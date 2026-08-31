import { AlunoMonitorado, NivelCriticidade, TipoTratativa, TipoAnomaliaRitmo } from '../types';

export interface AcademicStatusResult {
  faltasBrutasMes: number;
  faltasBrutasTotais: number;
  faltasEfetivasMes: number;
  faltasEfetivasTotais: number;
  reposicoesRealizadas: number;
  reposicoesAgendadas: number;
  presencasRegulares: number;
  presencasReposicao: number;
  presencasTotais: number;
  taxaFrequenciaReal: number;
  criticidade: NivelCriticidade;
  tratativaSugerida: TipoTratativa;
  isBloqueado: boolean;
  deveBloquear: boolean;
  motivoBloqueio?: string;
  disciplinaAtual: string;
  diasSemAcesso: number;
  // Análise de Ritmo & Sino de Alerta Pedagógico
  anomaliaRitmo: TipoAnomaliaRitmo;
  temAlertaSino: boolean;
  detalheAnomaliaRitmo: string;
  tempoMedioPorAulaMinutos: number;
  percentualAvancoDisciplina: number;
  horasCursadasDisciplinaAtual: number;
  horasEsperadasDisciplinaAtual: number;
  cargaHorariaDisciplinaAtual: number;
  sugestaoAcaoRitmo: string;
}

/**
 * Recalculates student academic status, attendance accounting for makeups (reposições),
 * current subject tracking, criticidade levels, and pacing rhythm anomalies (bell alert).
 */
export function calculateAcademicStatus(aluno: Partial<AlunoMonitorado>): AcademicStatusResult {
  const faltasBrutasMes = aluno.faltasBrutasMes ?? aluno.faltasMesAtual ?? 0;
  const faltasBrutasTotais = aluno.faltasBrutasTotais ?? aluno.faltasTotais ?? 0;
  const reposicoesRealizadas = aluno.reposicoesRealizadas ?? 0;
  const reposicoesAgendadas = aluno.reposicoesAgendadas ?? 0;
  const presencasRegulares = aluno.presencasRegulares ?? 12;
  const presencasReposicao = aluno.presencasReposicao ?? reposicoesRealizadas;
  
  // As reposições de aula abatem as faltas brutas do aluno
  const faltasEfetivasMes = Math.max(0, faltasBrutasMes - reposicoesRealizadas);
  const faltasEfetivasTotais = Math.max(0, faltasBrutasTotais - reposicoesRealizadas);
  const presencasTotais = presencasRegulares + reposicoesRealizadas;

  const totalAulasConsideradas = presencasTotais + faltasEfetivasTotais;
  const taxaFrequenciaReal =
    totalAulasConsideradas > 0
      ? Math.round((presencasTotais / totalAulasConsideradas) * 100)
      : 100;

  const diasEmCurso = aluno.diasEmCurso ?? 0;
  const diasSemAcesso = aluno.diasSemAcesso ?? (aluno.ultimoAcesso === '—' || !aluno.ultimoAcesso ? 20 : 2);

  // Determinar Disciplina Atual & Carga Horária
  let disciplinaAtual = aluno.disciplinaAtual || '';
  let cargaHorariaDisciplinaAtual = 25; // default

  if (aluno.disciplinas && aluno.disciplinas.length > 0) {
    const emAndamento = aluno.disciplinas.find((d) => d.status === 'em_andamento');
    if (emAndamento) {
      disciplinaAtual = emAndamento.nome;
      cargaHorariaDisciplinaAtual = emAndamento.cargaHoraria || 25;
    } else {
      const pendente = aluno.disciplinas.find((d) => d.status === 'pendente');
      if (pendente) {
        disciplinaAtual = pendente.nome;
        cargaHorariaDisciplinaAtual = pendente.cargaHoraria || 25;
      } else {
        const last = aluno.disciplinas[aluno.disciplinas.length - 1];
        disciplinaAtual = last.nome;
        cargaHorariaDisciplinaAtual = last.cargaHoraria || 25;
      }
    }
  }
  if (!disciplinaAtual) {
    disciplinaAtual = `${aluno.curso || 'Informática'} - Módulo Prático`;
  }

  // Análise de Ritmo da Disciplina (Pacing Anomaly Detection)
  // 1. Cliques rápidos: tempo médio por aula muito baixo (< 6 minutos) para avançar telas
  // 2. Avanço lento: aluno com muitos dias em curso, mas horas cursadas muito abaixo da carga esperada
  const tempoMedioPorAulaMinutos =
    aluno.tempoMedioPorAulaMinutos ??
    (aluno.anomaliaRitmo === 'cliques_rapidos' ? 2.4 : 38.5);

  const percentualAvancoDisciplina =
    aluno.percentualAvancoDisciplina ??
    (aluno.anomaliaRitmo === 'avanco_lento' ? 18 : aluno.anomaliaRitmo === 'cliques_rapidos' ? 95 : 62);

  const horasCursadasDisciplinaAtual =
    aluno.horasCursadasDisciplinaAtual ??
    Math.round((cargaHorariaDisciplinaAtual * percentualAvancoDisciplina) / 100);

  const horasEsperadasDisciplinaAtual =
    aluno.horasEsperadasDisciplinaAtual ??
    Math.min(cargaHorariaDisciplinaAtual, Math.round(cargaHorariaDisciplinaAtual * Math.min(1, (diasEmCurso % 45 + 10) / 40)));

  let anomaliaRitmo: TipoAnomaliaRitmo = aluno.anomaliaRitmo || 'sem_anomalia';
  let detalheAnomaliaRitmo = aluno.detalheAnomaliaRitmo || '';
  let sugestaoAcaoRitmo = 'Ritmo adequado ao plano de ensino.';

  // Verificação heurística de anomalia se não foi especificada
  if (!aluno.anomaliaRitmo || aluno.anomaliaRitmo === 'sem_anomalia') {
    if (tempoMedioPorAulaMinutos < 8 && percentualAvancoDisciplina > 60) {
      anomaliaRitmo = 'cliques_rapidos';
    } else if (diasEmCurso >= 45 && percentualAvancoDisciplina < 30 && diasSemAcesso < 10) {
      anomaliaRitmo = 'avanco_lento';
    }
  }

  if (anomaliaRitmo === 'cliques_rapidos') {
    detalheAnomaliaRitmo =
      detalheAnomaliaRitmo ||
      `Avanço artificial por cliques rápidos detectado (${tempoMedioPorAulaMinutos.toFixed(1)} min/aula). Aluno avançando sem tempo mínimo de absorção da carga horária de ${cargaHorariaDisciplinaAtual}h.`;
    sugestaoAcaoRitmo = 'Aplicar avaliação prática presencial ou atividade de fixação para validar retenção do conteúdo.';
  } else if (anomaliaRitmo === 'avanco_lento') {
    detalheAnomaliaRitmo =
      detalheAnomaliaRitmo ||
      `Avanço muito lento em relação à carga horária (${horasCursadasDisciplinaAtual}h de ${cargaHorariaDisciplinaAtual}h concluídas, ${percentualAvancoDisciplina}% em ${diasEmCurso} dias). Risco de atraso no contrato.`;
    sugestaoAcaoRitmo = 'Agendar reforço no laboratório ou aula de aceleração para equalizar a grade curricular.';
  }

  const temAlertaSino = anomaliaRitmo !== 'sem_anomalia';

  // Avaliação de Criticidade ponderando dias:
  // dias > 90: CRÍTICO (badging vermelho / tratativa Aulão)
  // dias >= 60: MODERADO (badging laranja / tratativa Atividade Prática)
  // dias >= 30: ATENÇÃO (badging amarelo / tratativa Acompanhamento)
  // dias < 30: NORMAL (badging verde)
  let criticidade: NivelCriticidade = 'normal';
  let tratativaSugerida: TipoTratativa = 'normal';

  if (diasEmCurso > 90) {
    criticidade = 'critico';
    tratativaSugerida = 'aulao';
  } else if (diasEmCurso >= 60) {
    criticidade = 'moderado';
    tratativaSugerida = 'atividade_pratica';
  } else if (diasEmCurso >= 30) {
    criticidade = 'atencao';
    tratativaSugerida = 'acompanhamento';
  } else {
    criticidade = 'normal';
    tratativaSugerida = 'normal';
  }

  // Se o aluno já possuir criticidade explicitamente definida
  if (aluno.criticidade && ['critico', 'moderado', 'atencao', 'normal'].includes(aluno.criticidade) && diasEmCurso === 0) {
    criticidade = aluno.criticidade;
    tratativaSugerida = criticidade === 'critico' ? 'aulao' : criticidade === 'moderado' ? 'atividade_pratica' : criticidade === 'atencao' ? 'acompanhamento' : 'normal';
  }

  // Bloqueio preventivo automático se faltas efetivas no mês forem >= 3 (limite CFIS de 3 faltas)
  const deveBloquear = faltasEfetivasMes >= 3;

  // Respeitar status explícito de matrícula e liberação manual
  const isBloqueado =
    aluno.statusMatricula === 'bloqueado_faltas' ||
    (aluno.bloqueadoAutomaticamente === true) ||
    (aluno.bloqueadoAutomaticamente === undefined && aluno.statusMatricula === undefined && deveBloquear);

  let motivoBloqueio: string | undefined = undefined;
  const reposicoesPendentesCalc = Math.max(0, faltasBrutasTotais - reposicoesRealizadas);

  if (isBloqueado) {
    if (faltasEfetivasMes >= 3) {
      motivoBloqueio = `Bloqueio automático: ${faltasEfetivasMes} faltas no mês. Limite de bloqueio: 3 faltas. Faltas acumuladas: ${faltasBrutasTotais}. Reposições pendentes: ${reposicoesPendentesCalc}.`;
    } else {
      motivoBloqueio = aluno.motivoBloqueio || 'Bloqueio preventivo de matrícula aplicado via CGD.';
    }
  } else if (faltasBrutasMes >= 3 && faltasEfetivasMes < 3) {
    motivoBloqueio = `Liberado por reposição: ${reposicoesRealizadas} reposição(ões) compensaram as faltas (saldo pendente: ${reposicoesPendentesCalc}).`;
  }

  return {
    faltasBrutasMes,
    faltasBrutasTotais,
    faltasEfetivasMes,
    faltasEfetivasTotais,
    reposicoesRealizadas,
    reposicoesAgendadas,
    presencasRegulares,
    presencasReposicao,
    presencasTotais,
    taxaFrequenciaReal,
    criticidade,
    tratativaSugerida,
    isBloqueado,
    deveBloquear,
    motivoBloqueio,
    disciplinaAtual,
    diasSemAcesso,
    // Anomalia de Ritmo
    anomaliaRitmo,
    temAlertaSino,
    detalheAnomaliaRitmo,
    tempoMedioPorAulaMinutos,
    percentualAvancoDisciplina,
    horasCursadasDisciplinaAtual,
    horasEsperadasDisciplinaAtual,
    cargaHorariaDisciplinaAtual,
    sugestaoAcaoRitmo,
  };
}
