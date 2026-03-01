export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // Log para conferência no painel Vercel
        console.log("Iniciando Checkout SyncPay para:", customer.email);

        const response = await fetch("https://api.syncpay.com.br/v1/checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Usa o nome da variável que está no seu painel Vercel
                "x-api-key": process.env.syncpay
            },
            body: JSON.stringify({
                amount: amount, // Ex: 9681 (centavos)
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "") // Apenas números
                },
                items: [{
                    title: kitName,
                    unit_price: amount,
                    quantity: 1
                }]
            })
        });

        // Captura o texto da resposta antes de converter para JSON para evitar o erro de 'Unexpected token <'
        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("A API retornou HTML em vez de JSON. Resposta:", responseText.substring(0, 200));
            return res.status(500).json({ error: "Erro na comunicação com a SyncPay (Resposta Inválida)." });
        }

        if (!response.ok) {
            console.error("Erro retornado pela SyncPay:", data);
            return res.status(response.status).json(data);
        }

        // Retorna os dados para o seu front-end (pix_qr_code e pix_code)
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro fatal no servidor:", error);
        return res.status(500).json({ error: error.message });
    }
}