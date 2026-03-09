export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { customer, amount, kitName, description, isUpsell } = req.body;

    try {
        // ===============================
        // 1. TRATAMENTO DE VALOR (DECIMAL)
        // ===============================
        let parsedAmount = Number(
            String(amount || "0")
                .replace(/\./g, "")
                .replace(",", ".")
        );

        if (!parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({ error: "Valor inválido" });
        }

        // Se o valor chegar em centavos (ex: 8990), converte para decimal (89.90)
        // A SyncPay, nesta estrutura, espera o ponto decimal.
        if (parsedAmount > 1000) {
            parsedAmount = parsedAmount / 100;
        }

        parsedAmount = Number(parsedAmount.toFixed(2));

        const cleanCpf = String(customer?.cpf_cnpj || "")
            .replace(/\D/g, "")
            .slice(0, 11);

        const cleanPhone =
            String(customer?.phone || "")
                .replace(/\D/g, "")
                .slice(-11) || "11999999999";

        // ===============================
        // 2. AUTENTICAÇÃO
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
        // 3. DESCRIÇÃO E WEBHOOK
        // ===============================
        const finalDescription = description || kitName || (isUpsell ? "Upsell: Kit Limpeza Soberano" : "Compra Soberano 3D Mats");

        // Usa a URL do seu site ou fallback
        const webhookUrl = process.env.BASE_URL ? `${process.env.BASE_URL}/api/webhook` : "https://exclusive-3d-mats.vercel.app/api/webhook";

        // ===============================
        // 4. GERAÇÃO DO PIX (MUDANÇA PARA 'CLIENT' E 'CPF')
        // ===============================
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
                    amount: parsedAmount, // Ex: 89.90
                    description: finalDescription.substring(0, 50),
                    webhook_url: webhookUrl,
                    client: { // Algumas versões usam 'client' em vez de 'customer'
                        name: String(customer?.name || "Cliente").trim(),
                        email: customer?.email,
                        cpf: cleanCpf, // Algumas versões usam 'cpf' em vez de 'cpf_cnpj'
                        phone: cleanPhone,
                    },
                }),
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("Payload enviado:", parsedAmount, finalDescription, cleanCpf);
            console.error("Erro na geração do pagamento:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        // ===============================
        // 5. TRATAMENTO DO RETORNO (MULTI-CAMPO)
        // ===============================
        const pixRaw = paymentData?.data || paymentData;

        // Tenta capturar o código PIX de qualquer campo possível
        const pixCode = pixRaw.pix_code || pixRaw.paymentcode || pixRaw.paymentCode || pixRaw.emv;

        if (!pixCode) {
            return res.status(500).json({ error: "PIX não retornado pela SyncPay", details: pixRaw });
        }

        const transactionId = pixRaw.id || pixRaw.identifier || pixRaw.idtransaction || pixRaw.uuid;

        // ===============================
        // 6. QR CODE E RESPOSTA
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
        console.error("Erro interno no servidor:", error);
        return res.status(500).json({ error: "Erro interno", details: error.message });
    }
}