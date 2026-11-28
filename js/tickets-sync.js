/**
 * MG Editáveis - Sistema Universal de Sincronização em Tempo Real de Tickets & Chat
 * Sincroniza bidirecionalmente entre Administrador MG (admin.html), ADM BR7 (adm-br7.html) e Clientes (suporte.html)
 * Usa Supabase (tabela configuracoes / chave happynation_tickets_sync) + BroadcastChannel para latência 0ms
 */
(function() {
    'use strict';

    const SUP_PROJECT_URL = 'https://bgaurmeuimrtvawworxv.supabase.co';
    const SUP_PUB_KEY = 'sb_publishable__62sJuMowJahz2gl4YFdEQ_QItjTWsQ';
    const LOCAL_KEY = 'happynation_tickets';
    const SYNC_CONFIG_KEY = 'happynation_tickets_sync';
    const BC_CHANNEL_NAME = 'happynation_live_sync';

    let bcInstance = null;
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            bcInstance = new BroadcastChannel(BC_CHANNEL_NAME);
        }
    } catch(e) {}

    const DEFAULT_SEED_TICKETS = [
        {
            id: 't_1',
            assunto: 'Dúvida com emissão de CNH',
            descricao: 'Olá, preciso de suporte para validar a CNH',
            data: '28 de fev. de 2026',
            status: 'Em andamento',
            user_nome: 'Cliente Oficial',
            mensagens: [
                { autor: 'user', texto: 'Olá, preciso de suporte para validar a CNH', data: '28/02/2026 03:00' },
                { autor: 'suporte', admin_nome: 'Administrador MG', texto: 'Olá! Estamos à disposição para ajudar.', data: '28/02/2026 03:05' }
            ]
        }
    ];

    window.MGTicketsSync = {
        getTickets: function() {
            try {
                const raw = localStorage.getItem(LOCAL_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch(e) {}
            return [...DEFAULT_SEED_TICKETS];
        },

        saveTickets: function(tickets) {
            if (!Array.isArray(tickets)) return;
            const jsonStr = JSON.stringify(tickets);

            // 1. Salva localmente
            try {
                localStorage.setItem(LOCAL_KEY, jsonStr);
            } catch(e) {}

            // 2. Transmite instantaneamente (0ms) entre todas as abas abertas no navegador
            if (bcInstance) {
                try {
                    bcInstance.postMessage({ type: 'tickets_updated', tickets: tickets });
                } catch(eBc) {}
            }

            // 3. Persiste no Supabase (Nuvem universal para sincronizar celulares, PCs e outros navegadores)
            fetch(`${SUP_PROJECT_URL}/rest/v1/configuracoes`, {
                method: 'POST',
                headers: {
                    'apikey': SUP_PUB_KEY,
                    'Authorization': `Bearer ${SUP_PUB_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    chave: SYNC_CONFIG_KEY,
                    valor: jsonStr
                })
            }).catch(function(err) {
                console.warn('[MGTicketsSync] Erro ao sincronizar nuvem:', err);
            });
        },

        syncFromCloud: async function(onUpdateCallback) {
            try {
                const res = await fetch(`${SUP_PROJECT_URL}/rest/v1/configuracoes?chave=eq.${SYNC_CONFIG_KEY}&select=valor`, {
                    headers: {
                        'apikey': SUP_PUB_KEY,
                        'Authorization': `Bearer ${SUP_PUB_KEY}`
                    }
                });
                if (!res.ok) return;
                const rows = await res.json();
                if (rows && rows.length > 0 && rows[0].valor) {
                    const cloudTickets = JSON.parse(rows[0].valor);
                    if (Array.isArray(cloudTickets)) {
                        const localRaw = localStorage.getItem(LOCAL_KEY) || '[]';
                        if (localRaw !== rows[0].valor) {
                            localStorage.setItem(LOCAL_KEY, rows[0].valor);
                            if (typeof onUpdateCallback === 'function') {
                                onUpdateCallback(cloudTickets);
                            }
                        }
                    }
                }
            } catch(e) {}
        },

        startPolling: function(onUpdateCallback, intervalMs = 3500) {
            // Escuta BroadcastChannel instantâneo
            if (bcInstance) {
                bcInstance.addEventListener('message', function(ev) {
                    if (ev && ev.data && ev.data.type === 'tickets_updated' && Array.isArray(ev.data.tickets)) {
                        localStorage.setItem(LOCAL_KEY, JSON.stringify(ev.data.tickets));
                        if (typeof onUpdateCallback === 'function') {
                            onUpdateCallback(ev.data.tickets);
                        }
                    }
                });
            }

            // Polling de nuvem Supabase periódico
            window.MGTicketsSync.syncFromCloud(onUpdateCallback);
            return setInterval(function() {
                window.MGTicketsSync.syncFromCloud(onUpdateCallback);
            }, intervalMs);
        },

        getPendingCount: function(tickets) {
            if (!Array.isArray(tickets)) return 0;
            return tickets.filter(function(t) {
                const st = String(t.status || '').toLowerCase().trim();
                return st === 'aberto' || st === 'em andamento' || st === 'pendente';
            }).length;
        }
    };
})();
