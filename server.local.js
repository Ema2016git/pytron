const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    // Log API requests for debugging
    if (req.url.startsWith('/api/')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    }

    // Proxy API requests to Hugging Face
    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch { parsed = {}; }

            const MODEL_MAP = {
                'Qwen/Qwen2.5-72B-Instruct': 'qwen3.5-plus',
                'Qwen/Qwen2.5-Coder-32B-Instruct': 'qwen3-coder-plus',
                'meta-llama/Llama-3.3-70B-Instruct': 'gemini-3-flash',
                'mistralai/Mistral-Small-24B-Instruct-2501': 'gemini-3-flash',
            };
            const originalModel = parsed.model || 'Qwen/Qwen2.5-72B-Instruct';
            parsed.model = MODEL_MAP[originalModel] || 'qwen3.5-plus';

            console.log(`  [CHAT] ${originalModel} -> ${parsed.model}`);

            const proxyBody = JSON.stringify(parsed);
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
                console.log(`  -> API responded: ${proxyRes.statusCode}`);
                if (proxyRes.statusCode !== 200) {
                    let errBody = '';
                    proxyRes.on('data', c => errBody += c);
                    proxyRes.on('end', () => {
                        console.log(`  -> Error: ${errBody.substring(0, 200)}`);
                        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: { message: 'Error del servicio de IA. Intenta de nuevo.' } }));
                    });
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': proxyRes.headers['content-type'] || 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                });
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (err) => {
                console.error(`  -> API error: ${err.message}`);
                res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: { message: 'No se pudo conectar con el servicio de IA: ' + err.message } }));
            });

            proxyReq.write(proxyBody);
            proxyReq.end();
        });
        return;
    }

    // Image generation proxy (uses Pollinations.ai - free, no API key needed)
    if (req.url === '/api/image' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch { 
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
                return;
            }

            const prompt = encodeURIComponent(parsed.prompt || 'a cat');
            const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;

            console.log(`  [IMAGE] Generating: "${(parsed.prompt || '').substring(0, 50)}..."`);

            https.get(imageUrl, (imgRes) => {
                if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
                    https.get(imgRes.headers.location, (redirectRes) => {
                        const chunks = [];
                        redirectRes.on('data', chunk => chunks.push(chunk));
                        redirectRes.on('end', () => {
                            const buffer = Buffer.concat(chunks);
                            const contentType = redirectRes.headers['content-type'] || 'image/jpeg';
                            console.log(`  [IMAGE] Success! Size: ${buffer.length} bytes`);
                            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                            res.end(JSON.stringify({ image: `data:${contentType};base64,${buffer.toString('base64')}` }));
                        });
                    }).on('error', (err) => {
                        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Error de redirección: ' + err.message }));
                    });
                    return;
                }

                const chunks = [];
                imgRes.on('data', chunk => chunks.push(chunk));
                imgRes.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    if (imgRes.statusCode !== 200 || buffer.length < 1000) {
                        console.log(`  [IMAGE] Error: status ${imgRes.statusCode}, size ${buffer.length}`);
                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Error al generar imagen. Intenta de nuevo.' }));
                        return;
                    }
                    const contentType = imgRes.headers['content-type'] || 'image/jpeg';
                    console.log(`  [IMAGE] Success! Size: ${buffer.length} bytes`);
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ image: `data:${contentType};base64,${buffer.toString('base64')}` }));
                });
            }).on('error', (err) => {
                console.log(`  [IMAGE] Error: ${err.message}`);
                res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'No se pudo generar la imagen: ' + err.message }));
            });
        });
        return;
    }

    // Audio/Music generation proxy (tries multiple Gradio Spaces)
    if (req.url === '/api/audio' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
                return;
            }

            const prompt = parsed.prompt || 'happy acoustic guitar melody';
            const hfToken = (req.headers['authorization'] || '').replace('Bearer ', '');

            console.log(`  [AUDIO] Starting generation: "${prompt.substring(0, 50)}..."`);

            const SPACES = [
                { host: 'facebook-musicgen.hf.space', endpoint: '/predict_batched', data: [prompt, null] },
                { host: 'sanchit-gandhi-musicgen-streaming.hf.space', endpoint: '/generate_audio', data: [prompt, 8, 1.5, 5] },
                { host: 'Surn-UnlimitedMusicGen.hf.space', endpoint: '/predict_simple', data: ['medium', prompt, null, 8, 2, 200, 0.01, 1, 4] },
            ];

            function trySpace(idx) {
                if (idx >= SPACES.length) {
                    console.log('  [AUDIO] All spaces failed');
                    res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Los servicios de generación de música no están disponibles en este momento. Todos los servidores gratuitos de Hugging Face están saturados o en mantenimiento. Intenta de nuevo en unos minutos.' }));
                    return;
                }

                const space = SPACES[idx];
                console.log(`  [AUDIO] Trying space ${idx + 1}/${SPACES.length}: ${space.host}`);

                const submitPayload = JSON.stringify({ data: space.data });
                const submitReq = https.request({
                    hostname: space.host,
                    path: `/gradio_api/call${space.endpoint}`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfToken}` }
                }, (submitRes) => {
                    let submitBody = '';
                    submitRes.on('data', chunk => submitBody += chunk);
                    submitRes.on('end', () => {
                        if (submitRes.statusCode !== 200) {
                            console.log(`  [AUDIO] Space ${idx + 1} submit failed: ${submitRes.statusCode}`);
                            trySpace(idx + 1);
                            return;
                        }

                        let eventId;
                        try { eventId = JSON.parse(submitBody).event_id; } catch {
                            console.log(`  [AUDIO] Space ${idx + 1} bad response`);
                            trySpace(idx + 1);
                            return;
                        }

                        console.log(`  [AUDIO] Space ${idx + 1} event: ${eventId}`);

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
                                    if (lines[i].startsWith('event: error')) {
                                        console.log(`  [AUDIO] Space ${idx + 1} generation error`);
                                        trySpace(idx + 1);
                                        return;
                                    }
                                }

                                if (!audioPath) {
                                    console.log(`  [AUDIO] Space ${idx + 1} no audio in response`);
                                    trySpace(idx + 1);
                                    return;
                                }

                                console.log(`  [AUDIO] Downloading from space ${idx + 1}: ${audioPath.substring(0, 80)}...`);

                                https.get(audioPath, { headers: { 'Authorization': `Bearer ${hfToken}` } }, (audioRes) => {
                                    const audioChunks = [];
                                    audioRes.on('data', chunk => audioChunks.push(chunk));
                                    audioRes.on('end', () => {
                                        const audioBuffer = Buffer.concat(audioChunks);
                                        if (audioBuffer.length < 1000) {
                                            console.log(`  [AUDIO] Space ${idx + 1} audio too small: ${audioBuffer.length}`);
                                            trySpace(idx + 1);
                                            return;
                                        }
                                        console.log(`  [AUDIO] Success! Size: ${audioBuffer.length} bytes`);
                                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                        res.end(JSON.stringify({ audio: `data:audio/wav;base64,${audioBuffer.toString('base64')}` }));
                                    });
                                }).on('error', () => trySpace(idx + 1));
                            });
                        }).on('error', () => trySpace(idx + 1));
                    });
                });

                submitReq.on('error', () => {
                    console.log(`  [AUDIO] Space ${idx + 1} connection error`);
                    trySpace(idx + 1);
                });
                submitReq.write(submitPayload);
                submitReq.end();
            }

            trySpace(0);
        });
        return;
    }

    // Vision / Image analysis proxy (uses Florence-2 on HF Spaces)
    if (req.url === '/api/vision' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
                return;
            }

            const imageBase64 = parsed.image;
            const question = parsed.question || 'Describe this image in detail';
            if (!imageBase64) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'No se proporcionó imagen' }));
                return;
            }

            const spaceHost = 'prithivmlmods-florence-2-image-caption.hf.space';
            console.log(`  [VISION] Analyzing image... Question: "${question.substring(0, 50)}"`);

            const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
            const rawBase64 = mimeMatch ? imageBase64.replace(/^data:image\/\w+;base64,/, '') : imageBase64;
            const imgBuffer = Buffer.from(rawBase64, 'base64');

            const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
            const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="upload.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
            const footerPart = `\r\n--${boundary}--\r\n`;
            const uploadBody = Buffer.concat([Buffer.from(headerPart), imgBuffer, Buffer.from(footerPart)]);

            const uploadReq = https.request({
                hostname: spaceHost,
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
                        console.log(`  [VISION] Upload failed: ${uploadRes.statusCode}`);
                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Error al subir imagen para análisis' }));
                        return;
                    }

                    let filePath;
                    try { filePath = JSON.parse(uploadData)[0]; } catch {
                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Respuesta inválida del servidor de visión' }));
                        return;
                    }

                    console.log(`  [VISION] File uploaded: ${filePath}`);

                    const callBody = JSON.stringify({
                        data: [
                            { path: filePath, meta: { _type: 'gradio.FileData' } },
                            'Florence-2-large'
                        ]
                    });

                    const callReq = https.request({
                        hostname: spaceHost,
                        path: '/gradio_api/call/describe_image',
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(callBody) }
                    }, (callRes) => {
                        let callData = '';
                        callRes.on('data', c => callData += c);
                        callRes.on('end', () => {
                            if (callRes.statusCode !== 200) {
                                console.log(`  [VISION] Call failed: ${callRes.statusCode}`);
                                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                res.end(JSON.stringify({ error: 'Error al analizar la imagen' }));
                                return;
                            }

                            let eventId;
                            try { eventId = JSON.parse(callData).event_id; } catch {
                                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                res.end(JSON.stringify({ error: 'Respuesta inválida' }));
                                return;
                            }

                            console.log(`  [VISION] Event ID: ${eventId}, waiting...`);

                            const pollReq = https.request({
                                hostname: spaceHost,
                                path: `/gradio_api/call/describe_image/${eventId}`,
                                method: 'GET'
                            }, (pollRes) => {
                                let sseBuffer = '';
                                let completed = false;

                                const timeout = setTimeout(() => {
                                    if (!completed) {
                                        completed = true;
                                        pollReq.destroy();
                                        res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                        res.end(JSON.stringify({ error: 'El análisis tardó demasiado.' }));
                                    }
                                }, 60000);

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
                                                console.log(`  [VISION] Success: "${String(description).substring(0, 80)}..."`);
                                                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                                res.end(JSON.stringify({ description: String(description) }));
                                            } catch {
                                                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                                res.end(JSON.stringify({ description: dataStr }));
                                            }
                                        } else if (line.startsWith('data: ') && currentEvent === 'error' && !completed) {
                                            completed = true;
                                            clearTimeout(timeout);
                                            let errMsg = 'Error al analizar imagen.';
                                            const dataStr = line.slice(6).trim();
                                            if (dataStr.includes('ZeroGPU') || dataStr.includes('exceeded')) {
                                                errMsg = 'Se agotó la cuota gratuita de GPU. Intenta mañana.';
                                            }
                                            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                            res.end(JSON.stringify({ error: errMsg }));
                                        }
                                    }
                                });

                                pollRes.on('end', () => {
                                    if (!completed) {
                                        completed = true;
                                        clearTimeout(timeout);
                                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                        res.end(JSON.stringify({ error: 'No se pudo obtener la descripción.' }));
                                    }
                                });
                            });

                            pollReq.on('error', (err) => {
                                res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                res.end(JSON.stringify({ error: 'Error de conexión: ' + err.message }));
                            });
                            pollReq.end();
                        });
                    });

                    callReq.on('error', (err) => {
                        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Error de conexión: ' + err.message }));
                    });
                    callReq.write(callBody);
                    callReq.end();
                });
            });

            uploadReq.on('error', (err) => {
                res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'No se pudo conectar: ' + err.message }));
            });
            uploadReq.write(uploadBody);
            uploadReq.end();
        });
        return;
    }

    // Video generation proxy (uses HF Spaces Gradio API - free ZeroGPU)
    if (req.url === '/api/video' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'JSON inválido' }));
                return;
            }

            const prompt = parsed.prompt || 'a cat walking';
            const hfToken = (req.headers['authorization'] || '').replace('Bearer ', '');
            const spaceHost = 'mediasynthesismuseum-modelscope-text-to-video.hf.space';

            console.log(`  [VIDEO] Starting generation: "${prompt.substring(0, 50)}..."`);

            const submitData = JSON.stringify({
                data: [prompt, -1, 32, 25]
            });

            const submitOptions = {
                hostname: spaceHost,
                path: '/gradio_api/call/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${hfToken}`
                }
            };

            const submitReq = https.request(submitOptions, (submitRes) => {
                let submitBody = '';
                submitRes.on('data', chunk => submitBody += chunk);
                submitRes.on('end', () => {
                    if (submitRes.statusCode !== 200) {
                        console.log(`  [VIDEO] Submit failed: ${submitRes.statusCode} - ${submitBody}`);
                        res.writeHead(submitRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: `Error al iniciar video: ${submitBody}` }));
                        return;
                    }

                    let eventId;
                    try { eventId = JSON.parse(submitBody).event_id; } catch {
                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Respuesta inválida del Space' }));
                        return;
                    }

                    console.log(`  [VIDEO] Event ID: ${eventId}, polling for result...`);

                    const pollOptions = {
                        hostname: spaceHost,
                        path: `/gradio_api/call/generate/${eventId}`,
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${hfToken}` }
                    };

                    const pollReq = https.request(pollOptions, (pollRes) => {
                        let sseBuffer = '';
                        let videoUrl = null;
                        let completed = false;

                        const timeout = setTimeout(() => {
                            if (!completed) {
                                completed = true;
                                pollReq.destroy();
                                console.log('  [VIDEO] Timeout after 5 minutes');
                                res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                res.end(JSON.stringify({ error: 'El video tardó demasiado. Intenta con un prompt más simple.' }));
                            }
                        }, 300000);

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
                                            if (videoInfo.url) {
                                                videoUrl = videoInfo.url;
                                            } else if (videoInfo.path) {
                                                videoUrl = `https://${spaceHost}/gradio_api/file=${videoInfo.path}`;
                                            }
                                        }
                                    } catch (e) {
                                        console.log('  [VIDEO] Parse error:', e.message, 'data:', dataStr.substring(0, 200));
                                    }
                                } else if (line.startsWith('data: ') && currentEvent === 'error') {
                                    const dataStr = line.slice(6).trim();
                                    if (!completed) {
                                        completed = true;
                                        clearTimeout(timeout);
                                        console.log('  [VIDEO] Space error:', dataStr.substring(0, 200));
                                        let userMsg = 'Error al generar video. Intenta de nuevo.';
                                        if (dataStr.includes('ZeroGPU quota') || dataStr.includes('exceeded')) {
                                            userMsg = 'Se agotó la cuota gratuita de GPU por hoy. Los videos tienen un límite de 5 minutos de GPU al día. Intenta mañana.';
                                        } else if (dataStr.includes('queue') || dataStr.includes('busy')) {
                                            userMsg = 'El servidor está ocupado. Intenta en unos minutos.';
                                        }
                                        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                        res.end(JSON.stringify({ error: userMsg }));
                                    }
                                }

                                if (currentEvent === 'complete' && videoUrl && !completed) {
                                    completed = true;
                                    clearTimeout(timeout);
                                    console.log(`  [VIDEO] Got URL, downloading video...`);

                                    const videoReq = https.get(videoUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } }, (videoRes) => {
                                        const videoChunks = [];
                                        videoRes.on('data', chunk => videoChunks.push(chunk));
                                        videoRes.on('end', () => {
                                            const videoBuffer = Buffer.concat(videoChunks);
                                            const base64Video = videoBuffer.toString('base64');
                                            console.log(`  [VIDEO] Success! Size: ${videoBuffer.length} bytes`);
                                            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                            res.end(JSON.stringify({ video: `data:video/mp4;base64,${base64Video}` }));
                                        });
                                    });
                                    videoReq.on('error', (err) => {
                                        console.log(`  [VIDEO] Download error: ${err.message}`);
                                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                        res.end(JSON.stringify({ video: videoUrl }));
                                    });
                                }
                            }
                        });

                        pollRes.on('end', () => {
                            if (!completed) {
                                completed = true;
                                clearTimeout(timeout);
                                if (videoUrl) {
                                    const videoReq2 = https.get(videoUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } }, (videoRes2) => {
                                        const chunks2 = [];
                                        videoRes2.on('data', chunk => chunks2.push(chunk));
                                        videoRes2.on('end', () => {
                                            const buf = Buffer.concat(chunks2);
                                            console.log(`  [VIDEO] Success (fallback)! Size: ${buf.length} bytes`);
                                            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                            res.end(JSON.stringify({ video: `data:video/mp4;base64,${buf.toString('base64')}` }));
                                        });
                                    });
                                    videoReq2.on('error', () => {
                                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                        res.end(JSON.stringify({ video: videoUrl }));
                                    });
                                } else {
                                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                    res.end(JSON.stringify({ error: 'No se pudo obtener el video. Intenta de nuevo.' }));
                                }
                            }
                        });
                    });

                    pollReq.on('error', (err) => {
                        console.log('  [VIDEO] Poll error:', err.message);
                        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Error de conexión: ' + err.message }));
                    });

                    pollReq.end();
                });
            });

            submitReq.on('error', (err) => {
                console.log('  [VIDEO] Submit error:', err.message);
                res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'No se pudo conectar con el Space: ' + err.message }));
            });

            submitReq.write(submitData);
            submitReq.end();
        });
        return;
    }

    // Backup/restore user data (persists across browser clears)
    if (req.url === '/api/backup' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const backupFile = path.join(__dirname, 'pytron_data.json');
                let existing = {};
                try { existing = JSON.parse(fs.readFileSync(backupFile, 'utf8')); } catch {}
                if (data.users) existing.users = data.users;
                if (data.licenses) existing.licenses = data.licenses;
                if (data.username && data.userData) {
                    if (!existing.userData) existing.userData = {};
                    existing.userData[data.username] = data.userData;
                }
                existing.lastBackup = new Date().toISOString();
                fs.writeFileSync(backupFile, JSON.stringify(existing, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    if (req.url === '/api/backup' && req.method === 'GET') {
        const backupFile = path.join(__dirname, 'pytron_data.json');
        try {
            const data = fs.readFileSync(backupFile, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(data);
        } catch {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end('{}');
        }
        return;
    }

    // Serve static files
    let urlPath = req.url.split('?')[0];
    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Archivo no encontrado</h1>');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║          PYTRON está listo            ║`);
    console.log(`  ║                                       ║`);
    console.log(`  ║   Abre: http://localhost:${PORT}          ║`);
    console.log(`  ║                                       ║`);
    console.log(`  ║   Ctrl+C para detener                 ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
});
