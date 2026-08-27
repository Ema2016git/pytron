const https = require('https');

const HF_TOKEN = process.env.HF_TOKEN || '';

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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
                'Authorization': `Bearer ${HF_TOKEN}`
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
                let errBody = '';
                proxyRes.on('data', c => errBody += c);
                proxyRes.on('end', () => {
                    console.log(`[CHAT] Error ${proxyRes.statusCode}:`, errBody.substring(0, 200));
                    res.status(proxyRes.statusCode).json({ error: { message: 'Error del servicio de IA. Intenta de nuevo.' } });
                    resolve();
                });
                return;
            }

            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Allow-Origin', '*');
            proxyRes.pipe(res);
            proxyRes.on('end', resolve);
        });

        proxyReq.on('error', (err) => {
            res.status(502).json({ error: { message: 'No se pudo conectar con el servicio de IA: ' + err.message } });
            resolve();
        });

        proxyReq.write(proxyBody);
        proxyReq.end();
    });
};
