-- CFIS: alinhamento do schema real com o contrato do ingestor CGD.
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS data_termino_contrato date,
  ADD COLUMN IF NOT EXISTS dias_contrato_total integer,
  ADD COLUMN IF NOT EXISTS reposicoes_realizadas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgd_url text,
  ADD COLUMN IF NOT EXISTS bloqueio_manual_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.aluno_disciplinas
  ADD COLUMN IF NOT EXISTS horas_cursadas numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_esperadas numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_avanco numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_excedentes numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultrapassou_carga boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ritmo text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.aluno_disciplinas
  DROP CONSTRAINT IF EXISTS aluno_disciplinas_ritmo_check;

ALTER TABLE public.aluno_disciplinas
  ADD CONSTRAINT aluno_disciplinas_ritmo_check
  CHECK (ritmo IN ('normal','avanco_lento','excesso_tempo','concluida'));

ALTER TABLE public.alunos
  ALTER COLUMN curso DROP NOT NULL,
  ALTER COLUMN turma_nome DROP NOT NULL,
  ALTER COLUMN professor_nome DROP NOT NULL,
  ALTER COLUMN data_inicio DROP NOT NULL;
