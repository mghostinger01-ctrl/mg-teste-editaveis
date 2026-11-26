/**
 * MG Editáveis - Sistema de Segurança e Bloqueio de IP Estrito (Anti-Revenda de Contas)
 * 
 * Regra:
 * - O IP público é capturado automaticamente no momento do cadastro (sem o usuário precisar digitar).
 * - A conta fica estritamente vinculada a este IP (register_ip).
 * - Qualquer acesso ou tentativa de login a partir de um IP diferente bloqueia a conta imediatamente.
 * - Em caso de bloqueio, exibe tela de segurança completa com detalhes e botão direto para suporte no WhatsApp.
 * - O Administrador possui isenção total e controle de reset/desvinculação de IP no painel.
 */
(function(window) {
    'use strict';

    const SUP_URL = 'https://bgaurmeuimrtvawworxv.supabase.co';
    const SUP_KEY = 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ';

    let _cachedIp = null;
    let _detectingPromise = null;

    // Helper universal de fetch com timeout compatível com qualquer navegador
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

    // ─── 1. CAPTURA AUTOMÁTICA ULTRA-RÁPIDA DE IP COM MÚLTIPLOS PROVEDORES PARALELOS ───
    async function detectClientIp() {
        if (_cachedIp && _cachedIp !== '127.0.0.1' && _cachedIp !== '::1') return _cachedIp;

        // Tenta recuperar do sessionStorage
        try {
            const sessIp = sessionStorage.getItem('happynation_detected_ip');
            if (sessIp && sessIp.length >= 7 && sessIp !== '127.0.0.1' && sessIp !== '::1') {
                _cachedIp = sessIp;
                return sessIp;
            }
        } catch(e) {}

        if (_detectingPromise) return _detectingPromise;

        const providers = [
            // Provedor 1: API local PHP (Hostinger/cPanel/XAMPP - se disponível)
            async () => {
                const res = await fetchTimeout('api/index.php?action=get_client_ip', 1500);
                if (!res.ok) throw new Error('local failed');
                const data = await res.json();
                const ip = (data && data.data && data.data.ip) || (data && data.ip);
                if (ip && ip.length >= 7 && ip !== '127.0.0.1' && ip !== '::1') return ip.trim();
                throw new Error('invalid local ip');
            },
            // Provedor 2: ipify IPv4
            async () => {
                const res = await fetchTimeout('https://api.ipify.org?format=json', 2200);
                if (!res.ok) throw new Error('ipify failed');
                const data = await res.json();
                if (data && data.ip && data.ip.length >= 7) return data.ip.trim();
                throw new Error('invalid ipify ip');
            },
            // Provedor 3: ipify IPv6/IPv4 universal
            async () => {
                const res = await fetchTimeout('https://api64.ipify.org?format=json', 2200);
                if (!res.ok) throw new Error('ipify64 failed');
                const data = await res.json();
                if (data && data.ip && data.ip.length >= 7) return data.ip.trim();
                throw new Error('invalid ipify64 ip');
            },
            // Provedor 4: Cloudflare trace oficial (ultra rápido em qualquer rede)
            async () => {
                const res = await fetchTimeout('https://www.cloudflare.com/cdn-cgi/trace', 2200);
                if (!res.ok) throw new Error('cf failed');
                const text = await res.text();
                const match = text.match(/ip=([^\n]+)/);
                if (match && match[1] && match[1].trim().length >= 7) return match[1].trim();
                throw new Error('invalid cf ip');
            },
            // Provedor 5: icanhazip.com
            async () => {
                const res = await fetchTimeout('https://icanhazip.com', 2200);
                if (!res.ok) throw new Error('icanhazip failed');
                const text = await res.text();
                if (text && text.trim().length >= 7) return text.trim();
                throw new Error('invalid icanhazip');
            },
            // Provedor 6: ipapi.co
            async () => {
                const res = await fetchTimeout('https://ipapi.co/json/', 2200);
                if (!res.ok) throw new Error('ipapi failed');
                const data = await res.json();
                if (data && data.ip && data.ip.length >= 7) return data.ip.trim();
                throw new Error('invalid ipapi');
            }
        ];

        _detectingPromise = Promise.any(providers.map(fn => fn()))
            .then(ip => {
                _cachedIp = ip;
                try { sessionStorage.setItem('happynation_detected_ip', ip); } catch(e) {}
                return ip;
            })
            .catch(() => {
                return '127.0.0.1';
            })
            .finally(() => {
                _detectingPromise = null;
            });

        return _detectingPromise;
    }

    // Pré-aquecimento da detecção em background assim que o script é carregado
    try { setTimeout(detectClientIp, 50); } catch(ePre) {}

    // ─── 2. WHATSAPP DE SUPORTE DINÂMICO ───
    function getSupportPhone() {
        let phone = localStorage.getItem('happynation_whatsapp') || '';
        phone = phone.replace(/\D/g, '');
        if (!phone || phone.length < 8) phone = '5521998821029';
        if (phone.length <= 11 && !phone.startsWith('55')) phone = '55' + phone;
        return phone;
    }

    // ─── 3. VALIDAÇÃO DE IP E DETECÇÃO DE DIVERGÊNCIA ───
    function isIpAllowed(user, currentIp) {
        if (!user) return { allowed: false, reason: 'no_user' };
        
        // Administradores são isentos de restrição de IP
        const role = String(user.role || '').toLowerCase();
        const email = String(user.email || '').toLowerCase().trim();
        if (role === 'admin' || email === 'mg' || email === 'admin@mgeditaveis.com.br' || email.includes('admin@mgeditaveis')) {
            return { allowed: true, isAdmin: true };
        }

        const registeredIp = (user.register_ip || user.ip || '').trim();
        const curIp = (currentIp || '').trim();

        // Se o usuário ainda não tiver IP registrado (contas antigas), autoriza e solicita vinculação
        if (!registeredIp) {
            return { allowed: true, needBind: true };
        }

        // Se o IP for idêntico, acesso permitido
        if (registeredIp === curIp || registeredIp.toLowerCase() === curIp.toLowerCase()) {
            return { allowed: true };
        }

        // DIVERGÊNCIA DE IP DETECTADA: ACESSO BLOQUEADO!
        return {
            allowed: false,
            reason: 'ip_divergence',
            registeredIp: registeredIp,
            currentIp: curIp,
            nome: user.nome || 'Cliente',
            email: user.email || ''
        };
    }

    // ─── 4. VINCULAR / ATUALIZAR IP DO CLIENTE NO BANCO ───
    async function bindUserIp(userId, ipToBind) {
        if (!userId || !ipToBind) return;
        try {
            // Atualiza no Supabase
            await fetch(`${SUP_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUP_KEY,
                    'Authorization': 'Bearer ' + SUP_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    register_ip: ipToBind,
                    last_ip: ipToBind
                })
            });
        } catch(e) {}

        // Atualiza na API PHP se disponível
        try {
            await fetch('api/index.php?action=bind_ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, ip: ipToBind })
            });
        } catch(e2) {}
    }

    // ─── 5. REGISTRAR BLOQUEIO DE CONTA POR DIVERGÊNCIA DE IP ───
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
            // Atualiza status do usuário para blocked no Supabase
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

        // Registra na tabela de ips_bloqueados via API PHP
        try {
            await fetch('api/index.php?action=block_ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: currentIp,
                    user_email: email,
                    motivo: `Divergência de IP: Cadastrado no IP ${registeredIp}, tentou acessar pelo IP ${currentIp}`
                })
            });
        } catch(e2) {}
    }

    // ─── 6. MODAL DE BLOQUEIO DE IP (DESIGN PREMIUM & WHATSAPP DIRETO) ───
    function showBlockedModal(data) {
        if (!data) data = {};
        let existingModal = document.getElementById('mgIpBlockedModal');
        if (existingModal) existingModal.remove();

        const nome = data.nome || data.name || 'Cliente';
        const email = data.email || '--';
        const regIp = data.registeredIp || data.register_ip || data.registerIp || 'Não identificado';
        const curIp = data.currentIp || data.current_ip || data.currentIp || 'Não identificado';

        const phone = getSupportPhone();
        const msg = encodeURIComponent(
            `Olá! Minha conta no MG Editáveis foi bloqueada por divergência de IP de segurança.\n\n` +
            `👤 *Nome:* ${nome}\n` +
            `📧 *E-mail:* ${email}\n` +
            `🔒 *IP Registrado:* ${regIp}\n` +
            `🌐 *IP Atual Detectado:* ${curIp}\n\n` +
            `Solicito a validação e liberação com o suporte.`
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
                <!-- Ícone de Alerta com Pulso -->
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
                    Divergência de IP • Acesso Bloqueado
                </div>

                <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 10px; color: #fff; letter-spacing: -0.3px;">
                    Acesso Não Autorizado
                </h2>

                <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.55; margin-bottom: 22px;">
                    Para sua segurança e proteção contra <strong>revenda ou compartilhamento ilegal de contas</strong>, esta conta é vinculada estritamente ao IP de cadastro.
                </p>

                <!-- Box Comparativo de IPs -->
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
                            IP Autorizado:
                        </span>
                        <span style="font-family: monospace; color: #00dc82; font-weight: 800; background: rgba(0,220,130,0.12); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(0,220,130,0.3);">${regIp}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #ef4444; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            IP Detectado:
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

    // Exporta objeto global
    window.MGIpSecurity = {
        detectIp: detectClientIp,
        isIpAllowed: isIpAllowed,
        bindUserIp: bindUserIp,
        lockUserByIp: lockUserByIp,
        showBlockedModal: showBlockedModal,
        getSupportPhone: getSupportPhone
    };

    // Auto-detecta parâmetros de bloqueio na URL ao carregar
    document.addEventListener('DOMContentLoaded', function() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('bloqueado') === 'ip_divergente') {
                const regIp = params.get('ip_reg') || '';
                const curIp = params.get('ip_cur') || '';
                const nome = params.get('nome') || '';
                const email = params.get('email') || '';
                showBlockedModal({ registeredIp: regIp, currentIp: curIp, nome: nome, email: email });
            }
        } catch(e) {}
    });

})(window);
