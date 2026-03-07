export default async function handler(req, res) {

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "ID não informado" });
    }

    try {

        // ===============================
        // 1. AUTENTICAÇÃO
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
            return res.status(401).json({ error: "Erro autenticação SyncPay" });
        }

        // ===============================
        // 2. CONSULTA DO PAGAMENTO
        // ===============================
        const paymentResponse = await fetch(
            `https://api.syncpayments.com.br/api/partner/v1/cash-in/${id}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authData.access_token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            return res.status(500).json(paymentData);
        }

        const payment = paymentData?.data || paymentData;

        return res.status(200).json({
            status: payment.status || "pending",
            amount: payment.amount,
            id: payment.id
        });

    } catch (error) {

        console.error("Erro verificar pagamento:", error);

        return res.status(500).json({
            error: "Erro ao verificar pagamento",
            details: error.message
        });

    }
}