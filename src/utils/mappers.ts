import {
  AlunoRow,
  AlunoDisciplinaRow,
  AlunoMonitorado,
  DisciplinaAluno,
  OcorrenciaRow,
  OcorrenciaCGD,
  TurmaCGDRow,
  TurmaCGD,
  ProfileRow,
  UserProfile,
} from '../types';

/**
 * Utilitário seguro para parsing de datas nos formatos YYYY-MM-DD, ISO ou DD/MM/YYYY.
 */
function parseDataSegura(dataStr?: string | null): Date | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const limpa = dataStr.trim();
  if (!limpa) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(limpa)) {
    const [ano, mes, dia] = limpa.split('T')[0].split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(limpa)) {
    const [dia, mes, ano] = limpa.split(' ')[0].split('/').map(Number);
    const d = new Date(ano, mes - 1, dia);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(limpa);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calcula os prazos contratuais do aluno a partir de datas reais.
 */
export function calcularPrazosContrato(
  dataInicioStr?: string | null,
  dataTerminoStr?: string | null,
  mesesContratoTotal: number = 12,
  diasContratoTotalBanco?: number | null
) {
  const dataInicio = parseDataSegura(dataInicioStr);
  const dataTermino = parseDataSegura(dataTerminoStr);
  const hoje = new Date();

  // Dias totais de contrato: se veio no banco, usa ele. Se tem data de término e início reais, calcula.
  let diasContratoTotal: number | undefined = undefined;
  if (diasContratoTotalBanco !== null && diasContratoTotalBanco !== undefined && diasContratoTotalBanco > 0) {
    diasContratoTotal = diasContratoTotalBanco;
  } else if (dataInicio && dataTermino) {
    const diffMs = dataTermino.getTime() - dataInicio.getTime();
    diasContratoTotal = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  } else if (mesesContratoTotal > 0) {
    diasContratoTotal = mesesContratoTotal * 30;
  }

  let diasContratoDecorridos: number | undefined = undefined;
  let diasContratoRestantes: number | undefined = undefined;

  if (dataInicio) {
    const diffInicio = hoje.getTime() - dataInicio.getTime();
    diasContratoDecorridos = Math.max(0, Math.round(diffInicio / (1000 * 60 * 60 * 24)));

    if (dataTermino) {
      const diffTermino = dataTermino.getTime() - hoje.getTime();
      diasContratoRestantes = Math.max(0, Math.round(diffTermino / (1000 * 60 * 60 * 24)));
    } else if (diasContratoTotal !== undefined) {
      diasContratoRestantes = Math.max(0, diasContratoTotal - diasContratoDecorridos);
    }
  }

  return {
    dataTerminoContrato: dataTerminoStr || (dataTermino ? dataTermino.toISOString().split('T')[0] : undefined),
    diasContratoTotal,
    diasContratoDecorridos,
    diasContratoRestantes,
  };
}

/**
 * Calcula o indicador de risco do prazo contratual (NÃO é estimativa de horas reais).
 * Avalia a proporção do contrato consumido em relação ao avanço na grade de disciplinas e reposições pendentes.
 */
export function calcularRiscoPrazoContrato(params: {
  diasContratoTotal?: number;
  diasContratoDecorridos?: number;
  diasContratoRestantes?: number;
  totalDisciplinasGrade: number;
  disciplinasConcluidas: number;
  reposicoesPendentes: number;
  temDisciplinaEmAndamento: boolean;
}): {
  risco: 'baixo' | 'moderado' | 'alto' | 'critico';
  detalhe: string;
} {
  const {
    diasContratoTotal,
    diasContratoDecorridos,
    diasContratoRestantes,
    totalDisciplinasGrade,
    disciplinasConcluidas,
    reposicoesPendentes,
    temDisciplinaEmAndamento,
  } = params;

  const totalGrade = Math.max(1, totalDisciplinasGrade);
  const percentualGrade = Math.min(100, (disciplinasConcluidas / totalGrade) * 100);

  let percentualContratoConsumido = 0;
  if (diasContratoTotal && diasContratoTotal > 0 && diasContratoDecorridos !== undefined) {
    percentualContratoConsumido = Math.min(100, (diasContratoDecorridos / diasContratoTotal) * 100);
  }

  const defasagem = percentualContratoConsumido - percentualGrade;

  // Classificação conservadora de risco de prazo
  if (
    (diasContratoRestantes !== undefined && diasContratoRestantes <= 30 && percentualGrade < 70) ||
    (percentualContratoConsumido >= 85 && percentualGrade < 60) ||
    reposicoesPendentes >= 5
  ) {
    return {
      risco: 'critico',
      detalhe: `Risco Crítico: ${percentualContratoConsumido.toFixed(0)}% do prazo contratual decorrido com ${disciplinasConcluidas}/${totalDisciplinasGrade} disciplinas concluídas (${percentualGrade.toFixed(0)}%) e ${reposicoesPendentes} reposições pendentes.`,
    };
  }

  if (
    defasagem >= 30 ||
    reposicoesPendentes >= 3 ||
    (!temDisciplinaEmAndamento && percentualGrade < 100 && percentualContratoConsumido > 50)
  ) {
    return {
      risco: 'alto',
      detalhe: `Risco Alto: Defasagem de ${defasagem > 0 ? defasagem.toFixed(0) : 0}% entre o tempo decorrido (${percentualContratoConsumido.toFixed(0)}%) e a conclusão da grade (${percentualGrade.toFixed(0)}%). Reposições pendentes: ${reposicoesPendentes}.`,
    };
  }

  if (defasagem >= 15 || reposicoesPendentes >= 1) {
    return {
      risco: 'moderado',
      detalhe: `Risco Moderado: Ritmo exige atenção para manter o cronograma contratual. ${reposicoesPendentes} reposição(ões) pendente(s).`,
    };
  }

  return {
    risco: 'baixo',
    detalhe: 'Risco Baixo: Andamento curricular e reposições em equilíbrio com o prazo contratual.',
  };
}

/**
 * Calcula os indicadores de ritmo da disciplina.
 */
function calcularIndicadoresDisciplina(
  cargaHoraria: number,
  horasCursadas?: number | null,
  horasEsperadas?: number | null
) {
  const cursadas =
    horasCursadas !== null && horasCursadas !== undefined
      ? Math.max(0, horasCursadas)
      : undefined;

  const esperadas =
    horasEsperadas !== null && horasEsperadas !== undefined
      ? Math.max(0, horasEsperadas)
      : undefined;

  const percentualAvanco =
    cursadas !== undefined && cargaHoraria > 0
      ? Math.min(100, (cursadas / cargaHoraria) * 100)
      : undefined;

  const excedeuCargaHoraria =
    cursadas !== undefined
      ? cursadas > cargaHoraria
      : false;

  const horasExcedentes =
    cursadas !== undefined
      ? Math.max(0, cursadas - cargaHoraria)
      : undefined;

  return {
    horasCursadas: cursadas,
    horasEsperadas: esperadas,
    percentualAvanco,
    excedeuCargaHoraria,
    horasExcedentes,
  };
}

/**
 * Mapeia aluno_disciplinas do PostgreSQL
 * para DisciplinaAluno do frontend.
 */
export function mapAlunoDisciplinaRowToDisciplinaAluno(
  row: AlunoDisciplinaRow
): DisciplinaAluno {
  const indicadores = calcularIndicadoresDisciplina(
    row.carga_horaria,
    row.horas_cursadas
  );

  return {
    id: row.id,
    nome: row.nome,
    cargaHoraria: row.carga_horaria,
    status: row.status,

    nota:
      row.nota !== null && row.nota !== undefined
        ? row.nota
        : undefined,

    frequenciaPercent:
      row.frequencia_percent !== null &&
      row.frequencia_percent !== undefined
        ? row.frequencia_percent
        : undefined,

    dataConclusao:
      row.data_conclusao !== null &&
      row.data_conclusao !== undefined
        ? row.data_conclusao
        : undefined,

    horasCursadas: indicadores.horasCursadas,
    horasEsperadas: indicadores.horasEsperadas,
    percentualAvanco: indicadores.percentualAvanco,

    excedeuCargaHoraria: indicadores.excedeuCargaHoraria,
    horasExcedentes: indicadores.horasExcedentes,
  };
}

/**
 * Mapeia aluno do PostgreSQL para AlunoMonitorado.
 */
export function mapAlunoRowToAlunoMonitorado(
  aluno: AlunoRow,
  disciplinasRows: AlunoDisciplinaRow[] = []
): AlunoMonitorado {
  const mappedDisciplinas = disciplinasRows.map(
    mapAlunoDisciplinaRowToDisciplinaAluno
  );

  const concluidasCount =
    mappedDisciplinas.length > 0
      ? mappedDisciplinas.filter(
          (d) => d.status === 'concluida'
        ).length
      : aluno.disciplinas_concluidas;

  const totalGrade =
    mappedDisciplinas.length > 0
      ? mappedDisciplinas.length
      : aluno.total_disciplinas_grade;

  const disciplinaEmAndamento =
    mappedDisciplinas.find(
      (d) => d.status === 'em_andamento'
    );

  const disciplinaAtualNome = disciplinaEmAndamento
    ? disciplinaEmAndamento.nome
    : aluno.curso;

  // Faltas e Reposições
  const faltasAcumuladas = aluno.faltas_totais ?? 0;
  const faltasMesAtual = aluno.faltas_mes_atual ?? 0;
  const reposicoesRealizadas =
    aluno.reposicoes_realizadas !== null && aluno.reposicoes_realizadas !== undefined
      ? Math.max(0, aluno.reposicoes_realizadas)
      : 0;

  const reposicoesPendentes = Math.max(0, faltasAcumuladas - reposicoesRealizadas);
  const percentualReposicao =
    faltasAcumuladas > 0
      ? Math.min(100, Math.max(0, (reposicoesRealizadas / faltasAcumuladas) * 100))
      : 100;

  // Prazos e Risco Contratual
  const prazos = calcularPrazosContrato(
    aluno.data_inicio,
    aluno.data_termino_contrato,
    aluno.meses_contrato_total,
    aluno.dias_contrato_total
  );

  const analiseRiscoPrazo = calcularRiscoPrazoContrato({
    diasContratoTotal: prazos.diasContratoTotal,
    diasContratoDecorridos: prazos.diasContratoDecorridos,
    diasContratoRestantes: prazos.diasContratoRestantes,
    totalDisciplinasGrade: totalGrade,
    disciplinasConcluidas: concluidasCount,
    reposicoesPendentes,
    temDisciplinaEmAndamento: Boolean(disciplinaEmAndamento),
  });

  // Regra de Bloqueio Automático: faltas_mes_atual >= 3
  const deveBloquear = faltasMesAtual >= 3;
  const bloqueadoAutomaticamente = Boolean(aluno.bloqueado_automaticamente || deveBloquear);
  let statusMatricula = aluno.status_matricula;
  let motivoBloqueio =
    aluno.motivo_bloqueio !== null && aluno.motivo_bloqueio !== undefined
      ? aluno.motivo_bloqueio
      : undefined;

  if (deveBloquear) {
    statusMatricula = 'bloqueado_faltas';
    motivoBloqueio = `Bloqueio automático: ${faltasMesAtual} faltas no mês ${aluno.mes_referencia_faltas || 'vigente'}. Limite de bloqueio: 3 faltas. Faltas acumuladas: ${faltasAcumuladas}. Reposições pendentes: ${reposicoesPendentes}.`;
  }

  return {
    id: aluno.id,
    nome: aluno.nome,
    contrato: aluno.contrato,

    email:
      aluno.email !== null && aluno.email !== undefined
        ? aluno.email
        : undefined,

    telefone:
      aluno.telefone !== null && aluno.telefone !== undefined
        ? aluno.telefone
        : undefined,

    curso: aluno.curso,
    disciplinaAtual: disciplinaAtualNome,

    turmaId: aluno.turma_nome,
    turmaNome: aluno.turma_nome,

    professorResponsavel: aluno.professor_nome,

    dataInicio: aluno.data_inicio,
    mesesContratoTotal: aluno.meses_contrato_total,

    dataTerminoContrato: prazos.dataTerminoContrato,
    diasContratoTotal: prazos.diasContratoTotal,
    diasContratoDecorridos: prazos.diasContratoDecorridos,
    diasContratoRestantes: prazos.diasContratoRestantes,

    riscoPrazoContrato: analiseRiscoPrazo.risco,
    detalheRiscoPrazoContrato: analiseRiscoPrazo.detalhe,

    ultimaAula:
      aluno.ultima_aula !== null &&
      aluno.ultima_aula !== undefined
        ? aluno.ultima_aula
        : '',

    ultimoAcesso:
      aluno.ultimo_acesso !== null &&
      aluno.ultimo_acesso !== undefined
        ? aluno.ultimo_acesso
        : '',

    faltasTotais: faltasAcumuladas,
    faltasAcumuladas,
    faltasMesAtual,
    mesReferenciaFaltas: aluno.mes_referencia_faltas,

    reposicoesRealizadas,
    reposicoesPendentes,
    percentualReposicao,
    reposicoesAgendadas: (aluno as any).reposicoes_agendadas !== null && (aluno as any).reposicoes_agendadas !== undefined
      ? Math.max(0, Number((aluno as any).reposicoes_agendadas))
      : 0,
    proximaReposicao: (aluno as any).proxima_reposicao ? {
      id: (aluno as any).proxima_reposicao.id,
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      contrato: aluno.contrato,
      data: (aluno as any).proxima_reposicao.data,
      horarioInicio: (aluno as any).proxima_reposicao.horario_inicio || (aluno as any).proxima_reposicao.horarioInicio || '16:00',
      horarioFim: (aluno as any).proxima_reposicao.horario_fim || (aluno as any).proxima_reposicao.horarioFim || '18:00',
      duracaoHoras: (aluno as any).proxima_reposicao.duracao_horas || (aluno as any).proxima_reposicao.duracaoHoras || 2,
      disciplina: (aluno as any).proxima_reposicao.disciplina || disciplinaAtualNome || 'Módulo Geral',
      tipo: (aluno as any).proxima_reposicao.tipo || 'reforco_laboratorio',
      descricao: (aluno as any).proxima_reposicao.observacao || (aluno as any).proxima_reposicao.descricao || 'Reposição agendada',
      professorNome: (aluno as any).proxima_reposicao.professor || (aluno as any).proxima_reposicao.professorNome || aluno.professor_nome || 'Ronaldo Vasconcelos',
      status: (aluno as any).proxima_reposicao.status || 'agendada',
      horasCompensadas: (aluno as any).proxima_reposicao.duracao_horas || 2,
    } : undefined,
    historicoReposicoes: Array.isArray((aluno as any).historico_reposicoes)
      ? (aluno as any).historico_reposicoes.map((r: any) => ({
          id: r.id,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          contrato: aluno.contrato,
          data: r.data,
          horarioInicio: r.horario_inicio || r.horarioInicio || '16:00',
          horarioFim: r.horario_fim || r.horarioFim || '18:00',
          duracaoHoras: r.duracao_horas || r.duracaoHoras || 2,
          disciplina: r.disciplina || disciplinaAtualNome || 'Módulo Geral',
          tipo: r.tipo || 'reforco_laboratorio',
          descricao: r.observacao || r.descricao || 'Reposição agendada',
          professorNome: r.professor || r.professorNome || aluno.professor_nome || 'Ronaldo Vasconcelos',
          status: r.status || 'agendada',
          horasCompensadas: r.duracao_horas || 2,
        }))
      : [],

    diasEmCurso: aluno.dias_em_curso,

    criticidade: aluno.criticidade,
    tratativaSugerida: aluno.tratativa_sugerida,
    statusTratativa: aluno.status_tratativa,

    statusMatricula,
    bloqueadoAutomaticamente,
    motivoBloqueio,

    disciplinas: mappedDisciplinas,

    totalDisciplinasGrade: totalGrade,
    disciplinasConcluidas: concluidasCount,

    unidade: aluno.unidade,

    cgdUrl: undefined,
    cgdLaboratorio: undefined,

    diasSemAcesso: undefined,
    faltasBrutasTotais: undefined,
    faltasBrutasMes: undefined,

    presencasRegulares: undefined,
    presencasReposicao: undefined,

    anomaliaRitmo: undefined,
    detalheAnomaliaRitmo: undefined,

    tempoMedioPorAulaMinutos: undefined,

    /**
     * Agora estes campos são derivados
     * da disciplina atualmente em andamento.
     */
    percentualAvancoDisciplina:
      disciplinaEmAndamento?.percentualAvanco,

    horasCursadasDisciplinaAtual:
      disciplinaEmAndamento?.horasCursadas,

    horasEsperadasDisciplinaAtual:
      disciplinaEmAndamento?.horasEsperadas,

    primeiraOcorrenciaAutomatica: undefined,

    observacaoTratativa: undefined,
    status: undefined,
    diasTotalPrevisto: undefined,
  };
}

/**
 * Mapeia ocorrência do PostgreSQL para o frontend.
 */
export function mapOcorrenciaRowToOcorrenciaCGD(
  row: OcorrenciaRow
): OcorrenciaCGD {
  const tiposValidos: OcorrenciaCGD['tipo'][] = [
    'pedagogica',
    'disciplinar',
    'falta_excessiva',
    'aulao_recuperacao',
    'atividade_pratica',
    'elogio',
  ];

  const tipoValido = tiposValidos.includes(
    row.tipo as OcorrenciaCGD['tipo']
  )
    ? (row.tipo as OcorrenciaCGD['tipo'])
    : 'pedagogica';

  return {
    id: row.id,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome,
    contrato: row.contrato,
    curso: row.curso,
    turmaNome: row.turma_nome,
    professorId: row.professor_id,
    professorNome: row.professor_nome,
    data: row.data,
    tipo: tipoValido,
    titulo: row.titulo,
    descricao: row.descricao,
    tratativaAplicada: row.tratativa_aplicada,
    statusTratativa: row.status_tratativa,
    sincronizadoCGD: row.sincronizado_cgd,

    dataSincronizacaoCGD:
      row.data_sincronizacao_cgd ??
      undefined,

    protocoloCGD:
      row.protocolo_cgd ??
      undefined,
  };
}

/**
 * Mapeia turma do PostgreSQL para o frontend.
 */
export function mapTurmaCGDRowToTurmaCGD(
  row: TurmaCGDRow,
  totalMatriculados: number = 0
): TurmaCGD {
  const statusValido: TurmaCGD['status'] =
    ['em_andamento', 'prevista', 'encerrada'].includes(
      row.status
    )
      ? (row.status as TurmaCGD['status'])
      : 'em_andamento';

  return {
    id: row.id,
    nome: row.nome,
    cursoNome: row.curso_nome,
    codigoCurso: row.codigo_curso,
    professorResponsavel: row.professor_nome,
    professorId: row.professor_responsavel_id || '',
    diasSemana: row.dias_semana || [],
    horarioInicio: row.horario_inicio,
    horarioFim: row.horario_fim,
    sala: row.sala,
    limiteAlunos: row.limite_alunos,
    totalAlunosMatriculados: totalMatriculados,
    disciplinaAtual: row.disciplina_atual,
    status: statusValido,
    unidade: row.unidade,
  };
}

/**
 * Mapeia profile do PostgreSQL para o frontend.
 */
export function mapProfileRowToUserProfile(
  row: ProfileRow
): UserProfile {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    role: row.role,
    unidade: row.unidade,
    status: 'ativo',
    tipoAutenticacao: 'email_senha',
    dataCadastro: row.created_at,
    ultimoAcesso: row.updated_at,
  };
}

/**
 * Mapeador inverso AlunoMonitorado -> AlunoRow.
 */
export function mapAlunoMonitoradoToAlunoUpdate(
  aluno: Partial<AlunoMonitorado>
): Partial<AlunoRow> {
  const updateData: Partial<AlunoRow> = {};

  if (aluno.nome !== undefined)
    updateData.nome = aluno.nome;

  if (aluno.contrato !== undefined)
    updateData.contrato = aluno.contrato;

  if (aluno.email !== undefined)
    updateData.email = aluno.email;

  if (aluno.telefone !== undefined)
    updateData.telefone = aluno.telefone;

  if (aluno.curso !== undefined)
    updateData.curso = aluno.curso;

  if (aluno.turmaNome !== undefined)
    updateData.turma_nome = aluno.turmaNome;

  if (aluno.professorResponsavel !== undefined)
    updateData.professor_nome =
      aluno.professorResponsavel;

  if (aluno.dataInicio !== undefined)
    updateData.data_inicio = aluno.dataInicio;

  if (aluno.dataTerminoContrato !== undefined)
    updateData.data_termino_contrato = aluno.dataTerminoContrato;

  if (aluno.diasContratoTotal !== undefined)
    updateData.dias_contrato_total = aluno.diasContratoTotal;

  if (aluno.mesesContratoTotal !== undefined)
    updateData.meses_contrato_total =
      aluno.mesesContratoTotal;

  if (aluno.ultimaAula !== undefined)
    updateData.ultima_aula = aluno.ultimaAula;

  if (aluno.ultimoAcesso !== undefined)
    updateData.ultimo_acesso = aluno.ultimoAcesso;

  if (aluno.faltasAcumuladas !== undefined)
    updateData.faltas_totais = aluno.faltasAcumuladas;
  else if (aluno.faltasTotais !== undefined)
    updateData.faltas_totais = aluno.faltasTotais;

  if (aluno.faltasMesAtual !== undefined)
    updateData.faltas_mes_atual =
      aluno.faltasMesAtual;

  if (aluno.reposicoesRealizadas !== undefined)
    updateData.reposicoes_realizadas = aluno.reposicoesRealizadas;

  if (aluno.mesReferenciaFaltas !== undefined)
    updateData.mes_referencia_faltas =
      aluno.mesReferenciaFaltas;

  if (aluno.diasEmCurso !== undefined)
    updateData.dias_em_curso = aluno.diasEmCurso;

  if (aluno.criticidade !== undefined)
    updateData.criticidade = aluno.criticidade;

  if (aluno.tratativaSugerida !== undefined)
    updateData.tratativa_sugerida =
      aluno.tratativaSugerida;

  if (aluno.statusTratativa !== undefined)
    updateData.status_tratativa =
      aluno.statusTratativa;

  if (aluno.statusMatricula !== undefined)
    updateData.status_matricula =
      aluno.statusMatricula;

  if (aluno.bloqueadoAutomaticamente !== undefined)
    updateData.bloqueado_automaticamente =
      aluno.bloqueadoAutomaticamente;

  if (aluno.motivoBloqueio !== undefined)
    updateData.motivo_bloqueio =
      aluno.motivoBloqueio;

  if (aluno.totalDisciplinasGrade !== undefined)
    updateData.total_disciplinas_grade =
      aluno.totalDisciplinasGrade;

  if (aluno.disciplinasConcluidas !== undefined)
    updateData.disciplinas_concluidas =
      aluno.disciplinasConcluidas;

  if (aluno.unidade !== undefined)
    updateData.unidade = aluno.unidade;

  return updateData;
}