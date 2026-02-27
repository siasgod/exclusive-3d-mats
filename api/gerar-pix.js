export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { customer, amount, kitName } = req.body;

        if (!customer || !amount || !kitName) {
            return res.status(400).json({
                error: "Dados obrigatórios não enviados"
            });
        }

        const cleanDocument = String(customer.cpf_cnpj || "").replace(/\D/g, "");

        if (!cleanDocument) {
            return res.status(400).json({
                error: "CPF/CNPJ inválido"
            });
        }

        // =========================
        // 1️⃣ GERAR TOKEN
        // =========================

        const authResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/auth-token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    client_id: process.env.SYNCPAY_CLIENT_ID,
                    client_secret: process.env.SYNCPAY_SECRET_KEY
                })
            }
        );

        const authData = await authResponse.json();

        if (!authResponse.ok) {
            console.error("Erro ao gerar token:", authData);
            return res.status(authResponse.status).json(authData);
        }

        const accessToken = authData.access_token;

        // =========================
        // 2️⃣ CRIAR PAGAMENTO PIX
        // =========================

        const paymentResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/payments",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    amount: Number(amount),
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
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("Erro SyncPay:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        return res.status(200).json(paymentData);

    } catch (error) {
        console.error("Erro interno:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            details: error.message
        });
    }
}