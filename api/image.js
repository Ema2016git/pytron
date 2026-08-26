const https = require('https');

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
    const rawPrompt = parsed.prompt || 'a cat';

    function tryGenerate(attempt) {
        return new Promise((resolve) => {
            const prompt = encodeURIComponent(rawPrompt);
            const seed = Math.floor(Math.random() * 99999);
            const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=768&height=768&nologo=true&seed=${seed}`;

            function downloadImage(url, redirects) {
                if (redirects > 5) { resolve(null); return; }
                https.get(url, (imgRes) => {
                    if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
                        downloadImage(imgRes.headers.location, redirects + 1);
                        return;
                    }
                    const chunks = [];
                    imgRes.on('data', chunk => chunks.push(chunk));
                    imgRes.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        if (imgRes.statusCode !== 200 || buffer.length < 500) {
                            resolve(null);
                            return;
                        }
                        const contentType = imgRes.headers['content-type'] || 'image/jpeg';
                        resolve({ image: `data:${contentType};base64,${buffer.toString('base64')}` });
                    });
                }).on('error', () => resolve(null));
            }

            downloadImage(imageUrl, 0);
        });
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        const result = await tryGenerate(attempt);
        if (result) {
            return res.status(200).json(result);
        }
    }

    return res.status(500).json({ error: 'No se pudo generar la imagen después de varios intentos. Intenta con otra descripción.' });
};
