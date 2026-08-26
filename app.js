/* ============================================
   Pytron — Main Application
   ============================================ */

const HF_API_KEY = window.__HF_KEY || '';
const HF_API_URL = '/api/chat';

const PLANS = {
    free:    { id: 'free',    name: 'Free',    icon: '⚡', color: '#888',    price: '$0',    badge: '',          maxChats: 20,  maxAIs: 2,  docs: false, images: 5,  audio: false, video: false, vision: false, priority: false, fastModel: false },
    pro:     { id: 'pro',     name: 'Pro',     icon: '🚀', color: '#6C63FF', price: '$9.99', badge: 'PRO',       maxChats: 100, maxAIs: 10, docs: true,  images: 50, audio: true,  video: false, vision: false, priority: false, fastModel: false },
    plus:    { id: 'plus',    name: 'Plus',    icon: '💎', color: '#F59E0B', price: '$19.99',badge: 'PLUS',      maxChats: 500, maxAIs: 25, docs: true,  images: 100,audio: true,  video: false, vision: true,  priority: false, fastModel: false },
    platino: { id: 'platino', name: 'Platino', icon: '👑', color: '#A855F7', price: '$49.99',badge: 'PLATINO',   maxChats: -1,  maxAIs: -1, docs: true,  images: -1, audio: true,  video: true,  vision: true,  priority: true,  fastModel: true  },
    admin:   { id: 'admin',   name: 'Admin',   icon: '🛡️', color: '#EF4444', price: '--',    badge: 'ADMIN',     maxChats: -1,  maxAIs: -1, docs: true,  images: -1, audio: true,  video: true,  vision: true,  priority: true,  fastModel: true  }
};

const ADMIN_CODE = '3cu';

const APP = {
    currentUser: null,
    currentChatId: null,
    chats: {},
    customAIs: {},
    activeCustomAI: null,
    editingAIId: null,
    settings: { systemPrompt: '', temperature: 0.7 },
    memory: '',
    currentModel: { provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
    isGenerating: false,
    activeFolder: null,
    abortController: null,
    driveToken: null,
    userPlan: 'free'
};

const AI_TEMPLATES = {
    coder: {
        emoji: '💻', color: '#6C63FF', name: 'CodeMaster',
        description: 'Experto en programación',
        systemPrompt: 'Eres CodeMaster, un programador experto con dominio de múltiples lenguajes (Python, JavaScript, TypeScript, C++, Java, Go, Rust, etc.). Escribes código limpio, eficiente y bien documentado. Siempre explicas tu razonamiento, mencionas buenas prácticas y ofreces alternativas cuando es relevante. Respondes en el idioma del usuario.',
        welcomeMsg: '¡Hola! Soy CodeMaster, tu asistente de programación. ¿En qué proyecto puedo ayudarte?'
    },
    writer: {
        emoji: '✍️', color: '#fd79a8', name: 'PlumaPro',
        description: 'Escritor y redactor creativo',
        systemPrompt: 'Eres PlumaPro, un escritor profesional y creativo. Dominas todos los estilos literarios, redacción publicitaria, copywriting, guiones, poesía y narrativa. Tienes un excelente manejo del lenguaje y adaptas tu tono según lo que el usuario necesite.',
        welcomeMsg: '¡Hola! Soy PlumaPro. ¿Necesitas ayuda escribiendo algo?'
    },
    tutor: {
        emoji: '👨‍🏫', color: '#00D2FF', name: 'ProfeMax',
        description: 'Tutor educativo personalizado',
        systemPrompt: 'Eres ProfeMax, un tutor educativo paciente y dedicado. Explicas conceptos complejos de forma sencilla usando analogías y ejemplos del mundo real. Cubres matemáticas, ciencias, historia, filosofía y más. Ajustas tu nivel de explicación según el usuario.',
        welcomeMsg: '¡Hola! Soy ProfeMax, tu tutor personal. ¿Qué tema te gustaría aprender?'
    },
    chef: {
        emoji: '👨‍🍳', color: '#ff6348', name: 'Chef Mario',
        description: 'Chef profesional con recetas',
        systemPrompt: 'Eres Chef Mario, un chef profesional con 20 años de experiencia en cocina internacional. Proporcionas recetas detalladas con ingredientes exactos, tiempos de preparación, técnicas de cocción y consejos profesionales.',
        welcomeMsg: '¡Buongiorno! Soy el Chef Mario. ¿Qué delicia quieres cocinar hoy?'
    },
    fitness: {
        emoji: '🏋️', color: '#2ed573', name: 'FitCoach',
        description: 'Entrenador personal y nutrición',
        systemPrompt: 'Eres FitCoach, un entrenador personal certificado y nutricionista deportivo. Creas rutinas de ejercicios personalizadas, planes de alimentación y consejos de bienestar. Motivas al usuario de forma positiva.',
        welcomeMsg: '¡Hey! Soy FitCoach. ¿Listo para ponerte en forma?'
    },
    analyst: {
        emoji: '📊', color: '#ffa502', name: 'DataPro',
        description: 'Analista de datos y negocios',
        systemPrompt: 'Eres DataPro, un analista de datos y consultor de negocios experto. Analizas datos, creas estrategias, interpretas métricas y proporcionas insights accionables. Dominas Excel, SQL, Python para datos, Power BI y Tableau.',
        welcomeMsg: '¡Hola! Soy DataPro. ¿Qué datos necesitas analizar?'
    },
    translator: {
        emoji: '🌍', color: '#a29bfe', name: 'LinguaPro',
        description: 'Traductor y profesor de idiomas',
        systemPrompt: 'Eres LinguaPro, un políglota experto que domina inglés, español, francés, alemán, italiano, portugués, japonés, chino mandarín y coreano. Traduces con precisión manteniendo matices culturales. También enseñas idiomas.',
        welcomeMsg: '¡Hello! ¡Hola! Bonjour! Soy LinguaPro. ¿Qué necesitas traducir?'
    },
    creative: {
        emoji: '🎨', color: '#FF6B6B', name: 'CreativeAI',
        description: 'Generador de ideas creativas',
        systemPrompt: 'Eres CreativeAI, un director creativo brillante. Ayudas con brainstorming, diseño conceptual, campañas publicitarias, nombres de marcas, stories para redes sociales y contenido viral. Piensas fuera de la caja.',
        welcomeMsg: '¡Hey! Soy CreativeAI. ¿Sobre qué necesitas inspiración?'
    }
};

/* ============================================
   Initialization
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.protocol === 'file:') {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:white;font-family:Inter,sans-serif;text-align:center;padding:20px"><div><h1 style="color:#6C63FF">Pytron</h1><p style="font-size:18px;margin:20px 0">Abre la app desde el servidor:</p><code style="background:#1a1a2e;padding:12px 24px;border-radius:8px;font-size:16px;color:#00D2FF">http://localhost:3000</code><p style="margin-top:20px;color:#888">Ejecuta <code style="color:#00D2FF">node server.js</code> en la terminal primero.</p></div></div>';
        return;
    }

    try { setupAuthListeners(); } catch(e) { console.error('Error setupAuth:', e); }
    try { setupMarkdown(); } catch(e) { console.error('Error setupMarkdown:', e); }

    initApp();
});

async function initApp() {
    const localUsers = getUsers();
    if (Object.keys(localUsers).length === 0) {
        const restored = await restoreFromServer();
        if (restored) console.log('[PYTRON] Cuentas recuperadas del servidor');
    }

    const session = localStorage.getItem('pytron_session');
    if (session) {
        try {
            const user = JSON.parse(session);
            const users = getUsers();
            if (users[user.username]) {
                loginUser(user.username);
            } else {
                localStorage.removeItem('pytron_session');
            }
        } catch(e) { console.error('Error restoring session:', e); }
    }
}

function setupMarkdown() {
    marked.setOptions({ breaks: true, gfm: true });
    const renderer = new marked.Renderer();
    renderer.code = function(token) {
        const code = token.text || token;
        let lang = token.lang || '';
        let highlighted;
        if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(code, { language: lang }).value;
        } else {
            const auto = hljs.highlightAuto(code, ['python', 'javascript', 'java', 'cpp', 'html', 'css', 'sql', 'bash']);
            highlighted = auto.value;
            if (!lang && auto.language) lang = auto.language;
        }
        const langLabel = lang || 'code';
        const canRun = ['javascript', 'js', 'python', 'py'].includes(lang.toLowerCase());
        const runBtn = canRun ? `<button class="run-code-btn" onclick="runCode(this,'${lang.toLowerCase()}')" title="Ejecutar">▶ Run</button>` : '';
        return `<pre><div class="code-header"><span>${langLabel}</span><div style="display:flex;gap:2px">${runBtn}<button class="copy-code-btn" onclick="copyCode(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar</button></div></div><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    };
    marked.use({ renderer });
}

/* ============================================
   Auth System
   ============================================ */

function setupAuthListeners() {
    document.getElementById('showRegister').addEventListener('click', () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    });
    document.getElementById('showLogin').addEventListener('click', () => {
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    });

    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);

    document.getElementById('loginPassword').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('regPassword2').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

function getUsers() {
    try { return JSON.parse(localStorage.getItem('pytron_users') || '{}'); }
    catch { return {}; }
}

function saveUsers(users) {
    localStorage.setItem('pytron_users', JSON.stringify(users));
    backupToServer();
}

function backupToServer() {
    try {
        const data = { users: getUsers(), licenses: JSON.parse(localStorage.getItem('pytron_licenses') || '{}') };
        if (APP.currentUser) {
            data.username = APP.currentUser.username;
            data.userData = {
                chats: APP.chats,
                customAIs: APP.customAIs,
                settings: APP.settings,
                memory: APP.memory
            };
        }
        fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
            .then(r => r.json())
            .then(resp => {
                if (resp.totalUsers) {
                    fetch('/api/backup').then(r => r.json()).then(serverData => {
                        if (serverData.users) syncFromServer(serverData);
                    }).catch(() => {});
                }
            })
            .catch(() => {});
    } catch {}
}

function syncFromServer(serverData) {
    if (!serverData.users) return;
    const localUsers = getUsers();
    let changed = false;
    for (const [username, userData] of Object.entries(serverData.users)) {
        if (!localUsers[username]) {
            localUsers[username] = userData;
            changed = true;
        }
    }
    if (changed) {
        localStorage.setItem('pytron_users', JSON.stringify(localUsers));
    }
    if (serverData.licenses) {
        const localLic = JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
        let licChanged = false;
        for (const [u, lic] of Object.entries(serverData.licenses)) {
            if (!localLic[u] || (lic.grantedAt && lic.grantedAt > (localLic[u].grantedAt || 0))) {
                localLic[u] = lic;
                licChanged = true;
            }
        }
        if (licChanged) localStorage.setItem('pytron_licenses', JSON.stringify(localLic));
    }
}

async function restoreFromServer() {
    try {
        const localUsers = getUsers();
        if (Object.keys(localUsers).length > 0) {
            await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: localUsers, licenses: JSON.parse(localStorage.getItem('pytron_licenses') || '{}') })
            });
        }
        const res = await fetch('/api/backup');
        const data = await res.json();
        if (!data || !data.users) return false;
        syncFromServer(data);
        return Object.keys(data.users).length > 0;
    } catch { return false; }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
        errorEl.textContent = 'Completa todos los campos.';
        errorEl.classList.remove('hidden');
        return;
    }

    let users = getUsers();

    if (!users[username]) {
        try {
            const res = await fetch('/api/backup');
            const backup = await res.json();
            if (backup.users && backup.users[username]) {
                users[username] = backup.users[username];
                localStorage.setItem('pytron_users', JSON.stringify(users));
                if (backup.licenses) {
                    const localLic = JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
                    if (backup.licenses[username]) localLic[username] = backup.licenses[username];
                    localStorage.setItem('pytron_licenses', JSON.stringify(localLic));
                }
            }
        } catch {}
    }

    if (!users[username]) {
        errorEl.textContent = 'El usuario no existe. ¿Quieres crear una cuenta?';
        errorEl.classList.remove('hidden');
        return;
    }

    if (users[username].password !== btoa(password)) {
        errorEl.textContent = 'Contraseña incorrecta.';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    loginUser(username);
}

function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    const errorEl = document.getElementById('regError');

    if (!name || !username || !password) {
        errorEl.textContent = 'Completa todos los campos.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (username.length < 3) {
        errorEl.textContent = 'El usuario debe tener al menos 3 caracteres.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (password.length < 4) {
        errorEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (password !== password2) {
        errorEl.textContent = 'Las contraseñas no coinciden.';
        errorEl.classList.remove('hidden');
        return;
    }

    const users = getUsers();
    if (users[username]) {
        errorEl.textContent = 'Ese nombre de usuario ya existe. Elige otro.';
        errorEl.classList.remove('hidden');
        return;
    }

    users[username] = {
        name,
        username,
        password: btoa(password),
        createdAt: Date.now()
    };
    saveUsers(users);

    errorEl.classList.add('hidden');
    loginUser(username);
}

function loginUser(username) {
    const users = getUsers();
    const user = users[username];
    if (!user) return;

    APP.currentUser = user;
    localStorage.setItem('pytron_session', JSON.stringify({ username }));

    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();

    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) welcomeTitle.textContent = `¡Hola ${user.name}! ¿En qué te ayudo?`;

    loadUserData();
    setupAppListeners();
    try { setupVisionInput(); } catch(e) { console.error('Error setupVision:', e); }
    try { setupDragDrop(); } catch(e) { console.error('Error setupDragDrop:', e); }
    renderFolders();
    renderChatHistory();
    renderCustomAIs();
    updateActiveAIBadge();

    APP.isGenerating = false;
    APP.abortController = null;
    const msgInput = document.getElementById('messageInput');
    msgInput.disabled = false;
    document.getElementById('sendBtn').classList.remove('hidden');
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('stopBtn').classList.add('hidden');

    if (APP.currentChatId && APP.chats[APP.currentChatId]) {
        loadChat(APP.currentChatId);
    }

    msgInput.focus();
}

function logoutUser() {
    APP.currentUser = null;
    APP.currentChatId = null;
    APP.chats = {};
    APP.customAIs = {};
    APP.activeCustomAI = null;

    localStorage.removeItem('pytron_session');

    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');

    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

/* ============================================
   Plans & Licensing
   ============================================ */

function getUserPlan(username) {
    const licenses = JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
    const license = licenses[username];
    if (!license) return 'free';
    if (license.expiresAt && license.expiresAt < Date.now()) return 'free';
    return license.plan || 'free';
}

function setUserLicense(username, plan, days) {
    const licenses = JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
    licenses[username] = {
        plan,
        grantedAt: Date.now(),
        expiresAt: days > 0 ? Date.now() + days * 86400000 : 0,
        grantedBy: APP.currentUser?.username || 'system'
    };
    localStorage.setItem('pytron_licenses', JSON.stringify(licenses));
    backupToServer();
}

function revokeUserLicense(username) {
    const licenses = JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
    delete licenses[username];
    localStorage.setItem('pytron_licenses', JSON.stringify(licenses));
    backupToServer();
}

function getAllLicenses() {
    return JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
}

function getCurrentPlan() {
    return PLANS[APP.userPlan] || PLANS.free;
}

function updatePlanBadge() {
    const plan = getCurrentPlan();
    const badge = document.getElementById('planBadge');
    if (!badge) return;
    if (plan.id === 'admin') {
        badge.innerHTML = `<span class="plan-badge plan-admin" onclick="openAdminPanel()" style="background:${plan.color}">🛡️ ADMIN</span>`;
    } else if (plan.id === 'free') {
        badge.innerHTML = `<span class="plan-badge plan-free" onclick="openPlansModal()">FREE</span>`;
    } else {
        badge.innerHTML = `<span class="plan-badge plan-${plan.id}" onclick="openPlansModal()" style="background:${plan.color}">${plan.icon} ${plan.badge}</span>`;
    }
}

function canUseFeature(feature) {
    if (isAdmin()) return true;
    const plan = getCurrentPlan();
    if (feature === 'docs') return plan.docs;
    if (feature === 'audio') return plan.audio;
    if (feature === 'video') return plan.video;
    if (feature === 'vision') return plan.vision;
    if (feature === 'images') return plan.images !== 0;
    return true;
}

function openPlansModal() {
    const modal = document.getElementById('plansModal');
    if (!modal) return;
    const currentPlan = getCurrentPlan();

    let html = '<div class="plans-grid">';
    for (const [id, plan] of Object.entries(PLANS)) {
        if (id === 'admin') continue;
        const isCurrent = id === currentPlan.id;
        const features = [
            plan.maxChats === -1 ? '∞ Chats' : `${plan.maxChats} Chats`,
            plan.maxAIs === -1 ? '∞ IAs personalizadas' : `${plan.maxAIs} IAs`,
            plan.docs ? '✅ Documentos' : '❌ Documentos',
            plan.images === -1 ? '∞ Imágenes' : plan.images > 0 ? `${plan.images} Imágenes/día` : '❌ Imágenes',
            plan.audio ? '✅ Música' : '❌ Música',
            plan.video ? '✅ Video' : '❌ Video',
            plan.vision ? '✅ Análisis de imágenes' : '❌ Análisis de imágenes',
            plan.fastModel ? '✅ Modelos rápidos' : '',
            plan.priority ? '✅ Respuesta prioritaria' : '',
        ].filter(Boolean);

        html += `<div class="plan-card ${isCurrent ? 'plan-current' : ''}" style="border-color:${plan.color}40">
            <div class="plan-card-header" style="background:${plan.color}15">
                <span class="plan-card-icon">${plan.icon}</span>
                <h3>${plan.name}</h3>
                <div class="plan-card-price">${plan.price}<span>/mes</span></div>
            </div>
            <ul class="plan-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>
            <div class="plan-card-footer">
                ${isCurrent ? '<button class="plan-btn plan-btn-current" disabled>Plan actual</button>' :
                  id === 'free' ? '' :
                  `<button class="plan-btn" style="background:${plan.color}" onclick="showToast('Contacta al administrador para obtener este plan.','info')">Obtener</button>`}
            </div>
        </div>`;
    }
    html += '</div>';

    document.getElementById('plansContent').innerHTML = html;
    modal.classList.remove('hidden');
}

function closePlansModal() {
    document.getElementById('plansModal')?.classList.add('hidden');
}

function isAdmin() {
    if (!APP.currentUser) return false;
    return getUserPlan(APP.currentUser.username) === 'admin';
}

function grantAdmin(username) {
    const licenses = JSON.parse(localStorage.getItem('pytron_licenses') || '{}');
    licenses[username] = { plan: 'admin', grantedAt: Date.now(), expiresAt: 0, grantedBy: 'system' };
    localStorage.setItem('pytron_licenses', JSON.stringify(licenses));
    APP.userPlan = 'admin';
    updatePlanBadge();
    backupToServer();
}

function openAdminPanel() {
    if (!isAdmin()) {
        const code = prompt('Ingresa el código de administrador:');
        if (code !== ADMIN_CODE) {
            if (code !== null) showToast('Código incorrecto.', 'error');
            return;
        }
        grantAdmin(APP.currentUser.username);
        showToast('Acceso de administrador activado permanentemente.', 'success');
    }
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    renderAdminPanel();
    modal.classList.remove('hidden');
}

function closeAdminModal() {
    document.getElementById('adminModal')?.classList.add('hidden');
}

function renderAdminPanel() {
    const users = getUsers();
    const licenses = getAllLicenses();
    let html = `<div class="admin-section">
        <h3>Dar licencia</h3>
        <div class="admin-grant">
            <select id="adminUser" class="admin-input">
                <option value="">Seleccionar usuario</option>
                ${Object.keys(users).map(u => `<option value="${u}">${users[u].name} (@${u})</option>`).join('')}
            </select>
            <select id="adminPlan" class="admin-input">
                <option value="pro">🚀 Pro</option>
                <option value="plus">💎 Plus</option>
                <option value="platino">👑 Platino</option>
            </select>
            <select id="adminDuration" class="admin-input">
                <option value="0">Permanente</option>
                <option value="30">30 días</option>
                <option value="90">90 días</option>
                <option value="365">1 año</option>
            </select>
            <button class="plan-btn" style="background:#6C63FF" onclick="grantLicenseFromAdmin()">Dar licencia</button>
        </div>
    </div>
    <div class="admin-section">
        <h3>Licencias activas</h3>
        <div class="admin-licenses">`;

    const licenseEntries = Object.entries(licenses);
    if (licenseEntries.length === 0) {
        html += '<p style="color:var(--text-secondary);padding:12px">No hay licencias activas.</p>';
    } else {
        for (const [username, lic] of licenseEntries) {
            const plan = PLANS[lic.plan] || PLANS.free;
            const expired = lic.expiresAt && lic.expiresAt < Date.now();
            const expDate = lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Permanente';
            const userName = users[username]?.name || username;
            html += `<div class="admin-license-row ${expired ? 'expired' : ''}">
                <span class="admin-license-icon" style="background:${plan.color}20;color:${plan.color}">${plan.icon}</span>
                <div class="admin-license-info">
                    <strong>${userName}</strong> <span style="color:${plan.color}">${plan.badge}</span>
                    <div style="font-size:12px;color:var(--text-secondary)">${expired ? '⚠️ Expirada' : `Expira: ${expDate}`}</div>
                </div>
                <button class="admin-revoke-btn" onclick="revokeLicenseFromAdmin('${username}')">Revocar</button>
            </div>`;
        }
    }
    html += '</div></div>';
    document.getElementById('adminContent').innerHTML = html;
}

function grantLicenseFromAdmin() {
    const username = document.getElementById('adminUser').value;
    const plan = document.getElementById('adminPlan').value;
    const days = parseInt(document.getElementById('adminDuration').value);
    if (!username) { showToast('Selecciona un usuario.', 'error'); return; }
    setUserLicense(username, plan, days);
    if (APP.currentUser && APP.currentUser.username === username) {
        APP.userPlan = plan;
        updatePlanBadge();
    }
    renderAdminPanel();
    showToast(`Licencia ${PLANS[plan].badge} otorgada a @${username}.`, 'success');
}

function revokeLicenseFromAdmin(username) {
    if (!confirm(`¿Revocar licencia de @${username}?`)) return;
    revokeUserLicense(username);
    if (APP.currentUser && APP.currentUser.username === username) {
        APP.userPlan = 'free';
        updatePlanBadge();
    }
    renderAdminPanel();
    showToast(`Licencia de @${username} revocada.`, 'success');
}

/* ============================================
   User Data Persistence
   ============================================ */

function userKey(key) {
    return `pytron_${APP.currentUser.username}_${key}`;
}

async function loadUserData() {
    try {
        APP.userPlan = getUserPlan(APP.currentUser.username);
        updatePlanBadge();

        let chats = localStorage.getItem(userKey('chats'));
        let ais = localStorage.getItem(userKey('customAIs'));

        if (!chats && !ais) {
            try {
                const res = await fetch('/api/backup');
                const backup = await res.json();
                if (backup.userData && backup.userData[APP.currentUser.username]) {
                    const ud = backup.userData[APP.currentUser.username];
                    if (ud.chats && Object.keys(ud.chats).length > 0) {
                        APP.chats = ud.chats;
                        localStorage.setItem(userKey('chats'), JSON.stringify(ud.chats));
                    }
                    if (ud.customAIs && Object.keys(ud.customAIs).length > 0) {
                        APP.customAIs = ud.customAIs;
                        localStorage.setItem(userKey('customAIs'), JSON.stringify(ud.customAIs));
                    }
                    if (ud.settings) {
                        APP.settings = { ...APP.settings, ...ud.settings };
                        localStorage.setItem(userKey('settings'), JSON.stringify(ud.settings));
                    }
                    if (ud.memory) {
                        APP.memory = ud.memory;
                        localStorage.setItem(userKey('memory'), ud.memory);
                    }
                    console.log('[RESTORE] Datos del usuario restaurados del servidor');
                    chats = localStorage.getItem(userKey('chats'));
                    ais = localStorage.getItem(userKey('customAIs'));
                }
            } catch {}
        }

        if (chats) APP.chats = JSON.parse(chats);
        else APP.chats = {};

        if (ais) APP.customAIs = JSON.parse(ais);
        else APP.customAIs = {};

        APP.activeCustomAI = localStorage.getItem(userKey('activeAI')) || null;
        APP.currentChatId = localStorage.getItem(userKey('currentChat')) || null;

        const settings = localStorage.getItem(userKey('settings'));
        if (settings) APP.settings = { ...APP.settings, ...JSON.parse(settings) };
        else APP.settings = { systemPrompt: '', temperature: 0.7 };

        APP.memory = localStorage.getItem(userKey('memory')) || '';
        const savedTheme = localStorage.getItem(userKey('theme'));
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeIcon(savedTheme);
        }

        const VALID_MODELS = ['Qwen/Qwen2.5-72B-Instruct', 'meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'google/gemma-3-27b-it', 'Qwen/Qwen3-32B'];
        const model = localStorage.getItem(userKey('model'));
        if (model) {
            const parsed = JSON.parse(model);
            if (VALID_MODELS.includes(parsed.model)) {
                APP.currentModel = parsed;
            } else {
                APP.currentModel = { provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' };
                localStorage.setItem(userKey('model'), JSON.stringify(APP.currentModel));
            }
            document.getElementById('currentModelName').textContent = APP.currentModel.name;
            document.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.toggle('selected',
                    opt.dataset.provider === APP.currentModel.provider &&
                    opt.dataset.model === APP.currentModel.model);
            });
        }
    } catch {}
}

function saveChats() {
    if (!APP.currentUser) return;
    try {
        localStorage.setItem(userKey('chats'), JSON.stringify(APP.chats));
        if (APP.currentChatId) localStorage.setItem(userKey('currentChat'), APP.currentChatId);
        backupToServer();
    } catch (e) { console.warn('Could not save chats:', e); }
}

function saveCustomAIs() {
    if (!APP.currentUser) return;
    localStorage.setItem(userKey('customAIs'), JSON.stringify(APP.customAIs));
    backupToServer();
}

function saveSettings() {
    if (!APP.currentUser) return;
    localStorage.setItem(userKey('settings'), JSON.stringify(APP.settings));
    backupToServer();
}

/* ============================================
   App Event Listeners
   ============================================ */

let appListenersSetup = false;

function setupAppListeners() {
    if (appListenersSetup) return;
    appListenersSetup = true;

    const $ = id => document.getElementById(id);

    $('closeSidebar').addEventListener('click', () => $('sidebar').classList.add('hidden'));
    $('openSidebar').addEventListener('click', () => $('sidebar').classList.remove('hidden'));
    $('newChatBtn').addEventListener('click', createNewChat);
    $('logoutBtn').addEventListener('click', logoutUser);

    const input = $('messageInput');
    const sendBtn = $('sendBtn');

    function updateSendBtn() {
        sendBtn.disabled = false;
    }

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        updateSendBtn();
    });
    input.addEventListener('keyup', updateSendBtn);
    input.addEventListener('paste', () => setTimeout(updateSendBtn, 0));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.value.trim() && !APP.isGenerating) sendMessage();
        }
    });

    sendBtn.addEventListener('click', () => {
        if (input.value.trim() && !APP.isGenerating) sendMessage();
    });
    $('stopBtn').addEventListener('click', stopGeneration);

    $('modelSelectorBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        $('modelDropdown').classList.toggle('show');
    });

    document.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
            selectModel(option.dataset.provider, option.dataset.model,
                option.querySelector('.model-option-name').textContent);
        });
    });

    document.addEventListener('click', () => $('modelDropdown').classList.remove('show'));

    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            input.value = card.dataset.prompt;
            input.dispatchEvent(new Event('input'));
            sendMessage();
        });
    });

    $('settingsBtn').addEventListener('click', openSettings);
    $('closeSettings').addEventListener('click', closeSettings);
    $('cancelSettings').addEventListener('click', closeSettings);
    $('saveSettings').addEventListener('click', saveSettingsFromModal);
    $('settingsModal').addEventListener('click', (e) => {
        if (e.target === $('settingsModal')) closeSettings();
    });

    $('temperature').addEventListener('input', (e) => $('tempValue').textContent = e.target.value);

    $('userMemory').addEventListener('input', (e) => {
        if (e.target.value.length > 1000) e.target.value = e.target.value.substring(0, 1000);
        $('memoryCount').textContent = e.target.value.length;
    });

    $('clearAllBtn').addEventListener('click', () => {
        if (confirm('¿Borrar todas las conversaciones?')) {
            APP.chats = {};
            APP.currentChatId = null;
            saveChats();
            renderChatHistory();
            showWelcomeScreen();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n') { e.preventDefault(); createNewChat(); }
        if (e.ctrlKey && e.key === '/') { e.preventDefault(); $('searchInput').focus(); }
        if (e.ctrlKey && e.key === ',') { e.preventDefault(); openSettings(); }
        if (e.key === 'Escape') {
            if (!$('settingsModal').classList.contains('hidden')) closeSettings();
            else if (!$('aiModal').classList.contains('hidden')) closeAIModal();
            else if (!$('driveModal').classList.contains('hidden')) closeDriveModal();
            else if ($('searchInput').value) { $('searchInput').value = ''; filterChatHistory(''); }
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'Backspace') { e.preventDefault(); if (APP.isGenerating) stopGeneration(); }
    });

    $('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        $('searchClear').classList.toggle('hidden', !query);
        filterChatHistory(query);
    });
    $('searchClear').addEventListener('click', () => {
        $('searchInput').value = '';
        $('searchClear').classList.add('hidden');
        filterChatHistory('');
    });

    try { setupDriveListeners(); } catch(e) { console.error('Error setupDrive:', e); }

    $('createAIBtn').addEventListener('click', () => openAIModal());
    $('closeAIModal').addEventListener('click', closeAIModal);
    $('cancelAIModal').addEventListener('click', closeAIModal);
    $('aiModal').addEventListener('click', (e) => {
        if (e.target === $('aiModal')) closeAIModal();
    });
    $('saveAIBtn').addEventListener('click', saveCustomAI);
    $('deleteAIBtn').addEventListener('click', deleteCustomAI);
    $('aiTemperature').addEventListener('input', (e) => $('aiTempValue').textContent = e.target.value);

    document.querySelectorAll('.emoji-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            $('aiAvatarEmoji').textContent = btn.dataset.emoji;
            updateAvatarPreviewColor();
        });
    });

    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateAvatarPreviewColor();
        });
    });

    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => applyTemplate(card.dataset.template));
    });
}

/* ============================================
   Model Selection
   ============================================ */

function selectModel(provider, model, name) {
    APP.currentModel = { provider, model, name };
    document.getElementById('currentModelName').textContent = name;
    document.querySelectorAll('.model-option').forEach(opt => {
        opt.classList.toggle('selected',
            opt.dataset.provider === provider && opt.dataset.model === model);
    });
    document.getElementById('modelDropdown').classList.remove('show');
    if (APP.currentUser) localStorage.setItem(userKey('model'), JSON.stringify(APP.currentModel));
}

/* ============================================
   Custom AI Management
   ============================================ */

function openAIModal(editId = null) {
    APP.editingAIId = editId;
    const modal = document.getElementById('aiModal');
    const title = document.getElementById('aiModalTitle');
    const saveBtn = document.getElementById('saveAIBtn');
    const deleteBtn = document.getElementById('deleteAIBtn');

    if (editId && APP.customAIs[editId]) {
        const ai = APP.customAIs[editId];
        title.textContent = 'Editar IA';
        saveBtn.textContent = 'Guardar cambios';
        deleteBtn.classList.remove('hidden');
        document.getElementById('aiName').value = ai.name;
        document.getElementById('aiDescription').value = ai.description || '';
        document.getElementById('aiSystemPrompt').value = ai.systemPrompt;
        document.getElementById('aiWelcomeMsg').value = ai.welcomeMsg || '';
        document.getElementById('aiModel').value = ai.preferredModel || 'auto';
        document.getElementById('aiTemperature').value = ai.temperature || 0.7;
        document.getElementById('aiTempValue').textContent = ai.temperature || 0.7;
        document.getElementById('aiAvatarEmoji').textContent = ai.emoji;
        document.querySelectorAll('.emoji-option').forEach(b => b.classList.toggle('selected', b.dataset.emoji === ai.emoji));
        document.querySelectorAll('.color-option').forEach(b => b.classList.toggle('selected', b.dataset.color === ai.color));
    } else {
        title.textContent = 'Crear nueva IA';
        saveBtn.textContent = 'Crear IA';
        deleteBtn.classList.add('hidden');
        document.getElementById('aiName').value = '';
        document.getElementById('aiDescription').value = '';
        document.getElementById('aiSystemPrompt').value = '';
        document.getElementById('aiWelcomeMsg').value = '';
        document.getElementById('aiModel').value = 'auto';
        document.getElementById('aiTemperature').value = 0.7;
        document.getElementById('aiTempValue').textContent = '0.7';
        document.getElementById('aiAvatarEmoji').textContent = '🤖';
        document.querySelectorAll('.emoji-option').forEach((b, i) => b.classList.toggle('selected', i === 0));
        document.querySelectorAll('.color-option').forEach((b, i) => b.classList.toggle('selected', i === 0));
    }
    updateAvatarPreviewColor();
    modal.classList.remove('hidden');
}

function closeAIModal() {
    document.getElementById('aiModal').classList.add('hidden');
    APP.editingAIId = null;
}

function updateAvatarPreviewColor() {
    const color = document.querySelector('.color-option.selected')?.dataset.color || '#6C63FF';
    const preview = document.getElementById('aiAvatarPreview');
    preview.style.borderColor = color;
    preview.style.background = color + '20';
}

function applyTemplate(key) {
    const t = AI_TEMPLATES[key];
    if (!t) return;
    document.getElementById('aiName').value = t.name;
    document.getElementById('aiDescription').value = t.description;
    document.getElementById('aiSystemPrompt').value = t.systemPrompt;
    document.getElementById('aiWelcomeMsg').value = t.welcomeMsg;
    document.getElementById('aiAvatarEmoji').textContent = t.emoji;
    document.querySelectorAll('.emoji-option').forEach(b => b.classList.toggle('selected', b.dataset.emoji === t.emoji));
    document.querySelectorAll('.color-option').forEach(b => b.classList.toggle('selected', b.dataset.color === t.color));
    updateAvatarPreviewColor();
    showToast(`Plantilla "${t.name}" aplicada.`, 'success');
}

function saveCustomAI() {
    const name = document.getElementById('aiName').value.trim();
    const systemPrompt = document.getElementById('aiSystemPrompt').value.trim();
    if (!name) { showToast('Escribe un nombre para tu IA.'); return; }
    if (!systemPrompt) { showToast('Escribe las instrucciones para tu IA.'); return; }
    if (!APP.editingAIId) {
        const plan = getCurrentPlan();
        if (plan.maxAIs !== -1 && Object.keys(APP.customAIs).length >= plan.maxAIs) {
            showToast(`Tu plan ${plan.name} permite máximo ${plan.maxAIs} IAs. Mejora tu plan.`, 'error');
            openPlansModal();
            return;
        }
    }

    const aiData = {
        name,
        description: document.getElementById('aiDescription').value.trim(),
        emoji: document.getElementById('aiAvatarEmoji').textContent,
        color: document.querySelector('.color-option.selected')?.dataset.color || '#6C63FF',
        systemPrompt,
        welcomeMsg: document.getElementById('aiWelcomeMsg').value.trim(),
        preferredModel: document.getElementById('aiModel').value,
        temperature: parseFloat(document.getElementById('aiTemperature').value),
        updatedAt: Date.now()
    };

    if (APP.editingAIId) {
        aiData.id = APP.editingAIId;
        aiData.createdAt = APP.customAIs[APP.editingAIId].createdAt;
        APP.customAIs[APP.editingAIId] = aiData;
        showToast(`"${name}" actualizada.`, 'success');
    } else {
        aiData.id = 'ai_' + Date.now();
        aiData.createdAt = Date.now();
        APP.customAIs[aiData.id] = aiData;
        showToast(`"${name}" creada.`, 'success');
    }

    saveCustomAIs();
    renderCustomAIs();
    closeAIModal();
    if (APP.editingAIId && APP.activeCustomAI === APP.editingAIId) updateActiveAIBadge();
}

function deleteCustomAI() {
    if (!APP.editingAIId) return;
    const ai = APP.customAIs[APP.editingAIId];
    if (!confirm(`¿Eliminar "${ai.name}"?`)) return;
    if (APP.activeCustomAI === APP.editingAIId) { APP.activeCustomAI = null; updateActiveAIBadge(); }
    delete APP.customAIs[APP.editingAIId];
    saveCustomAIs();
    renderCustomAIs();
    closeAIModal();
    showToast(`"${ai.name}" eliminada.`, 'success');
}

function shareCustomAI(aiId) {
    const ai = APP.customAIs[aiId];
    if (!ai) return;
    const shareData = {
        _pytron: 1,
        n: ai.name,
        d: ai.description || '',
        e: ai.emoji,
        c: ai.color,
        s: ai.systemPrompt,
        w: ai.welcomeMsg || '',
        m: ai.preferredModel || 'auto',
        t: ai.temperature || 0.7
    };
    const code = 'PYTRON-' + btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    const modal = document.getElementById('shareModal');
    document.getElementById('shareAIName').textContent = ai.emoji + ' ' + ai.name;
    document.getElementById('shareCode').value = code;
    modal.classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
}

function copyShareCode() {
    const input = document.getElementById('shareCode');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Código copiado. Compártelo con quien quieras.', 'success');
    });
}

function openImportAI() {
    const code = prompt('Pega el código de la IA que quieres importar:');
    if (!code || !code.trim()) return;
    importAIFromCode(code.trim());
}

function importAIFromCode(code) {
    try {
        let raw = code;
        if (raw.startsWith('PYTRON-')) raw = raw.substring(7);
        const json = decodeURIComponent(escape(atob(raw)));
        const data = JSON.parse(json);

        if (!data._pytron || !data.n || !data.s) {
            showToast('Código inválido. Verifica que sea un código de IA de Pytron.');
            return;
        }

        const existing = Object.values(APP.customAIs).find(ai => ai.name.toLowerCase() === data.n.toLowerCase());
        if (existing) {
            if (!confirm(`Ya tienes una IA llamada "${data.n}". ¿Quieres importarla de todas formas?`)) return;
        }

        const newAI = {
            id: 'ai_' + Date.now(),
            name: data.n,
            description: data.d || '',
            emoji: data.e || '🤖',
            color: data.c || '#6C63FF',
            systemPrompt: data.s,
            welcomeMsg: data.w || '',
            preferredModel: data.m || 'auto',
            temperature: data.t || 0.7,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        APP.customAIs[newAI.id] = newAI;
        saveCustomAIs();
        renderCustomAIs();
        showToast(`"${newAI.name}" importada con éxito.`, 'success');
    } catch (e) {
        console.error('Import error:', e);
        showToast('Código inválido o corrupto. Verifica que lo pegaste completo.');
    }
}

function activateCustomAI(aiId) {
    APP.activeCustomAI = APP.activeCustomAI === aiId ? null : aiId;
    if (APP.currentUser) localStorage.setItem(userKey('activeAI'), APP.activeCustomAI || '');
    renderCustomAIs();
    updateActiveAIBadge();
}

function updateActiveAIBadge() {
    const container = document.getElementById('activeAIBadge');
    if (!APP.activeCustomAI || !APP.customAIs[APP.activeCustomAI]) { container.innerHTML = ''; return; }
    const ai = APP.customAIs[APP.activeCustomAI];
    container.innerHTML = `<div class="active-ai-badge" title="${escapeHtml(ai.name)}">
        <span class="badge-emoji">${ai.emoji}</span>
        <span class="badge-name">${escapeHtml(ai.name)}</span>
        <button class="badge-clear" onclick="event.stopPropagation();activateCustomAI('${ai.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    </div>`;
}

function renderCustomAIs() {
    const container = document.getElementById('customAIsList');
    container.innerHTML = '';
    const ais = Object.values(APP.customAIs).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    ais.forEach(ai => {
        const item = document.createElement('div');
        item.className = `custom-ai-item ${APP.activeCustomAI === ai.id ? 'active' : ''}`;
        item.innerHTML = `
            <div class="custom-ai-avatar" style="background:${ai.color}20;border:1px solid ${ai.color}40">${ai.emoji}</div>
            <div class="custom-ai-info">
                <span class="custom-ai-name">${escapeHtml(ai.name)}</span>
                ${ai.description ? `<span class="custom-ai-desc">${escapeHtml(ai.description)}</span>` : ''}
            </div>
            <div class="custom-ai-actions">
                <button title="Compartir" class="share-ai"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
                <button title="Editar" class="edit-ai"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button title="Eliminar" class="delete-ai"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>`;
        item.addEventListener('click', (e) => {
            if (e.target.closest('.edit-ai') || e.target.closest('.delete-ai') || e.target.closest('.share-ai')) return;
            activateCustomAI(ai.id);
        });
        item.querySelector('.share-ai').addEventListener('click', (e) => { e.stopPropagation(); shareCustomAI(ai.id); });
        item.querySelector('.edit-ai').addEventListener('click', (e) => { e.stopPropagation(); openAIModal(ai.id); });
        item.querySelector('.delete-ai').addEventListener('click', (e) => { e.stopPropagation(); APP.editingAIId = ai.id; deleteCustomAI(); });
        container.appendChild(item);
    });
}

/* ============================================
   Folder Management
   ============================================ */

function getFolders() {
    if (!APP.currentUser) return [];
    try {
        return JSON.parse(localStorage.getItem(userKey('folders')) || '[]');
    } catch { return []; }
}

function saveFolders(folders) {
    if (!APP.currentUser) return;
    localStorage.setItem(userKey('folders'), JSON.stringify(folders));
}

function createFolder() {
    const name = prompt('Nombre de la carpeta:');
    if (!name || !name.trim()) return;
    const folders = getFolders();
    if (folders.find(f => f.name.toLowerCase() === name.trim().toLowerCase())) {
        showToast('Ya existe una carpeta con ese nombre.');
        return;
    }
    folders.push({ id: 'folder_' + Date.now(), name: name.trim() });
    saveFolders(folders);
    renderFolders();
    showToast(`Carpeta "${name.trim()}" creada.`, 'success');
}

function deleteFolder(folderId) {
    const folders = getFolders();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    if (!confirm(`¿Eliminar carpeta "${folder.name}"? Los chats no se borran.`)) return;
    saveFolders(folders.filter(f => f.id !== folderId));
    Object.values(APP.chats).forEach(chat => {
        if (chat.folderId === folderId) { chat.folderId = null; }
    });
    saveChats();
    if (APP.activeFolder === folderId) APP.activeFolder = null;
    renderFolders();
    renderChatHistory();
}

function toggleFolderFilter(folderId) {
    APP.activeFolder = APP.activeFolder === folderId ? null : folderId;
    renderFolders();
    renderChatHistory();
}

function assignChatToFolder(chatId, folderId) {
    if (!APP.chats[chatId]) return;
    APP.chats[chatId].folderId = folderId || null;
    saveChats();
    renderChatHistory();
    renderFolders();
    const menu = document.querySelector('.folder-assign-menu');
    if (menu) menu.remove();
}

function showFolderMenu(chatId, event) {
    event.stopPropagation();
    const old = document.querySelector('.folder-assign-menu');
    if (old) old.remove();

    const folders = getFolders();
    const chat = APP.chats[chatId];
    if (!chat) return;

    const menu = document.createElement('div');
    menu.className = 'folder-assign-menu';

    const noneItem = document.createElement('button');
    noneItem.className = `folder-assign-item ${!chat.folderId ? 'active' : ''}`;
    noneItem.textContent = 'Sin carpeta';
    noneItem.onclick = () => assignChatToFolder(chatId, null);
    menu.appendChild(noneItem);

    folders.forEach(f => {
        const item = document.createElement('button');
        item.className = `folder-assign-item ${chat.folderId === f.id ? 'active' : ''}`;
        item.innerHTML = `📁 ${f.name}`;
        item.onclick = () => assignChatToFolder(chatId, f.id);
        menu.appendChild(item);
    });

    const rect = event.target.closest('.history-item').getBoundingClientRect();
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';
    document.body.appendChild(menu);

    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }, { once: true });
    }, 0);
}

function renderFolders() {
    const container = document.getElementById('foldersList');
    if (!container) return;
    const folders = getFolders();

    container.innerHTML = '';

    const allChip = document.createElement('button');
    allChip.className = `folder-chip ${!APP.activeFolder ? 'active' : ''}`;
    const allCount = Object.keys(APP.chats).length;
    allChip.innerHTML = `Todos <span class="folder-count">${allCount}</span>`;
    allChip.onclick = () => toggleFolderFilter(null);
    container.appendChild(allChip);

    folders.forEach(f => {
        const count = Object.values(APP.chats).filter(c => c.folderId === f.id).length;
        const chip = document.createElement('button');
        chip.className = `folder-chip ${APP.activeFolder === f.id ? 'active' : ''}`;
        chip.innerHTML = `📁 ${f.name} <span class="folder-count">${count}</span>`;
        chip.onclick = () => toggleFolderFilter(f.id);
        chip.oncontextmenu = (e) => { e.preventDefault(); deleteFolder(f.id); };
        container.appendChild(chip);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-folder-chip';
    addBtn.textContent = '+ Carpeta';
    addBtn.onclick = createFolder;
    container.appendChild(addBtn);
}

/* ============================================
   Chat Management
   ============================================ */

function createNewChat() {
    const plan = getCurrentPlan();
    if (plan.maxChats !== -1 && Object.keys(APP.chats).length >= plan.maxChats) {
        showToast(`Tu plan ${plan.name} permite máximo ${plan.maxChats} chats. Elimina algunos o mejora tu plan.`, 'error');
        openPlansModal();
        return false;
    }
    const id = 'chat_' + Date.now();
    APP.chats[id] = { id, title: 'Nueva conversación', messages: [], customAIId: APP.activeCustomAI || null, createdAt: Date.now(), updatedAt: Date.now() };
    APP.currentChatId = id;
    saveChats();
    renderChatHistory();
    showWelcomeScreen();
    document.getElementById('messageInput').focus();
}

function loadChat(chatId) {
    APP.currentChatId = chatId;
    const chat = APP.chats[chatId];
    if (!chat) return;
    renderChatHistory();
    document.getElementById('messagesContainer').innerHTML = '';
    if (chat.messages.length === 0) { showWelcomeScreen(); return; }
    hideWelcomeScreen();
    chat.messages.forEach(msg => {
        if (msg.role === 'system') return;
        if (msg.imageData) {
            appendImageMessage(msg.content, msg.imageData, chat.customAIId);
        } else if (msg.audioData) {
            appendAudioMessage(msg.content, msg.audioData, chat.customAIId);
        } else if (msg.videoUrl) {
            appendVideoMessage(msg.content, msg.videoUrl, chat.customAIId);
        } else {
            appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, false, chat.customAIId);
        }
    });
    scrollToBottom();
    if (APP.currentUser) localStorage.setItem(userKey('currentChat'), chatId);
}

function deleteChat(chatId, e) {
    e.stopPropagation();
    delete APP.chats[chatId];
    if (APP.currentChatId === chatId) { APP.currentChatId = null; showWelcomeScreen(); document.getElementById('messagesContainer').innerHTML = ''; }
    saveChats();
    renderChatHistory();
}

/* ============================================
   Messages
   ============================================ */

function handleInputChange() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

function detectVideoRequest(text) {
    const lower = text.toLowerCase();
    const videoWords = ['video', 'vídeo', 'animación', 'animacion', 'clip', 'película', 'pelicula', 'movie'];
    const actionWords = ['genera', 'crea', 'haz', 'hazme', 'crear', 'generar', 'hacer', 'dame', 'muéstrame', 'muestrame', 'quiero', 'graba', 'grabar', 'anima', 'animar'];
    const hasVideo = videoWords.some(w => lower.includes(w));
    const hasAction = actionWords.some(w => lower.includes(w));
    if (hasVideo && hasAction) return true;
    if (/^(genera|crea|haz|graba|anima)\s+.*\b(video|vídeo|animación|clip)\b/i.test(text)) return true;
    return false;
}

function extractVideoPrompt(text) {
    let prompt = text;
    prompt = prompt.replace(/^(por favor\s+|porfa\s+|porfavor\s+)?/i, '');
    prompt = prompt.replace(/^(genera|crea|haz|hazme|crear|generar|hacer|dame|muéstrame|muestrame|quiero|graba|grabar|anima|animar)\s*/i, '');
    prompt = prompt.replace(/^(un |una |el |la |me )?(video|vídeo|animación|animacion|clip|película|pelicula)\s*/i, '');
    prompt = prompt.replace(/^(de |del |de la |de un |de una |sobre |con |que |donde |:)\s*/i, '');
    return prompt.trim() || text;
}

function detectImageRequest(text) {
    const lower = text.toLowerCase();
    const imageWords = ['imagen', 'foto', 'dibujo', 'ilustración', 'ilustracion', 'picture', 'image', 'pintura', 'retrato', 'wallpaper', 'fondo de pantalla'];
    const actionWords = ['genera', 'crea', 'dibuja', 'haz', 'hazme', 'crear', 'generar', 'dibujar', 'hacer', 'dame', 'muéstrame', 'muestrame', 'pinta', 'pintar', 'imagina', 'diseña', 'diseñar', 'quiero'];
    const hasImage = imageWords.some(w => lower.includes(w));
    const hasAction = actionWords.some(w => lower.includes(w));
    if (hasImage && hasAction) return true;
    if (/^(dibuja|pinta)\s+/i.test(text)) return true;
    return false;
}

function extractImagePrompt(text) {
    let prompt = text;
    prompt = prompt.replace(/^(por favor\s+|porfa\s+|porfavor\s+)?/i, '');
    prompt = prompt.replace(/^(genera|crea|dibuja|haz|hazme|crear|generar|dibujar|hacer|dame|muéstrame|muestrame|pinta|pintar|imagina|diseña|diseñar|quiero)\s*/i, '');
    prompt = prompt.replace(/^(una |un |la |el |me )?(imagen|foto|dibujo|ilustración|ilustracion|picture|image|pintura|retrato)\s*/i, '');
    prompt = prompt.replace(/^(de |del |de la |de un |de una |sobre |con |que |donde |:)\s*/i, '');
    return prompt.trim() || text;
}

/* ============================================
   Document Detection & Generation
   ============================================ */

function detectDocumentRequest(text) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const formatPhrases = ['en word', 'en pdf', 'en doc', 'en excel', 'en csv', 'como word', 'como pdf', 'como doc', 'como excel', 'para word', 'para pdf', 'archivo word', 'archivo pdf', 'archivo doc', 'formato word', 'formato pdf', 'formato doc', 'de word', 'word sobre', 'pdf sobre', 'doc sobre', 'word de', 'pdf de', 'word acerca'];
    if (formatPhrases.some(w => lower.includes(w))) return true;

    const docWords = ['documento', 'word', ' doc ', '.doc', 'docx', ' pdf', '.pdf', 'archivo', 'carta formal', 'ensayo', 'reporte', 'informe', 'resumen ejecutivo', 'presentacion', 'excel', 'hoja de calculo', 'csv'];
    const actionWords = ['crea', 'genera', 'haz', 'hazme', 'crear', 'generar', 'hacer', 'escribe', 'escribir', 'redacta', 'redactar', 'dame', 'elabora', 'elaborar', 'prepara', 'preparar', 'quiero'];

    const hasDoc = docWords.some(w => lower.includes(w));
    const hasAction = actionWords.some(w => lower.includes(w));
    if (hasDoc && hasAction) return true;

    if (/\b(crea|genera|haz|hazme|escribe|redacta|elabora|prepara|dame|quiero)\b.*\b(documento|word|pdf|doc|carta|ensayo|reporte|informe)\b/i.test(text)) return true;
    if (/\b(documento|word|pdf|doc|carta|ensayo|reporte|informe)\b.*\b(sobre|de|acerca|del)\b/i.test(text)) return true;
    return false;
}

function getDocumentType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('pdf')) return 'pdf';
    if (lower.includes('excel') || lower.includes('csv') || lower.includes('hoja de cálculo') || lower.includes('hoja de calculo')) return 'excel';
    if (lower.includes('.txt') || lower.includes('texto plano')) return 'txt';
    return 'word';
}

function extractDocumentTopic(text) {
    let prompt = text;
    prompt = prompt.replace(/^(por favor\s+|porfa\s+|porfavor\s+)?/i, '');
    prompt = prompt.replace(/^(crea|genera|haz|hazme|crear|generar|hacer|escribe|escribir|redacta|redactar|dame|elabora|elaborar|prepara|preparar|quiero)\s*/i, '');
    prompt = prompt.replace(/\b(en word|en pdf|en doc|en excel|en csv|como word|como pdf|como doc|para word|para pdf|formato word|formato pdf)\b/gi, '');
    prompt = prompt.replace(/^(un |una |el |la |me )?(documento|word|doc|docx|pdf|archivo|carta|ensayo|reporte|informe|resumen|presentación|presentacion)\s*/i, '');
    prompt = prompt.replace(/^(de |del |de la |de un |de una |sobre |con |que |acerca de |:)\s*/i, '');
    return prompt.trim() || text;
}

const DRIVE_CLIENT_ID = '265049019501-5d4cdlg59qm654vh0iv7270nk2lecbom.apps.googleusercontent.com';

function ensureDriveAuth() {
    return new Promise((resolve, reject) => {
        if (APP.driveToken) { resolve(APP.driveToken); return; }

        if (typeof google === 'undefined' || !google.accounts) {
            reject(new Error('Google API no cargó. Recarga la página con Ctrl+Shift+R'));
            return;
        }

        if (typeof gapi === 'undefined') {
            reject(new Error('GAPI no cargó. Recarga la página con Ctrl+Shift+R'));
            return;
        }

        gapi.load('client', () => {
            gapi.client.init({}).then(() => {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: DRIVE_CLIENT_ID,
                    scope: 'https://www.googleapis.com/auth/drive.file',
                    callback: (response) => {
                        if (response.error) {
                            console.error('OAuth error:', response);
                            reject(new Error(response.error_description || response.error));
                            return;
                        }
                        console.log('Drive conectado OK');
                        APP.driveToken = response.access_token;
                        resolve(APP.driveToken);
                    }
                });
                tokenClient.requestAccessToken({ prompt: 'consent' });
            }).catch(reject);
        });
    });
}

async function ensureDriveFolder(token) {
    const searchRes = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name%3D'Pytron Docs' and mimeType%3D'application/vnd.google-apps.folder' and trashed%3Dfalse&fields=files(id,name)",
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'Pytron Docs',
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const folder = await createRes.json();
    console.log('Carpeta Pytron Docs creada:', folder.id);
    return folder.id;
}

async function uploadToGoogleDocs(content, title) {
    const token = await ensureDriveAuth();
    showToast('Conectado a Drive. Subiendo documento...', 'success');

    const folderId = await ensureDriveFolder(token);

    const htmlContent = `<html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#222}
h1{font-size:20pt;color:#1a1a2e;border-bottom:2px solid #4285f4;padding-bottom:8px}
h2{font-size:16pt;color:#2d2d5e;margin-top:20px}
h3{font-size:13pt;color:#444}
table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}
th{background:#f0f0f0;font-weight:bold}
blockquote{border-left:3px solid #4285f4;padding-left:12px;color:#555;margin:12px 0}
code{background:#f5f5f5;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:11pt}
pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto}
</style></head><body>${marked.parse(content)}</body></html>`;

    const metadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
        parents: [folderId]
    };

    const boundary = 'pytron_boundary_' + Date.now();
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlContent}\r\n--${boundary}--`;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('Drive upload failed:', err);
        if (res.status === 401) { APP.driveToken = null; }
        throw new Error(`Error al subir a Drive (${res.status})`);
    }

    const file = await res.json();
    console.log('Documento creado en Drive:', file);
    return file;
}

function generateWordFile(content, title) {
    showToast('Subiendo a Google Drive...', 'success');
    uploadToGoogleDocs(content, title).then(file => {
        if (file.webViewLink) {
            window.open(file.webViewLink, '_blank');
            showToast('Documento abierto en Google Docs.', 'success');
        } else if (file.id) {
            window.open(`https://docs.google.com/document/d/${file.id}/edit`, '_blank');
            showToast('Documento creado en Drive.', 'success');
        }
    }).catch(err => {
        console.error('Drive upload error:', err);
        showToast('No se pudo subir a Drive: ' + err.message + '. Descargando local...', 'error');
        downloadWordFallback(content, title);
    });
}

function downloadWordFallback(content, title) {
    const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#222;margin:40px}h1{font-size:22pt;color:#1a1a2e;border-bottom:2px solid #6C63FF;padding-bottom:8px}h2{font-size:16pt;color:#2d2d5e;margin-top:24px}h3{font-size:13pt;color:#444}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}th{background:#f0f0f0;font-weight:bold}</style></head>
<body>${marked.parse(content)}</body></html>`;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const safeName = title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '_').substring(0, 50);
    downloadFile(`${safeName}.doc`, blob, 'application/msword', true);
}

function generatePdfFile(content, title) {
    showToast('Subiendo a Google Drive...', 'success');
    uploadToGoogleDocs(content, title).then(file => {
        window.open(`https://docs.google.com/document/d/${file.id}/edit`, '_blank');
        showToast('Documento abierto en Google Docs.', 'success');
    }).catch(err => {
        console.error('Drive upload error:', err);
        showToast('No se pudo subir a Drive: ' + err.message + '. Descargando PDF...', 'error');
        downloadPdfFallback(content, title);
    });
}

function downloadPdfFallback(content, title) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        let y = margin;

        const plainText = content.replace(/```[\s\S]*?```/g, m => m.replace(/```\w*\n?/g, '').trim())
            .replace(/#{1,3}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/^[-*]\s+/gm, '• ');

        doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(26, 26, 46);
        const titleLines = doc.splitTextToSize(title, maxWidth);
        doc.text(titleLines, margin, y); y += titleLines.length * 8 + 4;
        doc.setDrawColor(108, 99, 255); doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y); y += 10;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(34, 34, 34);

        for (const para of plainText.split('\n')) {
            if (!para.trim()) { y += 4; continue; }
            for (const line of doc.splitTextToSize(para.trim(), maxWidth)) {
                if (y > pageHeight - margin) { doc.addPage(); y = margin; }
                doc.text(line, margin, y); y += 6;
            }
            y += 2;
        }
        doc.save(`${title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '_').substring(0, 50)}.pdf`);
    } catch (err) {
        console.error('PDF error:', err);
        downloadWordFallback(content, title);
    }
}

function generateTxtFile(content, title) {
    const plainText = content.replace(/#{1,3}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, m => m.replace(/```\w*\n?/g, '').trim());
    const safeName = title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '_').substring(0, 50);
    downloadFile(`${safeName}.txt`, plainText, 'text/plain');
}

async function generateDocument(message, docType, topic) {
    if (!APP.currentUser) return;
    if (APP.isGenerating) return;
    if (!canUseFeature('docs')) {
        showToast('Tu plan no incluye generación de documentos. Mejora tu plan.', 'error');
        openPlansModal();
        return;
    }
    if (!APP.currentChatId) createNewChat();

    const chat = APP.chats[APP.currentChatId];
    hideWelcomeScreen();

    const typeLabels = { word: 'Word', pdf: 'PDF', txt: 'Texto', excel: 'Excel' };
    const typeIcons = { word: '📄', pdf: '📕', txt: '📝', excel: '📊' };
    const typeLabel = typeLabels[docType] || 'Word';
    const typeIcon = typeIcons[docType] || '📄';
    const docTitle = topic.charAt(0).toUpperCase() + topic.slice(1);

    if (chat.messages.length === 0) {
        chat.title = topic.substring(0, 40) || 'Documento';
        chat.customAIId = APP.activeCustomAI || null;
        renderChatHistory();
    }

    chat.messages.push({ role: 'user', content: message });
    appendMessage('user', message, true);
    chat.updatedAt = Date.now();
    saveChats();

    APP.isGenerating = true;
    toggleGeneratingUI(true);

    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    const aiId = chat.customAIId || APP.activeCustomAI;
    if (aiId && APP.customAIs[aiId]) {
        avatar.style.background = APP.customAIs[aiId].color + '20';
        avatar.style.borderColor = APP.customAIs[aiId].color + '40';
    }
    avatar.innerHTML = getAIAvatar(aiId);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);

    contentDiv.innerHTML = `<div class="doc-card doc-generating">
        <div class="doc-card-icon">${typeIcon}</div>
        <div class="doc-card-info">
            <div class="doc-card-title">${escapeHtml(docTitle)}</div>
            <div class="doc-card-status">Generando documento ${typeLabel}...</div>
            <div class="doc-card-progress"><div class="doc-card-progress-bar"></div></div>
        </div>
    </div>`;
    scrollToBottom();

    const docPrompt = `Escribe un documento completo y bien estructurado sobre: "${topic}".\n\nReglas:\n- Formato Markdown\n- Empieza con un título # \n- Usa secciones con ## y ###\n- Contenido informativo y útil\n- Solo en español\n- NO incluyas comentarios, instrucciones o texto meta`;

    let useModel = 'Qwen/Qwen2.5-72B-Instruct';
    let useTemperature = 0.4;
    let systemPromptText = 'Eres un escritor profesional. Genera documentos bien estructurados en formato Markdown. Escribe solo el contenido del documento, sin explicaciones adicionales. Todo en español.';

    const customAIId = chat.customAIId || APP.activeCustomAI;
    if (customAIId && APP.customAIs[customAIId]) {
        const ai = APP.customAIs[customAIId];
        systemPromptText = ai.systemPrompt + '\n\nAdemás, genera documentos bien estructurados cuando se te pida.';
        useTemperature = ai.temperature || 0.7;
        if (ai.preferredModel && ai.preferredModel !== 'auto') {
            const parts = ai.preferredModel.split(':');
            if (parts.length === 2) useModel = parts[1];
        }
    }

    try {
        const messages = [
            { role: 'system', content: systemPromptText },
            { role: 'user', content: docPrompt }
        ];

        APP.abortController = new AbortController();
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_KEY}` },
            body: JSON.stringify({ model: useModel, messages, temperature: useTemperature, stream: true, max_tokens: 2048 }),
            signal: APP.abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Error ${response.status}: ${errorData.substring(0, 200)}`);
        }

        let fullContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) fullContent += delta;
                    } catch {}
                }
            }
        }

        if (fullContent) {
            const docId = 'doc_' + Date.now();
            window._pendingDocs = window._pendingDocs || {};
            window._pendingDocs[docId] = { content: fullContent, title: docTitle, type: docType };

            contentDiv.innerHTML = `<div class="doc-card doc-ready">
                <div class="doc-card-icon">${typeIcon}</div>
                <div class="doc-card-info">
                    <div class="doc-card-title">${escapeHtml(docTitle)}</div>
                    <div class="doc-card-status doc-card-success">Documento ${typeLabel} listo</div>
                </div>
                <div class="doc-card-actions">
                    <button class="doc-card-btn doc-card-btn-primary" onclick="downloadPendingDoc('${docId}')">
                        ⬇️ Descargar ${typeLabel}
                    </button>
                    <button class="doc-card-btn doc-card-btn-drive" onclick="uploadPendingDocToDrive('${docId}')">
                        📁 Abrir en Drive
                    </button>
                </div>
            </div>`;

            chat.messages.push({ role: 'assistant', content: `[Documento ${typeLabel}: ${docTitle}]` });
            chat.updatedAt = Date.now();
            saveChats();
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
            contentDiv.innerHTML = `<div class="doc-card doc-error">
                <div class="doc-card-icon">❌</div>
                <div class="doc-card-info">
                    <div class="doc-card-title">${escapeHtml(docTitle)}</div>
                    <div class="doc-card-status" style="color:var(--danger);">Error: ${escapeHtml(error.message)}</div>
                </div>
            </div>`;
        }
    } finally {
        APP.isGenerating = false;
        APP.abortController = null;
        toggleGeneratingUI(false);
        scrollToBottom();
    }
}

function downloadPendingDoc(docId) {
    const doc = (window._pendingDocs || {})[docId];
    if (!doc) { showToast('Documento no encontrado.', 'error'); return; }
    if (doc.type === 'pdf') downloadPdfFallback(doc.content, doc.title);
    else if (doc.type === 'txt') generateTxtFile(doc.content, doc.title);
    else downloadWordFallback(doc.content, doc.title);
}

function uploadPendingDocToDrive(docId) {
    const doc = (window._pendingDocs || {})[docId];
    if (!doc) { showToast('Documento no encontrado.', 'error'); return; }
    showToast('Subiendo a Google Drive...', 'success');
    uploadToGoogleDocs(doc.content, doc.title).then(file => {
        const url = file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`;
        window.open(url, '_blank');
        showToast('Documento abierto en Google Docs.', 'success');
    }).catch(err => {
        console.error('Drive upload error:', err);
        showToast('No se pudo subir a Drive. Descargando local...', 'error');
        downloadPendingDoc(docId);
    });
}

function detectCreateAIRequest(text) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const patterns = [
        /crea(r|me)?\s+(una?\s+)?ia\b/,
        /haz(me)?\s+(una?\s+)?ia\b/,
        /genera(r|me)?\s+(una?\s+)?ia\b/,
        /quiero\s+(una?\s+)?ia\b/,
        /necesito\s+(una?\s+)?ia\b/,
        /diseña(r|me)?\s+(una?\s+)?ia\b/,
        /crea(r|me)?\s+(una?\s+)?(inteligencia|asistente)\b/,
        /haz(me)?\s+(una?\s+)?(inteligencia|asistente)\b/,
        /nueva\s+ia\b/,
        /nuevo\s+asistente\b/,
        /crea(r|me)?\s+(un\s+)?bot\b/,
    ];
    return patterns.some(p => p.test(lower));
}

function extractAIDescription(text) {
    let desc = text;
    desc = desc.replace(/^(crea|haz|genera|diseña|quiero|necesito)(r|me)?\s+(una?\s+)?(ia|inteligencia artificial|asistente|bot)\s*/i, '');
    desc = desc.replace(/^(de |del |que |para |sobre |llamad[oa]\s+)/i, '');
    return desc.trim() || text;
}

const AI_EMOJIS = ['🤖','🧠','📚','✍️','💡','🔬','📊','🎯','🛡️','💬','📝','🎓','⚡','🔧','🌐','📖','🧪','🎨','🏥','💰'];
const AI_COLORS = ['#6C63FF','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE'];

async function createAIFromChat(message) {
    if (!APP.currentUser) return;
    if (APP.isGenerating) return;
    const plan = getCurrentPlan();
    if (plan.maxAIs !== -1 && Object.keys(APP.customAIs).length >= plan.maxAIs) {
        showToast(`Tu plan ${plan.name} permite máximo ${plan.maxAIs} IAs. Mejora tu plan para crear más.`, 'error');
        openPlansModal();
        return;
    }
    if (!APP.currentChatId) createNewChat();

    const chat = APP.chats[APP.currentChatId];
    hideWelcomeScreen();

    if (chat.messages.length === 0) {
        chat.title = 'Crear IA';
        chat.customAIId = APP.activeCustomAI || null;
        renderChatHistory();
    }

    chat.messages.push({ role: 'user', content: message });
    appendMessage('user', message, true);
    chat.updatedAt = Date.now();
    saveChats();

    APP.isGenerating = true;
    toggleGeneratingUI(true);

    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.innerHTML = getAIAvatar(null);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);

    contentDiv.innerHTML = `<div class="doc-card doc-generating">
        <div class="doc-card-icon">🤖</div>
        <div class="doc-card-info">
            <div class="doc-card-title">Creando IA personalizada...</div>
            <div class="doc-card-status">Analizando tu descripción</div>
            <div class="doc-card-progress"><div class="doc-card-progress-bar"></div></div>
        </div>
    </div>`;
    scrollToBottom();

    const desc = extractAIDescription(message);

    try {
        const aiGenPrompt = `El usuario quiere crear una IA/asistente personalizado. Descripción: "${desc}"

Genera un JSON con estos campos exactos (sin texto extra, SOLO el JSON):
{
  "name": "nombre corto de la IA (2-4 palabras)",
  "description": "descripción breve de qué hace (1 frase)",
  "systemPrompt": "instrucciones detalladas para la IA, cómo debe comportarse, qué debe hacer y cómo responder (mínimo 3 frases completas)",
  "welcomeMsg": "mensaje de bienvenida que la IA dirá al usuario (1-2 frases amigables)",
  "emoji": "un solo emoji que represente la IA"
}`;

        APP.abortController = new AbortController();
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_KEY}` },
            body: JSON.stringify({
                model: 'Qwen/Qwen2.5-72B-Instruct',
                messages: [
                    { role: 'system', content: 'Eres un generador de configuración de IAs. Responde SOLO con JSON válido, sin markdown, sin explicaciones.' },
                    { role: 'user', content: aiGenPrompt }
                ],
                temperature: 0.6,
                max_tokens: 512
            }),
            signal: APP.abortController.signal
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        const data = await response.json();
        let aiText = data.choices?.[0]?.message?.content || '';
        aiText = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('La IA no generó una configuración válida');

        const aiConfig = JSON.parse(jsonMatch[0]);
        if (!aiConfig.name || !aiConfig.systemPrompt) throw new Error('Configuración incompleta');

        const emoji = aiConfig.emoji && aiConfig.emoji.length <= 2 ? aiConfig.emoji : AI_EMOJIS[Math.floor(Math.random() * AI_EMOJIS.length)];
        const color = AI_COLORS[Math.floor(Math.random() * AI_COLORS.length)];

        const newAI = {
            id: 'ai_' + Date.now(),
            name: aiConfig.name,
            description: aiConfig.description || '',
            emoji,
            color,
            systemPrompt: aiConfig.systemPrompt,
            welcomeMsg: aiConfig.welcomeMsg || `¡Hola! Soy ${aiConfig.name}. ¿En qué puedo ayudarte?`,
            preferredModel: 'auto',
            temperature: 0.7,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        APP.customAIs[newAI.id] = newAI;
        saveCustomAIs();
        renderCustomAIs();

        contentDiv.innerHTML = `<div class="doc-card doc-ready" style="border-color:${color}40;">
            <div class="doc-card-icon" style="font-size:42px">${emoji}</div>
            <div class="doc-card-info">
                <div class="doc-card-title">${escapeHtml(newAI.name)}</div>
                <div class="doc-card-status">${escapeHtml(newAI.description)}</div>
                <div class="doc-card-status" style="margin-top:6px;font-style:italic;color:var(--text-secondary);">"${escapeHtml(newAI.welcomeMsg)}"</div>
            </div>
            <div class="doc-card-actions">
                <button class="doc-card-btn doc-card-btn-primary" onclick="activateAndChat('${newAI.id}')">
                    ⚡ Activar y chatear
                </button>
                <button class="doc-card-btn doc-card-btn-drive" onclick="openAIModal('${newAI.id}')">
                    ✏️ Editar
                </button>
            </div>
        </div>`;

        chat.messages.push({ role: 'assistant', content: `[IA creada: ${newAI.name}]` });
        chat.updatedAt = Date.now();
        saveChats();
        showToast(`"${newAI.name}" creada con éxito.`, 'success');

    } catch (error) {
        if (error.name !== 'AbortError') {
            contentDiv.innerHTML = `<div class="doc-card doc-error">
                <div class="doc-card-icon">❌</div>
                <div class="doc-card-info">
                    <div class="doc-card-title">Error al crear IA</div>
                    <div class="doc-card-status" style="color:var(--danger);">${escapeHtml(error.message)}</div>
                </div>
            </div>`;
        }
    } finally {
        APP.isGenerating = false;
        APP.abortController = null;
        toggleGeneratingUI(false);
        scrollToBottom();
    }
}

function activateAndChat(aiId) {
    if (!APP.customAIs[aiId]) return;
    APP.activeCustomAI = aiId;
    localStorage.setItem(userKey('activeAI'), aiId);
    updateActiveAIBadge();
    createNewChat();
    showToast(`"${APP.customAIs[aiId].name}" activada.`, 'success');
}

async function sendMessage() {
    try {
        const input = document.getElementById('messageInput');
        if (!input) return;
        const message = input.value.trim();
        if (!message) return;

        if (APP.isGenerating) {
            APP.isGenerating = false;
            if (APP.abortController) { APP.abortController.abort(); APP.abortController = null; }
            toggleGeneratingUI(false);
        }

        if (!APP.currentUser) {
            alert('Inicia sesión primero');
            return;
        }

        if (detectCreateAIRequest(message)) {
            input.value = '';
            input.style.height = 'auto';
            createAIFromChat(message);
            return;
        }

        if (detectDocumentRequest(message)) {
            const docType = getDocumentType(message);
            const topic = extractDocumentTopic(message);
            input.value = '';
            input.style.height = 'auto';
            generateDocument(message, docType, topic.length > 3 ? topic : message);
            return;
        }

        if (detectAudioRequest(message)) {
            const audioPrompt = extractAudioPrompt(message);
            input.value = '';
            input.style.height = 'auto';
            generateAudio(audioPrompt.length > 3 ? audioPrompt : message);
            return;
        }

        if (detectVideoRequest(message)) {
            const videoPrompt = extractVideoPrompt(message);
            input.value = '';
            input.style.height = 'auto';
            generateVideo(videoPrompt.length > 3 ? videoPrompt : message);
            return;
        }

        if (detectImageRequest(message)) {
            const imagePrompt = extractImagePrompt(message);
            input.value = '';
            input.style.height = 'auto';
            generateImage(imagePrompt.length > 3 ? imagePrompt : message);
            return;
        }

        if (!APP.currentChatId) createNewChat();

        const chat = APP.chats[APP.currentChatId];
        if (!chat) {
            console.error('No se encontró el chat:', APP.currentChatId);
            return;
        }

        if (chat.messages.length === 0) {
            chat.title = message.replace(/\n/g, ' ').trim().substring(0, 40) || 'Chat';
            chat.customAIId = APP.activeCustomAI || null;
            renderChatHistory();
        }

        hideWelcomeScreen();
        chat.messages.push({ role: 'user', content: message });
        appendMessage('user', message, true);
        input.value = '';
        input.style.height = 'auto';
        chat.updatedAt = Date.now();
        saveChats();
        await generateResponse(chat);
    } catch (err) {
        console.error('Error en sendMessage:', err);
        APP.isGenerating = false;
        toggleGeneratingUI(false);
    }
}

function getAIAvatar(customAIId) {
    if (customAIId && APP.customAIs[customAIId]) return `<span style="font-size:16px">${APP.customAIs[customAIId].emoji}</span>`;
    return `<svg width="18" height="18" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" stroke="url(#grad1)" stroke-width="1.5"/><path d="M9 14L12.5 17.5L19 11" stroke="url(#grad1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function appendMessage(type, content, animate = true, customAIId = null) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${type}`;

    if (type === 'user') {
        avatar.textContent = APP.currentUser ? APP.currentUser.name.charAt(0).toUpperCase() : 'T';
    } else {
        const aiId = customAIId || APP.activeCustomAI;
        if (aiId && APP.customAIs[aiId]) {
            avatar.style.background = APP.customAIs[aiId].color + '20';
            avatar.style.borderColor = APP.customAIs[aiId].color + '40';
        }
        avatar.innerHTML = getAIAvatar(aiId);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    if (type === 'user') {
        contentDiv.innerHTML = `<p>${escapeHtml(content)}</p>`;
    } else {
        contentDiv.innerHTML = renderMarkdown(content);
        const msgIdx = APP.currentChatId ? (APP.chats[APP.currentChatId]?.messages?.length || 0) : 0;
        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'message-reactions';
        reactionsDiv.innerHTML = `
            <button class="reaction-btn" data-reaction="like" title="Me gusta" onclick="toggleReaction(this,'like',${msgIdx})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
            </button>
            <button class="reaction-btn" data-reaction="dislike" title="No me gusta" onclick="toggleReaction(this,'dislike',${msgIdx})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
            </button>
            <button class="reaction-btn" data-reaction="copy" title="Copiar respuesta" onclick="copyFullResponse(this)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
            <button class="reaction-btn tts-btn" data-reaction="speak" title="Escuchar respuesta" onclick="speakResponse(this)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
            </button>`;
        contentDiv.appendChild(reactionsDiv);
    }
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
    scrollToBottom();
    return contentDiv;
}

function appendImageMessage(caption, imageData, customAIId = null) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    const aiId = customAIId || APP.activeCustomAI;
    if (aiId && APP.customAIs[aiId]) {
        avatar.style.background = APP.customAIs[aiId].color + '20';
        avatar.style.borderColor = APP.customAIs[aiId].color + '40';
    }
    avatar.innerHTML = getAIAvatar(aiId);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    const prompt = caption.replace(/^\[Imagen generada: /, '').replace(/\]$/, '');
    contentDiv.innerHTML = `<div class="generated-image"><img src="${imageData}" alt="${escapeHtml(prompt)}" onclick="window.open(this.src)"><p class="image-caption">${escapeHtml(prompt)}</p></div>`;
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
}

function appendTypingIndicator(customAIId = null) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    div.id = 'typingMessage';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    const aiId = customAIId || APP.activeCustomAI;
    if (aiId && APP.customAIs[aiId]) {
        avatar.style.background = APP.customAIs[aiId].color + '20';
        avatar.style.borderColor = APP.customAIs[aiId].color + '40';
    }
    avatar.innerHTML = getAIAvatar(aiId);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.id = 'streamContent';
    contentDiv.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
    scrollToBottom();
    return contentDiv;
}

/* ============================================
   AI Response
   ============================================ */

async function generateResponse(chat) {
    let useModel = APP.currentModel.model;
    let useTemperature = APP.settings.temperature;
    let systemPromptText = APP.settings.systemPrompt ||
        'Eres Pytron, un asistente de inteligencia artificial avanzado, útil y amigable. Respondes en español cuando el usuario habla en español, y en el idioma del usuario en otros casos. Proporcionas respuestas claras, precisas y bien estructuradas. Usas formato Markdown cuando es apropiado.';

    const customAIId = chat.customAIId || APP.activeCustomAI;
    if (customAIId && APP.customAIs[customAIId]) {
        const ai = APP.customAIs[customAIId];
        systemPromptText = ai.systemPrompt;
        useTemperature = ai.temperature || 0.7;
        if (ai.preferredModel && ai.preferredModel !== 'auto') {
            const parts = ai.preferredModel.split(':');
            if (parts.length === 2) useModel = parts[1];
        }
    }

    if (APP.memory) {
        systemPromptText += '\n\nMEMORIA DEL USUARIO (datos que el usuario quiere que siempre recuerdes):\n' + APP.memory;
    }

    const prevContext = getPreviousConversationsContext(chat.id);
    if (prevContext) {
        systemPromptText += '\n\nCONVERSACIONES ANTERIORES (resumen de lo que el usuario habló contigo antes, úsalo como contexto si es relevante):\n' + prevContext;
    }

    APP.isGenerating = true;
    let streamContent = null;

    try {
        toggleGeneratingUI(true);
        streamContent = appendTypingIndicator(customAIId);

        const messages = [{ role: 'system', content: systemPromptText }];
        const recentMsgs = chat.messages.filter(m => m.role !== 'system').slice(-20);
        recentMsgs.forEach(m => {
            messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
        });

        APP.abortController = new AbortController();
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_KEY}` },
            body: JSON.stringify({ model: useModel, messages, temperature: useTemperature, stream: true, max_tokens: 4096 }),
            signal: APP.abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.text();
            let errorMsg = `Error ${response.status}`;
            try { const p = JSON.parse(errorData); errorMsg = p.error?.message || p.message || errorMsg; } catch { errorMsg += ': ' + errorData.substring(0, 200); }
            throw new Error(errorMsg);
        }

        let fullContent = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) { fullContent += delta; streamContent.innerHTML = renderMarkdown(fullContent); scrollToBottom(); }
                    } catch {}
                }
            }
        }

        chat.messages.push({ role: 'assistant', content: fullContent });
        chat.updatedAt = Date.now();
        saveChats();
        autoSaveMemory(chat);

    } catch (error) {
        const sc = streamContent || document.getElementById('streamContent');
        if (error.name === 'AbortError') {
            if (sc) {
                const txt = sc.textContent;
                if (txt) { chat.messages.push({ role: 'assistant', content: txt }); saveChats(); }
            }
        } else {
            if (sc) sc.innerHTML = `<p style="color:var(--danger);">Error: ${escapeHtml(error.message)}</p>`;
            console.error('Pytron generateResponse error:', error);
        }
    } finally {
        APP.isGenerating = false;
        APP.abortController = null;
        toggleGeneratingUI(false);
        const tm = document.getElementById('typingMessage'); if (tm) tm.removeAttribute('id');
        const scEl = document.getElementById('streamContent'); if (scEl) scEl.removeAttribute('id');
    }
}

function stopGeneration() { if (APP.abortController) APP.abortController.abort(); }

function getPreviousConversationsContext(currentChatId) {
    const allChats = Object.values(APP.chats)
        .filter(c => c.id !== currentChatId && c.messages.length >= 2)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 3);

    if (allChats.length === 0) return '';

    let context = '';
    for (const chat of allChats) {
        const userMsgs = chat.messages.filter(m => m.role === 'user');
        if (userMsgs.length === 0) continue;
        context += `- "${chat.title}": ${userMsgs.slice(-2).map(m => m.content.substring(0, 80)).join('; ')}\n`;
    }

    return context.substring(0, 600);
}

function autoSaveMemory(chat) {
    if (!APP.currentUser) return;
    const userMsgs = chat.messages.filter(m => m.role === 'user').map(m => m.content);
    if (userMsgs.length === 0) return;

    const patterns = [
        { regex: /(?:me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚa-záéíóú]+)/i, template: 'Se llama {1}' },
        { regex: /(?:tengo|cumplo)\s+(\d{1,2})\s*años/i, template: 'Tiene {1} años' },
        { regex: /(?:juego|practico|hago|entreno)\s+(?:al?\s+)?(\w+(?:\s+\w+)?)/i, template: 'Practica {1}' },
        { regex: /(?:estudio|estudié)\s+(\w+(?:\s+\w+){0,3})/i, template: 'Estudia {1}' },
        { regex: /(?:trabajo en|trabajo como|soy)\s+((?:un |una )?(?:programador|ingenier|doctor|profesor|diseñador|estudiante|músico|artista|escritor|chef|abogado|contador|arquitecto|médico)\w*)/i, template: 'Es {1}' },
        { regex: /(?:vivo en|soy de)\s+([A-ZÁÉÍÓÚa-záéíóú]+(?:\s+[A-ZÁÉÍÓÚa-záéíóú]+){0,2})/i, template: 'Vive en {1}' },
        { regex: /(?:me gusta|me encanta|mi .* favorit[oa] es)\s+(.+?)(?:\.|,|$)/i, template: 'Le gusta {1}' },
        { regex: /(?:mi mascota|tengo (?:un |una )(?:perro|gato|pájaro|pez|conejo|hámster))\s*(?:que se llama\s+)?(\w+)?/i, template: 'Tiene mascota {1}' },
        { regex: /(?:mi color favorito es|me gusta el color)\s+(\w+)/i, template: 'Color favorito: {1}' },
        { regex: /(?:hablo|sé hablar)\s+(\w+(?:\s+y\s+\w+)*)/i, template: 'Habla {1}' },
    ];

    let newFacts = [];
    const currentMemory = (APP.memory || '').toLowerCase();

    for (const msg of userMsgs) {
        for (const p of patterns) {
            const match = msg.match(p.regex);
            if (match) {
                const fact = p.template.replace('{1}', match[1].trim());
                if (!currentMemory.includes(fact.toLowerCase().substring(0, 15))) {
                    newFacts.push(fact);
                }
            }
        }
    }

    if (newFacts.length > 0) {
        const separator = APP.memory ? '. ' : '';
        const newMemory = (APP.memory + separator + newFacts.join('. ')).substring(0, 1000);
        if (newMemory !== APP.memory) {
            APP.memory = newMemory;
            localStorage.setItem(userKey('memory'), APP.memory);
            showToast('💾 Recordaré: ' + newFacts.join(', '), 'success');
        }
    }
}

/* ============================================
   Image Generation
   ============================================ */

function openImagePrompt() {
    const prompt = window.prompt('Describe la imagen que quieres generar:');
    if (!prompt || !prompt.trim()) return;
    generateImage(prompt.trim());
}

async function generateImage(prompt) {
    if (!APP.currentUser) return;
    if (APP.isGenerating) return;
    if (!canUseFeature('images')) {
        showToast('Tu plan no incluye generación de imágenes. Mejora tu plan.', 'error');
        openPlansModal();
        return;
    }
    if (!APP.currentChatId) createNewChat();

    const chat = APP.chats[APP.currentChatId];
    hideWelcomeScreen();

    chat.messages.push({ role: 'user', content: `🎨 Genera imagen: ${prompt}` });
    appendMessage('user', `🎨 Genera imagen: ${prompt}`, true);

    APP.isGenerating = true;
    toggleGeneratingUI(true);

    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.innerHTML = getAIAvatar(APP.activeCustomAI);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<div class="image-generating"><div class="typing-indicator"><span></span><span></span><span></span></div><p>Generando imagen... (puede tardar hasta 30 seg)</p></div>';
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
    scrollToBottom();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt + ', high quality, detailed, sharp focus, professional'
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        contentDiv.innerHTML = `<div class="generated-image"><img src="${data.image}" alt="${escapeHtml(prompt)}" onclick="window.open(this.src)"><div class="image-footer"><p class="image-caption">${escapeHtml(prompt)}</p><a class="image-download" href="${data.image}" download="pytron-image.png" title="Descargar">⬇️</a></div></div>`;
        chat.messages.push({ role: 'assistant', content: `[Imagen generada: ${prompt}]`, imageData: data.image });
        chat.updatedAt = Date.now();
        saveChats();

    } catch (error) {
        clearTimeout(timeout);
        const msg = error.name === 'AbortError' ? 'La imagen tardó demasiado. Intenta de nuevo.' : error.message;
        contentDiv.innerHTML = `<p style="color:var(--danger);">Error al generar imagen: ${escapeHtml(msg)}</p>`;
        console.error('Image generation error:', error);
    } finally {
        APP.isGenerating = false;
        toggleGeneratingUI(false);
        scrollToBottom();
    }
}

/* ============================================
   Audio/Music Generation
   ============================================ */

function detectAudioRequest(text) {
    const lower = text.toLowerCase();
    const audioWords = ['música', 'musica', 'canción', 'cancion', 'melodía', 'melodia', 'audio', 'sonido', 'beat', 'instrumental', 'track', 'pista', 'ritmo', 'music', 'song'];
    const actionWords = ['genera', 'crea', 'haz', 'hazme', 'crear', 'generar', 'hacer', 'dame', 'quiero', 'compón', 'componer', 'toca', 'tocar', 'pon'];
    const hasAudio = audioWords.some(w => lower.includes(w));
    const hasAction = actionWords.some(w => lower.includes(w));
    return hasAudio && hasAction;
}

function extractAudioPrompt(text) {
    let prompt = text;
    prompt = prompt.replace(/^(por favor\s+|porfa\s+)?/i, '');
    prompt = prompt.replace(/^(genera|crea|haz|hazme|crear|generar|hacer|dame|quiero|compón|componer|toca|tocar|pon)\s*/i, '');
    prompt = prompt.replace(/^(una |un |la |el |me )?(música|musica|canción|cancion|melodía|melodia|audio|sonido|beat|instrumental|track|pista)\s*/i, '');
    prompt = prompt.replace(/^(de |del |de la |sobre |con |que |tipo |estilo |:)\s*/i, '');
    return prompt.trim() || text;
}

async function generateAudio(prompt) {
    if (!APP.currentUser) return;
    if (APP.isGenerating) return;
    if (!canUseFeature('audio')) {
        showToast('Tu plan no incluye generación de música. Mejora tu plan.', 'error');
        openPlansModal();
        return;
    }
    if (!APP.currentChatId) createNewChat();

    const chat = APP.chats[APP.currentChatId];
    hideWelcomeScreen();

    if (chat.messages.length === 0) {
        chat.title = ('Música: ' + prompt).substring(0, 40);
        chat.customAIId = APP.activeCustomAI || null;
        renderChatHistory();
    }

    chat.messages.push({ role: 'user', content: `🎵 Genera música: ${prompt}` });
    appendMessage('user', `🎵 Genera música: ${prompt}`, true);

    APP.isGenerating = true;
    toggleGeneratingUI(true);

    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.innerHTML = getAIAvatar(APP.activeCustomAI);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<div class="audio-generating">
        <div class="video-progress"><div class="video-progress-bar"></div></div>
        <p>Generando música con MusicGen... (puede tardar 1-3 minutos)</p>
    </div>`;
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
    scrollToBottom();

    try {
        const response = await fetch('/api/audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_KEY}` },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        contentDiv.innerHTML = `<div class="generated-audio">
            <div class="audio-header">🎵 Música generada</div>
            <audio controls autoplay src="${data.audio}"></audio>
            <div class="audio-footer">
                <p class="audio-caption">${escapeHtml(prompt)}</p>
                <a class="audio-download" href="${data.audio}" download="pytron-music.wav" title="Descargar">⬇️</a>
            </div>
        </div>`;

        chat.messages.push({ role: 'assistant', content: `[Música generada: ${prompt}]`, audioData: data.audio });
        chat.updatedAt = Date.now();
        saveChats();

    } catch (error) {
        contentDiv.innerHTML = `<p style="color:var(--danger);">Error al generar música: ${escapeHtml(error.message)}</p>`;
        console.error('Audio generation error:', error);
    } finally {
        APP.isGenerating = false;
        toggleGeneratingUI(false);
        scrollToBottom();
    }
}

function appendAudioMessage(caption, audioData, customAIId = null) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    const aiId = customAIId || APP.activeCustomAI;
    if (aiId && APP.customAIs[aiId]) {
        avatar.style.background = APP.customAIs[aiId].color + '20';
        avatar.style.borderColor = APP.customAIs[aiId].color + '40';
    }
    avatar.innerHTML = getAIAvatar(aiId);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    const prompt = caption.replace(/^\[Música generada: /, '').replace(/\]$/, '');
    contentDiv.innerHTML = `<div class="generated-audio">
        <div class="audio-header">🎵 Música generada</div>
        <audio controls src="${audioData}"></audio>
        <div class="audio-footer">
            <p class="audio-caption">${escapeHtml(prompt)}</p>
            <a class="audio-download" href="${audioData}" download="pytron-music.wav" title="Descargar">⬇️</a>
        </div>
    </div>`;
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
}

/* ============================================
   Video Generation
   ============================================ */

function openVideoPrompt() {
    const prompt = window.prompt('Describe el video que quieres generar (en inglés da mejores resultados):');
    if (!prompt || !prompt.trim()) return;
    generateVideo(prompt.trim());
}

async function generateVideo(prompt) {
    if (!APP.currentUser) return;
    if (APP.isGenerating) return;
    if (!canUseFeature('video')) {
        showToast('Tu plan no incluye generación de video. Mejora tu plan.', 'error');
        openPlansModal();
        return;
    }
    if (!APP.currentChatId) createNewChat();

    const chat = APP.chats[APP.currentChatId];
    hideWelcomeScreen();

    chat.messages.push({ role: 'user', content: `🎬 Genera video: ${prompt}` });
    appendMessage('user', `🎬 Genera video: ${prompt}`, true);

    APP.isGenerating = true;
    toggleGeneratingUI(true);

    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.innerHTML = getAIAvatar(APP.activeCustomAI);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<div class="video-generating">
        <div class="video-progress">
            <div class="video-progress-bar"></div>
        </div>
        <p>Generando video... Esto puede tardar 2-5 minutos. No cierres la página.</p>
    </div>`;
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
    scrollToBottom();

    try {
        const response = await fetch('/api/video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_KEY}` },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        const videoSrc = data.video;
        contentDiv.innerHTML = `<div class="generated-video">
            <video controls autoplay loop muted playsinline src="${videoSrc}">
                Tu navegador no soporta video HTML5.
            </video>
            <div class="video-footer">
                <p class="video-caption">${escapeHtml(prompt)}</p>
                <a class="video-download" href="${videoSrc}" download="pytron-video.mp4" title="Descargar">⬇️</a>
            </div>
        </div>`;

        chat.messages.push({ role: 'assistant', content: `[Video generado: ${prompt}]`, videoUrl: videoSrc });
        chat.updatedAt = Date.now();
        saveChats();

    } catch (error) {
        const msg = error.message || 'Error desconocido';
        contentDiv.innerHTML = `<p style="color:var(--danger);">Error al generar video: ${escapeHtml(msg)}</p>`;
        console.error('Video generation error:', error);
    } finally {
        APP.isGenerating = false;
        toggleGeneratingUI(false);
        scrollToBottom();
    }
}

function appendVideoMessage(caption, videoUrl, customAIId = null) {
    const container = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    const aiId = customAIId || APP.activeCustomAI;
    if (aiId && APP.customAIs[aiId]) {
        avatar.style.background = APP.customAIs[aiId].color + '20';
        avatar.style.borderColor = APP.customAIs[aiId].color + '40';
    }
    avatar.innerHTML = getAIAvatar(aiId);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    const prompt = caption.replace(/^\[Video generado: /, '').replace(/\]$/, '');
    contentDiv.innerHTML = `<div class="generated-video">
        <video controls loop muted playsinline>
            <source src="${videoUrl}" type="video/mp4">
        </video>
        <div class="video-footer">
            <p class="video-caption">${escapeHtml(prompt)}</p>
            <a class="video-download" href="${videoUrl}" download="pytron-video.mp4" target="_blank" title="Descargar">⬇️</a>
        </div>
    </div>`;
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    container.appendChild(div);
}

/* ============================================
   Vision / Image Analysis
   ============================================ */

function setupVisionInput() {
    const fileInput = document.getElementById('visionFileInput');
    if (!fileInput) return;
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';

        if (!file.type.startsWith('image/')) {
            showToast('Solo se permiten archivos de imagen.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('La imagen es muy grande. Máximo 10 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            const question = document.getElementById('messageInput').value.trim() || 'Describe esta imagen en detalle en español';
            document.getElementById('messageInput').value = '';
            analyzeImage(base64, file.name, question);
        };
        reader.readAsDataURL(file);
    });
}

function setupDragDrop() {
    let dragCounter = 0;
    const overlay = document.getElementById('dragOverlay');
    if (!overlay) return;

    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            dragCounter++;
            overlay.classList.add('active');
        }
    });

    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            overlay.classList.remove('active');
        }
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        overlay.classList.remove('active');

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            showToast('Solo se permiten archivos de imagen.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('La imagen es muy grande. Máximo 10 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            const question = document.getElementById('messageInput')?.value.trim() || 'Describe esta imagen en detalle en español';
            const msgInput = document.getElementById('messageInput');
            if (msgInput) msgInput.value = '';
            if (typeof analyzeImage === 'function') {
                analyzeImage(base64, file.name, question);
            }
        };
        reader.readAsDataURL(file);
    });
}

async function analyzeImage(imageBase64, fileName, question) {
    if (!APP.currentUser) return;
    if (APP.isGenerating) return;
    if (!canUseFeature('vision')) {
        showToast('Tu plan no incluye análisis de imágenes. Mejora tu plan.', 'error');
        openPlansModal();
        return;
    }
    if (!APP.currentChatId) createNewChat();

    const chat = APP.chats[APP.currentChatId];
    hideWelcomeScreen();

    if (chat.messages.length === 0) {
        chat.title = ('Análisis: ' + fileName).substring(0, 40);
        chat.customAIId = APP.activeCustomAI || null;
        renderChatHistory();
    }

    const container = document.getElementById('messagesContainer');

    const userDiv = document.createElement('div');
    userDiv.className = 'message';
    const userAvatar = document.createElement('div');
    userAvatar.className = 'message-avatar user';
    userAvatar.textContent = APP.currentUser ? APP.currentUser.name.charAt(0).toUpperCase() : 'T';
    const userContent = document.createElement('div');
    userContent.className = 'message-content';
    userContent.innerHTML = `<p>${escapeHtml(question)}</p><div class="vision-uploaded-image"><img src="${imageBase64}" alt="${escapeHtml(fileName)}"></div>`;
    userDiv.appendChild(userAvatar);
    userDiv.appendChild(userContent);
    container.appendChild(userDiv);
    scrollToBottom();

    chat.messages.push({ role: 'user', content: `[Imagen subida: ${fileName}] ${question}` });

    APP.isGenerating = true;
    toggleGeneratingUI(true);

    const aiDiv = document.createElement('div');
    aiDiv.className = 'message';
    const aiAvatar = document.createElement('div');
    aiAvatar.className = 'message-avatar ai';
    aiAvatar.innerHTML = getAIAvatar(APP.activeCustomAI);
    const aiContent = document.createElement('div');
    aiContent.className = 'message-content';
    aiContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div><p style="color:var(--text-secondary);font-size:14px;margin-top:8px">Analizando imagen con Florence-2...</p>';
    aiDiv.appendChild(aiAvatar);
    aiDiv.appendChild(aiContent);
    container.appendChild(aiDiv);
    scrollToBottom();

    try {
        const response = await fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64, question })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        const englishDesc = data.description;
        aiContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div><p style="color:var(--text-secondary);font-size:14px;margin-top:8px">Traduciendo y ampliando descripción...</p>';

        const expandPrompt = `El modelo de visión Florence-2 analizó una imagen y generó esta descripción en inglés:

"${englishDesc}"

El usuario preguntó: "${question}"

Basándote en la descripción del modelo de visión, responde al usuario en español de forma detallada y natural. Si la pregunta del usuario es específica, enfócate en responder eso. Si es general, describe la imagen completamente. No menciones a Florence-2 ni que estás traduciendo.`;

        if (!APP.currentChatId) { APP.isGenerating = false; toggleGeneratingUI(false); return; }

        const systemPrompt = 'Eres Pytron, un asistente que puede ver y describir imágenes. Respondes en español de forma natural y detallada.';
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: expandPrompt }
        ];

        APP.abortController = new AbortController();
        const chatResponse = await fetch(HF_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HF_API_KEY}` },
            body: JSON.stringify({ model: APP.currentModel.model, messages, temperature: 0.7, stream: true, max_tokens: 1024 }),
            signal: APP.abortController.signal
        });

        if (!chatResponse.ok) throw new Error(`Error ${chatResponse.status}`);

        let fullContent = '';
        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const d = line.slice(6).trim();
                    if (d === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(d);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) { fullContent += delta; aiContent.innerHTML = renderMarkdown(fullContent); scrollToBottom(); }
                    } catch {}
                }
            }
        }

        chat.messages.push({ role: 'assistant', content: fullContent });
        chat.updatedAt = Date.now();
        saveChats();

    } catch (error) {
        if (error.name !== 'AbortError') {
            aiContent.innerHTML = `<p style="color:var(--danger);">Error al analizar imagen: ${escapeHtml(error.message)}</p>`;
            console.error('Vision error:', error);
        }
    } finally {
        APP.isGenerating = false;
        APP.abortController = null;
        toggleGeneratingUI(false);
        scrollToBottom();
    }
}

/* ============================================
   UI Helpers
   ============================================ */

function toggleGeneratingUI(on) {
    document.getElementById('sendBtn').classList.toggle('hidden', on);
    document.getElementById('stopBtn').classList.toggle('hidden', !on);
}

function showWelcomeScreen() {
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('messagesContainer').innerHTML = '';
}
function hideWelcomeScreen() { document.getElementById('welcomeScreen').classList.add('hidden'); }

function scrollToBottom() {
    const el = document.getElementById('chatArea');
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

function renderMarkdown(text) {
    if (!text) return '';
    try { return marked.parse(text); } catch { return `<p>${escapeHtml(text)}</p>`; }
}

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    if (APP.currentUser) localStorage.setItem(userKey('theme'), next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    if (theme === 'light') {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    }
}

function copyCode(button) {
    const code = button.closest('pre').querySelector('code');
    navigator.clipboard.writeText(code.textContent).then(() => {
        const orig = button.innerHTML;
        button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copiado`;
        setTimeout(() => { button.innerHTML = orig; }, 2000);
    });
}

function runCode(button, lang) {
    const pre = button.closest('pre');
    const code = pre.querySelector('code').textContent;

    let existingOutput = pre.nextElementSibling;
    if (existingOutput && existingOutput.classList.contains('code-output')) {
        existingOutput.remove();
    }

    const outputDiv = document.createElement('div');
    outputDiv.className = 'code-output';
    outputDiv.innerHTML = '<div class="code-running">⏳ Ejecutando...</div>';
    pre.after(outputDiv);

    if (['javascript', 'js'].includes(lang)) {
        runJavaScript(code, outputDiv);
    } else if (['python', 'py'].includes(lang)) {
        runPython(code, outputDiv);
    }
}

function runJavaScript(code, outputDiv) {
    try {
        const logs = [];
        const origLog = console.log;
        const origError = console.error;
        const origWarn = console.warn;

        console.log = (...args) => {
            logs.push(args.map(a => {
                try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
                catch { return String(a); }
            }).join(' '));
        };
        console.error = (...args) => logs.push('Error: ' + args.map(String).join(' '));
        console.warn = (...args) => logs.push('Warn: ' + args.map(String).join(' '));

        let result;
        try {
            const fn = new Function(code);
            result = fn();
        } catch (e) {
            console.log = origLog;
            console.error = origError;
            console.warn = origWarn;
            outputDiv.className = 'code-output error';
            outputDiv.innerHTML = `<div class="code-output-label">❌ Error:</div>${escapeHtml(e.message)}`;
            return;
        }

        console.log = origLog;
        console.error = origError;
        console.warn = origWarn;

        let output = logs.join('\n');
        if (result !== undefined && !output.includes(String(result))) {
            output += (output ? '\n' : '') + '→ ' + String(result);
        }

        outputDiv.className = 'code-output';
        outputDiv.innerHTML = `<div class="code-output-label">✅ Resultado:</div>${escapeHtml(output || '(sin salida)')}`;
    } catch (e) {
        outputDiv.className = 'code-output error';
        outputDiv.innerHTML = `<div class="code-output-label">❌ Error:</div>${escapeHtml(e.message)}`;
    }
}

async function runPython(code, outputDiv) {
    try {
        if (!window.pyodideReady) {
            outputDiv.innerHTML = '<div class="code-running">⏳ Cargando Python (primera vez, puede tardar)...</div>';
            if (!window.pyodideLoading) {
                window.pyodideLoading = true;
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
                window.pyodide = await loadPyodide();
                window.pyodideReady = true;
            } else {
                while (!window.pyodideReady) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        outputDiv.innerHTML = '<div class="code-running">⏳ Ejecutando Python...</div>';

        window.pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
def input(prompt=''):
    return 'test'
`);

        let cleanCode = code.replace(/if\s+__name__\s*==\s*['"]__main__['"]\s*:/g, 'if True:');

        let result;
        try {
            result = window.pyodide.runPython(cleanCode);
        } catch (e) {
            outputDiv.className = 'code-output error';
            outputDiv.innerHTML = `<div class="code-output-label">❌ Error Python:</div>${escapeHtml(e.message)}`;
            return;
        }

        const stdout = window.pyodide.runPython('sys.stdout.getvalue()');
        const stderr = window.pyodide.runPython('sys.stderr.getvalue()');

        let output = stdout || '';
        if (stderr) output += (output ? '\n' : '') + stderr;
        if (result !== undefined && result !== null && String(result) !== 'None') {
            output += (output ? '\n' : '') + '→ ' + String(result);
        }

        outputDiv.className = 'code-output' + (stderr ? ' error' : '');
        outputDiv.innerHTML = `<div class="code-output-label">${stderr ? '⚠️' : '✅'} Resultado:</div>${escapeHtml(output || '(sin salida)')}`;

    } catch (e) {
        outputDiv.className = 'code-output error';
        outputDiv.innerHTML = `<div class="code-output-label">❌ Error:</div>${escapeHtml(e.message)}`;
    }
}

function toggleReaction(btn, type, msgIdx) {
    const reactionsDiv = btn.parentElement;
    const wasActive = btn.classList.contains('active');
    reactionsDiv.querySelectorAll('.reaction-btn').forEach(b => {
        if (b.dataset.reaction !== 'copy') b.classList.remove('active');
    });
    if (!wasActive) btn.classList.add('active');

    if (APP.currentChatId && APP.chats[APP.currentChatId]) {
        const chat = APP.chats[APP.currentChatId];
        if (!chat.reactions) chat.reactions = {};
        chat.reactions[msgIdx] = wasActive ? null : type;
        saveChats();
    }
}

function copyFullResponse(btn) {
    const content = btn.closest('.message-content');
    const text = content.innerText.replace(/\n*$/, '');
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 2000);
        showToast('Respuesta copiada', 'success');
    });
}

let currentTTSBtn = null;
function speakResponse(btn) {
    if (window.speechSynthesis.speaking && currentTTSBtn === btn) {
        window.speechSynthesis.cancel();
        btn.classList.remove('active');
        currentTTSBtn = null;
        return;
    }
    window.speechSynthesis.cancel();
    if (currentTTSBtn) currentTTSBtn.classList.remove('active');

    const content = btn.closest('.message-content');
    const text = content.innerText.replace(/\n*$/, '').substring(0, 5000);
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
    if (esVoice) utterance.voice = esVoice;

    btn.classList.add('active');
    currentTTSBtn = btn;

    utterance.onend = () => { btn.classList.remove('active'); currentTTSBtn = null; };
    utterance.onerror = () => { btn.classList.remove('active'); currentTTSBtn = null; };

    window.speechSynthesis.speak(utterance);
}

function showToast(msg, type = 'error') {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

/* ============================================
   Chat History
   ============================================ */

function filterChatHistory(query) {
    if (!query) { renderChatHistory(); return; }
    const todayEl = document.getElementById('todayChats');
    const olderEl = document.getElementById('olderChats');
    todayEl.innerHTML = '';
    olderEl.innerHTML = '';

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const sorted = Object.values(APP.chats).sort((a, b) => b.updatedAt - a.updatedAt);
    let hasToday = false, hasOlder = false;

    sorted.forEach(chat => {
        const titleMatch = chat.title.toLowerCase().includes(query);
        const msgMatch = chat.messages.some(m => m.content && m.content.toLowerCase().includes(query));
        if (!titleMatch && !msgMatch) return;

        const item = document.createElement('div');
        item.className = `history-item ${chat.id === APP.currentChatId ? 'active' : ''}`;
        let prefix = '';
        if (chat.customAIId && APP.customAIs[chat.customAIId]) prefix = APP.customAIs[chat.customAIId].emoji + ' ';
        const text = document.createElement('span');
        text.className = 'history-item-text';
        text.textContent = prefix + chat.title;
        item.appendChild(text);
        const del = document.createElement('button');
        del.className = 'delete-chat';
        del.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
        del.addEventListener('click', (e) => deleteChat(chat.id, e));
        item.appendChild(del);
        item.addEventListener('click', () => loadChat(chat.id));
        if (chat.createdAt >= todayTs) { todayEl.appendChild(item); hasToday = true; }
        else { olderEl.appendChild(item); hasOlder = true; }
    });

    todayEl.parentElement.style.display = hasToday ? 'block' : 'none';
    olderEl.parentElement.style.display = hasOlder ? 'block' : 'none';
}

function renderChatHistory() {
    const todayEl = document.getElementById('todayChats');
    const olderEl = document.getElementById('olderChats');
    todayEl.innerHTML = '';
    olderEl.innerHTML = '';

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const sorted = Object.values(APP.chats).sort((a, b) => b.updatedAt - a.updatedAt);
    let hasToday = false, hasOlder = false;

    sorted.forEach(chat => {
        if (APP.activeFolder && chat.folderId !== APP.activeFolder) return;
        if (APP.activeFolder === null && false) return;

        const item = document.createElement('div');
        item.className = `history-item ${chat.id === APP.currentChatId ? 'active' : ''}`;
        let prefix = '';
        if (chat.customAIId && APP.customAIs[chat.customAIId]) prefix = APP.customAIs[chat.customAIId].emoji + ' ';
        const text = document.createElement('span');
        text.className = 'history-item-text';
        text.textContent = prefix + chat.title;
        item.appendChild(text);

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:2px;align-items:center;flex-shrink:0';

        const folders = getFolders();
        if (folders.length > 0) {
            const folderBtn = document.createElement('button');
            folderBtn.className = 'delete-chat';
            folderBtn.title = 'Mover a carpeta';
            folderBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`;
            folderBtn.addEventListener('click', (e) => showFolderMenu(chat.id, e));
            actions.appendChild(folderBtn);
        }

        const del = document.createElement('button');
        del.className = 'delete-chat';
        del.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
        del.addEventListener('click', (e) => deleteChat(chat.id, e));
        actions.appendChild(del);

        item.appendChild(actions);
        item.addEventListener('click', () => loadChat(chat.id));
        if (chat.createdAt >= todayTs) { todayEl.appendChild(item); hasToday = true; }
        else { olderEl.appendChild(item); hasOlder = true; }
    });

    todayEl.parentElement.style.display = hasToday ? 'block' : 'none';
    olderEl.parentElement.style.display = hasOlder ? 'block' : 'none';
}

/* ============================================
   Settings
   ============================================ */

function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('systemPrompt').value = APP.settings.systemPrompt;
    document.getElementById('temperature').value = APP.settings.temperature;
    document.getElementById('tempValue').textContent = APP.settings.temperature;
    document.getElementById('userMemory').value = APP.memory;
    document.getElementById('memoryCount').textContent = APP.memory.length;
}

function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

function saveSettingsFromModal() {
    APP.settings.systemPrompt = document.getElementById('systemPrompt').value.trim();
    APP.settings.temperature = parseFloat(document.getElementById('temperature').value);
    APP.memory = document.getElementById('userMemory').value.trim().substring(0, 1000);
    saveSettings();
    if (APP.currentUser) localStorage.setItem(userKey('memory'), APP.memory);
    closeSettings();
    showToast('Configuración y memoria guardadas.', 'success');
}

/* ============================================
   Google Drive Integration (Download/Upload)
   ============================================ */

function setupDriveListeners() {
    const $ = id => document.getElementById(id);

    $('driveBtn').addEventListener('click', openDriveModal);
    $('closeDriveModal').addEventListener('click', closeDriveModal);
    $('driveModal').addEventListener('click', (e) => {
        if (e.target === $('driveModal')) closeDriveModal();
    });
    $('shareModal').addEventListener('click', (e) => {
        if (e.target === $('shareModal')) closeShareModal();
    });
    $('driveExportChat').addEventListener('click', driveExportCurrentChat);
    $('driveBackupAll').addEventListener('click', driveBackupAll);
    $('driveRestoreBackup').addEventListener('click', () => $('restoreFileInput').click());
    $('driveExportAllTxt').addEventListener('click', driveExportAllAsText);
    $('restoreFileInput').addEventListener('change', handleRestoreFile);
}

function openDriveModal() {
    document.getElementById('driveModal').classList.remove('hidden');
}

function closeDriveModal() {
    document.getElementById('driveModal').classList.add('hidden');
}

function downloadFile(fileName, content, mimeType, isBlob = false) {
    const blob = isBlob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function driveExportCurrentChat() {
    if (!APP.currentChatId || !APP.chats[APP.currentChatId]) {
        showToast('No hay chat abierto para exportar.');
        return;
    }

    const chat = APP.chats[APP.currentChatId];
    const safeName = (chat.title || 'Chat').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '_').substring(0, 50);
    const fileName = `Pytron_${safeName}_${new Date().toISOString().split('T')[0]}.txt`;
    const content = formatChatAsText(chat);

    downloadFile(fileName, content, 'text/plain');
    showToast(`Chat descargado: ${fileName}`, 'success');
}

function driveBackupAll() {
    const chatCount = Object.keys(APP.chats).length;
    const aiCount = Object.keys(APP.customAIs).length;

    if (chatCount === 0 && aiCount === 0) {
        showToast('No hay datos para respaldar.');
        return;
    }

    const backupData = {
        version: 1,
        app: 'Pytron',
        exportedAt: Date.now(),
        user: APP.currentUser ? { name: APP.currentUser.name, username: APP.currentUser.username } : null,
        chats: APP.chats,
        customAIs: APP.customAIs,
        settings: APP.settings,
        memory: APP.memory,
        currentModel: APP.currentModel
    };

    const fileName = `Pytron_Backup_${APP.currentUser?.username || 'user'}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(fileName, JSON.stringify(backupData, null, 2), 'application/json');
    showToast(`Respaldo descargado (${chatCount} chats, ${aiCount} IAs). Guárdalo en tu carpeta de Google Drive.`, 'success');
}

function handleRestoreFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        showToast('Selecciona un archivo .json de respaldo.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const backupData = JSON.parse(event.target.result);

            if (!backupData.version || !backupData.chats) {
                showToast('El archivo no es un respaldo válido de Pytron.');
                return;
            }

            const date = new Date(backupData.exportedAt).toLocaleString();
            const chatCount = Object.keys(backupData.chats).length;
            const aiCount = Object.keys(backupData.customAIs || {}).length;

            if (!confirm(`¿Restaurar respaldo del ${date}?\n\n${chatCount} conversaciones, ${aiCount} IAs.\n\nEsto reemplazará tus datos actuales.`)) return;

            APP.chats = backupData.chats || {};
            APP.customAIs = backupData.customAIs || {};
            APP.settings = backupData.settings || { systemPrompt: '', temperature: 0.7 };
            APP.memory = backupData.memory || '';
            if (backupData.currentModel) APP.currentModel = backupData.currentModel;

            saveChats();
            saveCustomAIs();
            saveSettings();
            if (APP.currentUser) {
                localStorage.setItem(userKey('memory'), APP.memory);
                localStorage.setItem(userKey('model'), JSON.stringify(APP.currentModel));
            }

            APP.currentChatId = null;
            renderChatHistory();
            renderCustomAIs();
            showWelcomeScreen();
            closeDriveModal();
            showToast(`Respaldo restaurado: ${chatCount} chats, ${aiCount} IAs.`, 'success');
        } catch (err) {
            console.error('Restore error:', err);
            showToast('Error al leer el archivo: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function driveExportAllAsText() {
    const chats = Object.values(APP.chats);
    if (chats.length === 0) {
        showToast('No hay conversaciones para exportar.');
        return;
    }

    let fullText = `PYTRON — Exportación completa\nUsuario: ${APP.currentUser?.name || 'Desconocido'}\nFecha: ${new Date().toLocaleString()}\nTotal de conversaciones: ${chats.length}\n${'═'.repeat(60)}\n\n`;

    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    chats.forEach((chat, i) => {
        fullText += formatChatAsText(chat, i + 1);
        fullText += '\n\n';
    });

    const fileName = `Pytron_Conversaciones_${new Date().toISOString().split('T')[0]}.txt`;
    downloadFile(fileName, fullText, 'text/plain');
    showToast(`${chats.length} conversaciones descargadas.`, 'success');
}

function formatChatAsText(chat, index) {
    let text = '';
    if (index) text += `[${index}] `;
    text += `${chat.title || 'Sin título'}\n`;
    text += `Fecha: ${new Date(chat.createdAt || Date.now()).toLocaleString()}\n`;
    text += `${'─'.repeat(40)}\n\n`;

    for (const msg of chat.messages) {
        if (msg.role === 'system') continue;
        const role = msg.role === 'user' ? 'Tú' : 'Pytron';
        text += `${role}:\n${msg.content}\n\n`;
    }

    text += `${'═'.repeat(60)}\n`;
    return text;
}
