// Cache simples de token em memória (válido por 1 hora)
let cachedToken = null;
let tokenExpiresAt = null;

async function getAuthToken() {
    const now = new Date();

    // Reutiliza o token se ainda for válido (com 1 min de margem)
    if (cachedToken && tokenExpiresAt && now < new Date(tokenExpiresAt - 60_000)) {
        return cachedToken;
    }

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
        throw new Error("Falha na autenticação SyncPay");
    }

    cachedToken = authData.access_token;
    tokenExpiresAt = new Date(authData.expires_at);

    return cachedToken;
}

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "ID não informado" });
    }

    try {
        // ===============================
        // 1. AUTENTICAÇÃO (com cache)
        // ===============================
        const token = await getAuthToken();

        // ===============================
        // 2. CONSULTA DO PAGAMENTO
        // ===============================
        const paymentResponse = await fetch(
            `https://api.syncpayments.com.br/api/partner/v1/transaction/${id}`, // ✅ endpoint corrigido
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
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
            id: payment.reference_id || payment.id || id, // ✅ campo correto da SyncPay
        });

    } catch (error) {
        console.error("verificar-pagamento: erro interno:", error.message);
        return res.status(500).json({
            error: "Erro ao verificar pagamento",
            details: error.message
        });
    }
}