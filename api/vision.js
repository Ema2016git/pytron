const https = require('https');

const SPACE_HOST = 'prithivmlmods-florence-2-image-caption.hf.space';

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
    const imageBase64 = parsed.image;
    if (!imageBase64) {
        return res.status(400).json({ error: 'No se proporcionó imagen' });
    }

    return new Promise((resolve) => {
        const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
        const rawBase64 = mimeMatch ? imageBase64.replace(/^data:image\/\w+;base64,/, '') : imageBase64;
        const imgBuffer = Buffer.from(rawBase64, 'base64');

        const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
        const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="upload.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
        const footerPart = `\r\n--${boundary}--\r\n`;
        const uploadBody = Buffer.concat([Buffer.from(headerPart), imgBuffer, Buffer.from(footerPart)]);

        const uploadReq = https.request({
            hostname: SPACE_HOST,
            path: '/gradio_api/upload',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': uploadBody.length
            }
        }, (uploadRes) => {
            let uploadData = '';
            uploadRes.on('data', c => uploadData += c);
            uploadRes.on('end', () => {
                if (uploadRes.statusCode !== 200) {
                    res.status(500).json({ error: 'Error al subir imagen para análisis' });
                    resolve();
                    return;
                }

                let filePath;
                try { filePath = JSON.parse(uploadData)[0]; } catch {
                    res.status(500).json({ error: 'Respuesta inválida del servidor de visión' });
                    resolve();
                    return;
                }

                const callBody = JSON.stringify({
                    data: [
                        { path: filePath, meta: { _type: 'gradio.FileData' } },
                        'Florence-2-large'
                    ]
                });

                const callReq = https.request({
                    hostname: SPACE_HOST,
                    path: '/gradio_api/call/describe_image',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(callBody) }
                }, (callRes) => {
                    let callData = '';
                    callRes.on('data', c => callData += c);
                    callRes.on('end', () => {
                        if (callRes.statusCode !== 200) {
                            res.status(500).json({ error: 'Error al analizar la imagen' });
                            resolve();
                            return;
                        }

                        let eventId;
                        try { eventId = JSON.parse(callData).event_id; } catch {
                            res.status(500).json({ error: 'Respuesta inválida' });
                            resolve();
                            return;
                        }

                        const pollReq = https.request({
                            hostname: SPACE_HOST,
                            path: `/gradio_api/call/describe_image/${eventId}`,
                            method: 'GET'
                        }, (pollRes) => {
                            let sseBuffer = '';
                            let completed = false;

                            const timeout = setTimeout(() => {
                                if (!completed) {
                                    completed = true;
                                    pollReq.destroy();
                                    res.status(504).json({ error: 'El análisis tardó demasiado.' });
                                    resolve();
                                }
                            }, 55000);

                            pollRes.on('data', (chunk) => {
                                sseBuffer += chunk.toString();
                                const lines = sseBuffer.split('\n');
                                sseBuffer = lines.pop() || '';

                                let currentEvent = '';
                                for (const line of lines) {
                                    if (line.startsWith('event: ')) {
                                        currentEvent = line.slice(7).trim();
                                    } else if (line.startsWith('data: ') && currentEvent === 'complete' && !completed) {
                                        completed = true;
                                        clearTimeout(timeout);
                                        const dataStr = line.slice(6).trim();
                                        try {
                                            const data = JSON.parse(dataStr);
                                            const description = Array.isArray(data) ? data[0] : data;
                                            res.status(200).json({ description: String(description) });
                                        } catch {
                                            res.status(200).json({ description: dataStr });
                                        }
                                        resolve();
                                    } else if (line.startsWith('data: ') && currentEvent === 'error' && !completed) {
                                        completed = true;
                                        clearTimeout(timeout);
                                        const dataStr = line.slice(6).trim();
                                        let errMsg = 'Error al analizar imagen.';
                                        if (dataStr.includes('ZeroGPU') || dataStr.includes('exceeded')) {
                                            errMsg = 'Se agotó la cuota gratuita de GPU. Intenta mañana.';
                                        }
                                        res.status(500).json({ error: errMsg });
                                        resolve();
                                    }
                                }
                            });

                            pollRes.on('end', () => {
                                if (!completed) {
                                    completed = true;
                                    clearTimeout(timeout);
                                    res.status(500).json({ error: 'No se pudo obtener la descripción.' });
                                    resolve();
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

                callReq.on('error', (err) => {
                    res.status(502).json({ error: 'Error de conexión: ' + err.message });
                    resolve();
                });
                callReq.write(callBody);
                callReq.end();
            });
        });

        uploadReq.on('error', (err) => {
            res.status(502).json({ error: 'No se pudo conectar: ' + err.message });
            resolve();
        });
        uploadReq.write(uploadBody);
        uploadReq.end();
    });
};
