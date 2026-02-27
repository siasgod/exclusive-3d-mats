export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { customer, amount, description } = req.body;

    const baseUrl = "https://api.syncpayments.com.br/api/partner/v1";

    try {
        /*
        =========================================
        1️⃣ GERAR TOKEN (OAuth)
        =========================================
        */
        const authResponse = await fetch(`${baseUrl}/auth-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY
            })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
            console.error("Erro na autenticação:", authData);
            return res.status(authResponse.status).json(authData);
        }

        const accessToken = authData.access_token;

        /*
        =========================================
        2️⃣ GERAR PIX (CASH-IN)
        =========================================
        */
        const paymentResponse = await fetch(`${baseUrl}/cash-in`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                amount: Number(amount),
                description: description || "Pagamento via PIX",
                client: {
                    name: customer.name,
                    cpf: customer.cpf.replace(/\D/g, ""),
                    email: customer.email,
                    phone: customer.phone
                }
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("Erro ao criar PIX:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        return res.status(200).json(paymentData);

    } catch (error) {
        console.error("Erro interno:", error);
        return res.status(500).json({
            error: "Erro interno no servidor",
            details: error.message
        });
    }
}