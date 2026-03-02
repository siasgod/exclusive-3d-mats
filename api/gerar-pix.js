export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        console.log("Iniciando Checkout SyncPay para:", customer?.email);

        // 1. TRATAMENTO DE VALOR (Garante R$ 102.30)
        let parsedAmount = parseFloat(String(amount).replace(",", "."));
        if (Number.isInteger(amount) && amount > 1000) {
            parsedAmount = amount / 100;
        }

        const cleanCpf = String(customer.cpf_cnpj || "").replace(/\D/g, "");
        const cleanPhone = String(customer.phone || "").replace(/\D/g, "") || "11999999999";

        // 2. ETAPA DE AUTENTICAÇÃO
        const authResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/auth-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.SYNCPAY_CLIENT_ID,
                client_secret: process.env.SYNCPAY_SECRET_KEY
            })
        });

        const authData = await authResponse.json();
        if (!authResponse.ok || !authData.access_token) {
            return res.status(401).json({ error: "Falha na autenticação SyncPay" });
        }

        // 3. GERAÇÃO DO PIX (CASH-IN)
        const paymentResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/cash-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${authData.access_token}`
            },
            body: JSON.stringify({
                amount: parsedAmount,
                description: kitName || "Compra Exclusive 3D Mats",
                webhook_url: "https://exclusive-3d-mats.vercel.app/api/webhook",
                client: {
                    name: customer.name,
                    email: customer.email,
                    cpf: cleanCpf,
                    phone: cleanPhone
                }
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("Erro no Cash-In:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        // 4. RETORNO PARA O FRONT-END
        // Baseado no seu log, a SyncPay retorna os dados dentro de 'data'
        // Enviamos o objeto completo para o seu site exibir o QR Code
        return res.status(200).json(paymentData.data);

    } catch (error) {
        console.error("Erro fatal:", error);
        return res.status(500).json({ error: "Erro interno", details: error.message });
    }
}