export type NivelCriticidade = 'critico' | 'moderado' | 'atencao' | 'normal';

export type TipoTratativa =
  | 'aulao'
  | 'atividade_pratica'
  | 'acompanhamento'
  | 'normal';

export type StatusTratativa =
  | 'pendente'
  | 'em_andamento'
  | 'concluido';

export type StatusAluno =
  | 'ativo'
  | 'bloqueado_faltas'
  | 'trancado'
  | 'concluido';

export type TipoAnomaliaRitmo =
  | 'cliques_rapidos'
  | 'avanco_lento'
  | 'excesso_tempo'
  | 'sem_anomalia';

export type UserRole =
  | 'professor'
  | 'coordenador'
  | 'admin';

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  cargoDescricao?: string;
  avatarUrl?: string;
  unidade: 'filial' | 'matriz';
  status: 'ativo' | 'inativo';
  tipoAutenticacao: 'email_senha' | 'oauth_google';
  dataCadastro: string;
  ultimoAcesso?: string;
  disciplinasMinistradas?: string[];
  permissoes?: string[];
}

export interface DisciplinaAluno {
  id: string;
  nome: string;
  cargaHoraria: number;
  status: 'concluida' | 'em_andamento' | 'pendente';
  nota?: number;
  frequenciaPercent?: number;
  dataConclusao?: string;

  // Controle de ritmo da disciplina
  horasCursadas?: number;
  horasEsperadas?: number;
  horasExcedentes?: number;
  excedeuCargaHoraria?: boolean;
  percentualCargaUtilizada?: number;
  percentualAvanco?: number;
  ritmoStatus?: 'normal' | 'atencao' | 'critico';
}

export interface ReposicaoAgendadaItem {
  id: string;
  aluno_id?: string;
  aluno_nome: string;
  contrato?: string;
  unidade?: string;
  data: string; // Ex: '03/09/2026' ou '2026-09-03'
  horario_inicio: string; // '16:00'
  horario_fim: string; // '18:00'
  duracao_horas: number; // 2
  disciplina?: string;
  professor?: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  tipo?: 'laboratorio' | 'atividade' | 'aulao' | string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistoricoReposicao {
  id: string;
  alunoId?: string;
  alunoNome?: string;
  contrato?: string;
  data: string;
  horarioInicio?: string;
  horarioFim?: string;
  duracaoHoras?: number;
  disciplina: string;
  tipo:
    | 'aula_sabado'
    | 'reforco_laboratorio'
    | 'aulao_recuperacao'
    | 'atividade_pratica'
    | 'online_acompanhada'
    | string;
  descricao: string;
  professor?: string;
  professorNome?: string;
  status: 'realizada' | 'agendada' | 'ausente' | 'cancelada';
  horasCompensadas: number;
}

export interface AlunoMonitorado {
  id: string;
  nome: string;
  contrato: string;
  cgdUrl?: string;
  cgdLaboratorio?:
    | 'lab_01'
    | 'lab_02'
    | 'lab_03'
    | 'lab_matriz_01'
    | 'lab_matriz_02';
  email?: string;
  telefone?: string;
  curso: string;
  disciplinaAtual: string;
  turmaId: string;
  turmaNome: string;
  professorResponsavel: string;
  dataInicio: string;
  mesesContratoTotal: number;
  ultimaAula: string;
  ultimoAcesso: string;

  diasSemAcesso?: number;

  faltasBrutasTotais?: number;
  faltasBrutasMes?: number;

  faltasAcumuladas?: number;
  reposicoesRealizadas: number;
  reposicoesPendentes?: number;
  percentualReposicao?: number;

  dataTerminoContrato?: string;
  diasContratoTotal?: number;
  diasContratoDecorridos?: number;
  diasContratoRestantes?: number;

  riscoPrazoContrato?: 'baixo' | 'moderado' | 'alto' | 'critico';
  detalheRiscoPrazoContrato?: string;

  reposicoesAgendadas: number;

  presencasRegulares?: number;
  presencasReposicao?: number;

  faltasTotais: number;
  faltasMesAtual: number;
  mesReferenciaFaltas: string;

  diasEmCurso: number;
  diasTotalPrevisto?: number;

  status?: string;

  criticidade: NivelCriticidade;
  tratativaSugerida: TipoTratativa;
  statusTratativa: StatusTratativa;
  observacaoTratativa?: string;

  statusMatricula: StatusAluno;

  bloqueadoAutomaticamente: boolean;
  motivoBloqueio?: string;

  disciplinas: DisciplinaAluno[];

  historicoReposicoes?: HistoricoReposicao[];
  proximaReposicao?: HistoricoReposicao;

  totalDisciplinasGrade: number;
  disciplinasConcluidas: number;

  anomaliaRitmo?: TipoAnomaliaRitmo;
  detalheAnomaliaRitmo?: string;

  tempoMedioPorAulaMinutos?: number;
  percentualAvancoDisciplina?: number;

  horasCursadasDisciplinaAtual?: number;
  horasEsperadasDisciplinaAtual?: number;
  horasExcedentesDisciplinaAtual?: number;
  percentualCargaUtilizadaDisciplinaAtual?: number;

  primeiraOcorrenciaAutomatica?: boolean;

  unidade: 'filial' | 'matriz';
}

export interface DashboardMetricsCGD {
  unidade: 'filial' | 'matriz';
  nomeUnidade: string;
  contratosTotais: number;
  contratosEAD: number;
  contratosPresenciais: number;
  emTurmas: number;
  individuais: number;
  emNegociacao: number;
  mesReferencia: string;
  matriculasMes: number;
  encerramentosMes: number;
  aEncerrarMes: number;
  negociosPerdidosMes: number;
  passaramDoPrazo: number;
  ativosSemParcelas: number;
  semTurmasESemCursos: number;
  apenasEmTurmasArquivadas: number;
  evolucaoMatriculas: {
    mes: string;
    quantidade: number;
  }[];
  usuarioLogadoCGD: string;
  urlPainel: string;
  ultimoUpdate: string;
}

export interface OcorrenciaCGD {
  id: string;
  alunoId: string;
  alunoNome: string;
  contrato: string;
  curso: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  data: string;
  tipo:
    | 'pedagogica'
    | 'disciplinar'
    | 'falta_excessiva'
    | 'aulao_recuperacao'
    | 'atividade_pratica'
    | 'elogio';
  titulo: string;
  descricao: string;
  tratativaAplicada: TipoTratativa;
  statusTratativa: StatusTratativa;
  sincronizadoCGD: boolean;
  dataSincronizacaoCGD?: string;
  protocoloCGD?: string;
  origemOcorrencia?:
    | 'sistema_automatico'
    | 'instrutor'
    | 'coordenacao';
  sequencialOcorrencia?: number;
}

export interface TurmaCGD {
  id: string;
  nome: string;
  cursoNome: string;
  codigoCurso: string;
  professorResponsavel: string;
  professorId: string;
  diasSemana: string[];
  horarioInicio: string;
  horarioFim: string;
  sala: string;
  limiteAlunos: number;
  totalAlunosMatriculados: number;
  disciplinaAtual: string;
  status: 'em_andamento' | 'prevista' | 'encerrada';
  unidade: 'filial' | 'matriz';
}

export interface RotinaScrapingCGD {
  id: string;
  nome: string;
  descricao: string;
  modulo:
    | 'cursos'
    | 'ocorrencias'
    | 'frequencia'
    | 'cadastro'
    | 'turmas'
    | 'disciplinas'
    | 'horarios'
    | 'historico_notas'
    | 'todos';
  frequenciaAgendada: string;
  proximaExecucao: string;
  ultimaExecucao: string;
  status:
    | 'ativo'
    | 'executando'
    | 'pausado'
    | 'erro';
  totalRegistrosExtraidos: number;
  unidadeAlvo: 'filial' | 'matriz';
}

export interface LogSincronizacaoCGD {
  id: string;
  timestamp: string;
  tipo: 'info' | 'sucesso' | 'alerta' | 'erro';
  modulo: string;
  mensagem: string;
  detalhes?: string;
  unidade: 'filial' | 'matriz';
}

export interface CredencialCGD {
  unidade: 'filial' | 'matriz';
  nomeUnidade: string;
  usuarioMascarado: string;
  usuarioLogin?: string;
  senhaLogin?: string;
  statusConexao:
    | 'conectado'
    | 'autenticado'
    | 'expirado'
    | 'nao_configurado'
    | 'testando';
  ultimoPing: string;
  totalAlunosDetectados: number;
  urlSistema: string;
  baseUrlContrato?: string;
  laboratoriosDisponiveis?: {
    id: string;
    nome: string;
    salas: string;
  }[];
  isAtiva: boolean;
  cookiesSessao?: string;
  ambienteTipo?: 'producao' | 'homologacao';
  modulosHabilitados?: string[];
  ultimoErro?: string;
}

// ============================================================================
// SUPABASE
// ============================================================================

export interface ProfileRow {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  unidade: 'filial' | 'matriz';
  created_at: string;
  updated_at: string;
}

export interface ResumoCGDRow {
  id: string;
  unidade: 'filial' | 'matriz';
  nome_unidade: string;
  total_alunos_ativos: number;
  total_matriz?: number | null;
  total_filial?: number | null;
  alunos_criticos?: number | null;
  alunos_moderados?: number | null;
  total_contratos: number;
  laboratorios_ativos?: unknown;
  criticos: number;
  moderados: number;
  atencao: number;
  normais: number;
  bloqueados_faltas: number;
  mes_referencia: string;
  alunos_data?: unknown;
  origem: string;
  ultimo_sync: string;
  created_at: string;
  updated_at: string;
}

export interface AlunoRow {
  id: string;
  cgd_matricula_id?: string | null;
  nome: string;
  contrato: string;
  email?: string | null;
  telefone?: string | null;
  curso: string;
  turma_nome: string;
  professor_responsavel_id?: string | null;
  professor_nome: string;
  data_inicio: string;
  data_termino_contrato?: string | null;
  dias_contrato_total?: number | null;
  meses_contrato_total: number;
  ultima_aula?: string | null;
  ultimo_acesso?: string | null;
  faltas_totais: number;
  faltas_mes_atual: number;
  mes_referencia_faltas: string;
  reposicoes_realizadas?: number | null;
  dias_em_curso: number;
  criticidade: NivelCriticidade;
  tratativa_sugerida: TipoTratativa;
  status_tratativa: StatusTratativa;
  status_matricula: StatusAluno;
  bloqueado_automaticamente: boolean;
  motivo_bloqueio?: string | null;
  total_disciplinas_grade: number;
  disciplinas_concluidas: number;
  unidade: 'filial' | 'matriz';
  created_at: string;
  updated_at: string;
}

export interface AlunoDisciplinaRow {
  id: string;
  aluno_id: string;
  nome: string;
  carga_horaria: number;
  status: 'concluida' | 'em_andamento' | 'pendente';
  nota?: number | null;
  frequencia_percent?: number | null;
  data_conclusao?: string | null;
  ordem: number;

  horas_cursadas?: number | null;
  horas_excedentes?: number | null;
  percentual_carga_utilizada?: number | null;
  percentual_avanco?: number | null;
  ritmo_status?: 'normal' | 'atencao' | 'critico' | null;
}

export interface OcorrenciaRow {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  contrato: string;
  curso: string;
  turma_nome: string;
  professor_id: string;
  professor_nome: string;
  data: string;
  tipo: string;
  titulo: string;
  descricao: string;
  tratativa_aplicada: TipoTratativa;
  status_tratativa: StatusTratativa;
  sincronizado_cgd: boolean;
  data_sincronizacao_cgd?: string | null;
  protocolo_cgd?: string | null;
  created_at: string;
}

export interface TurmaCGDRow {
  id: string;
  nome: string;
  curso_nome: string;
  codigo_curso: string;
  professor_responsavel_id?: string | null;
  professor_nome: string;
  dias_semana: string[];
  horario_inicio: string;
  horario_fim: string;
  sala: string;
  limite_alunos: number;
  disciplina_atual: string;
  status: string;
  unidade: 'filial' | 'matriz';
}

export interface CgdCredentialRow {
  id: string;
  unidade: 'filial' | 'matriz';
  url_sistema: string;
  usuario_encrypted: string;
  senha_encrypted: string;
  token_sessao_hash?: string | null;
  status_conexao: string;
  ultimo_ping?: string | null;
  updated_at: string;
}

export interface OcorrenciaCgdRow {
  id?: string;
  contrato: string;
  aluno_nome: string;
  status_tratativa: 'PENDENTE' | 'EM ANDAMENTO' | 'CONCLUÍDO';
  anotacao: string;
  reposicao_agendada: boolean;
  protocolo_cgd?: string | null;
  sincronizado_cgd?: boolean;
  atualizado_em?: string;
}

export interface ReposicaoAgendadaRow {
  id: string;
  aluno_id?: string | null;
  aluno_nome: string;
  contrato?: string | null;
  unidade: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  duracao_horas: number;
  disciplina?: string | null;
  professor?: string | null;
  status: string;
  tipo?: string | null;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}