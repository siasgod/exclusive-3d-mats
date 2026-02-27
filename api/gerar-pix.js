export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    // Mantendo a Base URL conforme o padrão identificado
    const baseUrl = "https://api.syncpayments.com.br/api/partner/v1";

    try {
        // 1. GERAR O TOKEN (Autenticação)
        // Usamos sua SECRET_KEY como o 'client_secret' exigido pela doc
        const authResponse = await fetch(`${baseUrl}/auth-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: "seu_client_id_aqui", // Se você tiver o ID, coloque aqui ou use outra env
                client_secret: process.env.SYNCPAY_SECRET_KEY
            })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
            console.error("Falha na autenticação:", authData);
            return res.status(401).json({ error: "Erro ao autorizar com a SyncPay." });
        }

        const token = authData.access_token;

        // 2. GERAR O PAGAMENTO (Usando o token obtido acima)
        const response = await fetch(`${baseUrl}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${token}` // Mudança crucial para Bearer
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "")
                },
                items: [{
                    title: kitName,
                    unit_price: amount,
                    quantity: 1
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro na criação do PIX:", data);
            return res.status(response.status).json(data);
        }

        // Retorno de sucesso para o seu front-end
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro fatal:", error.message);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
}