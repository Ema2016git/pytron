module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const HF_TOKEN = process.env.HF_TOKEN;
    if (!HF_TOKEN) {
        return res.status(500).json({ error: { message: 'HF_TOKEN no configurado.' } });
    }

    try {
        const parsed = req.body || {};
        if (!parsed.model) parsed.model = 'Qwen/Qwen2.5-72B-Instruct';

        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`
            },
            body: JSON.stringify(parsed)
        });

        const data = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({ error: { message: 'Error del servicio de IA. Intenta de nuevo.' } });
        }

        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(data);
    } catch (err) {
        return res.status(502).json({ error: { message: 'Error de conexion: ' + err.message } });
    }
};
