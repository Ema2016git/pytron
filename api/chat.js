module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const parsed = req.body || {};
        parsed.model = 'openai-fast';

        const response = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
