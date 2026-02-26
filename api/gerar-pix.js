export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // Base URL oficial confirmada no seu painel
        const url = "https://api.syncpayments.com.br/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                // Algumas integrações exigem 'x-api-key', outras 'Authorization'. 
                // Vamos usar o x-api-key que é o padrão do painel Apidog.
                "x-api-key": process.env.SYNCPAY_SECRET_KEY
            },
            body: JSON.stringify({
                amount: parseInt(amount), // Garante que seja um número inteiro
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "") // Envia apenas os 11 ou 14 dígitos
                },
                items: [{
                    title: kitName,
                    unit_price: parseInt(amount),
                    quantity: 1
                }]
            })
        });

        const responseText = await response.text();

        try {
            const data = JSON.parse(responseText);
            if (!response.ok) {
                console.error("SyncPay Recusou:", data);
                return res.status(response.status).json(data);
            }
            return res.status(200).json(data);
        } catch (parseError) {
            // Se cair aqui, a chave ou os dados causaram um erro de servidor (HTML)
            console.error("HTML recebido em vez de JSON. Verifique a Secret Key.");
            return res.status(500).json({
                error: "A API de pagamentos rejeitou a requisição. Verifique se a sua Chave Privada está correta no painel da Vercel.",
                debug: responseText.substring(0, 150)
            });
        }

    } catch (error) {
        console.error("Erro fatal:", error.message);
        return res.status(500).json({ error: error.message });
    }
}