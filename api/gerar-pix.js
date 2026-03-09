export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { customer, amount } = req.body;

    try {

        if (!customer || !customer.email) {
            return res.status(400).json({ error: "Dados do cliente inválidos" });
        }

        let finalAmount = Number(amount);

        if (!Number.isInteger(finalAmount)) {
            finalAmount = Math.round(finalAmount * 100);
        } else if (finalAmount < 500) {
            finalAmount = finalAmount * 100;
        }

        const cleanCpf = String(customer.cpf_cnpj || "").replace(/\D/g, "");
        const cleanPhone = String(customer.phone || "").replace(/\D/g, "");

        const orderId = `SOBERANO-${Date.now()}`;

        // AUTENTICAÇÃO
        const authResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/auth-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY
            })
        });

        const authData = await authResponse.json();

        if (!authData.access_token) {
            console.error("Erro Auth:", authData);
            return res.status(401).json({ error: "Erro autenticação SyncPay" });
        }

        const paymentBody = {
            amount: finalAmount,
            description: `Pedido ${orderId}`,
            external_id: orderId,
            payment_method: "pix",

            customer: {
                name: String(customer.name).trim(),
                email: customer.email.trim(),
                cpf: cleanCpf,
                phone: cleanPhone
            },

            callback_url: "https://exclusive-3d-mats.vercel.app/api/webhook"
        };

        const paymentResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/cash-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.access_token}`
            },
            body: JSON.stringify(paymentBody)
        });

        const paymentData = await paymentResponse.json();

        const pixRaw = paymentData.data || paymentData;

        if (!paymentResponse.ok || !pixRaw.pix_code) {

            console.error("Payload enviado:", JSON.stringify(paymentBody));
            console.error("Resposta SyncPay:", paymentData);

            return res.status(400).json({
                error: "Erro ao gerar PIX",
                details: paymentData
            });
        }

        return res.status(200).json({
            success: true,
            id: pixRaw.id || pixRaw.uuid,
            pix_code: pixRaw.pix_code,
            pix_qr_code:
                pixRaw.pix_qr_code ||
                `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    pixRaw.pix_code
                )}`,
            status: pixRaw.status
        });

    } catch (error) {

        console.error("Erro interno:", error);

        return res.status(500).json({
            error: "Erro interno",
            message: error.message
        });
    }
}