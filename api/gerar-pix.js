export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // A URL oficial baseada no seu painel da SyncPay
        const url = "https://api.syncpayments.com.br/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Usando o nome da variável que está agora na sua Vercel
                "x-api-key": process.env.SYNCPAY_SECRET_KEY
            },
            body: JSON.stringify({
                amount: amount, // Valor em centavos (ex: 9681)
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "") // Envia apenas números
                },
                items: [{
                    title: kitName,
                    unit_price: amount,
                    quantity: 1
                }]
            })
        });

        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Erro ao converter JSON. Recebido:", responseText);
            return res.status(500).json({ error: "Resposta inválida da API." });
        }

        if (!response.ok) {
            console.error("Erro da SyncPay:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro fatal:", error.message);
        return res.status(500).json({ error: error.message });
    }
}