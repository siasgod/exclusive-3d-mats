export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // CORREÇÃO: O domínio correto geralmente é .com.br com 'payments' 
        // ou o domínio .app. Vamos usar o oficial:
        const urlOficial = "https://api.syncpayments.com.br/v1/payments";

        const response = await fetch(urlOficial, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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

        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return res.status(500).json({
                error: "Erro de DNS ou URL. O servidor retornou algo não esperado.",
                debug: responseText.substring(0, 100)
            });
        }

        if (!response.ok) return res.status(response.status).json(data);

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro de conexão (Fetch Failed):", error.message);
        return res.status(500).json({
            error: "Falha ao conectar na API. Verifique a URL.",
            code: error.code
        });
    }
}