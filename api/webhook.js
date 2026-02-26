// api/webhook.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    const data = req.body;

    // Log para você debugar no painel da Vercel se o aviso está chegando
    console.log("Evento recebido da Syncpay:", data);

    // Na Syncpay, o status costuma ser 'paid' ou 'approved'
    // Verifique o campo exato na doc: geralmente é data.status ou data.event
    if (data.status === 'paid' || data.event === 'transaction.paid') {
        console.log(`Pagamento confirmado para o cliente: ${data.customer?.email}`);

        // Aqui você pode adicionar lógica futura (enviar e-mail, etc)
    }

    // A Syncpay PRECISA receber um status 200, senão ela fica tentando reenviar
    return res.status(200).json({ received: true });
}