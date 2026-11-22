-- ==============================================================================
-- MG EDITÁVEIS - SISTEMA DE PLANOS DE REVENDEDOR & ASSINANTES
-- Planos: Starter (R$ 150,00), Master Pro (R$ 450,00), Prime VIP (R$ 999,99)
-- Compatível com: MySQL (phpMyAdmin/HostGator/XAMPP) & Supabase (PostgreSQL)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ESTRUTURA PARA MYSQL / MARIADB (phpMyAdmin)
-- ------------------------------------------------------------------------------

-- Adiciona campos de plano e descontos na tabela de usuários (se não existirem)
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `plano` VARCHAR(50) NOT NULL DEFAULT 'Nenhum',
  ADD COLUMN IF NOT EXISTS `plano_status` ENUM('ativo', 'pendente', 'cancelado', 'inativo') NOT NULL DEFAULT 'inativo',
  ADD COLUMN IF NOT EXISTS `plano_desconto` INT(3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `plano_comissao` INT(3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `plano_validade` VARCHAR(50) NOT NULL DEFAULT 'Vitalício',
  ADD COLUMN IF NOT EXISTS `plano_ativado_em` DATETIME DEFAULT NULL;

-- Criação da tabela dedicada de assinantes
CREATE TABLE IF NOT EXISTS `assinantes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `user_nome` VARCHAR(150) NOT NULL,
  `user_email` VARCHAR(150) NOT NULL,
  `user_phone` VARCHAR(50) DEFAULT NULL,
  `plano` VARCHAR(50) NOT NULL DEFAULT 'Master Pro',
  `valor` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `desconto_doc` INT(3) NOT NULL DEFAULT 0,
  `comissao_indicacao` INT(3) NOT NULL DEFAULT 0,
  `status` ENUM('ativo', 'pendente', 'cancelado') NOT NULL DEFAULT 'ativo',
  `validade` VARCHAR(50) NOT NULL DEFAULT 'Vitalício',
  `observacao` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assinantes_user` (`user_id`),
  KEY `idx_assinantes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. ESTRUTURA PARA SUPABASE (POSTGRESQL - SQL EDITOR DO SUPABASE)
-- ------------------------------------------------------------------------------
-- Execute os comandos abaixo se estiver utilizando o banco PostgreSQL do Supabase:

/*
ALTER TABLE usuarios 
  ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'Nenhum',
  ADD COLUMN IF NOT EXISTS plano_status TEXT DEFAULT 'inativo',
  ADD COLUMN IF NOT EXISTS plano_desconto INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plano_comissao INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plano_validade TEXT DEFAULT 'Vitalício',
  ADD COLUMN IF NOT EXISTS plano_ativado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE TABLE IF NOT EXISTS assinantes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  user_nome TEXT,
  user_email TEXT,
  user_phone TEXT,
  plano TEXT NOT NULL DEFAULT 'Master Pro',
  valor NUMERIC(10,2) DEFAULT 0.00,
  desconto_doc INTEGER DEFAULT 0,
  comissao_indicacao INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo',
  validade TEXT DEFAULT 'Vitalício',
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissões RLS públicas para acesso do painel
ALTER TABLE assinantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total assinantes" ON assinantes FOR ALL USING (true) WITH CHECK (true);
*/
