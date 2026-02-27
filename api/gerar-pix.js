export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // TENTATIVA FINAL: Adicionando o prefixo /api/ que é padrão em sistemas Laravel White Label
        const url = "https://api.syncpayments.com.br/api/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-api-key": process.env.SYNCPAY_SECRET_KEY
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
            console.error("Erro retornado pela SyncPay:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro no servidor Vercel:", error.message);
        return res.status(500).json({ error: error.message });
    }
} export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // TENTATIVA FINAL: Adicionando o prefixo /api/ que é padrão em sistemas Laravel White Label
        const url = "https://api.syncpayments.com.br/api/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-api-key": process.env.SYNCPAY_SECRET_KEY
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
            console.error("Erro retornado pela SyncPay:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro no servidor Vercel:", error.message);
        return res.status(500).json({ error: error.message });
    }
}