const https = require('https');

function kvRequest(method, path, body) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return Promise.resolve(null);

    const parsed = new URL(url + path);
    return new Promise((resolve) => {
        const opts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        const req = https.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        if (body) req.write(body);
        req.end();
    });
}

async function getStore() {
    const resp = await kvRequest('GET', '/get/pytron_data');
    if (resp && resp.result) {
        try { return JSON.parse(resp.result); } catch { return { users: {}, licenses: {}, userData: {} }; }
    }
    return { users: {}, licenses: {}, userData: {} };
}

async function saveStore(store) {
    const body = JSON.stringify(['SET', 'pytron_data', JSON.stringify(store)]);
    await kvRequest('POST', '/', body);
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (!process.env.KV_REST_API_URL) {
        return res.status(200).json({ users: {}, licenses: {}, userData: {} });
    }

    if (req.method === 'GET') {
        const store = await getStore();
        return res.status(200).json(store);
    }

    if (req.method === 'POST') {
        try {
            const data = req.body || {};
            const store = await getStore();

            if (data.users) {
                for (const [k, v] of Object.entries(data.users)) {
                    if (!store.users[k]) {
                        store.users[k] = v;
                    }
                }
            }
            if (data.licenses) {
                for (const [k, v] of Object.entries(data.licenses)) {
                    if (!store.licenses[k] || (v.grantedAt && v.grantedAt >= (store.licenses[k].grantedAt || 0))) {
                        store.licenses[k] = v;
                    }
                }
            }
            if (data.username && data.userData) {
                store.userData[data.username] = data.userData;
            }

            await saveStore(store);
            return res.status(200).json({ ok: true, totalUsers: Object.keys(store.users).length });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
