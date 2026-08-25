const https = require('https');

const SPACE_HOST = 'mediasynthesismuseum-modelscope-text-to-video.hf.space';

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
    const prompt = parsed.prompt || 'a cat walking';
    const hfToken = (req.headers['authorization'] || '').replace('Bearer ', '');

    const submitData = JSON.stringify({ data: [prompt, -1, 32, 25] });

    return new Promise((resolve) => {
        const submitReq = https.request({
            hostname: SPACE_HOST,
            path: '/gradio_api/call/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${hfToken}`
            }
        }, (submitRes) => {
            let submitBody = '';
            submitRes.on('data', chunk => submitBody += chunk);
            submitRes.on('end', () => {
                if (submitRes.statusCode !== 200) {
                    res.status(submitRes.statusCode).json({ error: `Error al iniciar video: ${submitBody}` });
                    resolve();
                    return;
                }

                let eventId;
                try { eventId = JSON.parse(submitBody).event_id; } catch {
                    res.status(500).json({ error: 'Respuesta inválida del Space' });
                    resolve();
                    return;
                }

                const pollReq = https.request({
                    hostname: SPACE_HOST,
                    path: `/gradio_api/call/generate/${eventId}`,
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${hfToken}` }
                }, (pollRes) => {
                    let sseBuffer = '';
                    let videoUrl = null;
                    let completed = false;

                    const timeout = setTimeout(() => {
                        if (!completed) {
                            completed = true;
                            pollReq.destroy();
                            res.status(504).json({ error: 'El video tardó demasiado. Intenta con un prompt más simple.' });
                            resolve();
                        }
                    }, 290000);

                    pollRes.on('data', (chunk) => {
                        sseBuffer += chunk.toString();
                        const lines = sseBuffer.split('\n');
                        sseBuffer = lines.pop() || '';

                        let currentEvent = '';
                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                currentEvent = line.slice(7).trim();
                            } else if (line.startsWith('data: ') && currentEvent === 'complete') {
                                const dataStr = line.slice(6).trim();
                                try {
                                    const data = JSON.parse(dataStr);
                                    if (Array.isArray(data) && data[0]) {
                                        const videoInfo = data[0].video || data[0];
                                        if (videoInfo.url) videoUrl = videoInfo.url;
                                        else if (videoInfo.path) videoUrl = `https://${SPACE_HOST}/gradio_api/file=${videoInfo.path}`;
                                    }
                                } catch {}
                            } else if (line.startsWith('data: ') && currentEvent === 'error' && !completed) {
                                completed = true;
                                clearTimeout(timeout);
                                const dataStr = line.slice(6).trim();
                                let userMsg = 'Error al generar video. Intenta de nuevo.';
                                if (dataStr.includes('ZeroGPU quota') || dataStr.includes('exceeded')) {
                                    userMsg = 'Se agotó la cuota gratuita de GPU por hoy. Intenta mañana.';
                                } else if (dataStr.includes('queue') || dataStr.includes('busy')) {
                                    userMsg = 'El servidor está ocupado. Intenta en unos minutos.';
                                }
                                res.status(500).json({ error: userMsg });
                                resolve();
                            }

                            if (currentEvent === 'complete' && videoUrl && !completed) {
                                completed = true;
                                clearTimeout(timeout);

                                https.get(videoUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } }, (videoRes) => {
                                    const videoChunks = [];
                                    videoRes.on('data', chunk => videoChunks.push(chunk));
                                    videoRes.on('end', () => {
                                        const videoBuffer = Buffer.concat(videoChunks);
                                        res.status(200).json({ video: `data:video/mp4;base64,${videoBuffer.toString('base64')}` });
                                        resolve();
                                    });
                                }).on('error', () => {
                                    res.status(200).json({ video: videoUrl });
                                    resolve();
                                });
                            }
                        }
                    });

                    pollRes.on('end', () => {
                        if (!completed) {
                            completed = true;
                            clearTimeout(timeout);
                            if (videoUrl) {
                                https.get(videoUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } }, (videoRes2) => {
                                    const chunks2 = [];
                                    videoRes2.on('data', chunk => chunks2.push(chunk));
                                    videoRes2.on('end', () => {
                                        const buf = Buffer.concat(chunks2);
                                        res.status(200).json({ video: `data:video/mp4;base64,${buf.toString('base64')}` });
                                        resolve();
                                    });
                                }).on('error', () => {
                                    res.status(200).json({ video: videoUrl });
                                    resolve();
                                });
                            } else {
                                res.status(500).json({ error: 'No se pudo obtener el video. Intenta de nuevo.' });
                                resolve();
                            }
                        }
                    });
                });

                pollReq.on('error', (err) => {
                    res.status(502).json({ error: 'Error de conexión: ' + err.message });
                    resolve();
                });
                pollReq.end();
            });
        });

        submitReq.on('error', (err) => {
            res.status(502).json({ error: 'No se pudo conectar con el Space: ' + err.message });
            resolve();
        });
        submitReq.write(submitData);
        submitReq.end();
    });
};
