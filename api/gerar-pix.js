// api/gerar-pix.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        const response = await fetch("https://api.syncpay.com.br/v1/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Aqui o Node.js vai buscar a chave que você salvou no painel da Vercel
                "Authorization": `Bearer ${process.env.SYNCPAY_SECRET_KEY}`
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: "pix",
                customer: customer,
                items: [{ name: kitName, qty: 1, amount: amount }]
            })
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}