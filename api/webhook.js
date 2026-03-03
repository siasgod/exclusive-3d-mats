// api/webhook.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    const data = req.body;

    // Log detalhado para monitorar no painel da Vercel
    console.log("Evento recebido da Syncpay:", JSON.stringify(data, null, 2));

    // A SyncPay envia os dados dentro de 'data' ou na raiz, dependendo da versão
    const paymentStatus = data.status || data.data?.status;
    const paymentId = data.id || data.data?.id;
    const description = data.description || data.data?.description || "";
    const customerEmail = data.customer?.email || data.data?.client?.email;

    // 1. VERIFICAÇÃO DE PAGAMENTO CONFIRMADO
    if (paymentStatus === 'paid' || paymentStatus === 'concluded') {

        // 2. IDENTIFICAÇÃO DO TIPO DE PRODUTO
        if (description.includes("UPSELL") || description.includes("Kit Lavagem")) {
            console.log(`✅ [UPSELL CONFIRMADO]: O cliente ${customerEmail} adicionou o Kit de Limpeza ao pedido.`);

            // LÓGICA: Aqui você pode disparar uma notificação interna (ex: Slack ou E-mail)
            // informando que esse pedido específico deve incluir o Kit de Limpeza na caixa.
        } else {
            console.log(`✅ [VENDA PRINCIPAL]: O cliente ${customerEmail} pagou os Tapetes 3D.`);

            // LÓGICA: Iniciar fluxo padrão de separação de estoque.
        }

        // 3. LOG DE SEGURANÇA
        console.log(`ID da Transação: ${paymentId} | Valor: ${data.amount || data.data?.amount}`);
    }

    // A Syncpay PRECISA do status 200 para parar de enviar o webhook
    return res.status(200).json({
        received: true,
        message: "Webhook processado pela Soberano 3D"
    });
}