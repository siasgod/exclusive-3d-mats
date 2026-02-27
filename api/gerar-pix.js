export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { customer, amount } = req.body;

        if (!customer || !amount) {
            return res.status(400).json({
                error: "Dados obrigatórios não enviados"
            });
        }

        const cleanCpf = String(customer.cpf_cnpj || "").replace(/\D/g, "");

        if (!cleanCpf) {
            return res.status(400).json({
                error: "CPF inválido"
            });
        }

        // ======================
        // 1️⃣ GERAR TOKEN
        // ======================

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

        const token = authData.access_token;

        // ======================
        // 2️⃣ CASH-IN (PIX)
        // ======================

        const paymentResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/cash-in",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: Number(amount),
                    description: "Pagamento via PIX",
                    client: {
                        name: customer.name,
                        cpf: cleanCpf,
                        email: customer.email,
                        phone: customer.phone || "11999999999"
                    },
                    split: [
                        {
                            percentage: 100,
                            user_id: process.env.SYNCPAY_USER_ID
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