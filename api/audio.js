const https = require('https');

const SPACES = [
    { host: 'facebook-musicgen.hf.space', endpoint: '/predict_batched', data: null },
    { host: 'sanchit-gandhi-musicgen-streaming.hf.space', endpoint: '/generate_audio', data: null },
    { host: 'Surn-UnlimitedMusicGen.hf.space', endpoint: '/predict_simple', data: null },
];

function getSpaceData(idx, prompt) {
    switch (idx) {
        case 0: return [prompt, null];
        case 1: return [prompt, 8, 1.5, 5];
        case 2: return ['medium', prompt, null, 8, 2, 200, 0.01, 1, 4];
        default: return [prompt];
    }
}

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
    const prompt = parsed.prompt || 'happy acoustic guitar melody';
    const hfToken = (req.headers['authorization'] || '').replace('Bearer ', '');

    return new Promise((resolve) => {
        function trySpace(idx) {
            if (idx >= SPACES.length) {
                res.status(503).json({ error: 'Los servicios de generación de música no están disponibles. Intenta en unos minutos.' });
                resolve();
                return;
            }

            const space = SPACES[idx];
            const submitPayload = JSON.stringify({ data: getSpaceData(idx, prompt) });

            const submitReq = https.request({
                hostname: space.host,
                path: `/gradio_api/call${space.endpoint}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfToken}` }
            }, (submitRes) => {
                let submitBody = '';
                submitRes.on('data', chunk => submitBody += chunk);
                submitRes.on('end', () => {
                    if (submitRes.statusCode !== 200) { trySpace(idx + 1); return; }

                    let eventId;
                    try { eventId = JSON.parse(submitBody).event_id; } catch { trySpace(idx + 1); return; }

                    https.get({
                        hostname: space.host,
                        path: `/gradio_api/call${space.endpoint}/${eventId}`,
                        headers: { 'Authorization': `Bearer ${hfToken}` }
                    }, (resultRes) => {
                        let resultBody = '';
                        resultRes.on('data', chunk => resultBody += chunk);
                        resultRes.on('end', () => {
                            const lines = resultBody.split('\n');
                            let audioPath = null;

                            for (let i = 0; i < lines.length; i++) {
                                if (lines[i].startsWith('event: complete') && i + 1 < lines.length) {
                                    const dataLine = lines[i + 1].replace('data: ', '');
                                    try {
                                        const result = JSON.parse(dataLine);
                                        if (Array.isArray(result)) {
                                            for (const item of result) {
                                                if (item && typeof item === 'object') {
                                                    if (item.url) { audioPath = item.url; break; }
                                                    if (item.path) { audioPath = `https://${space.host}/gradio_api/file=${item.path}`; break; }
                                                }
                                            }
                                        }
                                    } catch {}
                                }
                                if (lines[i].startsWith('event: error')) { trySpace(idx + 1); return; }
                            }

                            if (!audioPath) { trySpace(idx + 1); return; }

                            https.get(audioPath, { headers: { 'Authorization': `Bearer ${hfToken}` } }, (audioRes) => {
                                const audioChunks = [];
                                audioRes.on('data', chunk => audioChunks.push(chunk));
                                audioRes.on('end', () => {
                                    const audioBuffer = Buffer.concat(audioChunks);
                                    if (audioBuffer.length < 1000) { trySpace(idx + 1); return; }
                                    res.status(200).json({ audio: `data:audio/wav;base64,${audioBuffer.toString('base64')}` });
                                    resolve();
                                });
                            }).on('error', () => trySpace(idx + 1));
                        });
                    }).on('error', () => trySpace(idx + 1));
                });
            });

            submitReq.on('error', () => trySpace(idx + 1));
            submitReq.write(submitPayload);
            submitReq.end();
        }

        trySpace(0);
    });
};
