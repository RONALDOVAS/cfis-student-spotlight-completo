ALTER TABLE public.alunos
  ALTER COLUMN mes_referencia_faltas DROP NOT NULL,
  ALTER COLUMN meses_contrato_total DROP NOT NULL,
  ALTER COLUMN total_disciplinas_grade DROP NOT NULL,
  ALTER COLUMN criticidade DROP NOT NULL,
  ALTER COLUMN tratativa_sugerida DROP NOT NULL,
  ALTER COLUMN status_tratativa DROP NOT NULL;
