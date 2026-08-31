-- ==============================================================================
-- MIGRATION: 20260830000001_create_reposicoes_agendadas.sql
-- Tabela de Reposições e Agendamentos Pedagógicos CFIS Student Spotlight
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reposicoes_agendadas (
  id TEXT PRIMARY KEY,
  aluno_id TEXT,
  aluno_nome TEXT NOT NULL,
  contrato TEXT,
  unidade TEXT NOT NULL DEFAULT 'FILIAL',
  data TEXT NOT NULL,
  horario_inicio TEXT NOT NULL DEFAULT '16:00',
  horario_fim TEXT NOT NULL DEFAULT '18:00',
  duracao_horas INTEGER NOT NULL DEFAULT 2,
  disciplina TEXT,
  professor TEXT DEFAULT 'Ronaldo Vasconcelos',
  status TEXT NOT NULL DEFAULT 'agendada', -- 'agendada', 'realizada', 'cancelada'
  tipo TEXT NOT NULL DEFAULT 'laboratorio', -- 'laboratorio', 'atividade', 'aulao'
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas por contrato, unidade e status
CREATE INDEX IF NOT EXISTS idx_reposicoes_contrato ON public.reposicoes_agendadas(contrato);
CREATE INDEX IF NOT EXISTS idx_reposicoes_unidade ON public.reposicoes_agendadas(unidade);
CREATE INDEX IF NOT EXISTS idx_reposicoes_status ON public.reposicoes_agendadas(status);

-- Habilita RLS de forma permissiva para leitura e escrita na aplicação
ALTER TABLE public.reposicoes_agendadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de reposições" ON public.reposicoes_agendadas;
CREATE POLICY "Permitir leitura pública de reposições"
  ON public.reposicoes_agendadas FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização de reposições" ON public.reposicoes_agendadas;
CREATE POLICY "Permitir inserção e atualização de reposições"
  ON public.reposicoes_agendadas FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserção idempotente da reposição de referência do Geovan (Filial)
INSERT INTO public.reposicoes_agendadas (
  id, aluno_nome, contrato, unidade, data, horario_inicio, horario_fim, duracao_horas, disciplina, professor, status, tipo, observacao
) VALUES (
  'rep_geovan_03092026',
  'Geovan Costa Nogueira',
  '653',
  'FILIAL',
  '03/09/2026',
  '16:00',
  '18:00',
  2,
  'Módulo Geral',
  'Ronaldo Vasconcelos',
  'agendada',
  'laboratorio',
  'Reposição agendada de laboratório'
)
ON CONFLICT (id) DO NOTHING;
