import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const SOURCE_URL =
  process.env.CFIS_DADOS_ALUNOS_URL ||
  'https://raw.githubusercontent.com/RONALDOVAS/google-ia-studio-CCFIS/main/dados_alunos.json';

const BATCH_SIZE = Math.max(50, Number(process.env.CFIS_IMPORT_BATCH_SIZE || 500));
const WRITE_ENABLED = process.argv.includes('--write');

type RawRecord = Record<string, unknown>;

type NormalizedAluno = {
  id: string;
  cgd_matricula_id: string;
  nome: string;
  contrato: string;
  email: string | null;
  telefone: string | null;
  curso: string;
  turma_nome: string;
  professor_responsavel_id: string | null;
  professor_nome: string;
  data_inicio: string;
  data_termino_contrato: string | null;
  dias_contrato_total: number | null;
  meses_contrato_total: number | null;
  ultima_aula: string | null;
  ultimo_acesso: string | null;
  faltas_totais: number;
  faltas_mes_atual: number;
  mes_referencia_faltas: string;
  reposicoes_realizadas: number;
  dias_em_curso: number;
  criticidade: 'critico' | 'moderado' | 'atencao' | 'normal' | null;
  tratativa_sugerida: 'aulao' | 'atividade_pratica' | 'acompanhamento' | 'normal' | null;
  status_tratativa: 'pendente' | 'em_andamento' | 'concluido' | null;
  status_matricula: 'ativo' | 'bloqueado_faltas' | 'trancado' | 'concluido' | null;
  bloqueado_automaticamente: boolean;
  bloqueio_manual_override: boolean;
  motivo_bloqueio: string | null;
  total_disciplinas_grade: number | null;
  disciplinas_concluidas: number;
  unidade: 'filial' | 'matriz';
  created_at: string;
  updated_at: string;
};

type NormalizedDisciplina = {
  id: string;
  aluno_id: string;
  nome: string;
  carga_horaria: number;
  status: 'concluida' | 'em_andamento' | 'pendente';
  nota: number | null;
  frequencia_percent: number | null;
  data_conclusao: string | null;
  ordem: number;
  horas_cursadas: number;
  horas_esperadas: number;
  percentual_avanco: number;
  horas_excedentes: number;
  ultrapassou_carga: boolean;
  ritmo: 'normal' | 'avanco_lento' | 'excesso_tempo' | 'concluida';
  created_at: string;
  updated_at: string;
};

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).replace(/\u00a0/g, ' ').trim();
    if (text) return text;
  }
  return '';
}

function numberValue(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function nullableNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function nullableText(...values: unknown[]): string | null {
  const value = textValue(...values);
  return value || null;
}

function normalizeDate(value: unknown): string | null {
  const raw = textValue(value);
  if (!raw) return null;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeTimestamp(value: unknown): string | null {
  const raw = textValue(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function uuidFromKey(key: string): string {
  const hex = createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function normalizeUnidade(value: unknown): 'filial' | 'matriz' | null {
  const raw = textValue(value).toLowerCase();
  if (raw.includes('matriz')) return 'matriz';
  if (raw.includes('filial')) return 'filial';
  return null;
}

function normalizeCriticidade(value: unknown): NormalizedAluno['criticidade'] {
  const raw = textValue(value).toLowerCase();
  if (!raw) return null;
  if (raw.includes('crit')) return 'critico';
  if (raw.includes('moder')) return 'moderado';
  if (raw.includes('aten')) return 'atencao';
  if (raw.includes('normal')) return 'normal';
  return null;
}

function normalizeTratativa(value: unknown): NormalizedAluno['tratativa_sugerida'] {
  const raw = textValue(value).toLowerCase();
  if (!raw) return null;
  if (raw.includes('aul')) return 'aulao';
  if (raw.includes('prát') || raw.includes('prat')) return 'atividade_pratica';
  if (raw.includes('acompan')) return 'acompanhamento';
  if (raw.includes('normal')) return 'normal';
  return null;
}

function normalizeStatusTratativa(value: unknown): NormalizedAluno['status_tratativa'] {
  const raw = textValue(value).toLowerCase();
  if (!raw) return null;
  if (raw.includes('concl')) return 'concluido';
  if (raw.includes('andamento')) return 'em_andamento';
  if (raw.includes('pend')) return 'pendente';
  return null;
}

function normalizeStatusAluno(value: unknown): NormalizedAluno['status_matricula'] {
  const raw = textValue(value).toLowerCase();
  if (!raw) return null;
  if (raw.includes('tranc')) return 'trancado';
  if (raw.includes('concl')) return 'concluido';
  if (raw.includes('bloque')) return 'bloqueado_faltas';
  if (raw.includes('ativo')) return 'ativo';
  return null;
}

function normalizeSource(raw: unknown): RawRecord[] {
  if (Array.isArray(raw)) return raw as RawRecord[];

  if (raw && typeof raw === 'object') {
    const root = raw as RawRecord;
    const candidates = [
      root.resultado,
      root.alunos,
      root.dados,
      root.data,
      root.result,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as RawRecord[];
      if (candidate && typeof candidate === 'object') {
        const nested = normalizeSource(candidate);
        if (nested.length) return nested;
      }
    }
  }

  throw new Error('Formato do dados_alunos.json não reconhecido: não foi encontrada uma lista de alunos.');
}

function normalizeAluno(raw: RawRecord, index: number): {
  aluno: NormalizedAluno | null;
  disciplinas: NormalizedDisciplina[];
  errors: string[];
} {
  const errors: string[] = [];

  const contrato = textValue(
    raw.contrato,
    raw.CONTRATO,
    raw.matricula,
    raw.MATRICULA,
    raw.cgd_matricula_id,
    raw.id_aluno,
  );

  const nome = textValue(raw.nome, raw.NOME, raw.aluno, raw.ALUNO, raw.nome_aluno);
  const unidade = normalizeUnidade(raw.unidade ?? raw.UNIDADE ?? raw.filial ?? raw.FILIAL);
  const curso = textValue(raw.curso, raw.CURSO);

  if (!contrato) errors.push('contrato/matrícula ausente');
  if (!nome) errors.push('nome ausente');
  if (!unidade) errors.push('unidade ausente ou inválida');
  if (!curso) errors.push('curso ausente');

  const dataInicio = normalizeDate(
    raw.data_inicio ?? raw.DATA_INICIO ?? raw.inicio_curso ?? raw.data_matricula,
  );

  if (!dataInicio) errors.push('data_inicio ausente ou inválida');

  if (errors.length) return { aluno: null, disciplinas: [], errors };

  const agora = new Date().toISOString();
  const faltasTotais = numberValue(
    raw.faltas_totais,
    raw.faltas_acumuladas,
    raw.FALTAS_ACUMULADAS,
    raw.faltas,
  );
  const faltasMes = numberValue(
    raw.faltas_mes_atual,
    raw.faltas_mes,
    raw.FALTAS_MES_ATUAL,
  );

  const reposicoesRealizadas = Math.max(0, numberValue(raw.reposicoes_realizadas, raw.reposicoesRealizadas));
  const faltasMesAnterior = Math.max(0, faltasTotais - faltasMes);
  const reposicoesQueAbatemHistorico = Math.min(reposicoesRealizadas, faltasMesAnterior);
  const faltasMesEfetivas = Math.max(0, faltasMes - Math.max(0, reposicoesRealizadas - reposicoesQueAbatemHistorico));
  const bloqueado = faltasMesEfetivas >= 3;
  const bloqueioManualOverride = Boolean(raw.bloqueio_manual_override);
  const statusMatricula = normalizeStatusAluno(raw.status_matricula);

  const alunoId = uuidFromKey(`${unidade}:${contrato}`);
  const turma = textValue(raw.turma_nome, raw.TURMA_NOME, raw.turma, raw.TURMA);
  const professorNome = textValue(raw.professor_nome, raw.professor, raw.PROFESSOR);
  const mesReferencia = textValue(raw.mes_referencia_faltas, raw.mes_referencia);
  const mesesContrato = nullableNumber(raw.meses_contrato_total, raw.meses_contrato);
  const totalGradeFonte = nullableNumber(raw.total_disciplinas_grade, raw.total_disciplinas);

  if (!turma) errors.push('turma_nome ausente');
  if (!professorNome) errors.push('professor_nome ausente');
  if (!mesReferencia) errors.push('mes_referencia_faltas ausente');
  if (mesesContrato === null) errors.push('meses_contrato_total ausente');
  if (totalGradeFonte === null && !Array.isArray(raw.disciplinas)) errors.push('total_disciplinas_grade ausente');
  if (errors.length) return { aluno: null, disciplinas: [], errors };

  const totalGrade = numberValue(
    totalGradeFonte,
    Array.isArray(raw.disciplinas) ? raw.disciplinas.length : undefined,
    Array.isArray(raw.disciplinas_pendentes) ? raw.disciplinas_pendentes.length : undefined,
    Array.isArray(raw.disciplinas_concluidas) ? raw.disciplinas_concluidas.length : undefined,
  );

  const concluidas = Array.isArray(raw.disciplinas_concluidas)
    ? raw.disciplinas_concluidas.length
    : numberValue(raw.disciplinas_concluidas, raw.disciplinas_concluidas_count);

  const aluno: NormalizedAluno = {
    id: alunoId,
    cgd_matricula_id: contrato,
    nome,
    contrato,
    email: nullableText(raw.email, raw.EMAIL),
    telefone: nullableText(raw.telefone, raw.TELEFONE, raw.celular),
    curso,
    turma_nome: turma,
    professor_responsavel_id: nullableText(raw.professor_responsavel_id),
    professor_nome: professorNome,
    data_inicio: dataInicio,
    data_termino_contrato: normalizeDate(raw.data_termino_contrato ?? raw.data_fim_contrato),
    dias_contrato_total: nullableNumber(raw.dias_contrato_total),
    meses_contrato_total: mesesContrato,
    ultima_aula: normalizeDate(raw.ultima_aula),
    ultimo_acesso: normalizeTimestamp(raw.ultimo_acesso),
    faltas_totais: Math.max(0, faltasTotais),
    faltas_mes_atual: Math.max(0, faltasMes),
    mes_referencia_faltas: mesReferencia,
    reposicoes_realizadas: reposicoesRealizadas,
    dias_em_curso: Math.max(0, numberValue(raw.dias_em_curso, raw.dias_curso, raw.dias)),
    criticidade: normalizeCriticidade(raw.criticidade),
    tratativa_sugerida: normalizeTratativa(raw.tratativa, raw.tratativa_sugerida),
    status_tratativa: normalizeStatusTratativa(raw.status_tratativa),
    status_matricula: statusMatricula,
    bloqueado_automaticamente: !bloqueioManualOverride && bloqueado,\n    bloqueio_manual_override: bloqueioManualOverride,
    motivo_bloqueio: !bloqueioManualOverride && bloqueado
      ? `Bloqueio automático: ${faltasMesEfetivas} faltas efetivas no mês ${textValue(raw.mes_referencia_faltas, raw.mes_referencia, 'vigente')}.`
      : nullableText(raw.motivo_bloqueio),
    total_disciplinas_grade: Math.max(0, totalGrade),
    disciplinas_concluidas: Math.max(0, concluidas),
    unidade,
    created_at: agora,
    updated_at: agora,
  };

  const disciplinas: NormalizedDisciplina[] = [];
  const rawDisciplinas = Array.isArray(raw.disciplinas) ? raw.disciplinas : [];

  rawDisciplinas.forEach((item, disciplineIndex) => {
    if (!item || typeof item !== 'object') return;
    const d = item as RawRecord;
    const nomeDisciplina = textValue(d.nome, d.disciplina, d.DISCIPLINA);
    const carga = numberValue(d.carga_horaria, d.CARGA_HORARIA);
    if (!nomeDisciplina || carga <= 0) return;

    const horasCursadas = Math.max(0, numberValue(d.horas_cursadas, d.horas_cumpridas));
    const horasEsperadas = Math.max(0, numberValue(d.horas_esperadas, d.horas_planejadas));
    const percentual = Math.max(0, Math.min(100, (horasCursadas / carga) * 100));
    const excedentes = Math.max(0, horasCursadas - carga);
    const statusRaw = textValue(d.status).toLowerCase();
    const status =
      statusRaw.includes('concl') ? 'concluida' :
      statusRaw.includes('andamento') ? 'em_andamento' :
      'pendente';
    const ritmo =
      status === 'concluida' ? 'concluida' :
      excedentes > 0 ? 'excesso_tempo' :
      percentual < 50 && horasEsperadas >= 20 ? 'avanco_lento' :
      'normal';

    disciplinas.push({
      id: uuidFromKey(`${alunoId}:disciplina:${disciplineIndex}:${nomeDisciplina}`),
      aluno_id: alunoId,
      nome: nomeDisciplina,
      carga_horaria: Math.round(carga),
      status,
      nota: nullableNumber(d.nota),
      frequencia_percent: nullableNumber(d.frequencia_percent, d.frequencia),
      data_conclusao: normalizeDate(d.data_conclusao),
      ordem: numberValue(d.ordem, disciplineIndex + 1),
      horas_cursadas: horasCursadas,
      horas_esperadas: horasEsperadas,
      percentual_avanco: percentual,
      horas_excedentes: excedentes,
      ultrapassou_carga: excedentes > 0,
      ritmo,
      created_at: agora,
      updated_at: agora,
    });
  });

  return { aluno, disciplinas, errors };
}

async function fetchSource(): Promise<RawRecord[]> {
  const response = await fetch(SOURCE_URL, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Falha ao baixar dados_alunos.json: HTTP ${response.status}`);
  }

  const payload = await response.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new Error(`dados_alunos.json não é JSON válido: ${error instanceof Error ? error.message : String(error)}`);
  }

  return normalizeSource(parsed);
}

async function main() {
  console.log('=== CFIS — INGESTÃO dados_alunos.json → Supabase ===');
  console.log(`Fonte: ${SOURCE_URL}`);
  console.log(`Modo: ${WRITE_ENABLED ? 'WRITE' : 'DRY-RUN'}`);

  const records = await fetchSource();
  console.log(`Registros brutos encontrados: ${records.length}`);

  const alunos: NormalizedAluno[] = [];
  const disciplinas: NormalizedDisciplina[] = [];
  const errors: Array<{ index: number; errors: string[] }> = [];

  records.forEach((record, index) => {
    const result = normalizeAluno(record, index);
    if (!result.aluno) {
      errors.push({ index, errors: result.errors });
      return;
    }
    alunos.push(result.aluno);
    disciplinas.push(...result.disciplinas);
  });

  const contratos = new Set<string>();
  const duplicados: string[] = [];
  for (const aluno of alunos) {
    if (contratos.has(aluno.cgd_matricula_id)) duplicados.push(aluno.cgd_matricula_id);
    contratos.add(aluno.cgd_matricula_id);
  }

  console.log(`Alunos válidos: ${alunos.length}`);
  console.log(`Disciplinas detalhadas válidas: ${disciplinas.length}`);
  console.log(`Registros inválidos: ${errors.length}`);
  console.log(`Contratos/matrículas duplicados: ${new Set(duplicados).size}`);

  if (errors.length) {
    console.log('Primeiros registros inválidos:');
    console.log(JSON.stringify(errors.slice(0, 20), null, 2));
  }

  if (duplicados.length) {
    throw new Error(`Contrato/matrícula duplicado detectado. Nenhum dado será gravado. Duplicados: ${[...new Set(duplicados)].slice(0, 20).join(', ')}`);
  }

  if (!WRITE_ENABLED) {
    console.log('DRY-RUN concluído. Nenhuma alteração foi enviada ao Supabase.');
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Para --write são obrigatórias SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. A service_role nunca deve ser colocada no frontend.',
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (let i = 0; i < alunos.length; i += BATCH_SIZE) {
    const batch = alunos.slice(i, i + BATCH_SIZE).map((aluno) => {
      const payload = { ...aluno } as Record<string, unknown>;
      // created_at pertence ao registro original; nunca deve ser resetado em um sync recorrente.
      delete payload.created_at;
      for (const key of ['criticidade', 'tratativa_sugerida', 'status_tratativa', 'status_matricula']) {
        if (payload[key] === null) delete payload[key];
      }
      return payload;
    });
    const { error } = await supabase
      .from('alunos')
      .upsert(batch, { onConflict: 'cgd_matricula_id' });

    if (error) {
      throw new Error(`Falha no upsert de alunos no lote ${i + 1}-${Math.min(i + BATCH_SIZE, alunos.length)}: ${error.message}`);
    }

    console.log(`ALUNOS_PERSISTIDOS=${Math.min(i + BATCH_SIZE, alunos.length)}/${alunos.length}`);
  }

  const alunoIds = alunos.map((aluno) => aluno.id);

  for (let i = 0; i < alunoIds.length; i += BATCH_SIZE) {
    const ids = alunoIds.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('aluno_disciplinas')
      .delete()
      .in('aluno_id', ids);

    if (error) {
      throw new Error(`Falha ao limpar disciplinas do lote: ${error.message}`);
    }
  }

  for (let i = 0; i < disciplinas.length; i += BATCH_SIZE) {
    const batch = disciplinas.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('aluno_disciplinas').insert(batch);

    if (error) {
      throw new Error(`Falha ao inserir disciplinas no lote ${i + 1}: ${error.message}`);
    }

    console.log(`DISCIPLINAS_PERSISTIDAS=${Math.min(i + BATCH_SIZE, disciplinas.length)}/${disciplinas.length}`);
  }

  console.log('INGESTAO_SUPABASE=OK');
}

main().catch((error) => {
  console.error('INGESTAO_SUPABASE=ERRO');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
