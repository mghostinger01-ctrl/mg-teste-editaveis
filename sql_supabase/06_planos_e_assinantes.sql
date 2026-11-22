-- =====================================================================
-- 06: GESTÃO DE ASSINANTES E PLANOS DE REVENDA (SUPABASE POSTGRESQL)
-- Execute no SQL Editor do Supabase para ativar a persistência total dos planos
-- =====================================================================

-- 1. ADICIONA AS COLUNAS DE PLANO NA TABELA DE USUÁRIOS (SE NÃO EXISTIREM)
ALTER TABLE public.usuarios 
    ADD COLUMN IF NOT EXISTS plano VARCHAR(50) DEFAULT 'Nenhum',
    ADD COLUMN IF NOT EXISTS plano_status VARCHAR(20) DEFAULT 'inativo',
    ADD COLUMN IF NOT EXISTS plano_desconto INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS plano_comissao INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS plano_validade VARCHAR(50) DEFAULT 'Vitalício',
    ADD COLUMN IF NOT EXISTS plano_ativado_em TIMESTAMPTZ DEFAULT NULL;

-- 2. CRIAÇÃO DA TABELA DE ASSINANTES
CREATE TABLE IF NOT EXISTS public.assinantes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_nome VARCHAR(150),
    user_email VARCHAR(150),
    user_phone VARCHAR(50),
    plano VARCHAR(50) NOT NULL,
    valor NUMERIC(10, 2) DEFAULT 0.00,
    desconto_doc INT DEFAULT 0,
    comissao_indicacao INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ativo',
    validade VARCHAR(50) DEFAULT 'Vitalício',
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assinantes_user_id_key UNIQUE (user_id)
);

-- 3. HABILITA POLÍTICAS DE ACESSO (RLS) PARA LEITURA, GRAVAÇÃO E EXCLUSÃO
ALTER TABLE public.assinantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura assinantes" ON public.assinantes;
CREATE POLICY "Permitir leitura assinantes" ON public.assinantes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao assinantes" ON public.assinantes;
CREATE POLICY "Permitir insercao assinantes" ON public.assinantes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao assinantes" ON public.assinantes;
CREATE POLICY "Permitir atualizacao assinantes" ON public.assinantes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao assinantes" ON public.assinantes;
CREATE POLICY "Permitir exclusao assinantes" ON public.assinantes FOR DELETE USING (true);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_assinantes_user_id ON public.assinantes(user_id);
CREATE INDEX IF NOT EXISTS idx_assinantes_plano ON public.assinantes(plano);
CREATE INDEX IF NOT EXISTS idx_assinantes_status ON public.assinantes(status);
