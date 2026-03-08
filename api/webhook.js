export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {

        const payload = req.body || {};

        console.log("Webhook SyncPay recebido");

        // ===============================
        // 1. NORMALIZAÇÃO
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
            raw.description || "";

        const customerEmail =
            raw.client_email ||
            raw.email ||
            payload?.customer?.email ||
            null;

        const statusRaw = raw.status || "";

        const normalizedStatus = normalizeStatus(statusRaw);

        // ===============================
        // 2. VALIDAÇÃO BÁSICA
        // ===============================

        if (!transactionId) {

            console.warn("Webhook sem transactionId");

            return res.status(400).json({
                error: "transactionId ausente"
            });

        }

        // ===============================
        // 3. PROTEÇÃO DUPLICAÇÃO
        // ===============================

        const processed = global.processedTransactions || new Set();

        if (processed.has(transactionId)) {

            console.log("Webhook duplicado ignorado:", transactionId);

            return res.status(200).json({
                duplicate: true
            });

        }

        processed.add(transactionId);
        global.processedTransactions = processed;

        // ===============================
        // 4. EXTRAIR ORDER ID
        // ===============================

        const orderMatch = description.match(/EX3DMATS-\d+-\d+/);

        const orderId = orderMatch ? orderMatch[0] : "unknown-order";

        // ===============================
        // 5. DETECTAR UPSELL
        // ===============================

        const isUpsell =
            description.toLowerCase().includes("upsell") ||
            Number(amount) < 50;

        // ===============================
        // 6. LOG ESTRUTURADO
        // ===============================

        console.log("Transaction:", transactionId);
        console.log("Order ID:", orderId);
        console.log("Status:", normalizedStatus);
        console.log("Valor:", amount);
        console.log("Cliente:", customerEmail);

        // ===============================
        // 7. PROCESSAR PAGAMENTO
        // ===============================

        if (normalizedStatus === "approved") {

            if (isUpsell) {

                console.log("✅ UPSELL CONFIRMADO");
                console.log("Cliente:", customerEmail);
                console.log("Pedido:", orderId);

            } else {

                console.log("✅ VENDA PRINCIPAL CONFIRMADA");
                console.log("Cliente:", customerEmail);
                console.log("Pedido:", orderId);

            }

            console.log(`Transação ${transactionId} aprovada | Valor ${amount}`);

        }

        // ===============================
        // 8. RESPOSTA PARA SYNCPAY
        // ===============================

        return res.status(200).json({
            received: true,
            status: normalizedStatus,
            transaction: transactionId
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