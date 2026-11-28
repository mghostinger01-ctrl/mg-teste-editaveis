/**
 * MG Editáveis - Sistema de Segurança por Aparelho / Máquina (Anti-Revenda de Contas)
 * 
 * Regra:
 * - O aparelho/máquina do cliente é identificado através de token persistente + fingerprint de hardware (GPU/Tela/CPU/SO).
 * - O primeiro acesso vincula o usuário àquela máquina/aparelho específico.
 * - Trocas normais de rede (Wi-Fi para 4G/5G, dados móveis ou reinicialização de roteador) são PERMITIDAS no mesmo aparelho.
 * - O BLOQUEIO ocorre estritamente quando há tentativa de acesso a partir de OUTRA MÁQUINA / OUTRO CELULAR.
 * - O Administrador pode resetar o vínculo de aparelho a qualquer momento no painel (/admin ou /adm-br7).
 */
(function(window) {
    'use strict';

    function isExemptAdmin(user) {
        if (!user) {
            try {
                if (localStorage.getItem('happynation_admin_auth') === 'true' || 
                    sessionStorage.getItem('happynation_admin_auth') === 'true' ||
                    localStorage.getItem('happynation_br7_auth') === 'true' ||
                    sessionStorage.getItem('happynation_br7_auth') === 'true' ||
                    localStorage.getItem('happynation_is_admin') === 'true' ||
                    sessionStorage.getItem('happynation_is_admin') === 'true') {
                    return true;
                }
            } catch(e) {}
            const path = (window.location.pathname || '').toLowerCase();
            return path.includes('admin') || path.includes('adm-br7') || path.includes('suporte-adm');
        }

        const role = String(user.role || '').toLowerCase().trim();
        const email = String(user.email || '').toLowerCase().trim();
        const nome = String(user.nome || '').toLowerCase().trim();

        if (role === 'admin' || role === 'adm' || role === 'operator' || role === 'suporte') {
            return true;
        }

        if (email === 'mg' || email === 'br7' || email.includes('admin') || email.includes('mgeditaveis') || email.includes('gustavo') ||
            nome.includes('administrador') || nome.includes('br7') || nome.includes('operador')) {
            return true;
        }

        try {
            if (localStorage.getItem('happynation_admin_auth') === 'true' || 
                sessionStorage.getItem('happynation_admin_auth') === 'true' ||
                localStorage.getItem('happynation_br7_auth') === 'true' ||
                sessionStorage.getItem('happynation_br7_auth') === 'true') {
                return true;
            }
        } catch(e) {}

        const path = (window.location.pathname || '').toLowerCase();
        return path.includes('admin') || path.includes('adm-br7') || path.includes('suporte-adm');
    }


    const SUP_URL = 'https://bgaurmeuimrtvawworxv.supabase.co';
    const SUP_KEY = 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ';

    let _cachedIp = null;
    let _detectingPromise = null;

    // Helper universal de fetch com timeout
    function fetchTimeout(url, ms) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), ms || 3000);
            fetch(url)
                .then(res => {
                    clearTimeout(timer);
                    resolve(res);
                })
                .catch(err => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    // ─── 0. IDENTIFICAÇÃO ÚNICA DE APARELHO / MÁQUINA (DEVICE TOKEN + HARDWARE HASH) ───
    function getDeviceToken() {
        let token = null;
        try { token = localStorage.getItem('happynation_device_token'); } catch(e){}
        if (!token) {
            try {
                const m = document.cookie.match(/happynation_device_token=([^;]+)/);
                if (m) token = decodeURIComponent(m[1]);
            } catch(e){}
        }
        if (!token) {
            token = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
            try { localStorage.setItem('happynation_device_token', token); } catch(e){}
            try { document.cookie = `happynation_device_token=${token}; path=/; max-age=315360000; SameSite=Lax`; } catch(e){}
        }
        return token;
    }

    function getHardwareFingerprint() {
        try {
            const parts = [
                (window.screen ? (window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth) : 'scr_na'),
                navigator.hardwareConcurrency || 'cpu_na',
                navigator.platform || 'plat_na',
                (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'tz_na'
            ];

            // WebGL renderer signature (GPU da máquina / celular)
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const ext = gl.getExtension('WEBGL_debug_renderer_info');
                    if (ext) {
                        parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
                    }
                }
            } catch(eGl){}

            // Hash 32-bit FNV
            const str = parts.join('|||');
            let hash = 2166136261;
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
            }
            return 'hw_' + (hash >>> 0).toString(16);
        } catch(e) {
            return 'hw_fallback';
        }
    }

    // ─── 1. CAPTURA AUTOMÁTICA DE IP COM MÚLTIPLOS PROVEDORES PARALELOS ───
    async function detectClientIp() {
        if (_cachedIp && _cachedIp !== '127.0.0.1' && _cachedIp !== '::1') return _cachedIp;

        try {
            const sessIp = sessionStorage.getItem('happynation_detected_ip');
            if (sessIp && sessIp.length >= 7 && sessIp !== '127.0.0.1' && sessIp !== '::1') {
                _cachedIp = sessIp;
                return sessIp;
            }
        } catch(e) {}

        if (_detectingPromise) return _detectingPromise;

        const providers = [
            async () => {
                const res = await fetchTimeout('api/index.php?action=get_client_ip', 1500);
                if (!res.ok) throw new Error('local failed');
                const data = await res.json();
                const ip = (data && data.data && data.data.ip) || (data && data.ip);
                if (ip && ip.length >= 7 && ip !== '127.0.0.1' && ip !== '::1') return ip.trim();
                throw new Error('invalid local ip');
            },
            async () => {
                const res = await fetchTimeout('https://api.ipify.org?format=json', 2200);
                if (!res.ok) throw new Error('ipify failed');
                const data = await res.json();
                if (data && data.ip && data.ip.length >= 7) return data.ip.trim();
                throw new Error('invalid ipify ip');
            },
            async () => {
                const res = await fetchTimeout('https://api64.ipify.org?format=json', 2200);
                if (!res.ok) throw new Error('ipify64 failed');
                const data = await res.json();
                if (data && data.ip && data.ip.length >= 7) return data.ip.trim();
                throw new Error('invalid ipify64 ip');
            },
            async () => {
                const res = await fetchTimeout('https://www.cloudflare.com/cdn-cgi/trace', 2200);
                if (!res.ok) throw new Error('cf failed');
                const text = await res.text();
                const match = text.match(/ip=([^\n]+)/);
                if (match && match[1] && match[1].trim().length >= 7) return match[1].trim();
                throw new Error('invalid cf ip');
            },
            async () => {
                const res = await fetchTimeout('https://icanhazip.com', 2200);
                if (!res.ok) throw new Error('icanhazip failed');
                const text = await res.text();
                if (text && text.trim().length >= 7) return text.trim();
                throw new Error('invalid icanhazip');
            }
        ];

        _detectingPromise = Promise.any(providers.map(fn => fn()))
            .then(ip => {
                _cachedIp = ip;
                try { sessionStorage.setItem('happynation_detected_ip', ip); } catch(e) {}
                return ip;
            })
            .catch(() => '127.0.0.1')
            .finally(() => {
                _detectingPromise = null;
            });

        return _detectingPromise;
    }

    try { setTimeout(detectClientIp, 50); } catch(ePre) {}

    // ─── 2. WHATSAPP DE SUPORTE DINÂMICO ───
    function getSupportPhone() {
        let phone = localStorage.getItem('happynation_whatsapp') || '';
        phone = phone.replace(/\D/g, '');
        if (!phone || phone.length < 8) phone = '5521998821029';
        if (phone.length <= 11 && !phone.startsWith('55')) phone = '55' + phone;
        return phone;
    }

    // ─── 3. VERIFICAÇÃO INTELIGENTE DE APARELHO / MÁQUINA ───
    async function checkDeviceAccess(user, currentIp) {
        if (!user) return { allowed: false, reason: 'no_user' };

        // Administradores e Operadores são 100% isentos de bloqueio de IP
        if (isExemptAdmin(user)) {
            return { allowed: true, isAdmin: true };
        }

        const registeredIp = (user.register_ip || user.ip || '').trim();
        const curIp = (currentIp || '').trim();

        const currentToken = getDeviceToken();
        const currentHw = getHardwareFingerprint();

        // 1. Conta sem aparelho/IP vinculado (1º acesso ou resetada pelo Administrador)
        if (!registeredIp) {
            return { allowed: true, needBind: true, token: currentToken, hw: currentHw };
        }

        // 2. Verificação Rápida Local (mesmo aparelho com token já validado anteriormente)
        let localBoundToken = null;
        try {
            localBoundToken = localStorage.getItem('happynation_bound_user_' + user.id);
        } catch(e){}

        if (localBoundToken && localBoundToken === currentToken) {
            // MESMO APARELHO CONFIRMADO! Troca de Wi-Fi/4G/5G permitida.
            if (curIp && curIp !== user.last_ip) {
                updateUserLastIp(user.id, curIp);
            }
            return { allowed: true, sameDevice: true };
        }

        // 3. Consulta ao Supabase configuracoes para o vínculo deste usuário
        let remoteDev = null;
        try {
            const res = await fetch(`${SUP_URL}/rest/v1/configuracoes?chave=eq.dev_user_${encodeURIComponent(user.id)}`, {
                headers: { 'apikey': SUP_KEY, 'Authorization': 'Bearer ' + SUP_KEY }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0 && data[0].valor) {
                    try { remoteDev = JSON.parse(data[0].valor); } catch(eP){}
                }
            }
        } catch(eFetch){}

        // Se for usuário antigo sem dev_user cadastrado no Supabase ainda:
        if (!remoteDev) {
            // Se o IP bater com o de cadastro ou for a mesma sub-rede
            if (registeredIp === curIp || (curIp && curIp.split('.').slice(0, 2).join('.') === registeredIp.split('.').slice(0, 2).join('.'))) {
                await bindUserDevice(user.id, curIp);
                return { allowed: true, boundNow: true };
            } else {
                return {
                    allowed: false,
                    reason: 'different_machine',
                    registeredIp: registeredIp,
                    currentIp: curIp,
                    nome: user.nome || 'Cliente',
                    email: user.email || ''
                };
            }
        }

        // 4. Comparação com o Aparelho Remoto Cadastrado
        const isMatchToken = Boolean(remoteDev.token && remoteDev.token === currentToken);
        const isMatchHw = Boolean(remoteDev.hw && remoteDev.hw === currentHw && remoteDev.hw !== 'hw_fallback');

        if (isMatchToken || isMatchHw) {
            // É O MESMO APARELHO! (O cliente apenas alternou entre Wi-Fi e 4G/5G)
            try {
                localStorage.setItem('happynation_bound_user_' + user.id, remoteDev.token || currentToken);
            } catch(e){}

            // Atualiza last_ip silenciosamente
            if (curIp && curIp !== user.last_ip) {
                updateUserLastIp(user.id, curIp);
            }

            return { allowed: true, sameDevice: true, networkSwitched: (curIp !== registeredIp) };
        }

        // 5. TENTATIVA A PARTIR DE OUTRA MÁQUINA / OUTRO CELULAR DETECTADA!
        return {
            allowed: false,
            reason: 'different_machine',
            registeredIp: registeredIp,
            currentIp: curIp,
            nome: user.nome || 'Cliente',
            email: user.email || ''
        };
    }

    // Helper síncrono mantido para compatibilidade imediata
    function isIpAllowed(user, currentIp) {
        if (!user) return { allowed: false, reason: 'no_user' };
        if (isExemptAdmin(user)) { return { allowed: true, isAdmin: true }; }
        const registeredIp = (user.register_ip || user.ip || '').trim();
        if (!registeredIp) return { allowed: true, needBind: true };

        const currentToken = getDeviceToken();
        try {
            const localBound = localStorage.getItem('happynation_bound_user_' + user.id);
            if (localBound && localBound === currentToken) {
                return { allowed: true, sameDevice: true };
            }
        } catch(e){}

        if (registeredIp === (currentIp || '').trim()) {
            return { allowed: true };
        }

        return { allowed: true, checkAsyncNeeded: true };
    }

    // ─── 4. VINCULAR APARELHO / MÁQUINA NO SUPABASE ───
    async function bindUserDevice(userId, currentIp) {
        if (!userId) return;
        const devToken = getDeviceToken();
        const hwHash = getHardwareFingerprint();

        try {
            localStorage.setItem('happynation_bound_user_' + userId, devToken);
        } catch(e){}

        // 1. Salva nas configurações o vínculo do aparelho
        try {
            await fetch(`${SUP_URL}/rest/v1/configuracoes`, {
                method: 'POST',
                headers: {
                    'apikey': SUP_KEY,
                    'Authorization': 'Bearer ' + SUP_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    chave: 'dev_user_' + userId,
                    valor: JSON.stringify({
                        token: devToken,
                        hw: hwHash,
                        ip: currentIp || null,
                        bound_at: new Date().toISOString()
                    })
                })
            });
        } catch(e){}

        // 2. Atualiza register_ip e last_ip em usuarios
        if (currentIp) {
            try {
                await fetch(`${SUP_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUP_KEY,
                        'Authorization': 'Bearer ' + SUP_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        register_ip: currentIp,
                        last_ip: currentIp
                    })
                });
            } catch(e2){}
        }
    }

    async function updateUserLastIp(userId, currentIp) {
        if (!userId || !currentIp) return;
        try {
            await fetch(`${SUP_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUP_KEY,
                    'Authorization': 'Bearer ' + SUP_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    last_ip: currentIp
                })
            });
        } catch(e){}
    }

    // ─── 5. REGISTRAR BLOQUEIO DE CONTA POR TENTATIVA EM OUTRA MÁQUINA ───
    async function lockUserByIp(param1, param2, param3, param4) {
        let userId, email, registeredIp, currentIp;
        if (typeof param1 === 'object' && param1 !== null) {
            userId = param1.id;
            email = param1.email;
            registeredIp = param1.register_ip || param1.registeredIp;
            currentIp = param2;
        } else {
            userId = param1;
            email = param2;
            registeredIp = param3;
            currentIp = param4;
        }

        try {
            if (userId) {
                await fetch(`${SUP_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUP_KEY,
                        'Authorization': 'Bearer ' + SUP_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'blocked',
                        last_ip: currentIp
                    })
                });
            }
        } catch(e) {}
    }

    // ─── 6. MODAL DE BLOQUEIO DE SEGURANÇA (DESIGN ENTERPRISE & WHATSAPP) ───
    function showBlockedModal(data) {
        if (isExemptAdmin(data)) return;
        if (!data) data = {};
        let existingModal = document.getElementById('mgIpBlockedModal');
        if (existingModal) existingModal.remove();

        const nome = data.nome || data.name || 'Cliente';
        const email = data.email || '--';
        const regIp = data.registeredIp || data.register_ip || data.registerIp || 'Dispositivo de Cadastro';
        const curIp = data.currentIp || data.current_ip || data.currentIp || 'Outra Máquina Detectada';

        const phone = getSupportPhone();
        const msg = encodeURIComponent(
            `Olá! Minha conta no MG Editáveis foi bloqueada por tentativa de acesso em outro aparelho/máquina.\n\n` +
            `👤 *Nome:* ${nome}\n` +
            `📧 *E-mail:* ${email}\n` +
            `🔒 *Aparelho Original:* ${regIp}\n` +
            `🌐 *IP / Máquina Atual:* ${curIp}\n\n` +
            `Solicito o reset de aparelho com o suporte.`
        );
        const whatsUrl = `https://wa.me/${phone}?text=${msg}`;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'mgIpBlockedModal';
        modalDiv.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 99999999;
            background: rgba(8, 10, 11, 0.94);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            animation: mgFadeInModal 0.25s ease-out forwards;
        `;

        modalDiv.innerHTML = `
            <style>
                @keyframes mgFadeInModal { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                @keyframes mgPulseRed { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); } 70% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
            </style>
            <div style="
                background: linear-gradient(160deg, #15181a 0%, #0f1113 100%);
                border: 1px solid rgba(239, 68, 68, 0.4);
                box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(239, 68, 68, 0.2);
                border-radius: 20px;
                max-width: 480px;
                width: 100%;
                padding: 32px 28px;
                text-align: center;
                color: #ffffff;
                position: relative;
            ">
                <div style="
                    width: 68px;
                    height: 68px;
                    margin: 0 auto 18px auto;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.15);
                    border: 2px solid #ef4444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ef4444;
                    animation: mgPulseRed 2s infinite;
                ">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>

                <div style="
                    display: inline-block;
                    font-size: 10.5px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.35);
                    padding: 4px 12px;
                    border-radius: 20px;
                    margin-bottom: 12px;
                ">
                    Acesso Negado • Outra Máquina
                </div>

                <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 10px; color: #fff; letter-spacing: -0.3px;">
                    Tentativa em Outro Aparelho
                </h2>

                <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.55; margin-bottom: 22px;">
                    Para proteger o sistema contra <strong>compartilhamento ou revenda de contas</strong>, sua conta é de uso pessoal e vinculada estritamente ao seu <strong>aparelho/máquina de cadastro</strong>.<br>
                    <span style="font-size:12px; color:#cbd5e1; margin-top:6px; display:inline-block;">(Você pode usar Wi-Fi ou 4G livremente no mesmo aparelho. Acesso em outro computador/celular requer liberação do suporte).</span>
                </p>

                <!-- Box Comparativo de Aparelho / IP -->
                <div style="
                    background: rgba(0, 0, 0, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 22px;
                    text-align: left;
                    font-size: 12.5px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #64748b; font-size: 11.5px;">Cliente:</span>
                        <span style="color: #f1f5f9; font-weight: 700;">${nome}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px;">
                        <span style="color: #64748b; font-size: 11.5px;">E-mail:</span>
                        <span style="color: #94a3b8; font-family: monospace;">${email}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #00dc82; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                            Aparelho Autorizado:
                        </span>
                        <span style="font-family: monospace; color: #00dc82; font-weight: 800; background: rgba(0,220,130,0.12); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(0,220,130,0.3);">${regIp}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Máquina / IP Detectado:
                        </span>
                        <span style="font-family: monospace; color: #ef4444; font-weight: 800; background: rgba(239,68,68,0.12); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3);">${curIp}</span>
                    </div>
                </div>

                <!-- Botões de Ação -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <a href="${whatsUrl}" target="_blank" style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        background: #25d366;
                        color: #ffffff;
                        font-weight: 800;
                        font-size: 14px;
                        padding: 13px 20px;
                        border-radius: 10px;
                        text-decoration: none;
                        box-shadow: 0 4px 18px rgba(37, 211, 102, 0.4);
                        transition: transform 0.2s, background 0.2s;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652c1.746.951 3.71 1.452 5.711 1.453h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.411z"/>
                        </svg>
                        <span>Falar com Suporte no WhatsApp</span>
                    </a>

                    <button type="button" onclick="window.location.replace('login.html?logged_out=1')" style="
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        color: #94a3b8;
                        font-weight: 600;
                        font-size: 13px;
                        padding: 10px 18px;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: background 0.2s;
                    ">
                        Voltar ao Início / Fazer Login
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
    }

    // Exporta objeto global com funções melhoradas
    window.MGIpSecurity = {
        detectIp: detectClientIp,
        getDeviceToken: getDeviceToken,
        getHardwareFingerprint: getHardwareFingerprint,
        checkDeviceAccess: checkDeviceAccess,
        isIpAllowed: isIpAllowed,
        bindUserDevice: bindUserDevice,
        bindUserIp: bindUserDevice, // alias
        lockUserByIp: lockUserByIp,
        showBlockedModal: showBlockedModal,
        getSupportPhone: getSupportPhone
    };

    // Auto-detecta parâmetros de bloqueio na URL ao carregar
    document.addEventListener('DOMContentLoaded', function() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('bloqueado') === 'ip_divergente' || params.get('bloqueado') === 'dispositivo_divergente') {
                const regIp = params.get('ip_reg') || '';
                const curIp = params.get('ip_cur') || '';
                const nome = params.get('nome') || '';
                const email = params.get('email') || '';
                showBlockedModal({ registeredIp: regIp, currentIp: curIp, nome: nome, email: email });
            }
        } catch(e) {}
    });

})(window);
