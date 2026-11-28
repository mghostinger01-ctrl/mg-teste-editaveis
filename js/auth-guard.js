/**
 * MG Editáveis - Auth Guard & Proteção de Rotas
 * Impede o acesso direto a qualquer área interna sem autenticação prévia.
 * Redireciona imediatamente para login.html caso o usuário não esteja autenticado.
 */
(function() {
    'use strict';
    // MULTI-DOMINIO HOSTMF AUTO-ROUTE
    try {
        var currentHost = window.location.hostname.toLowerCase();
        var rawCfg = localStorage.getItem('happynation_domains_cfg');
        if (rawCfg) {
            var dCfg = JSON.parse(rawCfg);
            if (dCfg) {
                // Se o visitante acessou a raiz usando o domínio de Validação
                if (dCfg.dominioQrCode && dCfg.dominioQrCode.toLowerCase().includes(currentHost)) {
                    if (!window.location.pathname.includes('validar-cnh.html')) {
                        window.location.replace('validar-cnh.html' + window.location.search);
                        return;
                    }
                }
                // Se o visitante acessou a raiz usando o domínio do App CDT
                if (dCfg.dominioApp && dCfg.dominioApp.toLowerCase().includes(currentHost)) {
                    if (!window.location.pathname.includes('/app/')) {
                        window.location.replace('app/index.html' + window.location.search);
                        return;
                    }
                }
            }
        }
    } catch(e) {}


    // Global logout helper acessível em qualquer página interna
    window.handleLogout = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        try {
            localStorage.removeItem('happynation_user');
            sessionStorage.removeItem('happynation_user');
        } catch(err) {}
        var isSubdir = window.location.pathname.includes('/app/');
        window.location.replace((isSubdir ? '../' : '') + 'login.html?logged_out=1');
    };

    try {
        var user = null;
        var rawLocal = localStorage.getItem('happynation_user');
        var rawSession = sessionStorage.getItem('happynation_user');

        if (rawLocal) {
            try { user = JSON.parse(rawLocal); } catch(e) {}
        }
        if (!user && rawSession) {
            try { user = JSON.parse(rawSession); } catch(e) {}
        }

        // Valida se o usuário está devidamente autenticado
        var isValid = Boolean(user && (user.logged === true || user.id) && user.email);

        if (!isValid) {
            // Limpa resíduos de sessões inválidas
            try {
                localStorage.removeItem('happynation_user');
                sessionStorage.removeItem('happynation_user');
            } catch(e) {}

            // Redireciona instantaneamente para login.html
            var isSubdir = window.location.pathname.includes('/app/');
            var target = (isSubdir ? '../' : '') + 'login.html';
            window.location.replace(target);
            return;
        }

        // ── VERIFICAÇÃO DE EXCLUSÃO DE CONTA (PERDA INSTANTÂNEA DE ACESSO) ──
        var uStatus = String(user.status || '').toLowerCase().trim();
        if (uStatus === 'deleted' || uStatus === 'excluido' || uStatus === 'excluida') {
            try {
                localStorage.removeItem('happynation_user');
                sessionStorage.removeItem('happynation_user');
            } catch(e) {}
            var isSubdir = window.location.pathname.includes('/app/');
            window.location.replace((isSubdir ? '../' : '') + 'login.html?deleted=1');
            return;
        }

        // ── MONITORAMENTO INSTANTÂNEO DE EXCLUSÃO VIA BROADCAST CHANNEL ──
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                var bcLiveAuth = new BroadcastChannel('happynation_live_sync');
                bcLiveAuth.onmessage = function(ev) {
                    if (ev && ev.data && (ev.data.type === 'user_deleted' || ev.data.type === 'user_kicked')) {
                        var targetId = String(ev.data.id || '');
                        var targetEmail = String(ev.data.email || '').toLowerCase().trim();
                        var curId = String(user.id || '');
                        var curEmail = String(user.email || '').toLowerCase().trim();
                        if ((targetId && targetId === curId) || (targetEmail && targetEmail === curEmail)) {
                            try {
                                localStorage.removeItem('happynation_user');
                                sessionStorage.removeItem('happynation_user');
                            } catch(e) {}
                            var isSubdir = window.location.pathname.includes('/app/');
                            window.location.replace((isSubdir ? '../' : '') + 'login.html?deleted=1');
                        }
                    }
                };
            }
        } catch(eBc) {}

        // ── REGISTRO GLOBAL DE PRESENÇA EM TEMPO REAL (ONLINE) PARA TODOS OS USUÁRIOS ──
        if (user && (user.id || user.email)) {
            (function startRealtimePresence() {
                var SUP_URL = 'https://bgaurmeuimrtvawworxv.supabase.co';
                var SUP_KEY = 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ';
                var uid = user.id ? String(user.id).trim() : '';
                var uemail = user.email ? String(user.email).toLowerCase().trim() : '';
                var lastPing = 0;

                function pingPresence() {
                    var nowIso = new Date().toISOString();

                    // 1. Salva imediatamente em localStorage para consulta instantânea
                    try {
                        if (uid) localStorage.setItem('happynation_presence_' + uid, nowIso);
                        if (uemail) localStorage.setItem('happynation_presence_' + uemail, nowIso);
                    } catch(e) {}

                    // 1.5. Verifica se o usuário foi excluído em segundo plano no Supabase
                    if (uid && user.role !== 'admin') {
                        try {
                            fetch(SUP_URL + '/rest/v1/usuarios?id=eq.' + encodeURIComponent(uid) + '&select=status', {
                                headers: { 'apikey': SUP_KEY, 'Authorization': 'Bearer ' + SUP_KEY }
                            }).then(function(res) { return res.json(); }).then(function(rows) {
                                if (rows && rows.length > 0) {
                                    var st = String(rows[0].status || '').toLowerCase().trim();
                                    if (st === 'deleted' || st === 'excluido' || st === 'excluida') {
                                        try {
                                            localStorage.removeItem('happynation_user');
                                            sessionStorage.removeItem('happynation_user');
                                        } catch(e) {}
                                        var isSubdir = window.location.pathname.includes('/app/');
                                        window.location.replace((isSubdir ? '../' : '') + 'login.html?deleted=1');
                                    }
                                }
                            }).catch(function(){});
                        } catch(eStatusCheck) {}
                    }

                    // 2. Registra na tabela 'configuracoes' (chave presence_{uid} e presence_{uemail})
                    try {
                        if (uid) {
                            fetch(SUP_URL + '/rest/v1/configuracoes', {
                                method: 'POST',
                                headers: {
                                    'apikey': SUP_KEY,
                                    'Authorization': 'Bearer ' + SUP_KEY,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'resolution=merge-duplicates'
                                },
                                body: JSON.stringify({ chave: 'presence_' + uid, valor: nowIso })
                            }).catch(function(){});
                        }
                        if (uemail) {
                            fetch(SUP_URL + '/rest/v1/configuracoes', {
                                method: 'POST',
                                headers: {
                                    'apikey': SUP_KEY,
                                    'Authorization': 'Bearer ' + SUP_KEY,
                                    'Content-Type': 'application/json',
                                    'Prefer': 'resolution=merge-duplicates'
                                },
                                body: JSON.stringify({ chave: 'presence_' + uemail, valor: nowIso })
                            }).catch(function(){});
                        }
                    } catch(e) {}

                    // 3. Atualiza coluna 'last_seen' diretamente na tabela 'usuarios'
                    try {
                        var q = uid ? ('id=eq.' + encodeURIComponent(uid)) : ('email=eq.' + encodeURIComponent(uemail));
                        fetch(SUP_URL + '/rest/v1/usuarios?' + q, {
                            method: 'PATCH',
                            headers: {
                                'apikey': SUP_KEY,
                                'Authorization': 'Bearer ' + SUP_KEY,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ last_seen: nowIso })
                        }).catch(function(){});
                    } catch(e) {}
                }

                function throttledPing() {
                    var n = Date.now();
                    if (n - lastPing > 20000) {
                        lastPing = n;
                        pingPresence();
                    }
                }

                pingPresence();
                setInterval(pingPresence, 25000); // Heartbeat a cada 25 segundos
                window.addEventListener('click', throttledPing, { passive: true });
                window.addEventListener('keydown', throttledPing, { passive: true });
                window.addEventListener('scroll', throttledPing, { passive: true });
                document.addEventListener('visibilitychange', function() {
                    if (!document.hidden) pingPresence();
                });
            })();
        }

        // ── VERIFICAÇÃO ATIVA DE CONTA EXCLUÍDA E IP (CLIENTES) ──
        function isAdmExempt(u) {
            if (!u) return false;
            var r = String(u.role || '').toLowerCase().trim();
            var e = String(u.email || '').toLowerCase().trim();
            var n = String(u.nome || '').toLowerCase().trim();
            return r === 'admin' || r === 'adm' || r === 'operator' || r === 'suporte' || e === 'mg' || e === 'br7' || e.includes('admin') || e.includes('gustavo') || n.includes('admin') || n.includes('br7');
        }
        if (user && !isAdmExempt(user)) {
            (async function verifySessionAndSecurity() {
                var SUP_URL = 'https://bgaurmeuimrtvawworxv.supabase.co';
                var SUP_KEY = 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ';
                var isSub = window.location.pathname.includes('/app/');

                // 1. Verifica se a conta do cliente foi excluída ou bloqueada no Supabase
                try {
                    var rCheck = await fetch(SUP_URL + '/rest/v1/usuarios?id=eq.' + encodeURIComponent(user.id) + '&select=id,status', {
                        headers: { 'apikey': SUP_KEY, 'Authorization': 'Bearer ' + SUP_KEY }
                    });
                    if (rCheck.ok) {
                        var dUsers = await rCheck.json();
                        // Se não retornou o usuário, a conta foi EXCLUÍDA pelo Administrador!
                        if (!dUsers || dUsers.length === 0) {
                            console.warn('[AuthGuard] Conta excluída pelo Administrador. Acesso revogado.');
                            try {
                                localStorage.removeItem('happynation_user');
                                sessionStorage.removeItem('happynation_user');
                            } catch(eWipe) {}
                            window.location.replace((isSub ? '../' : '') + 'login.html?logged_out=1&motivo=conta_excluida');
                            return;
                        }
                        var uStat = String(dUsers[0].status || '').toLowerCase().trim();
                        if (uStat === 'blocked' || uStat === 'bloqueado') {
                            try {
                                localStorage.removeItem('happynation_user');
                                sessionStorage.removeItem('happynation_user');
                            } catch(eWipe2) {}
                            window.location.replace((isSub ? '../' : '') + 'login.html?bloqueado=1');
                            return;
                        }
                    }
                } catch(eAccountChk) {}

                // 2. Verificação de IP de segurança (anti-venda de contas)
                try {
                    // Carrega ip-security dinamicamente se ainda não estiver na página
                    if (!window.MGIpSecurity) {
                        await new Promise(function(resolve) {
                            var s = document.createElement('script');
                            s.src = (isSub ? '../' : '') + 'js/ip-security.js';
                            s.onload = resolve;
                            s.onerror = resolve;
                            document.head.appendChild(s);
                        });
                    }
                    if (window.MGIpSecurity && typeof window.MGIpSecurity.detectIp === 'function') {
                        var curIp = await window.MGIpSecurity.detectIp();
                        if (curIp && curIp !== '127.0.0.1' && curIp !== '::1') {
                            var access = await window.MGIpSecurity.checkDeviceAccess(user, curIp);
                            if (access.needBind) {
                                user.register_ip = curIp;
                                user.last_ip = curIp;
                                try {
                                    if (rawLocal) localStorage.setItem('happynation_user', JSON.stringify(user));
                                    if (rawSession) sessionStorage.setItem('happynation_user', JSON.stringify(user));
                                } catch(eStore) {}
                                window.MGIpSecurity.bindUserDevice(user.id, curIp);
                            } else if (!access.allowed) {
                                // TENTATIVA EM OUTRA MÁQUINA DETECTADA! Bloqueia conta e expulsa para a tela de bloqueio com WhatsApp
                                console.warn('[Auth-Guard] Tentativa de acesso em outro aparelho detectada!', access);
                                if (typeof window.MGIpSecurity.lockUserByIp === 'function') {
                                    await window.MGIpSecurity.lockUserByIp(user, curIp);
                                }
                                try {
                                    localStorage.removeItem('happynation_user');
                                    sessionStorage.removeItem('happynation_user');
                                } catch(eWipe) {}
                                var redirectUrl = (isSub ? '../' : '') + 'login.html?bloqueado=dispositivo_divergente' +
                                    '&nome=' + encodeURIComponent(user.nome || '') +
                                    '&email=' + encodeURIComponent(user.email || '') +
                                    '&ip_reg=' + encodeURIComponent(user.register_ip || '') +
                                    '&ip_cur=' + encodeURIComponent(curIp);
                                window.location.replace(redirectUrl);
                                return;
                            }
                        }
                    }
                } catch(eIpCheck) {
                    console.warn('[Auth-Guard IP Check]', eIpCheck);
                }
            })();
        }

        // Delegação de evento para garantir que qualquer clique em "Sair" acione o handleLogout
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('a[href*="login.html"], .dropdown-item.danger, [data-logout]').forEach(function(el) {
                var text = (el.textContent || '').toLowerCase();
                if (text.includes('sair') || el.getAttribute('href') === 'login.html') {
                    el.addEventListener('click', function(ev) {
                        ev.preventDefault();
                        window.handleLogout(ev);
                    });
                }
            });
        });
    } catch(err) {
        window.location.replace('login.html');
    }
})();
