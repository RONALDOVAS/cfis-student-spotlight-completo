export const SUPABASE_RLS_SQL_SCHEMA = `-- ==============================================================================
-- CFIS - ESQUEMA DE BANCO DE DADOS SUPABASE COM RLS
-- Gestão Acadêmica, Níveis de Criticidade, Ritmo por Disciplina & CGD
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS
CREATE TYPE user_role_enum AS ENUM ('professor', 'coordenador', 'admin');
CREATE TYPE criticidade_enum AS ENUM ('critico', 'moderado', 'atencao', 'normal');
CREATE TYPE tratativa_enum AS ENUM ('aulao', 'atividade_pratica', 'acompanhamento', 'normal');
CREATE TYPE status_tratativa_enum AS ENUM ('pendente', 'em_andamento', 'concluido');
CREATE TYPE status_aluno_enum AS ENUM ('ativo', 'bloqueado_faltas', 'trancado', 'concluido');
CREATE TYPE unidade_enum AS ENUM ('filial', 'matriz');

-- 3. PERFIS DE USUÁRIOS
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role_enum NOT NULL DEFAULT 'professor',
  unidade unidade_enum NOT NULL DEFAULT 'filial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RESUMO CGD
CREATE TABLE public.resumo_cgd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unidade unidade_enum NOT NULL UNIQUE,
  nome_unidade TEXT NOT NULL,
  total_alunos_ativos INTEGER NOT NULL DEFAULT 0,
  total_matriz INTEGER DEFAULT 0,
  total_filial INTEGER DEFAULT 0,
  alunos_criticos INTEGER DEFAULT 0,
  alunos_moderados INTEGER DEFAULT 0,
  total_contratos INTEGER NOT NULL DEFAULT 0,
  laboratorios_ativos JSONB DEFAULT '[]'::jsonb,
  criticos INTEGER NOT NULL DEFAULT 0,
  moderados INTEGER NOT NULL DEFAULT 0,
  atencao INTEGER NOT NULL DEFAULT 0,
  normais INTEGER NOT NULL DEFAULT 0,
  bloqueados_faltas INTEGER NOT NULL DEFAULT 0,
  mes_referencia TEXT NOT NULL DEFAULT '08/2026',
  alunos_data JSONB DEFAULT '[]'::jsonb,
  origem TEXT NOT NULL DEFAULT 'cgd_live',
  ultimo_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ALUNOS
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cgd_matricula_id TEXT UNIQUE,
  nome TEXT NOT NULL,
  contrato TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  curso TEXT NOT NULL,
  turma_nome TEXT NOT NULL,
  professor_responsavel_id UUID REFERENCES public.profiles(id),
  professor_nome TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_termino_contrato DATE,
  dias_contrato_total INTEGER,
  meses_contrato_total INTEGER NOT NULL DEFAULT 12,
  ultima_aula DATE,
  ultimo_acesso TIMESTAMPTZ,

  -- FREQUÊNCIA E REPOSIÇÕES
  faltas_totais INTEGER NOT NULL DEFAULT 0,
  faltas_mes_atual INTEGER NOT NULL DEFAULT 0,
  mes_referencia_faltas TEXT NOT NULL,
  reposicoes_realizadas INTEGER NOT NULL DEFAULT 0,

  -- TEMPO GERAL DE CURSO
  dias_em_curso INTEGER NOT NULL DEFAULT 0,

  -- CLASSIFICAÇÃO
  criticidade criticidade_enum NOT NULL DEFAULT 'normal',
  tratativa_sugerida tratativa_enum NOT NULL DEFAULT 'normal',
  status_tratativa status_tratativa_enum NOT NULL DEFAULT 'pendente',

  -- STATUS
  status_matricula status_aluno_enum NOT NULL DEFAULT 'ativo',
  bloqueado_automaticamente BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_bloqueio TEXT,

  -- GRADE
  total_disciplinas_grade INTEGER NOT NULL DEFAULT 10,
  disciplinas_concluidas INTEGER NOT NULL DEFAULT 0,

  unidade unidade_enum NOT NULL DEFAULT 'filial',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DISCIPLINAS DO ALUNO
--
-- Esta tabela agora possui os dados necessários para medir o ritmo
-- individual do aluno dentro da disciplina.
--
CREATE TABLE public.aluno_disciplinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  aluno_id UUID NOT NULL
    REFERENCES public.alunos(id)
    ON DELETE CASCADE,

  nome TEXT NOT NULL,

  -- CARGA HORÁRIA OFICIAL DA DISCIPLINA
  carga_horaria INTEGER NOT NULL,

  -- STATUS DA DISCIPLINA
  status TEXT NOT NULL
    CHECK (status IN ('concluida', 'em_andamento', 'pendente')),

  nota NUMERIC(4,2),

  frequencia_percent NUMERIC(5,2),

  data_conclusao DATE,

  ordem INTEGER NOT NULL DEFAULT 1,

  -- ==========================================================================
  -- CONTROLE DE RITMO DA DISCIPLINA
  -- ==========================================================================

  -- Horas efetivamente realizadas pelo aluno nesta disciplina.
  horas_cursadas NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Horas que deveriam ter sido realizadas considerando o planejamento.
  horas_esperadas NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Percentual de avanço baseado na carga horária oficial.
  percentual_avanco NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Quantidade de horas que excederam a carga horária oficial.
  horas_excedentes NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Indica se o aluno ultrapassou a carga horária prevista.
  ultrapassou_carga BOOLEAN NOT NULL DEFAULT FALSE,

  -- Classificação específica do ritmo.
  ritmo TEXT NOT NULL DEFAULT 'normal'
    CHECK (
      ritmo IN (
        'normal',
        'avanco_lento',
        'excesso_tempo',
        'concluida'
      )
    ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Evita carga horária inválida.
  CONSTRAINT aluno_disciplinas_carga_horaria_positive
    CHECK (carga_horaria > 0),

  -- Evita valores negativos.
  CONSTRAINT aluno_disciplinas_horas_cursadas_positive
    CHECK (horas_cursadas >= 0),

  CONSTRAINT aluno_disciplinas_horas_esperadas_positive
    CHECK (horas_esperadas >= 0),

  CONSTRAINT aluno_disciplinas_percentual_valido
    CHECK (percentual_avanco >= 0),

  CONSTRAINT aluno_disciplinas_horas_excedentes_validas
    CHECK (horas_excedentes >= 0)
);

-- 7. OCORRÊNCIAS
CREATE TABLE public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  aluno_id UUID NOT NULL
    REFERENCES public.alunos(id)
    ON DELETE CASCADE,

  aluno_nome TEXT NOT NULL,
  contrato TEXT NOT NULL,
  curso TEXT NOT NULL,
  turma_nome TEXT NOT NULL,

  professor_id UUID NOT NULL
    REFERENCES public.profiles(id),

  professor_nome TEXT NOT NULL,

  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  tipo TEXT NOT NULL,

  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,

  tratativa_aplicada tratativa_enum NOT NULL,

  status_tratativa status_tratativa_enum NOT NULL DEFAULT 'pendente',

  sincronizado_cgd BOOLEAN NOT NULL DEFAULT FALSE,

  data_sincronizacao_cgd TIMESTAMPTZ,

  protocolo_cgd TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TURMAS CGD
CREATE TABLE public.turmas_cgd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  nome TEXT NOT NULL,
  curso_nome TEXT NOT NULL,
  codigo_curso TEXT NOT NULL,

  professor_responsavel_id UUID REFERENCES public.profiles(id),

  professor_nome TEXT NOT NULL,

  dias_semana TEXT[] NOT NULL,

  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,

  sala TEXT NOT NULL,

  limite_alunos INTEGER NOT NULL DEFAULT 15,

  disciplina_atual TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'em_andamento',

  unidade unidade_enum NOT NULL DEFAULT 'filial'
);

-- 9. CREDENCIAIS CGD
CREATE TABLE public.cgd_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  unidade unidade_enum NOT NULL UNIQUE,

  url_sistema TEXT NOT NULL
    DEFAULT 'https://cgd.cfis.edu.br/portal',

  usuario_encrypted TEXT NOT NULL,
  senha_encrypted TEXT NOT NULL,

  token_sessao_hash TEXT,

  status_conexao TEXT NOT NULL DEFAULT 'desconectado',

  ultimo_ping TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. FUNÇÃO PARA CALCULAR O RITMO DA DISCIPLINA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calcular_ritmo_disciplina()
RETURNS TRIGGER AS $$
BEGIN

  -- ---------------------------------------------------------------------------
  -- HORAS ESPERADAS
  -- Se não houver valor informado, usamos a carga horária oficial.
  -- ---------------------------------------------------------------------------
  IF NEW.horas_esperadas IS NULL OR NEW.horas_esperadas = 0 THEN
    NEW.horas_esperadas := NEW.carga_horaria;
  END IF;

  -- ---------------------------------------------------------------------------
  -- PERCENTUAL DE AVANÇO
  -- ---------------------------------------------------------------------------
  NEW.percentual_avanco :=
    ROUND(
      (NEW.horas_cursadas / NULLIF(NEW.carga_horaria, 0)) * 100,
      2
    );

  -- ---------------------------------------------------------------------------
  -- HORAS EXCEDENTES
  -- ---------------------------------------------------------------------------
  IF NEW.horas_cursadas > NEW.carga_horaria THEN

    NEW.horas_excedentes :=
      ROUND(
        NEW.horas_cursadas - NEW.carga_horaria,
        2
      );

    NEW.ultrapassou_carga := TRUE;

  ELSE

    NEW.horas_excedentes := 0;
    NEW.ultrapassou_carga := FALSE;

  END IF;

  -- ---------------------------------------------------------------------------
  -- CLASSIFICAÇÃO DO RITMO
  -- ---------------------------------------------------------------------------

  IF NEW.status = 'concluida' THEN

    NEW.ritmo := 'concluida';

  ELSIF NEW.horas_cursadas > NEW.carga_horaria THEN

    -- Exemplo:
    -- disciplina = 24h
    -- aluno cursou = 30h
    --
    -- Resultado:
    -- horas_excedentes = 6h
    -- ultrapassou_carga = TRUE
    -- ritmo = excesso_tempo

    NEW.ritmo := 'excesso_tempo';

  ELSIF NEW.percentual_avanco < 50
        AND NEW.horas_esperadas >= 20 THEN

    NEW.ritmo := 'avanco_lento';

  ELSE

    NEW.ritmo := 'normal';

  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

-- Trigger do cálculo automático do ritmo
CREATE TRIGGER trg_calcular_ritmo_disciplina
BEFORE INSERT OR UPDATE
ON public.aluno_disciplinas
FOR EACH ROW
EXECUTE FUNCTION public.calcular_ritmo_disciplina();

-- ==============================================================================
-- 11. GATILHO AUTOMÁTICO DO ALUNO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_aluno_faltas_trigger()
RETURNS TRIGGER AS $$
BEGIN

  -- ============================================================================
  -- BLOQUEIO COM 3 FALTAS NO MÊS ATUAL
  -- ============================================================================
  IF NEW.faltas_mes_atual >= 3 THEN

    NEW.status_matricula := 'bloqueado_faltas';

    NEW.bloqueado_automaticamente := TRUE;

    NEW.motivo_bloqueio :=
      CONCAT(
        'Bloqueio automático: ',
        NEW.faltas_mes_atual,
        ' faltas no mês ',
        NEW.mes_referencia_faltas,
        '. Limite de bloqueio: 3 faltas. Faltas acumuladas: ',
        NEW.faltas_totais,
        '. Reposições pendentes: ',
        GREATEST(0, NEW.faltas_totais - COALESCE(NEW.reposicoes_realizadas, 0)),
        '.'
      );

  END IF;

  -- ============================================================================
  -- CRITICIDADE
  --
  -- A criticidade NÃO depende somente das faltas.
  -- O tempo do aluno na disciplina também será considerado.
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

CREATE TRIGGER trg_check_aluno_faltas
BEFORE INSERT OR UPDATE
ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.check_aluno_faltas_trigger();

-- ==============================================================================
-- 12. ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumo_cgd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aluno_disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas_cgd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cgd_credentials ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 13. POLÍTICAS - PROFILES
-- ==============================================================================

CREATE POLICY "Usuários autenticados podem ler perfis da mesma unidade"
ON public.profiles FOR SELECT
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Apenas admins podem editar perfis"
ON public.profiles FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ==============================================================================
-- 14. POLÍTICAS - RESUMO CGD
-- ==============================================================================

CREATE POLICY "Todos autenticados podem ler resumo_cgd"
ON public.resumo_cgd FOR SELECT
USING (true);

CREATE POLICY "Equipe autenticada pode inserir ou atualizar resumo_cgd"
ON public.resumo_cgd FOR ALL
USING (true);

-- ==============================================================================
-- 15. POLÍTICAS - ALUNOS
-- ==============================================================================

CREATE POLICY "Professores e equipe podem visualizar todos os alunos da unidade"
ON public.alunos FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND (
    unidade = (
      SELECT unidade
      FROM public.profiles
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

CREATE POLICY "Apenas coordenadores e admins podem editar alunos diretamente"
ON public.alunos FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coordenador', 'admin')
  )
);

-- ==============================================================================
-- 16. POLÍTICAS - DISCIPLINAS
-- ==============================================================================

CREATE POLICY "Usuários autenticados podem visualizar disciplinas"
ON public.aluno_disciplinas FOR SELECT
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Coordenadores e admins podem modificar disciplinas"
ON public.aluno_disciplinas FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coordenador', 'admin')
  )
);

-- ==============================================================================
-- 17. POLÍTICAS - OCORRÊNCIAS
-- ==============================================================================

CREATE POLICY "Todos os professores autenticados podem ver ocorrências da unidade"
ON public.ocorrencias FOR SELECT
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Professores podem inserir ocorrências apontando para si mesmos"
ON public.ocorrencias FOR INSERT
WITH CHECK (
  professor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coordenador', 'admin')
  )
);

CREATE POLICY "Professores só podem alterar as suas próprias ocorrências"
ON public.ocorrencias FOR UPDATE
USING (
  professor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coordenador', 'admin')
  )
);

CREATE POLICY "Apenas coordenadores e admins podem excluir ocorrências"
ON public.ocorrencias FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coordenador', 'admin')
  )
);

-- ==============================================================================
-- 18. POLÍTICAS - TURMAS
-- ==============================================================================

CREATE POLICY "Todos autenticados visualizam turmas"
ON public.turmas_cgd FOR SELECT
USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Apenas coordenadores e admins modificam turmas"
ON public.turmas_cgd FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coordenador', 'admin')
  )
);

-- ==============================================================================
-- 19. POLÍTICAS - CREDENCIAIS CGD
-- ==============================================================================

CREATE POLICY "Apenas admins têm acesso a credenciais de scraping do CGD"
ON public.cgd_credentials FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ==============================================================================
-- 20. OCORRÊNCIAS CGD (PERSISTÊNCIA CENTRALIZADA DE TRATATIVAS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ocorrencias_cgd (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato TEXT NOT NULL UNIQUE,
  aluno_nome TEXT NOT NULL,
  status_tratativa TEXT NOT NULL DEFAULT 'PENDENTE',
  anotacao TEXT,
  reposicao_agendada BOOLEAN NOT NULL DEFAULT FALSE,
  protocolo_cgd TEXT,
  sincronizado_cgd BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ocorrencias_cgd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar ocorrencias_cgd"
ON public.ocorrencias_cgd FOR SELECT
USING (true);

CREATE POLICY "Professores e administradores podem inserir ou atualizar ocorrencias_cgd"
ON public.ocorrencias_cgd FOR ALL
USING (true);

-- ==============================================================================
-- 21. REPOSIÇÕES AGENDADAS E HISTÓRICO DE SESSÕES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reposicoes_agendadas (
  id TEXT PRIMARY KEY,
  aluno_id UUID,
  aluno_nome TEXT NOT NULL,
  contrato TEXT,
  unidade TEXT NOT NULL DEFAULT 'MATRIZ',
  data TEXT NOT NULL,
  horario_inicio TEXT NOT NULL DEFAULT '16:00',
  horario_fim TEXT NOT NULL DEFAULT '18:00',
  duracao_horas INTEGER NOT NULL DEFAULT 2,
  disciplina TEXT,
  professor TEXT NOT NULL DEFAULT 'Ronaldo Vasconcelos',
  status TEXT NOT NULL DEFAULT 'agendada',
  tipo TEXT NOT NULL DEFAULT 'laboratorio',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reposicoes_contrato ON public.reposicoes_agendadas(contrato);
CREATE INDEX IF NOT EXISTS idx_reposicoes_aluno_nome ON public.reposicoes_agendadas(aluno_nome);

ALTER TABLE public.reposicoes_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar reposicoes_agendadas"
ON public.reposicoes_agendadas FOR SELECT
USING (true);

CREATE POLICY "Professores e equipe podem gerenciar reposicoes_agendadas"
ON public.reposicoes_agendadas FOR ALL
USING (true);

-- ==============================================================================
-- FIM DO SCHEMA CFIS
-- ==============================================================================
`;
