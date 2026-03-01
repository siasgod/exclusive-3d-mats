module.exports = async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {

        const body = req.body || {};
        const customer = body.customer || null;
        const amount = body.amount || null;

        console.log("BODY RECEBIDO:", body);

        // ======================
        // VALIDAÇÕES
        // ======================

        if (!customer) {
            return res.status(400).json({ error: "Customer não enviado" });
        }

        if (!amount) {
            return res.status(400).json({ error: "Amount não enviado" });
        }

        if (!customer.phone) {
            return res.status(400).json({ error: "Telefone é obrigatório" });
        }

        const cleanCpf = String(customer.cpf_cnpj || "")
            .replace(/\D/g, "");

        if (!cleanCpf || cleanCpf.length < 11) {
            return res.status(400).json({ error: "CPF inválido" });
        }

        const cleanPhone = String(customer.phone || "")
            .replace(/\D/g, "");

        // Telefone brasileiro válido (10 ou 11 dígitos sem +55)
        if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) {
            return res.status(400).json({
                error: "Telefone inválido. Envie com DDD e sem +55"
            });
        }

        const parsedAmount = parseFloat(
            String(amount).replace(",", ".")
        );

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: "Valor inválido" });
        }

        if (!process.env.SYNCPAY_CLIENT_ID || !process.env.SYNCPAY_SECRET_KEY) {
            return res.status(500).json({
                error: "Credenciais da SyncPay não configuradas"
            });
        }

        // ======================
        // 1️⃣ AUTH
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

        let authData;

        try {
            authData = await authResponse.json();
        } catch (err) {
            return res.status(500).json({
                error: "Erro ao interpretar resposta de autenticação"
            });
        }

        if (!authResponse.ok || !authData.access_token) {
            console.error("Erro ao gerar token:", authData);
            return res.status(authResponse.status || 401).json(authData);
        }

        const token = authData.access_token;

        // ======================
        // 2️⃣ CASH-IN (GERAR PIX)
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
                    amount: parsedAmount,
                    description: body.kitName || "Pagamento via PIX",
                    webhook_url: "https://exclusive-3d-mats.vercel.app/api/webhook",
                    client: {
                        name: customer.name || "",
                        cpf: cleanCpf,
                        email: customer.email || "",
                        phone: cleanPhone
                    }
                })
            }
        );

        let paymentData;

        try {
            paymentData = await paymentResponse.json();
        } catch (err) {
            return res.status(500).json({
                error: "Erro ao interpretar resposta de pagamento"
            });
        }

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
};