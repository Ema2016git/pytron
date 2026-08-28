module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method === 'GET') return res.status(200).json({ version: 'gemini-v2', status: 'ok' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: { message: 'GEMINI_API_KEY no configurado en Vercel.' } });
    }

    try {
        const parsed = req.body || {};
        parsed.model = 'gemini-3.6-flash';
        const isStream = parsed.stream === true;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(parsed)
        });

        if (!response.ok) {
            const errText = await response.text();
            let errMsg = 'Error del servicio de IA (' + response.status + ')';
            try { const e = JSON.parse(errText); errMsg = e[0]?.error?.message || e.error?.message || errMsg; } catch {}
            return res.status(response.status).json({ error: { message: errMsg } });
        }

        if (isStream && response.body) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = response.body.getReader();
            const pump = async () => {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { res.end(); break; }
                    res.write(Buffer.from(value));
                }
            };
            await pump();
        } else {
            const data = await response.text();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).send(data);
        }
    } catch (err) {
        if (!res.headersSent) {
            return res.status(502).json({ error: { message: 'Error de conexion: ' + err.message } });
        }
    }
};
