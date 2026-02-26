export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // A URL correta conforme a documentação SyncPay
        const response = await fetch("https://api.syncpay.com.br/v1/checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Usando o nome exato da sua variável na Vercel
                "x-api-key": process.env.SYNCPAY_SECRET_KEY
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "") // Limpa CPF para enviar apenas números
                },
                items: [{
                    title: kitName,
                    unit_price: amount,
                    quantity: 1
                }]
            })
        });

        // Lógica para evitar o erro de "Unexpected token <"
        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Erro: A API não retornou JSON. Resposta do servidor:", responseText.substring(0, 200));
            return res.status(500).json({
                error: "Resposta inválida da API (HTML). Verifique se a URL ou a Chave estão corretas."
            });
        }

        if (!response.ok) {
            console.error("Erro na SyncPay:", data);
            return res.status(response.status).json(data);
        }

        // Retorna os dados do PIX (QR Code e Código)
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro interno no servidor Vercel:", error);
        return res.status(500).json({ error: error.message });
    }
}