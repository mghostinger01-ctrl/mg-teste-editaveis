/**
 * Sistema de Cancelamento e Validação de Documentos em Tempo Real
 * MG Editáveis / HappyNation
 */
(function() {
    window.registerCanceledDoc = function(identifiers, type) {
        try {
            const list = JSON.parse(localStorage.getItem('happynation_deleted_docs') || '[]');
            const toAdd = (Array.isArray(identifiers) ? identifiers : [identifiers])
                .filter(Boolean)
                .map(x => String(x).trim());
            toAdd.forEach(id => {
                if (!list.includes(id)) list.push(id);
                const digits = id.replace(/\D/g, '');
                if (digits.length === 11 && !list.includes(digits)) list.push(digits);
            });
            localStorage.setItem('happynation_deleted_docs', JSON.stringify(list));

            // Notifica backend PHP
            toAdd.forEach(id => {
                fetch('api/index.php?action=cancel_doc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: type, identifier: id })
                }).catch(() => {});
            });

            // Dispara BroadcastChannel para atualização instantânea
            try {
                const bc = new BroadcastChannel('happynation_live_sync');
                bc.postMessage({ type: 'doc_deleted', docType: type, identifiers: toAdd, timestamp: Date.now() });
                bc.close();
            } catch(eBc){}
        } catch(e){}
    };

    window.checkDocumentoCancelado = function(identifiers, options) {
        options = options || {};
        const list = (Array.isArray(identifiers) ? identifiers : [identifiers])
            .filter(Boolean)
            .map(x => String(x).trim());

        const cleanCpfs = list.map(x => x.replace(/\D/g, '')).filter(x => x.length === 11);
        const allIds = list.concat(cleanCpfs);

        // 1. Verificação síncrona no localStorage
        try {
            const delDocs = JSON.parse(localStorage.getItem('happynation_deleted_docs') || '[]');
            const cancDocs = JSON.parse(localStorage.getItem('happynation_canceled_docs') || '[]');
            const cancCpfs = JSON.parse(localStorage.getItem('happynation_canceled_cpfs') || '[]');
            const delCnhs = JSON.parse(localStorage.getItem('happynation_deleted_cnhs') || '[]');
            const delExames = JSON.parse(localStorage.getItem('happynation_deleted_exames') || '[]');
            const delAtest = JSON.parse(localStorage.getItem('happynation_deleted_atestados') || '[]');

            const allCanceled = [].concat(delDocs, cancDocs, cancCpfs, delCnhs, delExames, delAtest);

            const isCanceled = allIds.some(id => allCanceled.includes(id));
            if (isCanceled) {
                renderCanceladoScreen(options);
                return true;
            }
        } catch(e) {}

        // 2. Verificação assíncrona no servidor
        const mainId = list[0] || '';
        const mainCpf = cleanCpfs[0] || '';
        if (mainId || mainCpf) {
            fetch(`api/index.php?action=check_doc_status&identifier=${encodeURIComponent(mainId)}&cpf=${encodeURIComponent(mainCpf)}`)
                .then(r => r.json())
                .then(res => {
                    if (res && (res.error && res.error.canceled || res.status === 'canceled' || (res.data && res.data.canceled))) {
                        renderCanceladoScreen(options);
                    }
                }).catch(() => {});
        }
        return false;
    };

    function renderCanceladoScreen(options) {
        const target = (options.targetSelector && document.querySelector(options.targetSelector)) ||
                       document.querySelector('.main-container') ||
                       document.querySelector('.container') ||
                       document.querySelector('main') ||
                       document.querySelector('.phone-wrapper') ||
                       document.querySelector('.content') ||
                       document.body;

        const docTitle = options.title || 'QR CODE INVÁLIDO OU CANCELADO';
        const docMsg = options.message || 'Este documento foi CANCELADO ou EXCLUÍDO pelo emissor responsável. O registro de autenticidade foi revogado no sistema.';

        if (options.onCancel && typeof options.onCancel === 'function') {
            options.onCancel();
        }

        if (target) {
            target.innerHTML = `
                <div style="max-width:520px; margin:40px auto; padding:36px 24px; background:#ffffff; border-radius:16px; border:1px solid #fee2e2; box-shadow:0 10px 25px rgba(220,38,38,0.09); text-align:center; font-family:'Plus Jakarta Sans',sans-serif;">
                    <div style="width:74px; height:74px; margin:0 auto 20px; border-radius:50%; background:#fee2e2; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(220,38,38,0.15);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    </div>
                    <h2 style="font-size:19px; font-weight:800; color:#991b1b; margin-bottom:12px; letter-spacing:-0.2px;">${docTitle}</h2>
                    <p style="font-size:14px; color:#475569; line-height:1.6; margin-bottom:22px;">${docMsg}</p>
                    <div style="display:inline-block; background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:10px 20px; font-size:13px; color:#b91c1c; font-weight:700;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:6px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Autenticidade Revogada • Registro Inativo
                    </div>
                </div>
            `;
        }
    }
})();
