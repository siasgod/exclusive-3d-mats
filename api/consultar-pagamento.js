export default async function handler(req, res) {
    // Captura o ID da URL. Certifique-se que o front envia como ?id=...
    // ou que o arquivo esteja na pasta /api/consultar-pagamento/[id].js
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "ID da transação ausente" });
    }

    try {
        // 1. AUTENTICAÇÃO (Token)
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
            console.error("Falha ao obter token para consulta");
            return res.status(401).json({ error: "Erro de autenticação na API" });
        }

        // 2. CONSULTA STATUS
        // Nota: Verifique na documentação se o endpoint é /cash-in/ ou /transactions/
        const checkResponse = await fetch(`https://api.syncpayments.com.br/api/partner/v1/transactions/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${authData.access_token}`,
                "Accept": "application/json"
            }
        });

        const checkData = await checkResponse.json();

        // 3. TRATAMENTO SEGURO DOS DADOS
        // Algumas APIs retornam os dados direto, outras dentro de .data
        const info = checkData.data || checkData;
        const statusAtual = (info.status || "").toUpperCase();

        // Mapeamento de status comuns de sucesso (PAID, APPROVED, COMPLETED, CONFIRMED)
        const statusSucesso = ["PAID", "APPROVED", "COMPLETED", "CONFIRMED"];
        const estahPago = statusSucesso.includes(statusAtual);

        return res.status(200).json({
            status: statusAtual,
            pago: estahPago,
            success: estahPago // Para facilitar a leitura do front
        });

    } catch (error) {
        console.error("Erro na consulta:", error.message);
        return res.status(500).json({ error: "Erro interno ao consultar status" });
    }
}