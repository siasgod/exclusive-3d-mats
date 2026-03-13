export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { customer, amount, description, isUpsell } = req.body;

    // ===============================
    // 1. VALIDAÇÃO DE ENTRADA
    // ===============================
    if (!customer?.email || !customer.email.includes("@")) {
        return res.status(400).json({ error: "E-mail do cliente inválido ou ausente" });
    }

    if (!customer?.name?.trim()) {
        return res.status(400).json({ error: "Nome do cliente ausente" });
    }

    try {
        // ===============================
        // 2. TRATAMENTO DE VALOR
        // ===============================
        let parsedAmount = Number(
            String(amount || "0")
                .replace(/\./g, "")
                .replace(",", ".")
        );

        if (!parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({ error: "Valor inválido" });
        }

        // Se chegar em centavos (ex: 8990), converte para decimal (89.90)
        if (parsedAmount > 1000) {
            parsedAmount = parsedAmount / 100;
        }

        parsedAmount = Number(parsedAmount.toFixed(2));

        const cleanCpf = String(customer?.cpf_cnpj || "")
            .replace(/\D/g, "")
            .slice(0, 11);

        const cleanPhone = String(customer?.phone || "")
            .replace(/\D/g, "")
            .slice(-11) || null;

        // Avisa no log se telefone vier vazio — sem enviar número falso
        if (!cleanPhone) {
            console.warn("gerar-pix: telefone ausente para", customer.email);
        }

        // ===============================
        // 3. AUTENTICAÇÃO
        // ===============================
        const authResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/auth-token",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: process.env.SYNCPAY_CLIENT_ID,
                    client_secret: process.env.SYNCPAY_SECRET_KEY,
                }),
            }
        );

        const authData = await authResponse.json();

        if (!authResponse.ok || !authData?.access_token) {
            console.error("Erro na autenticação SyncPay:", authData);
            return res.status(401).json({ error: "Erro na autenticação SyncPay" });
        }

        // ===============================
        // 4. DESCRIÇÃO E WEBHOOK
        // ===============================
        const rawDescription = description || (isUpsell ? "Upsell: Kit Limpeza Soberano" : "Compra Soberano Tapetes");

        // Corta em limite de palavra para não truncar no meio
        const finalDescription = rawDescription.length > 50
            ? rawDescription.substring(0, 50).replace(/\s\S*$/, "")
            : rawDescription;

        const webhookUrl = process.env.BASE_URL
            ? `${process.env.BASE_URL}/api/webhook`
            : "https://exclusive-3d-mats.vercel.app/api/webhook";

        // ===============================
        // 5. GERAÇÃO DO PIX
        // ===============================
        const clientPayload = {
            name: String(customer.name).trim(),
            email: customer.email,
            cpf: cleanCpf,
        };
        if (cleanPhone) clientPayload.phone = cleanPhone;

        const paymentResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/cash-in",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authData.access_token}`,
                },
                body: JSON.stringify({
                    amount: parsedAmount,
                    description: finalDescription,
                    webhook_url: webhookUrl,
                    client: clientPayload,
                }),
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            // Loga sem expor CPF
            console.error("Erro na geração do pagamento:", {
                status: paymentResponse.status,
                amount: parsedAmount,
                description: finalDescription,
                error: paymentData
            });
            return res.status(paymentResponse.status).json(paymentData);
        }

        // ===============================
        // 6. NORMALIZAÇÃO DO RETORNO
        // ===============================
        const pixRaw = paymentData?.data || paymentData;

        const pixCode = pixRaw.pix_code || pixRaw.paymentcode || pixRaw.paymentCode || pixRaw.emv;

        if (!pixCode) {
            console.error("PIX não retornado pela SyncPay:", pixRaw);
            return res.status(500).json({ error: "PIX não retornado pela SyncPay", details: pixRaw });
        }

        const transactionId =
            pixRaw.id ||
            pixRaw.identifier ||
            pixRaw.idtransaction ||
            pixRaw.uuid ||
            null;

        if (!transactionId) {
            console.warn("gerar-pix: transactionId ausente no retorno da SyncPay", pixRaw);
        }

        // Log de conversão — sem dados sensíveis
        console.log(`gerar-pix: PIX gerado | isUpsell=${!!isUpsell} | amount=${parsedAmount} | id=${transactionId}`);

        // ===============================
        // 7. RESPOSTA
        // ===============================
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

        return res.status(200).json({
            success: true,
            id: transactionId,
            pix_code: pixCode,
            pix_qr_code: qrCodeImageUrl,
            status: pixRaw.status || "PENDING"
        });

    } catch (error) {
        console.error("Erro interno no servidor:", error.message);
        return res.status(500).json({ error: "Erro interno", details: error.message });
    }
}