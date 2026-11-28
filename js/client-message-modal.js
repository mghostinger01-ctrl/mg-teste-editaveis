/**
 * client-message-modal.js
 * Exibe o card/modal "MENSAGEM PARA O CLIENTE" idêntico ao sistema da CNH
 * após a geração de qualquer documento (Diploma, CAC, Exame, CRLV, etc.)
 */
(function() {
    function injectModalStyles() {
        if (document.getElementById('client-msg-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'client-msg-modal-styles';
        style.textContent = `
            .client-msg-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.82);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease;
            }
            .client-msg-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            .client-msg-card {
                background: #121517;
                border: 1px solid rgba(0, 220, 130, 0.35);
                border-radius: 16px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 220, 130, 0.15);
                max-width: 580px;
                width: 100%;
                padding: 24px;
                transform: scale(0.96) translateY(10px);
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                color: #e2e8f0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .client-msg-overlay.active .client-msg-card {
                transform: scale(1) translateY(0);
            }
            .client-msg-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                gap: 12px;
            }
            .client-msg-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #94a3b8;
            }
            .client-msg-title-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #00dc82;
                box-shadow: 0 0 10px #00dc82;
            }
            .btn-copy-client-msg {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 8px;
                padding: 7px 14px;
                font-size: 12.5px;
                font-weight: 700;
                color: #ffffff;
                cursor: pointer;
                transition: all 0.18s ease;
            }
            .btn-copy-client-msg:hover {
                background: rgba(0, 220, 130, 0.18);
                border-color: rgba(0, 220, 130, 0.45);
                color: #00dc82;
                transform: translateY(-1px);
            }
            .btn-copy-client-msg:active {
                transform: translateY(0);
            }
            .client-msg-box {
                background: #090c0e;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 18px 20px;
                font-size: 13.5px;
                line-height: 1.65;
                color: #cbd5e1;
                white-space: pre-wrap;
                word-break: break-word;
                max-height: 380px;
                overflow-y: auto;
                user-select: all;
                font-family: inherit;
            }
            .client-msg-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-top: 18px;
                flex-wrap: wrap;
            }
            .btn-client-msg-main {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: linear-gradient(135deg, #00dc82, #00b068);
                color: #051a10;
                font-weight: 800;
                font-size: 13px;
                padding: 10px 20px;
                border-radius: 9px;
                border: none;
                cursor: pointer;
                transition: all 0.18s ease;
                box-shadow: 0 4px 14px rgba(0, 220, 130, 0.3);
            }
            .btn-client-msg-main:hover {
                background: #34d399;
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(0, 220, 130, 0.45);
            }
            .btn-client-msg-secondary {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #94a3b8;
                font-weight: 600;
                font-size: 12.5px;
                padding: 10px 16px;
                border-radius: 9px;
                cursor: pointer;
                transition: all 0.18s ease;
            }
            .btn-client-msg-secondary:hover {
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.25);
                background: rgba(255, 255, 255, 0.04);
            }
            .client-msg-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: #111417;
                border: 1px solid #00dc82;
                color: #ffffff;
                font-size: 13px;
                font-weight: 700;
                padding: 12px 24px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 220, 130, 0.35);
                z-index: 1000000;
                opacity: 0;
                pointer-events: none;
                transition: all 0.25s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .client-msg-toast.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    function showToast(msg) {
        let toast = document.getElementById('client-msg-toast-el');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'client-msg-toast-el';
            toast.className = 'client-msg-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span>✓</span> <span>${msg}</span>`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }

    window.copyClientMessageText = function(textToCopy, btnEl) {
        if (!textToCopy) return;
        const doCopy = () => {
            showToast('Mensagem copiada para a área de transferência!');
            if (btnEl) {
                const origHtml = btnEl.innerHTML;
                btnEl.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00dc82" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style="color:#00dc82;">Copiado!</span>
                `;
                setTimeout(() => { btnEl.innerHTML = origHtml; }, 2200);
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(doCopy).catch(() => {
                fallbackCopy(textToCopy);
                doCopy();
            });
        } else {
            fallbackCopy(textToCopy);
            doCopy();
        }
    };

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch(e) {}
        ta.remove();
    }

    window.showClientMessageModal = function(options) {
        // Grava a emissão do documento no Supabase public.atividades em tempo real
        try {
            let loggedUser = {};
            try { loggedUser = JSON.parse(localStorage.getItem('happynation_user') || sessionStorage.getItem('happynation_user') || '{}'); } catch(e){}
            const uNome = (loggedUser && (loggedUser.nome || loggedUser.email)) ? loggedUser.nome : 'Cliente';
            const uId = (loggedUser && (loggedUser.id || loggedUser.user_id)) ? loggedUser.id : null;
            const docType = (options && options.docType) || 'documento';
            const docDesc = (options && options.docDesc) || (options && options.title) || 'Documento Emitido';
            const docSub = (options && options.docSub) || 'Emissão Oficial';

            fetch('https://bgaurmeuimrtvawworxv.supabase.co/rest/v1/atividades', {
                method: 'POST',
                headers: {
                    'apikey': 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ',
                    'Authorization': 'Bearer sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: uId,
                    user_nome: uNome,
                    tipo: docType,
                    descricao: docDesc,
                    sub_rotulo: docSub,
                    valor: 0.00,
                    tag_class: 'badge-' + docType,
                    tag_text: docType.toUpperCase()
                })
            }).catch(function(){});

            if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('happynation_live_sync');
                bc.postMessage({ type: 'activity_created', tipo: docType });
                bc.close();
            }
        } catch(eActSync) {}

        injectModalStyles();
        const msgText = (options && options.messageText) || '';
        const backUrl = (options && options.onBackUrl) || '';
        const backText = (options && options.backText) || 'Voltar aos Documentos';

        let overlay = document.getElementById('clientMsgModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'clientMsgModalOverlay';
            overlay.className = 'client-msg-overlay';
            overlay.onclick = function(e) {
                if (e.target === overlay) window.closeClientMessageModal();
            };
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="client-msg-card">
                <div class="client-msg-header">
                    <div class="client-msg-title">
                        <span class="client-msg-title-dot"></span>
                        <span>MENSAGEM PARA O CLIENTE</span>
                    </div>
                    <button type="button" class="btn-copy-client-msg" id="btnTopCopyMsg" onclick="window.copyClientMessageText(document.getElementById('clientMsgDisplayBox').innerText, this)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>Copiar mensagem</span>
                    </button>
                </div>

                <div class="client-msg-box" id="clientMsgDisplayBox">${escapeHtml(msgText)}</div>

                <div class="client-msg-footer">
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn-client-msg-main" onclick="window.copyClientMessageText(document.getElementById('clientMsgDisplayBox').innerText, document.getElementById('btnTopCopyMsg'))">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            <span>Copiar Mensagem</span>
                        </button>
                        ${backUrl ? `
                            <button type="button" class="btn-client-msg-secondary" onclick="window.location.href='${backUrl}'">
                                <span>${backText}</span>
                            </button>
                        ` : ''}
                    </div>
                    <button type="button" class="btn-client-msg-secondary" onclick="window.closeClientMessageModal()">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    };

    window.closeClientMessageModal = function() {
        const overlay = document.getElementById('clientMsgModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    };

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
})();
