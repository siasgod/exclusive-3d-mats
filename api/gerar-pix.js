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

        // 2. TRATAMENTO DE VALOR (Garante centavos para a API)
        // Se o front já manda 18990 (R$ 189,90), mantemos. 
        // Se manda 189.90, convertemos.
        let finalAmount = Math.round(Number(amount));

        // 3. NORMALIZAÇÃO
        const cleanCpf = String(customer.cpf_cnpj || "").replace(/\D/g, "");
        const cleanPhone = String(customer.phone || "").replace(/\D/g, "");
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

        // 5. GERAÇÃO DO PAGAMENTO
        const paymentResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/cash-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.access_token}`,
            },
            body: JSON.stringify({
                amount: finalAmount, // Valor em centavos (ex: 15000 para R$ 150,00)
                description: description || `${kitName} | Pedido ${orderId}`,
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: cleanCpf,
                    phone: cleanPhone
                }
            }),
        });

        const paymentData = await paymentResponse.json();

        // A SyncPay costuma retornar os dados dentro de 'data'
        const pixRaw = paymentData.data || paymentData;

        if (!paymentResponse.ok || !pixRaw.pix_code) {
            console.error("Erro SyncPay:", paymentData);
            return res.status(400).json({ error: "Falha ao gerar PIX", details: paymentData });
        }

        // 6. RESPOSTA PARA O FRONT
        return res.status(200).json({
            success: true,
            id: pixRaw.id || pixRaw.uuid,
            pix_code: pixRaw.pix_code,
            pix_qr_code: pixRaw.pix_qr_code || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixRaw.pix_code)}`,
            status: pixRaw.status
        });

    } catch (error) {
        console.error("Erro Interno:", error);
        return res.status(500).json({ error: "Erro interno no servidor", message: error.message });
    }
}