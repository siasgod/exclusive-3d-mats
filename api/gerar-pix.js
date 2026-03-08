export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { customer, amount, kitName, description, isUpsell } = req.body;

    try {
        // 1. VALIDAÇÃO BÁSICA
        if (!customer || !customer.email) {
            return res.status(400).json({ error: "Dados do cliente inválidos" });
        }

        // 2. TRATAMENTO DE VALOR (CORREÇÃO DE CARA)
        // Se vier 189.90 vira 18990. Se vier 18990 continua 18990.
        let finalAmount = Number(amount);
        if (!Number.isInteger(finalAmount)) {
            finalAmount = Math.round(finalAmount * 100);
        } else if (finalAmount < 500) {
            // Proteção extra: se for um valor inteiro muito baixo, 
            // provavelmente o front esqueceu de multiplicar por 100.
            finalAmount = finalAmount * 100;
        }

        // 3. NORMALIZAÇÃO RÍGIDA (A API REJEITA PONTOS E TRAÇOS)
        const cleanCpf = String(customer.cpf_cnpj || "").replace(/\D/g, "");
        const cleanPhone = String(customer.phone || "").replace(/\D/g, "").slice(-11);
        const orderId = `SOBERANO-${Date.now()}`;

        // 4. AUTENTICAÇÃO SYNCPAY
        const authResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/auth-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY,
            }),
        });

        const authData = await authResponse.json();
        if (!authResponse.ok || !authData.access_token) {
            return res.status(401).json({ error: "Erro na autenticação SyncPay" });
        }

        // 5. GERAÇÃO DO PAGAMENTO (BLINDADO)
        const paymentBody = {
            amount: finalAmount, // Agora garantido como INTEIRO (centavos)
            description: description || `${kitName || "Pedido"} | ${orderId}`,
            payment_method: "pix",
            customer: {
                name: String(customer.name).substring(0, 60),
                email: customer.email,
                cpf_cnpj: cleanCpf,
                phone: cleanPhone || "11999999999"
            }
        };

        const paymentResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/cash-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${authData.access_token}`,
            },
            body: JSON.stringify(paymentBody),
        });

        const paymentData = await paymentResponse.json();
        const pixRaw = paymentData.data || paymentData;

        if (!paymentResponse.ok || !pixRaw.pix_code) {
            // Log para você ver exatamente o que a SyncPay não gostou
            console.error("Payload enviado:", JSON.stringify(paymentBody));
            console.error("Resposta erro SyncPay:", paymentData);
            return res.status(400).json({ error: "Falha ao gerar PIX", details: paymentData });
        }

        // 6. RESPOSTA PARA O FRONT
        return res.status(200).json({
            success: true,
            id: pixRaw.id || pixRaw.uuid || pixRaw.identifier,
            pix_code: pixRaw.pix_code,
            pix_qr_code: pixRaw.pix_qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixRaw.pix_code)}`,
            status: pixRaw.status
        });

    } catch (error) {
        console.error("Erro Interno:", error);
        return res.status(500).json({ error: "Erro interno no servidor", message: error.message });
    }
}