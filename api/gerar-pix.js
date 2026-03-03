export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { customer, amount, kitName, description, isUpsell } = req.body;

    try {

        // ===============================
        // 1. TRATAMENTO DE VALOR
        // ===============================
        let parsedAmount = parseFloat(String(amount).replace(",", "."));

        if (Number.isInteger(amount) && amount > 1000) {
            parsedAmount = amount / 100;
        }

        const cleanCpf = String(customer?.cpf_cnpj || "").replace(/\D/g, "");
        const cleanPhone = String(customer?.phone || "").replace(/\D/g, "") || "11999999999";

        // ===============================
        // 2. AUTENTICAÇÃO
        // ===============================
        const authResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/auth-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY
            })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok || !authData.access_token) {
            console.error("Erro na autenticação SyncPay:", authData);
            return res.status(401).json({ error: "Erro na autenticação SyncPay" });
        }

        // ===============================
        // 3. DESCRIÇÃO FINAL
        // ===============================
        const finalDescription =
            description ||
            kitName ||
            (isUpsell
                ? "Upsell: Kit Limpeza Soberano"
                : "Compra Exclusive 3D Mats");

        // ===============================
        // 4. GERAÇÃO DO PIX
        // ===============================
        const paymentResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/cash-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${authData.access_token}`
            },
            body: JSON.stringify({
                amount: parsedAmount,
                description: finalDescription,
                webhook_url: "https://exclusive-3d-mats.vercel.app/api/webhook",
                client: {
                    name: customer?.name,
                    email: customer?.email,
                    cpf: cleanCpf,
                    phone: cleanPhone
                }
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("Erro na geração do pagamento:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        // ===============================
        // 5. TRATAMENTO DO RETORNO
        // ===============================

        // Se vier dentro de "data", usa ele
        // Senão, usa o objeto direto
        const pixRaw = paymentData?.data || paymentData;

        if (!pixRaw) {
            console.error("Resposta inesperada da SyncPay:", paymentData);
            return res.status(500).json({ error: "Resposta inválida da SyncPay" });
        }

        // Aceita múltiplos nomes possíveis
        const pixCode =
            pixRaw.pix_code ||
            pixRaw.paymentcode ||
            pixRaw.paymentCode ||
            null;

        if (!pixCode) {
            console.error("PIX não retornado corretamente:", pixRaw);
            return res.status(500).json({ error: "PIX não retornado pela SyncPay" });
        }

        // ID pode vir como id ou identifier
        const transactionId =
            pixRaw.id ||
            pixRaw.identifier ||
            pixRaw.idtransaction ||
            null;

        // QR Code
        let qrCodeImageUrl;

        if (pixRaw.paymentCodeBase64) {
            qrCodeImageUrl = `data:image/png;base64,${pixRaw.paymentCodeBase64}`;
        } else {
            qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
        }

        // ===============================
        // 6. RESPOSTA PARA O FRONT
        // ===============================
        const responsePayload = {
            success: true,
            id: transactionId,
            pix_code: pixCode,
            pix_qr_code: qrCodeImageUrl,
            qrcode_image: qrCodeImageUrl,
            amount: pixRaw.amount || parsedAmount,
            status: pixRaw.status || "WAITING_FOR_APPROVAL"
        };

        console.log(`PIX ${isUpsell ? 'Upsell' : 'Principal'} Gerado:`, pixRaw.id);

        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error("Erro interno no servidor:", error);
        return res.status(500).json({
            error: "Erro interno no servidor",
            details: error.message
        });
    }
}