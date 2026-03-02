export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { customer, amount, kitName } = req.body;

    try {
        // 1. TRATAMENTO DE VALOR
        let parsedAmount = parseFloat(String(amount).replace(",", "."));
        if (Number.isInteger(amount) && amount > 1000) {
            parsedAmount = amount / 100;
        }

        const cleanCpf = String(customer.cpf_cnpj || "").replace(/\D/g, "");
        const cleanPhone = String(customer.phone || "").replace(/\D/g, "") || "11999999999";

        // 2. AUTENTICAÇÃO
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
            return res.status(401).json({ error: "Erro na autenticação SyncPay" });
        }

        // 3. GERAÇÃO DO PIX
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
            return res.status(paymentResponse.status).json(paymentData);
        }

        // 4. MAPEAMENTO DE RESPOSTA (O segredo para o QR Code aparecer)
        // Criamos um objeto que atende a vários nomes de variáveis comuns em checkouts
        const pixData = paymentData.data;

        const responsePayload = {
            success: true,
            id: pixData.id,
            // Mapeamos para todos os nomes prováveis que seu Front-end usa:
            pix_code: pixData.pix_code,
            qrcode: pixData.pix_code,
            pix_copy_and_paste: pixData.pix_code,
            copy_paste: pixData.pix_code,
            amount: pixData.amount,
            status: pixData.status
        };

        return res.status(200).json(responsePayload);

    } catch (error) {
        return res.status(500).json({ error: "Erro interno", details: error.message });
    }
}