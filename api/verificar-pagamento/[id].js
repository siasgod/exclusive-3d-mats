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
            console.error("verificar-pagamento: falha na autenticação SyncPay");
            return res.status(401).json({ error: "Erro na autenticação SyncPay" });
        }

        // ===============================
        // 2. CONSULTA DO PAGAMENTO
        // ===============================
        const paymentResponse = await fetch(
            `https://api.syncpayments.com.br/api/partner/v1/cash-in/${id}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authData.access_token}`,
                    "Accept": "application/json",
                },
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("verificar-pagamento: erro na consulta SyncPay:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        // ===============================
        // 3. NORMALIZAÇÃO
        // ===============================
        const payment = paymentData?.data || paymentData;

        const statusFinal = (payment.status || "PENDING").toUpperCase();

        const statusSucesso = ["PAID", "APPROVED", "COMPLETED", "CONFIRMED"];
        const pago = statusSucesso.includes(statusFinal);

        if (pago) {
            console.log(`verificar-pagamento: transação ${id} confirmada — status ${statusFinal}`);
        }

        return res.status(200).json({
            success: pago,
            status: statusFinal,
            pago,
            id: payment.id || id
        });

    } catch (error) {
        console.error("verificar-pagamento: erro interno:", error.message);
        return res.status(500).json({
            error: "Erro ao verificar pagamento",
            details: error.message
        });
    }
}