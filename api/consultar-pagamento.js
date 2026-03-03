export default async function handler(req, res) {
    const { id } = req.query; // Recebe o ID da transação via URL

    try {
        // 1. Pega o Token (mesma lógica do gerar-pix)
        const authResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/auth-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY
            })
        });
        const authData = await authResponse.json();

        // 2. Consulta o status na SyncPay
        // Endpoint baseado na documentação: /api/partner/v1/transactions/{id}
        const checkResponse = await fetch(`https://api.syncpayments.com.br/api/partner/v1/transactions/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authData.access_token}`,
                "Accept": "application/json"
            }
        });

        const checkData = await checkResponse.json();

        // 3. Retorna o status para o Front-end
        // Na SyncPay, geralmente os status são: 'pending', 'completed' ou 'paid'
        return res.status(200).json({
            status: checkData.data.status,
            pago: checkData.data.status === 'completed' || checkData.data.status === 'paid'
        });

    } catch (error) {
        return res.status(500).json({ error: "Erro ao consultar status" });
    }
}