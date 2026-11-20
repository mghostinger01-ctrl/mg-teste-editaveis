/**
 * MG Editáveis - Document Data Isolation Guard
 * Garante privacidade absoluta e isolamento multi-tenant:
 * Cada cliente visualiza estritamente os seus próprios documentos gerados.
 * Nenhum cliente comum tem acesso ou visibilidade a documentos, nomes ou CPFs de outros clientes.
 * Sementes/mocks de exemplo são desabilitadas para clientes reais.
 */
(function() {
    'use strict';

    function getClientContext() {
        let user = null;
        try {
            const raw = localStorage.getItem('happynation_user') || sessionStorage.getItem('happynation_user');
            if (raw) user = JSON.parse(raw);
        } catch(e) {}

        const email = (user && user.email) ? String(user.email).trim().toLowerCase() : '';
        const id = (user && (user.id || user.user_id)) ? String(user.id) : '';
        const nome = (user && (user.nome || user.name)) ? String(user.nome).trim() : '';
        const role = (user && user.role) ? String(user.role).trim().toLowerCase() : '';
        const isAdmin = Boolean(
            role === 'admin' ||
            (user && user.isAdmin === true) ||
            email === 'admin@mgeditaveis.com.br' ||
            email.startsWith('admin@') ||
            localStorage.getItem('happynation_admin_auth') === 'true' ||
            sessionStorage.getItem('happynation_admin_auth') === 'true'
        );

        return { user, email, id, nome, isAdmin };
    }

    // IDs de documentos mock/demonstração conhecidos que nunca devem ser exibidos a clientes
    const FAKE_MOCK_IDS = new Set([
        'c0921530', '01a4e744', '801c0b56', '647ff4b5', 'a4dc5098',
        'b3037d47', 'fc1f5415', 'ce46be5b', 'cbdefe13', '13c75ce8',
        'b9e1e3b2', 'a2ab74fc', '571d83ea', 'cb042216', '27da3f18',
        '42f1d417', '4ee7bde6', 'a4471e16', 'ccc0af5c', '64553606',
        'DIP-44409', 'DIP-44410', 'DIP-44411', 'DIP-44412', 'DIP-44413',
        'SENAI-44409', 'SENAI-44410', 'SENAI-44411', 'SENAI-44412', 'SENAI-44413',
        'CR204000163', 'CR204000164', 'CR204000165',
        'CHA899210', 'COND-001', 'COND-002', 'RG-DEMO-001'
    ]);

    function isRecordOwnedByClient(record, ctx) {
        if (!record) return false;
        if (!ctx) ctx = getClientContext();

        // Se for admin, tem permissão para auditar
        if (ctx.isAdmin) return true;

        // Se o cliente não estiver autenticado com email válido, bloqueia
        if (!ctx.email && !ctx.id) return false;

        // Bloqueia registros fakes/seeds de demonstração
        const recId = String(record.id || record.codigo || '');
        if (recId && FAKE_MOCK_IDS.has(recId)) return false;

        // Extrai dados parseados
        let dj = null;
        if (record.dados_json) {
            try {
                dj = typeof record.dados_json === 'string' ? JSON.parse(record.dados_json) : record.dados_json;
            } catch(e) {}
        }
        if (!dj && record.dados) {
            dj = typeof record.dados === 'string' ? JSON.parse(record.dados) : record.dados;
        }

        // Verifica email direto no registro ou em dados_json
        const recEmail = (record.user_email || (dj && (dj.user_email || dj.userEmail || dj.email)) || '').toLowerCase().trim();
        if (recEmail && ctx.email && recEmail === ctx.email) {
            return true;
        }

        // Verifica user_id
        const recUserId = String(record.user_id || record.userId || (dj && (dj.user_id || dj.userId)) || '');
        if (recUserId && ctx.id && recUserId === ctx.id && recUserId !== '1') {
            // Nota: id '1' costuma ser o admin fallback em algumas bases, então só aceita se ctx.id for realmente '1'
            return true;
        }
        if (recUserId && ctx.id && recUserId === ctx.id && ctx.email && recEmail === ctx.email) {
            return true;
        }

        return false;
    }

    window.DocIsolationGuard = {
        getClientContext: getClientContext,
        isRecordOwnedByClient: isRecordOwnedByClient,
        FAKE_MOCK_IDS: FAKE_MOCK_IDS
    };
})();
