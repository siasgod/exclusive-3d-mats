export default async function handler(req, res) {
    // 1. Verificação básica de segurança e variáveis
    if (!process.env.SYNCPAY_SECRET_KEY) {
        console.error("ERRO: A variável SYNCPAY_SECRET_KEY não foi encontrada no ambiente.");
        return res.status(500).json({ error: "Configuração do servidor incompleta (Chave ausente)." });
    }

    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        const url = "https://api.syncpayments.com.br/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.SYNCPAY_SECRET_KEY.trim() // O .trim() remove espaços acidentais
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
            console.error("Erro da API SyncPay:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro fatal na função:", error.message);
        return res.status(500).json({ error: "Falha interna ao processar pagamento." });
    }
}