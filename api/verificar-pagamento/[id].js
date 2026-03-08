export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "ID não informado" });
    }

    try {
        // 1. AUTENTICAÇÃO
        const authResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/auth-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY,
            }),
        });

        const authData = await authResponse.json();

        if (!authResponse.ok || !authData?.access_token) {
            return res.status(401).json({ error: "Erro autenticação SyncPay" });
        }

        // 2. CONSULTA DO PAGAMENTO
        // Verifique se o endpoint é /cash-in/ ou /transactions/ na sua versão da API
        const paymentResponse = await fetch(`https://api.syncpayments.com.br/api/partner/v1/cash-in/${id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${authData.access_token}`,
                "Accept": "application/json",
            },
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            return res.status(paymentResponse.status).json(paymentData);
        }

        // 3. NORMALIZAÇÃO DA RESPOSTA
        const payment = paymentData?.data || paymentData;

        // Padronizamos o retorno para o Front-end
        const statusFinal = (payment.status || "PENDING").toUpperCase();

        return res.status(200).json({
            success: true,
            status: statusFinal,
            pago: ["PAID", "APPROVED", "COMPLETED", "CONFIRMED"].includes(statusFinal),
            id: payment.id || id
        });

    } catch (error) {
        console.error("Erro verificar pagamento:", error);
        return res.status(500).json({
            error: "Erro ao verificar pagamento",
            details: error.message
        });
    }
}