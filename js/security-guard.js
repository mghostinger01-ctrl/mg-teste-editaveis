/**
 * MG Editáveis - Security Guard
 * Proteção total contra cópia, toque longo (mobile), download de fotos/logos e inspeção de código fonte.
 * Bloqueio persistente e à prova de fuga por navegação ("Voltar" do navegador ou botões da página).
 * ATIVO EM TODO O SISTEMA.
 */
(function() {
    'use strict';

    // 1. CHECAGEM DE ISENÇÃO DE ADMINISTRADOR
    function isExemptAdmin() {
        try {
            const user = JSON.parse(localStorage.getItem('happynation_user') || sessionStorage.getItem('happynation_user') || '{}');
            if (user) {
                var r = String(user.role || '').toLowerCase().trim();
                var e = String(user.email || '').toLowerCase().trim();
                var n = String(user.nome || '').toLowerCase().trim();
                if (r === 'admin' || r === 'adm' || r === 'operator' || r === 'suporte' || e === 'mg' || e === 'br7' || e.includes('admin') || e.includes('gustavo') || n.includes('admin') || n.includes('br7')) {
                    return true;
                }
            }
            if (localStorage.getItem('happynation_admin_auth') || sessionStorage.getItem('happynation_admin_auth') ||
                localStorage.getItem('happynation_is_admin') === 'true' || sessionStorage.getItem('happynation_is_admin') === 'true') {
                return true;
            }
        } catch(e) {}
        return false;
    }

    // Checa se o visitante está em estado de bloqueio de segurança
    function isSecurityLocked() {
        if (isExemptAdmin()) return false;
        try {
            if (localStorage.getItem('mg_security_lockout') === '1') return true;
            if (sessionStorage.getItem('mg_security_lockout') === '1') return true;
            if (document.cookie && document.cookie.indexOf('mg_security_lockout=1') !== -1) return true;
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('bloqueado') === 'violacao_seguranca') return true;
        } catch(e) {}
        return false;
    }

    function getLockoutReason() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const paramReason = urlParams.get('motivo');
            if (paramReason) return paramReason;
            return localStorage.getItem('mg_security_reason') || 
                   sessionStorage.getItem('mg_security_reason') || 
                   'Tentativa de visualização de código ou violação de segurança';
        } catch(e) {
            return 'Tentativa de visualização de código ou violação de segurança';
        }
    }

    // 2. INJEÇÃO DE ESTILOS ANTI-CÓPIA, ANTI-DRAG E MODAL DE SEGURANÇA
    const style = document.createElement('style');
    style.id = 'security-guard-styles';
    style.innerHTML = `
        /* Desabilita totalmente seleção de texto e menu nativo de toque longo */
        *, *::before, *::after {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            -khtml-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }

        /* Permite digitação em campos de formulário */
        input, textarea, [contenteditable="true"] {
            -webkit-touch-callout: default !important;
            -webkit-user-select: text !important;
            -khtml-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }

        /* Impede arrastar ou segurar imagens, logos, SVGs, canvas e fotos */
        img, svg, picture, video, canvas, [role="img"] {
            -webkit-user-drag: none !important;
            -khtml-user-drag: none !important;
            -moz-user-drag: none !important;
            -o-user-drag: none !important;
            user-drag: none !important;
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
        }

        /* Bloqueio absoluto de toque/download em fotos de documentos e prévias */
        .cnh-photo-frame img, #cnhPhotoImg, #cnhSignatureImg, #cnhSignatureFrame img,
        #foto-area img, #assinatura-area img, .sheet-a4 img, .sheet-doc img, #sheetDoc img,
        .doc-preview img, .preview-area img, .document-sheet img, .photo-col img, .cnh-photo img,
        .watermark-bg, .p2-watermark-bg, [id*="view_foto"], [id*="foto"] img {
            pointer-events: none !important;
            -webkit-touch-callout: none !important;
            -webkit-user-drag: none !important;
            user-select: none !important;
        }

        /* Bloqueio total do body durante o lockout */
        body.mg-locked-down {
            overflow: hidden !important;
            height: 100vh !important;
            width: 100vw !important;
            pointer-events: none !important;
        }

        /* Modal de Bloqueio de Segurança Fullscreen (Impermeável) */
        #mg-security-lockout-modal {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 2147483647 !important;
            background: rgba(5, 7, 12, 0.98) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 20px !important;
            box-sizing: border-box !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            color: #ffffff !important;
            pointer-events: auto !important;
            animation: mgFadeIn 0.25s ease-out forwards;
        }

        @keyframes mgFadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }

        .mg-security-card {
            background: #11141b !important;
            border: 1px solid rgba(239, 68, 68, 0.45) !important;
            border-radius: 20px !important;
            max-width: 460px !important;
            width: 100% !important;
            padding: 32px 24px !important;
            text-align: center !important;
            box-shadow: 0 25px 60px -15px rgba(239, 68, 68, 0.35), 0 0 50px rgba(239, 68, 68, 0.15) !important;
            pointer-events: auto !important;
        }

        .mg-security-icon {
            width: 72px !important;
            height: 72px !important;
            margin: 0 auto 20px auto !important;
            background: rgba(239, 68, 68, 0.15) !important;
            border: 2px solid rgba(239, 68, 68, 0.4) !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #ef4444 !important;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important;
        }

        .mg-security-title {
            font-size: 20px !important;
            font-weight: 800 !important;
            color: #ffffff !important;
            margin-bottom: 12px !important;
            letter-spacing: -0.3px !important;
        }

        .mg-security-text {
            font-size: 14px !important;
            line-height: 1.6 !important;
            color: #94a3b8 !important;
            margin-bottom: 18px !important;
        }

        .mg-security-reason-box {
            background: rgba(239, 68, 68, 0.08) !important;
            border: 1px dashed rgba(239, 68, 68, 0.35) !important;
            border-radius: 10px !important;
            padding: 12px !important;
            font-size: 12.5px !important;
            color: #fca5a5 !important;
            margin-bottom: 24px !important;
            word-break: break-word !important;
        }

        .mg-btn-whatsapp {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 10px !important;
            background: #22c55e !important;
            color: #ffffff !important;
            text-decoration: none !important;
            font-size: 15px !important;
            font-weight: 700 !important;
            padding: 15px 20px !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 20px rgba(34, 197, 94, 0.35) !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
            box-sizing: border-box !important;
            cursor: pointer !important;
            pointer-events: auto !important;
        }

        .mg-btn-whatsapp:hover {
            background: #16a34a !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 12px 25px rgba(34, 197, 94, 0.45) !important;
        }

        .mg-btn-admin-unlock {
            margin-top: 16px !important;
            background: none !important;
            border: none !important;
            color: #64748b !important;
            font-size: 12px !important;
            cursor: pointer !important;
            text-decoration: underline !important;
            padding: 6px !important;
            pointer-events: auto !important;
        }
        .mg-btn-admin-unlock:hover {
            color: #94a3b8 !important;
        }
    `;

    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.head) document.head.appendChild(style);
        });
    }

    // 3. ARMADILHA DE HISTÓRICO (PREVINE EVASÃO VIA BOTÃO "VOLTAR" DO NAVEGADOR)
    function trapBrowserHistory() {
        try {
            for (let i = 0; i < 15; i++) {
                window.history.pushState({ mg_locked: true, step: i }, '', window.location.href);
            }
        } catch(e) {}
    }

    // Escuta o evento 'popstate' (disparado quando o usuário clica em Voltar ou Avançar no navegador)
    window.addEventListener('popstate', function(e) {
        if (isSecurityLocked()) {
            trapBrowserHistory();
            renderLockoutModal(getLockoutReason());
        }
    });

    // Escuta restauração do BFCache (quando a página é restaurada do cache ao voltar)
    window.addEventListener('pageshow', function(e) {
        if (isSecurityLocked()) {
            trapBrowserHistory();
            renderLockoutModal(getLockoutReason());
        }
    });

    // Escuta troca de fragmento de URL
    window.addEventListener('hashchange', function() {
        if (isSecurityLocked()) {
            trapBrowserHistory();
            renderLockoutModal(getLockoutReason());
        }
    });

    // 4. INTERCEPTADOR GLOBAL DE CLIQUES E ENTRADA QUANDO BLOQUEADO
    // Impede que qualquer link ("Voltar", menu, etc.) seja clicado durante o bloqueio
    ['click', 'dblclick', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'keydown', 'keypress', 'keyup', 'submit'].forEach(function(evtName) {
        window.addEventListener(evtName, function(e) {
            if (!isSecurityLocked()) return;

            const target = e.target;
            // Permite APENAS cliques dentro dos botões do modal de segurança (WhatsApp e Admin Unlock)
            if (target && target.closest && (
                target.closest('.mg-btn-whatsapp') || 
                target.closest('.mg-btn-admin-unlock') ||
                target.closest('#mg-security-lockout-modal')
            )) {
                return; // Ação autorizada
            }

            // Qualquer outro clique na página (inclusive qualquer botão de voltar) é 100% anulado!
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }, { capture: true, passive: false });
    });

    // 5. BLOQUEIO DE BOTÃO DIREITO DO MOUSE E MENU DE CONTEXTO
    window.addEventListener('contextmenu', function(e) {
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            return; // Permite colar texto em formulários
        }
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, { capture: true, passive: false });

    // 6. BLOQUEIO DE TOQUE LONGO EM IMAGENS NO MOBILE
    ['touchstart', 'touchend', 'touchcancel'].forEach(function(evtName) {
        window.addEventListener(evtName, function(e) {
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
            if (target && (target.tagName === 'IMG' || target.closest('img, .cnh-photo-frame, #foto-area, #assinatura-area, .sheet-a4, .sheet-doc'))) {
                if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                }
            }
        }, { capture: true, passive: false });
    });

    // 7. BLOQUEIO DE COPIAR E RECORTAR FORA DE INPUTS
    window.addEventListener('copy', function(e) {
        const target = e.target;
        if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });

    window.addEventListener('cut', function(e) {
        const target = e.target;
        if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });

    // 8. BLOQUEIO DE COLAR FORA DE INPUTS
    window.addEventListener('paste', function(e) {
        const target = e.target;
        if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });

    // 9. BLOQUEIO DE SELEÇÃO DE TEXTO
    window.addEventListener('selectstart', function(e) {
        const target = e.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            return true;
        }
        e.preventDefault();
        return false;
    }, { capture: true, passive: false });

    // 10. BLOQUEIO DE ARRASTAR ELEMENTOS E IMAGENS
    window.addEventListener('dragstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        return false;
    }, { capture: true, passive: false });

    // 11. SUPABASE CLOUD & IDENTIFICAÇÃO DE IP DO CLIENTE
    const SUP_URL = 'https://bgaurmeuimrtvawworxv.supabase.co';
    const SUP_KEY = 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ';

    let cachedClientIp = null;
    function fetchClientIp() {
        if (cachedClientIp && cachedClientIp !== 'desconhecido') {
            return Promise.resolve(cachedClientIp);
        }
        try {
            const st = sessionStorage.getItem('mg_client_ip') || localStorage.getItem('mg_client_ip');
            if (st && st !== 'desconhecido') {
                cachedClientIp = st;
                return Promise.resolve(st);
            }
        } catch(e) {}

        return fetch('https://api.ipify.org?format=json')
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d && d.ip) {
                    cachedClientIp = d.ip;
                    try {
                        sessionStorage.setItem('mg_client_ip', d.ip);
                        localStorage.setItem('mg_client_ip', d.ip);
                    } catch(e) {}
                    return d.ip;
                }
                return 'desconhecido';
            })
            .catch(function() {
                return fetch('https://api64.ipify.org?format=json')
                    .then(function(r) { return r.json(); })
                    .then(function(d) {
                        if (d && d.ip) {
                            cachedClientIp = d.ip;
                            try {
                                sessionStorage.setItem('mg_client_ip', d.ip);
                                localStorage.setItem('mg_client_ip', d.ip);
                            } catch(e) {}
                            return d.ip;
                        }
                        return 'desconhecido';
                    })
                    .catch(function() { return 'desconhecido'; });
            });
    }

    // Pré-carrega o IP silenciosamente
    fetchClientIp();

    // 12. BLOQUEIO RIGOROSO DE TECLAS DE ATALHO DE CÓPIA, INSPEÇÃO E SALVAMENTO
    function handleKeydownSecurity(e) {
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;
        const key = e.key ? e.key.toUpperCase() : '';
        const code = e.code ? e.code.toUpperCase() : '';
        const keyCode = e.keyCode || e.which;
        const target = e.target;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

        // Se já estiver bloqueado, anula qualquer atalho
        if (isSecurityLocked()) {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return false;
        }

        // PrintScreen é 100% liberado para capturas normais
        if (key === 'PRINTSCREEN' || keyCode === 44) {
            return true;
        }

        // F12 (DevTools)
        if (key === 'F12' || keyCode === 123 || code === 'F12') {
            if (isExemptAdmin()) return true;
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            triggerSecurityLockout('Tentativa de abertura do DevTools (F12)');
            return false;
        }

        // Ctrl+U (Ver Código Fonte) - INTERCEPTAÇÃO E BLOQUEIO INSTANTÂNEO DE IP
        if (isCtrlOrMeta && (key === 'U' || keyCode === 85 || code === 'KEYU')) {
            if (isExemptAdmin()) return true;
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            triggerSecurityLockout('Tentativa de visualização do código-fonte (Ctrl+U)');
            return false;
        }

        // Ctrl+Shift+I / Meta+Alt+I (Inspecionar Elemento)
        if (isCtrlOrMeta && (e.shiftKey || e.altKey) && (key === 'I' || keyCode === 73 || code === 'KEYI')) {
            if (isExemptAdmin()) return true;
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            triggerSecurityLockout('Tentativa de inspeção de elemento (Ctrl+Shift+I)');
            return false;
        }

        // Ctrl+Shift+J / Meta+Alt+J (Console do Navegador)
        if (isCtrlOrMeta && (e.shiftKey || e.altKey) && (key === 'J' || keyCode === 74 || code === 'KEYJ')) {
            if (isExemptAdmin()) return true;
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            triggerSecurityLockout('Tentativa de abertura do console (Ctrl+Shift+J)');
            return false;
        }

        // Ctrl+Shift+C / Meta+Alt+C (Seletor de elementos)
        if (isCtrlOrMeta && (e.shiftKey || e.altKey) && (key === 'C' || keyCode === 67 || code === 'KEYC')) {
            if (isExemptAdmin()) return true;
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            triggerSecurityLockout('Tentativa de inspeção de código (Ctrl+Shift+C)');
            return false;
        }

        // Ctrl+S / Meta+S (Salvar Página como arquivo)
        if (isCtrlOrMeta && (key === 'S' || keyCode === 83 || code === 'KEYS')) {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+P / Meta+P (Imprimir página pelo browser)
        if (isCtrlOrMeta && (key === 'P' || keyCode === 80 || code === 'KEYP')) {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return false;
        }

        // Bloqueio de Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X fora de campos de texto
        if (isCtrlOrMeta && !isInput) {
            if (key === 'C' || key === 'V' || key === 'A' || key === 'X' ||
                keyCode === 67 || keyCode === 86 || keyCode === 65 || keyCode === 88) {
                e.preventDefault();
                e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                return false;
            }
        }
    }

    // Registra listener no window e document em fase de captura
    window.addEventListener('keydown', handleKeydownSecurity, { capture: true, passive: false });
    document.addEventListener('keydown', handleKeydownSecurity, { capture: true, passive: false });

    // 13. PROTEÇÃO DENTRO DE TODOS OS IFRAMES DO SISTEMA
    function protectIframe(ifr) {
        try {
            const doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
            if (!doc || doc.getElementById('security-guard-iframe-styles')) return;

            const st = doc.createElement('style');
            st.id = 'security-guard-iframe-styles';
            st.innerHTML = `
                *, *::before, *::after {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    user-select: none !important;
                }
                img, svg, canvas {
                    -webkit-touch-callout: none !important;
                    -webkit-user-drag: none !important;
                    user-drag: none !important;
                    pointer-events: none !important;
                }
            `;
            doc.head.appendChild(st);

            ['contextmenu', 'dragstart', 'copy', 'cut', 'selectstart'].forEach(function(evName) {
                doc.addEventListener(evName, function(e) {
                    const tg = e.target;
                    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }, { capture: true, passive: false });
            });

            doc.addEventListener('keydown', handleKeydownSecurity, { capture: true, passive: false });
        } catch(e) {}
    }

    function protectAllIframes() {
        document.querySelectorAll('iframe').forEach(protectIframe);
    }

    window.addEventListener('load', protectAllIframes);
    setInterval(protectAllIframes, 1500);

    // 14. EXECUÇÃO DO BLOQUEIO INSTANTÂNEO & REGISTRO DE VIOLAÇÃO POR IP
    let lockoutTriggered = false;

    function triggerSecurityLockout(reason) {
        if (lockoutTriggered || isExemptAdmin()) return;
        lockoutTriggered = true;

        let userEmail = '';
        try {
            const user = JSON.parse(localStorage.getItem('happynation_user') || '{}');
            userEmail = user.email || '';
        } catch(e) {}

        // 1. Bloqueia localmente IMEDIATAMENTE (mesmo milissegundo)
        try {
            localStorage.setItem('mg_security_lockout', '1');
            localStorage.setItem('mg_security_reason', reason);
            localStorage.setItem('mg_security_time', Date.now().toString());

            sessionStorage.setItem('mg_security_lockout', '1');
            sessionStorage.setItem('mg_security_reason', reason);

            document.cookie = 'mg_security_lockout=1; path=/; max-age=86400; SameSite=Lax';

            // Remove credenciais de login para anular requisições autorizadas
            localStorage.removeItem('happynation_user');
            localStorage.removeItem('happynation_token');
            sessionStorage.removeItem('happynation_user');
            sessionStorage.removeItem('happynation_token');
        } catch(e) {}

        // Trava o histórico do navegador imediatamente
        trapBrowserHistory();

        // Renderiza o modal de bloqueio imediatamente
        renderLockoutModal(reason);

        // 2. Registra o IP na tabela ips_bloqueados do Supabase Cloud em tempo real
        fetchClientIp().then(function(clientIp) {
            const bodyPayload = {
                ip: clientIp || 'desconhecido',
                motivo: reason || 'Violação de segurança',
                user_email: userEmail,
                data: new Date().toISOString()
            };

            fetch(SUP_URL + '/rest/v1/ips_bloqueados', {
                method: 'POST',
                headers: {
                    'apikey': SUP_KEY,
                    'Authorization': 'Bearer ' + SUP_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(bodyPayload)
            }).catch(function() {});

            // Notifica também api PHP caso esteja em servidor LAMP/Hostinger
            const apiUrl = (window.location.pathname.includes('/app/') ? '../api/index.php' : 'api/index.php') + '?action=registrar_violacao_ip';
            try {
                fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload),
                    keepalive: true
                }).catch(function() {});
            } catch(e) {}
        });
    }

    // 15. RENDERIZAÇÃO DO MODAL IMPERMEÁVEL
    function renderLockoutModal(reason) {
        if (isExemptAdmin()) return;

        // Adiciona classe de bloqueio no body
        if (document.body) {
            document.body.classList.add('mg-locked-down');
        }

        let existingModal = document.getElementById('mg-security-lockout-modal');
        if (existingModal) {
            const reasonSpan = document.getElementById('mg-security-reason-text');
            if (reasonSpan && reason) reasonSpan.textContent = reason;
            return;
        }

        let whatsappNumber = '5521998821029';
        try {
            const cfg = JSON.parse(localStorage.getItem('happynation_webapp_customization') || '{}');
            if (cfg && cfg.groupUrl && cfg.groupUrl.includes('wa.me')) {
                const match = cfg.groupUrl.match(/wa\.me\/(\d+)/);
                if (match) whatsappNumber = match[1];
            }
        } catch(e) {}

        const encodedMsg = encodeURIComponent(`Olá, meu acesso ao sistema MG Editáveis foi bloqueado por segurança.\n\nMotivo informado: ${reason || 'Violação de segurança'}\nSolicito revisão e desbloqueio do meu acesso.`);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMsg}`;

        const modal = document.createElement('div');
        modal.id = 'mg-security-lockout-modal';
        modal.innerHTML = `
            <div class="mg-security-card">
                <div class="mg-security-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </div>
                <div class="mg-security-title">Acesso Bloqueado por Violação</div>
                <div class="mg-security-text">
                    Detectamos uma tentativa de inspeção de código-fonte (Ctrl+U, DevTools ou atalhos) ou violação dos protocolos de proteção de dados.<br><br>
                    Por medidas de segurança, <strong>seu acesso foi cancelado e seu endereço IP foi bloqueado automaticamente no servidor</strong>.
                </div>
                <div class="mg-security-reason-box">
                    <strong>Motivo:</strong> <span id="mg-security-reason-text">${escapeHtml(reason || 'Tentativa de visualização de código')}</span>
                </div>
                <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="mg-btn-whatsapp">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    Falar com o Suporte no WhatsApp
                </a>
                <button type="button" class="mg-btn-admin-unlock" onclick="window.mgUnlockAdmin()">
                    Sou o Administrador (Desbloquear Acesso)
                </button>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(modal);
        } else {
            document.documentElement.appendChild(modal);
        }

        // Função de desbloqueio com senha de administrador
        window.mgUnlockAdmin = function() {
            const pwd = prompt('Digite a senha mestre de Administrador para desbloquear o acesso:');
            if (!pwd) return;

            if (pwd === 'Comida12.@' || pwd === '840169') {
                fetchClientIp().then(function(ip) {
                    if (ip && ip !== 'desconhecido') {
                        fetch(SUP_URL + '/rest/v1/ips_bloqueados?ip=eq.' + encodeURIComponent(ip), {
                            method: 'DELETE',
                            headers: { 'apikey': SUP_KEY, 'Authorization': 'Bearer ' + SUP_KEY }
                        }).catch(function() {});
                    }
                });
                clearLockoutStateLocally();
                localStorage.setItem('happynation_is_admin', 'true');
                sessionStorage.setItem('happynation_is_admin', 'true');
                alert('Acesso desbloqueado com sucesso! Redirecionando...');
                window.location.href = window.location.pathname.includes('/app/') ? '../admin.html' : 'admin.html';
            } else {
                alert('Senha incorreta! Acesso não autorizado.');
            }
        };
    }

    function clearLockoutStateLocally() {
        try {
            localStorage.removeItem('mg_security_lockout');
            localStorage.removeItem('mg_security_reason');
            localStorage.removeItem('mg_security_time');
            sessionStorage.removeItem('mg_security_lockout');
            sessionStorage.removeItem('mg_security_reason');
            document.cookie = 'mg_security_lockout=; path=/; max-age=0; SameSite=Lax';
        } catch(e) {}
        const m = document.getElementById('mg-security-lockout-modal');
        if (m) m.remove();
        if (document.body) document.body.classList.remove('mg-locked-down');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 16. CHECAGEM REMOTA NO SUPABASE CLOUD (SÓ DESBLOQUEIA QUANDO O ADMIN DESBLOQUEAR)
    function checkRemoteIpBlock() {
        if (isExemptAdmin()) return;
        fetchClientIp().then(function(ip) {
            if (!ip || ip === 'desconhecido') return;
            fetch(SUP_URL + '/rest/v1/ips_bloqueados?ip=eq.' + encodeURIComponent(ip) + '&select=*', {
                headers: { 'apikey': SUP_KEY, 'Authorization': 'Bearer ' + SUP_KEY }
            })
            .then(function(r) { return r.json(); })
            .then(function(rows) {
                if (Array.isArray(rows) && rows.length > 0) {
                    // IP está ativamente bloqueado na nuvem! Bloqueio total!
                    triggerSecurityLockout(rows[0].motivo || 'Endereço IP bloqueado por violação de segurança (Administrador)');
                } else {
                    // IP foi liberado pelo Administrador no painel! Remove lockout local
                    if (isSecurityLocked()) {
                        clearLockoutStateLocally();
                    }
                }
            })
            .catch(function() {});
        });
    }

    // 17. INICIALIZAÇÃO IMEDIATA (EXECUTA ANTES MESMO DO DOMContentLoaded SE POSSÍVEL)
    function checkAndEnforceLockout() {
        if (isExemptAdmin()) return;
        if (isSecurityLocked()) {
            trapBrowserHistory();
            renderLockoutModal(getLockoutReason());
        }
    }

    checkAndEnforceLockout();
    checkRemoteIpBlock();

    // Re-checa no DOMContentLoaded e faz a checagem remota de IP no Supabase
    window.addEventListener('DOMContentLoaded', function() {
        checkAndEnforceLockout();
        checkRemoteIpBlock();
    });

    window.mgSecurityGuard = {
        triggerLockout: triggerSecurityLockout,
        showModal: renderLockoutModal,
        isLocked: isSecurityLocked,
        unblockLocally: clearLockoutStateLocally,
        checkRemote: checkRemoteIpBlock
    };
})();
