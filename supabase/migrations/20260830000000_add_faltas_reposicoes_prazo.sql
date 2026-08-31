-- ==============================================================================
-- MIGRATION: 20260830000000_add_faltas_reposicoes_prazo.sql
-- Motor de Faltas, Reposições e Prazos Contratuais CFIS Student Spotlight
-- ==============================================================================

-- 1. ADIÇÃO DE COLUNAS NA TABELA public.alunos
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS data_termino_contrato DATE,
  ADD COLUMN IF NOT EXISTS dias_contrato_total INTEGER,
  ADD COLUMN IF NOT EXISTS reposicoes_realizadas INTEGER NOT NULL DEFAULT 0;

-- Comentários para documentação de schema
COMMENT ON COLUMN public.alunos.data_termino_contrato IS 'Data real de término do contrato do aluno';
COMMENT ON COLUMN public.alunos.dias_contrato_total IS 'Quantidade total de dias previstos no contrato';
COMMENT ON COLUMN public.alunos.reposicoes_realizadas IS 'Quantidade de reposições pedagógicas concluídas pelo aluno';

-- 2. ATUALIZAÇÃO DA FUNÇÃO DO TRIGGER DE BLOQUEIO POR FALTAS E CRITICIDADE
CREATE OR REPLACE FUNCTION public.check_aluno_faltas_trigger()
RETURNS TRIGGER AS $$
BEGIN

  -- ============================================================================
  -- BLOQUEIO AUTOMÁTICO: 3 OU MAIS FALTAS NO MÊS ATUAL (>= 3)
  -- ============================================================================
  IF NEW.faltas_mes_atual >= 3 THEN

    NEW.status_matricula := 'bloqueado_faltas';
    NEW.bloqueado_automaticamente := TRUE;

    NEW.motivo_bloqueio :=
      CONCAT(
        'Bloqueio automático: ',
        NEW.faltas_mes_atual,
        ' faltas no mês ',
        COALESCE(NEW.mes_referencia_faltas, 'vigente'),
        '. Limite de bloqueio: 3 faltas. Faltas acumuladas: ',
        NEW.faltas_totais,
        '. Reposições pendentes: ',
        GREATEST(0, NEW.faltas_totais - COALESCE(NEW.reposicoes_realizadas, 0)),
        '.'
      );

  END IF;

  -- ============================================================================
  -- CRITICIDADE ACADÊMICA
  -- ============================================================================
  IF NEW.faltas_mes_atual >= 3 THEN
    NEW.criticidade := 'critico';
    NEW.tratativa_sugerida := 'aulao';
  ELSIF NEW.dias_em_curso >= 90 THEN
    NEW.criticidade := 'critico';
    NEW.tratativa_sugerida := 'aulao';
  ELSIF NEW.dias_em_curso >= 60 THEN
    NEW.criticidade := 'moderado';
    NEW.tratativa_sugerida := 'atividade_pratica';
  ELSIF NEW.dias_em_curso >= 30 THEN
    NEW.criticidade := 'atencao';
    NEW.tratativa_sugerida := 'acompanhamento';
  ELSE
    NEW.criticidade := 'normal';
    NEW.tratativa_sugerida := 'normal';
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

-- 3. RECRIAÇÃO SEGURA DO TRIGGER
DROP TRIGGER IF EXISTS trg_check_aluno_faltas ON public.alunos;

CREATE TRIGGER trg_check_aluno_faltas
BEFORE INSERT OR UPDATE
ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.check_aluno_faltas_trigger();
