import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AlunoMonitorado, NivelCriticidade, TipoTratativa } from '../types';

export { supabase, isSupabaseConfigured };

export interface ResumoCGDRecord {
  id?: string | number;
  unidade?: 'filial' | 'matriz';
  total_matriz?: number;
  total_filial?: number;
  total_alunos_ativos?: number;
  alunos_criticos?: number;
  criticos?: number;
  alunos_moderados?: number;
  moderados?: number;
  dados_completos?: any;
  relatorio?: any;
  alunos_data?: any;
  alunos?: any;
}

export const getSupabaseClient = (): SupabaseClient | null => supabase;

// Busca os registros da tabela resumo_cgd sem exigir coluna created_at
export const fetchResumoCgdFromSupabase = async (
  unidade?: 'filial' | 'matriz'
): Promise<{
  success: boolean;
  data: ResumoCGDRecord[] | null;
  error?: string;
}> => {
  try {
    if (!supabase) {
      return { success: false, data: null, error: 'Supabase não inicializado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.' };
    }
    let query = supabase.from('resumo_cgd').select('*');
    if (unidade) {
      query = query.eq('unidade', unidade);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro na consulta Supabase:', error);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: (data as ResumoCGDRecord[]) || [] };
  } catch (err: any) {
    console.error('Falha de conexão Supabase:', err);
    return { success: false, data: null, error: err?.message || 'Erro de conexão' };
  }
};

// Salva ou atualiza registros na tabela resumo_cgd
export const upsertResumoCgdToSupabase = async (
  record: Partial<ResumoCGDRecord>
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    if (!supabase) {
      return { success: false, data: null, error: 'Supabase não inicializado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.' };
    }
    const { data, error } = await supabase
      .from('resumo_cgd')
      .upsert([record])
      .select();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, data: null, error: err?.message || 'Erro ao enviar dados ao Supabase' };
  }
};

// Extração segura de alunos do JSON sem limite de registros
export function extractAlunosFromSupabaseRecord(
  record: any,
  unidadePadrao: 'filial' | 'matriz' = 'filial'
): AlunoMonitorado[] {
  if (!record) return [];

  let rawData = record.dados_completos ?? record.relatorio ?? record.alunos_data ?? record.alunos;

  if (!rawData) return [];

  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch (e) {
      console.error('Erro ao converter JSON:', e);
      return [];
    }
  }

  // Se for objeto aninhado
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    if (Array.isArray(rawData.alunos)) {
      rawData = rawData.alunos;
    } else if (Array.isArray(rawData.data)) {
      rawData = rawData.data;
    } else if (Array.isArray(rawData.relatorio)) {
      rawData = rawData.relatorio;
    } else if (Array.isArray(rawData.dados_completos)) {
      rawData = rawData.dados_completos;
    } else {
      const values = Object.values(rawData);
      if (values.length > 0 && typeof values[0] === 'object') {
        rawData = values;
      }
    }
  }

  if (!Array.isArray(rawData)) return [];

  const targetUnidade: 'filial' | 'matriz' = record.unidade
    ? (String(record.unidade).toLowerCase() as 'filial' | 'matriz')
    : unidadePadrao;

  return rawData.map((item: any, index: number): AlunoMonitorado => {
    const dias = Number(
      item.dias ??
      item.diasEmCurso ??
      item.dias_curso ??
      item.dias_em_curso ??
      item.tempo_curso_dias ??
      item.tempo_dias ??
      item.dias_cursados ??
      0
    );

    // Nível de Criticidade e Tratativa baseado nos dias
    let statusVal = 'NORMAL';
    let criticidadeVal: NivelCriticidade = 'normal';
    let tratativaVal: TipoTratativa = 'normal';

    if (dias > 90) {
      statusVal = 'CRÍTICO';
      criticidadeVal = 'critico';
      tratativaVal = 'aulao';
    } else if (dias >= 60) {
      statusVal = 'MODERADO';
      criticidadeVal = 'moderado';
      tratativaVal = 'atividade_pratica';
    } else if (dias >= 30) {
      statusVal = 'ATENÇÃO';
      criticidadeVal = 'atencao';
      tratativaVal = 'acompanhamento';
    } else {
      statusVal = 'NORMAL';
      criticidadeVal = 'normal';
      tratativaVal = 'normal';
    }

    const contratoValido = String(item.contrato || item.matricula || item.codigo || item.id_contrato || (10000 + index));
    const nomeVal = String(item.nome || item.name || item.aluno || item.nome_aluno || item.nomeAluno || `Aluno ${contratoValido}`);
    const faltasMesVal = Number(item.faltasMesAtual ?? item.faltas_mes_atual ?? item.faltas_mes ?? item.faltas ?? item.faltasConsecutivas ?? 0);
    const faltasTotaisVal = Number(item.faltasTotais ?? item.faltas_totais ?? item.total_faltas ?? faltasMesVal);
    const reposicoesRealizadasVal = Number(item.reposicoesRealizadas ?? item.reposicoes_realizadas ?? 0);
    const reposicoesAgendadasVal = Number(item.reposicoesAgendadas ?? item.reposicoes_agendadas ?? 0);
    const disciplinasArr = Array.isArray(item.disciplinas) ? item.disciplinas : [];

    const concluidasCount = Number(
      item.disciplinasConcluidas ??
      item.disciplinas_concluidas ??
      disciplinasArr.filter((d: any) => d.status === 'concluida').length
    );

    const alunoUnidade: 'filial' | 'matriz' = item.unidade
      ? (String(item.unidade).toLowerCase() as 'filial' | 'matriz')
      : targetUnidade;

    const reposicoesPendentesVal = Math.max(0, faltasTotaisVal - reposicoesRealizadasVal);
    const percentualReposicaoVal = faltasTotaisVal > 0
      ? Math.min(100, Math.max(0, (reposicoesRealizadasVal / faltasTotaisVal) * 100))
      : 100;
    const deveBloquear = faltasMesVal >= 3;

    return {
      id: String(item.id || contratoValido || `aluno-${index}`),
      nome: nomeVal,
      contrato: contratoValido,
      cgdUrl: item.cgdUrl || item.cgd_url || `https://app.cgd.com.br/contratos/${contratoValido}`,
      cgdLaboratorio: item.cgdLaboratorio || item.cgd_laboratorio || (alunoUnidade === 'filial' ? 'lab_01' : 'lab_matriz_01'),
      email: item.email || `${nomeVal.toLowerCase().replace(/\s+/g, '.')}@aluno.cfis.edu.br`,
      telefone: item.telefone || item.celular || item.fone || '(91) 98800-0000',
      curso: item.curso || item.course || 'Profissionalizante em Tecnologia',
      disciplinaAtual: item.disciplinaAtual || item.disciplina_atual || item.disciplina || item.modulo || 'Informática Essencial',
      turmaId: String(item.turmaId || item.turma_id || item.turma || 'TURMA-PADRAO'),
      turmaNome: item.turmaNome || item.turma_nome || item.turma || (alunoUnidade === 'filial' ? 'Turma Lab 1 - Castanhal' : 'Turma Lab Matriz'),
      professorResponsavel: item.professorResponsavel || item.professor_responsavel || item.professor || (alunoUnidade === 'filial' ? 'Ronaldo Vasconcelos' : 'Carlos Mendes'),
      dataInicio: item.dataInicio || item.data_inicio || '2026-01-15',
      dataTerminoContrato: item.dataTerminoContrato || item.data_termino_contrato || undefined,
      diasContratoTotal: item.diasContratoTotal || item.dias_contrato_total || undefined,
      mesesContratoTotal: Number(item.mesesContratoTotal || item.meses_contrato_total || 12),
      ultimaAula: item.ultimaAula || item.ultima_aula || item.ultimoAcesso || item.ultimo_acesso || '19/08/2026',
      ultimoAcesso: item.ultimoAcesso || item.ultimo_acesso || '19/08/2026 14:00',
      diasSemAcesso: Number(item.diasSemAcesso ?? item.dias_sem_acesso ?? 0),
      faltasTotais: faltasTotaisVal,
      faltasAcumuladas: faltasTotaisVal,
      faltasMesAtual: faltasMesVal,
      mesReferenciaFaltas: item.mesReferenciaFaltas || item.mes_referencia_faltas || '08/2026',
      reposicoesRealizadas: reposicoesRealizadasVal,
      reposicoesPendentes: reposicoesPendentesVal,
      percentualReposicao: percentualReposicaoVal,
      diasEmCurso: dias,
      status: statusVal,
      criticidade: criticidadeVal,
      tratativaSugerida: tratativaVal,
      statusTratativa: item.statusTratativa || item.status_tratativa || 'pendente',
      observacaoTratativa: item.observacaoTratativa || item.observacao_tratativa || '',
      statusMatricula: item.statusMatricula || item.status_matricula || (deveBloquear ? 'bloqueado_faltas' : 'ativo'),
      bloqueadoAutomaticamente: Boolean(item.bloqueadoAutomaticamente ?? deveBloquear),
      motivoBloqueio: item.motivoBloqueio || item.motivo_bloqueio || (deveBloquear ? `Bloqueio automático: ${faltasMesVal} faltas no mês ${item.mesReferenciaFaltas || item.mes_referencia_faltas || 'vigente'}. Limite de bloqueio: 3 faltas. Faltas acumuladas: ${faltasTotaisVal}. Reposições pendentes: ${reposicoesPendentesVal}.` : undefined),
      disciplinas: disciplinasArr,
      totalDisciplinasGrade: Number(item.totalDisciplinasGrade ?? item.total_disciplinas ?? (disciplinasArr.length > 0 ? disciplinasArr.length : 6)),
      disciplinasConcluidas: concluidasCount,
      reposicoesAgendadas: reposicoesAgendadasVal,
      unidade: alunoUnidade,
      anomaliaRitmo: item.anomaliaRitmo,
      detalheAnomaliaRitmo: item.detalheAnomaliaRitmo,
      tempoMedioPorAulaMinutos: item.tempoMedioPorAulaMinutos ? Number(item.tempoMedioPorAulaMinutos) : undefined,
      percentualAvancoDisciplina: item.percentualAvancoDisciplina ? Number(item.percentualAvancoDisciplina) : undefined,
      horasCursadasDisciplinaAtual: item.horasCursadasDisciplinaAtual ? Number(item.horasCursadasDisciplinaAtual) : undefined,
      horasEsperadasDisciplinaAtual: item.horasEsperadasDisciplinaAtual ? Number(item.horasEsperadasDisciplinaAtual) : undefined,
    };
  });
}