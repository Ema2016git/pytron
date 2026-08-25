const https = require('https');

const MODEL_MAP = {
    'Qwen/Qwen2.5-72B-Instruct': 'qwen3.5-plus',
    'Qwen/Qwen2.5-Coder-32B-Instruct': 'qwen3-coder-plus',
    'meta-llama/Llama-3.3-70B-Instruct': 'gemini-3-flash',
    'mistralai/Mistral-Small-24B-Instruct-2501': 'gemini-3-flash',
};

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
    const originalModel = parsed.model || 'Qwen/Qwen2.5-72B-Instruct';
    parsed.model = MODEL_MAP[originalModel] || 'qwen3.5-plus';

    const proxyBody = JSON.stringify(parsed);

    return new Promise((resolve) => {
        const options = {
            hostname: 'gpt.crax.lol',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 Pytron/1.0'
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
                let errBody = '';
                proxyRes.on('data', c => errBody += c);
                proxyRes.on('end', () => {
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
