CREATE TABLE IF NOT EXISTS public.reposicoes_agendadas (
  id text PRIMARY KEY,
  aluno_id text,
  aluno_nome text NOT NULL,
  contrato text,
  unidade text,
  data text NOT NULL,
  horario_inicio text,
  horario_fim text,
  duracao_horas numeric,
  disciplina text,
  professor text,
  status text NOT NULL DEFAULT 'agendada',
  tipo text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reposicoes_agendadas_contrato ON public.reposicoes_agendadas(contrato);
CREATE INDEX IF NOT EXISTS idx_reposicoes_agendadas_aluno_id ON public.reposicoes_agendadas(aluno_id);
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS dados_detalhados_validos boolean NOT NULL DEFAULT false;
