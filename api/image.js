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
    const prompt = encodeURIComponent(parsed.prompt || 'a cat');
    const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;

    return new Promise((resolve) => {
        function downloadImage(url) {
            https.get(url, (imgRes) => {
                if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
                    downloadImage(imgRes.headers.location);
                    return;
                }

                const chunks = [];
                imgRes.on('data', chunk => chunks.push(chunk));
                imgRes.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    if (imgRes.statusCode !== 200 || buffer.length < 1000) {
                        res.status(500).json({ error: 'Error al generar imagen. Intenta de nuevo.' });
                        resolve();
                        return;
                    }
                    const contentType = imgRes.headers['content-type'] || 'image/jpeg';
                    res.status(200).json({ image: `data:${contentType};base64,${buffer.toString('base64')}` });
                    resolve();
                });
            }).on('error', (err) => {
                res.status(502).json({ error: 'No se pudo generar la imagen: ' + err.message });
                resolve();
            });
        }

        downloadImage(imageUrl);
    });
};
