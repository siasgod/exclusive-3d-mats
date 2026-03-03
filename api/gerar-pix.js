export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Adicionamos 'description' e 'isUpsell' para dar flexibilidade
    const { customer, amount, kitName, description, isUpsell } = req.body;

    try {
        // 1. TRATAMENTO DE VALOR
        // Aceita tanto centavos (8990) quanto decimal (89.90)
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
            console.error("Erro na autenticação SyncPay:", authData);
            return res.status(401).json({ error: "Erro na autenticação SyncPay" });
        }

        // 3. DEFINIÇÃO DA DESCRIÇÃO (Prioriza o que vem do front-end)
        const finalDescription = description || kitName || (isUpsell ? "Upsell: Kit Limpeza Soberano" : "Compra Exclusive 3D Mats");

        // 4. GERAÇÃO DO PIX (Cash-In)
        const paymentResponse = await fetch("https://api.syncpayments.com.br/api/partner/v1/cash-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${authData.access_token}`
            },
            body: JSON.stringify({
                amount: parsedAmount,
                description: finalDescription,
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
            console.error("Erro na geração do pagamento:", paymentData);
            return res.status(paymentResponse.status).json(paymentData);
        }

        const pixRaw = paymentData.data;

        // Geramos a URL da imagem usando a API do Google Charts
        const qrCodeImageUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(pixRaw.pix_code)}`;

        // 5. MAPEAMENTO DE RESPOSTA (Ajustado para o seu obrigado.html)
        const responsePayload = {
            success: true,
            id: pixRaw.id,
            pix_code: pixRaw.pix_code,
            pix_qr_code: qrCodeImageUrl, // <--- ADICIONADO PARA BATER COM O SCRIPT DO OBRIGADO.HTML
            qrcode_image: qrCodeImageUrl,
            amount: pixRaw.amount,
            status: pixRaw.status
        };

        console.log(`PIX ${isUpsell ? 'Upsell' : 'Principal'} Gerado:`, pixRaw.id);
        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error("Erro interno no servidor:", error.message);
        return res.status(500).json({ error: "Erro interno", details: error.message });
    }
}