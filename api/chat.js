module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method === 'GET') return res.status(200).json({ version: 'gemini-v1', status: 'ok' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: { message: 'GEMINI_API_KEY no configurado en Vercel.' } });
    }

    try {
        const parsed = req.body || {};
        parsed.model = 'gemini-2.0-flash';

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(parsed)
        });

        const data = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({ error: { message: 'Error del servicio de IA (' + response.status + '). Intenta de nuevo.' } });
        }

        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(data);
    } catch (err) {
        return res.status(502).json({ error: { message: 'Error de conexion: ' + err.message } });
    }
};
