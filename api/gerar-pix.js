// api/gerar-pix.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        const response = await fetch("https://api.syncpayments.com.br/v1/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // ATENÇÃO: Usei 'syncpay' pois é o nome que está no seu print da Vercel
                "Authorization": `Bearer ${process.env.syncpay}`
            },
            body: JSON.stringify({
                amount: amount, // Certifique-se que o front envia em centavos (ex: 9681)
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: customer.cpf_cnpj.replace(/\D/g, "") // Remove pontos e traços
                },
                items: [{
                    title: kitName,
                    unit_price: amount,
                    quantity: 1
                }]
            })
        });

        const data = await response.json();

        // Se a SyncPayments retornar erro (400, 401, etc), repassa o erro para o front
        if (!response.ok) {
            console.error("Erro da SyncPayments:", data);
            return res.status(response.status).json({
                message: data.message || "Erro na API de Pagamento",
                details: data
            });
        }

        // Retorna o sucesso com os dados do PIX
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro fatal no servidor:", error);
        return res.status(500).json({ error: error.message });
    }
}