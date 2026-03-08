export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { customer, amount, kitName, description, isUpsell } = req.body;

    try {

        // ===============================
        // 1. VALIDAÇÃO BÁSICA DE CLIENTE
        // ===============================

        if (!customer || !customer.email) {
            return res.status(400).json({
                error: "Dados do cliente inválidos"
            });
        }

        // ===============================
        // 2. TRATAMENTO DE VALOR (BLINDADO)
        // ===============================

        let parsedAmount = Number(
            String(amount || "0")
                .replace(/\./g, "")
                .replace(",", ".")
        );

        if (!parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({
                error: "Valor inválido"
            });
        }

        // Caso venha em centavos (8990)
        if (parsedAmount > 1000) {
            parsedAmount = parsedAmount / 100;
        }

        parsedAmount = Number(parsedAmount.toFixed(2));

        // ===============================
        // 3. NORMALIZAÇÃO DE DADOS
        // ===============================

        const cleanCpf = String(customer?.cpf_cnpj || "")
            .replace(/\D/g, "")
            .slice(0, 11);

        const cleanPhone = String(customer?.phone || "")
            .replace(/\D/g, "")
            .slice(-11) || "11999999999";

        // ===============================
        // 4. GERAR ORDER ID INTERNO
        // ===============================

        const orderId = `EX3DMATS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // ===============================
        // 5. AUTENTICAÇÃO SYNCPAY
        // ===============================

        const authResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/auth-token",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: process.env.SYNCPAY_CLIENT_ID,
                    client_secret: process.env.SYNCPAY_SECRET_KEY,
                }),
            }
        );

        const authData = await authResponse.json();

        if (!authResponse.ok || !authData?.access_token) {
            console.error("Erro na autenticação SyncPay:", authData);

            return res.status(401).json({
                error: "Erro na autenticação SyncPay",
            });
        }

        // ===============================
        // 6. DESCRIÇÃO FINAL DO PEDIDO
        // ===============================

        const finalDescription =
            description ||
            (isUpsell
                ? `Upsell: Kit Limpeza Soberano | Pedido ${orderId}`
                : `${kitName || "Compra Exclusive 3D Mats"} | Pedido ${orderId}`);

        // ===============================
        // 7. GERAR COBRANÇA PIX
        // ===============================

        const paymentResponse = await fetch(
            "https://api.syncpayments.com.br/api/partner/v1/cash-in",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${authData.access_token}`,
                },
                body: JSON.stringify({
                    amount: parsedAmount,
                    description: finalDescription,
                    webhook_url: `${process.env.BASE_URL}/api/webhook`,
                    client: {
                        name: customer?.name || "Cliente",
                        email: customer?.email || "cliente@email.com",
                        cpf: cleanCpf || "00000000000",
                        phone: cleanPhone,
                    },
                }),
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error("Erro na geração do pagamento:", paymentData);

            return res
                .status(paymentResponse.status)
                .json(paymentData);
        }

        // ===============================
        // 8. TRATAMENTO DO RETORNO
        // ===============================

        const pixRaw = paymentData?.data || paymentData;

        if (!pixRaw) {
            console.error("Resposta inesperada da SyncPay:", paymentData);

            return res.status(500).json({
                error: "Resposta inválida da SyncPay"
            });
        }

        const pixCode =
            pixRaw.pix_code ||
            pixRaw.paymentcode ||
            pixRaw.paymentCode ||
            null;

        if (!pixCode) {
            console.error("PIX não retornado:", pixRaw);

            return res.status(500).json({
                error: "PIX não retornado pela SyncPay"
            });
        }

        const transactionId =
            pixRaw.id ||
            pixRaw.identifier ||
            pixRaw.idtransaction ||
            null;

        if (!transactionId) {
            console.warn("ID da transação não encontrado.");
        }

        // ===============================
        // 9. GERAR QR CODE UNIVERSAL
        // ===============================

        const qrCodeImageUrl =
            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

        // ===============================
        // 10. RESPOSTA FINAL
        // ===============================

        const responsePayload = {
            success: true,
            id: transactionId,
            order_id: orderId,
            pix_code: pixCode,
            pix_qr_code: qrCodeImageUrl,
            qrcode_image: qrCodeImageUrl,
            amount: pixRaw.amount || parsedAmount,
            status: pixRaw.status || "WAITING_FOR_APPROVAL",
        };

        console.log(
            `PIX ${isUpsell ? "Upsell" : "Principal"} Gerado:`,
            transactionId,
            "| Pedido:",
            orderId
        );

        return res.status(200).json(responsePayload);

    } catch (error) {

        console.error("Erro interno no servidor:", error);

        return res.status(500).json({
            error: "Erro interno no servidor",
            details: error.message,
        });
    }
}