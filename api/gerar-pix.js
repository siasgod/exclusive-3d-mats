export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        const url = "https://api.syncpayments.com.br/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                // A SyncPay costuma validar a chave diretamente no x-api-key
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

        // Capturamos a resposta bruta primeiro
        const text = await response.text();

        try {
            const data = JSON.parse(text);
            return res.status(response.status).json(data);
        } catch (err) {
            // Se cair aqui, a API retornou um erro em HTML (o <!DOCTYPE)
            console.error("Resposta não-JSON da API:", text.substring(0, 200));
            return res.status(500).json({
                error: "A API recusou a conexão. Verifique se sua Secret Key é válida.",
                preview: text.substring(0, 100)
            });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}