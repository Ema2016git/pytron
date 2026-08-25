let store = { users: {}, licenses: {}, userData: {}, lastUpdate: 0 };

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method === 'GET') {
        return res.status(200).json(store);
    }

    if (req.method === 'POST') {
        try {
            const data = req.body || {};
            if (data.users) {
                for (const [k, v] of Object.entries(data.users)) {
                    if (!store.users[k] || (v.createdAt && (!store.users[k].createdAt || v.createdAt <= store.users[k].createdAt))) {
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
            store.lastUpdate = Date.now();
            return res.status(200).json({ ok: true, totalUsers: Object.keys(store.users).length });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
