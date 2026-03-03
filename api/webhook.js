// api/webhook.js

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {

        const payload = req.body;

        console.log("Evento recebido da Syncpay:", JSON.stringify(payload, null, 2));

        // ===============================
        // 1. NORMALIZAÇÃO DO OBJETO
        // ===============================

        const raw = payload?.data || payload;

        const transactionId =
            raw.id ||
            raw.idtransaction ||
            null;

        const amount =
            raw.amount ||
            raw.final_amount ||
            null;

        const description =
            raw.description ||
            "";

        const customerEmail =
            raw.client_email ||
            raw.email ||
            payload?.customer?.email ||
            null;

        const statusRaw = raw.status || "";

        const normalizedStatus = normalizeStatus(statusRaw);

        // ===============================
        // 2. LOG ESTRUTURADO
        // ===============================

        console.log("ID:", transactionId);
        console.log("Status recebido:", statusRaw);
        console.log("Status normalizado:", normalizedStatus);
        console.log("Valor:", amount);
        console.log("Email:", customerEmail);

        // ===============================
        // 3. PROCESSAMENTO APENAS SE APROVADO
        // ===============================

        if (normalizedStatus === "approved") {

            const isUpsell =
                description.toLowerCase().includes("upsell") ||
                description.toLowerCase().includes("kit limpeza") ||
                description.toLowerCase().includes("kit lavagem");

            if (isUpsell) {

                console.log(`✅ [UPSELL CONFIRMADO] Cliente: ${customerEmail}`);

                // 👉 Aqui você pode:
                // - Marcar no banco como upsell pago
                // - Disparar webhook para ERP
                // - Enviar notificação Slack
                // - Atualizar CRM

            } else {

                console.log(`✅ [VENDA PRINCIPAL CONFIRMADA] Cliente: ${customerEmail}`);

                // 👉 Fluxo normal:
                // - Liberar pedido
                // - Enviar para logística
                // - Atualizar CRM
            }

            console.log(`Transação ${transactionId} confirmada | Valor ${amount}`);
        }

        // ===============================
        // 4. RESPOSTA OBRIGATÓRIA
        // ===============================

        return res.status(200).json({
            received: true,
            status: normalizedStatus
        });

    } catch (error) {

        console.error("Erro interno no webhook:", error);

        return res.status(500).json({
            error: "Erro interno no webhook",
            details: error.message
        });
    }
}


// ===============================
// NORMALIZADOR DE STATUS
// ===============================

function normalizeStatus(status) {
    if (!status) return "unknown";

    const s = String(status).toLowerCase();

    if (s === "waiting_for_approval" || s === "pending")
        return "pending";

    if (
        s === "approved" ||
        s === "paid" ||
        s === "concluded" ||
        s === "success"
    )
        return "approved";

    if (
        s === "cancelled" ||
        s === "canceled" ||
        s === "refused"
    )
        return "cancelled";

    return s;
}