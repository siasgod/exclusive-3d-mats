export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    // Conforme seu painel, a Base URL é https://api.syncpayments.com.br/
    // O erro 404 indica que o servidor Laravel não reconhece o sufixo da rota.
    const baseUrl = "https://api.syncpayments.com.br";
    const endpoint = "/api/v2/payments"; // Mudança para v2, comum em sistemas Dubai Whitelabel

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-api-key": process.env.SYNCPAY_SECRET_KEY // Sua variável da Vercel
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "")
                },
                items: [{ title: kitName, unit_price: amount, quantity: 1 }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Erro na rota ${endpoint}:`, data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}