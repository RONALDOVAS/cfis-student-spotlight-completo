-- CFIS: regra oficial de faltas/reposições.
-- Executar no Supabase antes do primeiro WRITE do ingestador.
-- Preserva histórico agregado e permite desbloqueio automático.

ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS bloqueio_manual_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.check_aluno_faltas_trigger()
RETURNS TRIGGER AS $$
DECLARE
  faltas_mes_anterior INTEGER;
  reposicoes_historicas INTEGER;
  reposicoes_para_mes INTEGER;
  faltas_mes_efetivas INTEGER;
  faltas_acumuladas_efetivas INTEGER;
BEGIN
  faltas_mes_anterior := GREATEST(
    0,
    COALESCE(NEW.faltas_totais, 0) - COALESCE(NEW.faltas_mes_atual, 0)
  );
  reposicoes_historicas := LEAST(
    COALESCE(NEW.reposicoes_realizadas, 0),
    faltas_mes_anterior
  );
  reposicoes_para_mes := GREATEST(
    0,
    COALESCE(NEW.reposicoes_realizadas, 0) - reposicoes_historicas
  );
  faltas_mes_efetivas := GREATEST(
    0,
    COALESCE(NEW.faltas_mes_atual, 0) - reposicoes_para_mes
  );
  faltas_acumuladas_efetivas := GREATEST(
    0,
    COALESCE(NEW.faltas_totais, 0) - COALESCE(NEW.reposicoes_realizadas, 0)
  );

  IF COALESCE(NEW.bloqueio_manual_override, FALSE) THEN
    RETURN NEW;
  END IF;

  IF faltas_mes_efetivas >= 3 THEN
    NEW.status_matricula := 'bloqueado_faltas';
    NEW.bloqueado_automaticamente := TRUE;
    NEW.motivo_bloqueio := CONCAT(
      'Bloqueio automático: ',
      faltas_mes_efetivas,
      ' faltas efetivas no mês ',
      NEW.mes_referencia_faltas,
      '. Limite: 3. Faltas acumuladas efetivas: ',
      faltas_acumuladas_efetivas,
      '. Reposições realizadas: ',
      COALESCE(NEW.reposicoes_realizadas, 0),
      '.'
    );
  ELSIF COALESCE(NEW.bloqueado_automaticamente, FALSE)
        AND NEW.status_matricula = 'bloqueado_faltas' THEN
    NEW.status_matricula := 'ativo';
    NEW.bloqueado_automaticamente := FALSE;
    NEW.motivo_bloqueio := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_aluno_faltas ON public.alunos;
CREATE TRIGGER trg_check_aluno_faltas
BEFORE INSERT OR UPDATE
ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.check_aluno_faltas_trigger();
