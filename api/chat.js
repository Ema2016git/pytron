const https = require('https');

const HF_TOKEN = process.env.HF_TOKEN || '';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!HF_TOKEN) {
        return res.status(500).json({ error: { message: 'HF_TOKEN no configurado en el servidor.' } });
    }

    const parsed = req.body || {};
    if (!parsed.model) parsed.model = 'Qwen/Qwen2.5-72B-Instruct';

    const proxyBody = JSON.stringify(parsed);

    return new Promise((resolve) => {
        const options = {
            hostname: 'router.huggingface.co',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Length': Buffer.byteLength(proxyBody)
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            const chunks = [];
            proxyRes.on('data', chunk => chunks.push(chunk));
            proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString();
                const ct = proxyRes.headers['content-type'] || 'application/json';

                if (proxyRes.statusCode !== 200) {
                    res.status(proxyRes.statusCode);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: { message: 'Error del servicio de IA. Intenta de nuevo.' } }));
                    resolve();
                    return;
                }

                res.setHeader('Content-Type', ct);
                res.setHeader('Cache-Control', 'no-cache');
                res.status(200).end(body);
                resolve();
            });
        });

        proxyReq.on('error', (err) => {
            res.status(502).json({ error: { message: 'No se pudo conectar: ' + err.message } });
            resolve();
        });

        proxyReq.write(proxyBody);
        proxyReq.end();
    });
};
