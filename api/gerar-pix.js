export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { customer, amount, kitName } = req.body;

        // 🔎 Validação básica
        if (!customer || !amount || !kitName) {
            return res.status(400).json({
                error: "Dados obrigatórios não enviados"
            });
        }

        if (!customer.name || !customer.email || !customer.cpf_cnpj) {
            return res.status(400).json({
                error: "Dados do cliente incompletos"
            });
        }

        // 🔐 Limpa CPF/CNPJ com segurança
        const cleanDocument = String(customer.cpf_cnpj).replace(/\D/g, "");

        const url = "https://api.syncpayments.com.br/v1/payments";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-api-key": process.env.SYNCPAY_SECRET_KEY
            },
            body: JSON.stringify({
                amount: Number(amount), // garante número
                payment_method: "pix",
                customer: {
                    name: customer.name,
                    email: customer.email,
                    cpf_cnpj: cleanDocument
                },
                items: [
                    {
                        title: kitName,
                        unit_price: Number(amount),
                        quantity: 1
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro SyncPay:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro interno:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            details: error.message
        });
    }
}