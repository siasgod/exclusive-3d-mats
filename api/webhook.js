export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const payload = req.body || {};

        // ===============================
        // 1. NORMALIZAÇÃO
        // ===============================
        const raw = payload?.data || payload;

        const transactionId = raw.id || raw.idtransaction || null;
        const amount = raw.amount || raw.final_amount || null;
        const description = raw.description || "";
        const customerEmail = raw.client_email || raw.email || payload?.customer?.email || null;
        const statusRaw = raw.status || "";
        const normalizedStatus = normalizeStatus(statusRaw);

        // ===============================
        // 2. VALIDAÇÃO BÁSICA
        // ===============================
        if (!transactionId) {
            console.warn("webhook: recebido sem transactionId — payload:", JSON.stringify(raw).substring(0, 200));
            return res.status(400).json({ error: "transactionId ausente" });
        }

        // ===============================
        // 3. PROTEÇÃO ANTI-DUPLICAÇÃO
        // ===============================
        // ATENÇÃO: global.processedTransactions não persiste entre instâncias da Vercel.
        // Para produção com volume, use um KV store (ex: Vercel KV, Redis, Supabase).
        // Esta implementação protege apenas contra duplicatas na mesma instância.
        const processed = global.processedTransactions || new Set();
        if (processed.has(transactionId)) {
            console.log("webhook: duplicado ignorado:", transactionId);
            return res.status(200).json({ duplicate: true });
        }
        processed.add(transactionId);
        global.processedTransactions = processed;

        // ===============================
        // 4. DETECTAR UPSELL
        // ===============================
        const isUpsell =
            description.toLowerCase().includes("upsell") ||
            Number(amount) < 50;

        // ===============================
        // 5. LOG ESTRUTURADO (sem dados sensíveis)
        // ===============================
        console.log("webhook recebido:", {
            transactionId,
            status: normalizedStatus,
            amount,
            isUpsell,
            hasEmail: !!customerEmail
        });

        // ===============================
        // 6. PROCESSAR PAGAMENTO
        // ===============================
        if (normalizedStatus === "approved") {
            if (isUpsell) {
                console.log(`webhook: ✅ UPSELL CONFIRMADO — id=${transactionId} | valor=${amount}`);
            } else {
                console.log(`webhook: ✅ VENDA PRINCIPAL CONFIRMADA — id=${transactionId} | valor=${amount}`);
            }
            // TODO: aqui pode ser integrado envio de e-mail, notificação, ERP etc.
        }

        // ===============================
        // 7. RESPOSTA PARA SYNCPAY
        // ===============================
        return res.status(200).json({
            received: true,
            status: normalizedStatus,
            transaction: transactionId
        });

    } catch (error) {
        console.error("webhook: erro interno:", error.message);
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

    if (["waiting_for_approval", "pending"].includes(s)) return "pending";
    if (["approved", "paid", "concluded", "success"].includes(s)) return "approved";
    if (["cancelled", "canceled", "refused"].includes(s)) return "cancelled";

    return s;
}