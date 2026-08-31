import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { mapAlunoRowToAlunoMonitorado } from './utils/mappers';
import { AlunoRow, AlunoDisciplinaRow, UserProfile, UserRole } from './types';
import { currentUserMock, availableUsersMock } from './data/mockData';
import dadosAlunosBackup from './data/dadosAlunosBackup.json';
import { AuthModal } from './components/AuthModal';
import { enviarOcorrenciaParaCgd } from './services/cgdIntegrationService';
import { 
  buscarTodasReposicoes, 
  persistirReposicao, 
  associarReposicoesAoAluno,
  ordenarReposicoesPorData,
  derivarProximaReposicao,
  ReposicaoAgendadaItem 
} from './services/reposicoesService';
import { 
  RefreshCw, Clock, CheckCircle, Hourglass, 
  Search, X, Bell, Activity, CalendarCheck, UserX, BookOpen, User, Building2, FileText, Calendar, ExternalLink, Save, Clock3, CheckSquare, ListOrdered, Database, LogOut, Shield, Lock, Send, Zap, CheckCircle2, AlertCircle
} from 'lucide-react';

const DATA_URL_GITHUB = "https://raw.githubusercontent.com/RONALDOVAS/google-ia-studio-CCFIS/refs/heads/main/dados_alunos.json";

export type StatusTratativa = 'PENDENTE' | 'EM ANDAMENTO' | 'CONCLUÍDO';
export type NivelCriticidade = 'CRÍTICO' | 'MODERADO' | 'ATENÇÃO' | 'NORMAL';

export type { ReposicaoAgendadaItem };

interface AlunoCGD {
  id: string;
  contrato: string;
  nome: string;
  unidade: string;
  curso: string;
  disciplina_atual: string;
  disciplinas_concluidas: string[];
  disciplinas_pendentes: string[];
  dias_aula: string;
  horario_aula: string;
  carga_horaria: number;
  horas_cumpridas: number;
  dias_inatividade: number;
  faltas_acumuladas: number;
  ultimo_acesso: string;
  reposicoes_realizadas: number;
  reposicoes_pendentes: number;
  reposicoes_agendadas: number;
  reposicao_agendada?: boolean;
  proxima_reposicao?: ReposicaoAgendadaItem;
  historico_reposicoes?: ReposicaoAgendadaItem[];
  criticidade: NivelCriticidade;
  status_tratativa: StatusTratativa;
  tratativa: string;
  acao_recomendada: string;
  link_cgd?: string;
  temReposicao?: boolean;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(currentUserMock);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(availableUsersMock);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  const [alunos, setAlunos] = useState<AlunoCGD[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState<string>('');
  const [filtroUnidade, setFiltroUnidade] = useState<string>('TODAS');
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>('TODOS');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>(new Date().toLocaleString('pt-BR'));
  
  const [tratativasLocais, setTratativasLocais] = useState<Record<string, string>>({});
  const [statusLocais, setStatusLocais] = useState<Record<string, StatusTratativa>>({});
  const [reposicoesLocais, setReposicoesLocais] = useState<Record<string, boolean>>({});
  const [agendamentosLocais, setAgendamentosLocais] = useState<Record<string, ReposicaoAgendadaItem[]>>({});
  const [listaReposicoes, setListaReposicoes] = useState<ReposicaoAgendadaItem[]>([]);
  const [sinoDesativadoLocais, setSinoDesativadoLocais] = useState<Record<string, boolean>>({});
  
  const [statusEnvioCgd, setStatusEnvioCgd] = useState<Record<string, 'PENDENTE' | 'ENVIANDO' | 'ENVIADO' | 'ERRO'>>({});
  const [protocolosCgd, setProtocolosCgd] = useState<Record<string, string>>({});
  const [mensagemEnvioCgd, setMensagemEnvioCgd] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoCGD | null>(null);
  const [modalAgendamentoAluno, setModalAgendamentoAluno] = useState<AlunoCGD | null>(null);
  const [reposicaoEmEdicao, setReposicaoEmEdicao] = useState<ReposicaoAgendadaItem | null>(null);
  const [formReposicao, setFormReposicao] = useState<{
    data: string;
    horario_inicio: string;
    horario_fim: string;
    disciplina: string;
    professor: string;
    observacao: string;
    status: 'agendada' | 'realizada' | 'cancelada';
  }>({
    data: '03/09/2026',
    horario_inicio: '16:00',
    horario_fim: '18:00',
    disciplina: 'Módulo Geral',
    professor: 'Ronaldo Vasconcelos',
    observacao: 'Reposição agendada de laboratório',
    status: 'agendada',
  });

  // 1. Gerenciamento de Sessão e Perfil com Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!supabase) {
        setAuthChecked(true);
        setIsGuestMode(true);
        return;
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user.id, initialSession.user.email || '');
          }
        }
      } catch (err) {
        console.warn('Erro ao inicializar sessão Supabase Auth:', err);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    initAuth();

    let authSubscription: any = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id, newSession.user.email || '');
        } else {
          setCurrentUser(currentUserMock);
        }
      });
      authSubscription = data?.subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, userEmail: string) => {
    if (!supabase) return;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && profileData) {
        const role = (profileData.role || 'professor') as UserRole;
        const mappedUser: UserProfile = {
          id: profileData.id,
          nome: profileData.nome || userEmail.split('@')[0] || 'Usuário Autenticado',
          email: profileData.email || userEmail,
          role: role,
          cargoDescricao: role === 'admin' ? 'Administrador Geral' : role === 'coordenador' ? 'Coordenação Pedagógica' : 'Docente de Informática',
          unidade: (profileData.unidade === 'matriz' ? 'matriz' : 'filial'),
          status: 'ativo',
          tipoAutenticacao: 'email_senha',
          dataCadastro: profileData.created_at || new Date().toISOString(),
          permissoes:
            role === 'admin'
              ? ['Acesso Total', 'Cofre CGD', 'Gerenciamento de Equipe', 'Políticas RLS']
              : role === 'coordenador'
              ? ['Gestão de Alunos', 'Auditoria de Ocorrências', 'Desbloqueio de Matrículas', 'Criação de Turmas']
              : ['Lançar Ocorrências', 'Consultar Turmas', 'Visualizar Alunos'],
        };
        setCurrentUser(mappedUser);
      } else {
        // Fallback para usuário autenticado sem registro em profiles
        setCurrentUser({
          id: userId,
          nome: userEmail.split('@')[0] || 'Usuário',
          email: userEmail,
          role: 'professor',
          cargoDescricao: 'Docente Autenticado',
          unidade: 'filial',
          status: 'ativo',
          tipoAutenticacao: 'email_senha',
          dataCadastro: new Date().toISOString(),
          permissoes: ['Lançar Ocorrências', 'Consultar Turmas', 'Visualizar Alunos'],
        });
      }
    } catch (err) {
      console.warn('Erro ao buscar perfil do usuário no Supabase:', err);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setIsGuestMode(false);
    setCurrentUser(currentUserMock);
  };

  // Função de formatação para os dados brutos do CGD/GitHub/Backup
  const formatarAlunoItemBruto = (
    item: any, 
    idx: number, 
    mapaOcorrencias: Record<string, any> = {},
    todasReposicoes: ReposicaoAgendadaItem[] = []
  ): AlunoCGD => {
    let rawContrato = String(item.contrato || item.CONTRATO || item.matricula || item.MATRICULA || item.id_aluno || '').trim();
    let rawNome = String(item.nome || item.NOME || item.aluno || item.ALUNO || item.nome_aluno || '').trim();

    // Detecção inteligente de inversão de contrato e nome
    let contratoFinal = rawContrato;
    let nomeFinal = rawNome;

    const isContratoLetters = /[a-zA-ZÀ-ÿ]/.test(rawContrato) && rawContrato.length > 5;
    const isNomeDigits = /^\d+$/.test(rawNome);

    if (isContratoLetters && isNomeDigits) {
      nomeFinal = rawContrato;
      contratoFinal = rawNome;
    } else if (!nomeFinal && contratoFinal) {
      nomeFinal = contratoFinal;
      contratoFinal = String(1000 + idx);
    } else if (!nomeFinal) {
      nomeFinal = `Aluno ${idx + 1}`;
    }

    const und = String(item.unidade || item.UNIDADE || item.filial || item.FILIAL || 'MATRIZ').toUpperCase();
    const cur = String(item.curso || item.CURSO || 'Curso Geral / Profissionalizante').trim();
    
    const disc = String(
      item.disciplina_andamento || item.DISCIPLINA_ANDAMENTO || 
      item.disciplina_atual || item.DISCIPLINA_ATUAL || 
      item.disciplina || item.DISCIPLINA || 
      item.modulo || item.MODULO || item.modulo_atual || 'Informática Essencial'
    ).trim();

    const discConcluidas: string[] = Array.isArray(item.disciplinas_concluidas) ? item.disciplinas_concluidas : 
                                    Array.isArray(item.modulos_concluidos) ? item.modulos_concluidos : 
                                    item.concluidas ? String(item.concluidas).split(',') : [];

    const discPendentes: string[] = Array.isArray(item.disciplinas_pendentes) ? item.disciplinas_pendentes : 
                                   Array.isArray(item.modulos_pendentes) ? item.modulos_pendentes : 
                                   item.pendentes ? String(item.pendentes).split(',') : [];

    const diasAulas = String(
      item.dias_aula || item.DIAS_AULA || 
      item.dias_semana || item.DIAS_SEMANA || 
      item.turma || item.TURMA || item.dia_semana || 'Flexível / CGD'
    ).trim();

    const horario = String(
      item.horario_aula || item.HORARIO_AULA || 
      item.horario || item.HORARIO || item.turno || 'Horário de Laboratório'
    ).trim();

    const faltas = Number(
      item.faltas_acumuladas ?? item.FALTAS_ACUMULADAS ?? 
      item.faltas_efetivas ?? item.FALTAS_EFETIVAS ?? 
      item.faltas ?? item.FALTAS ?? 0
    );

    const diasInativo = Number(
      item.dias_inatividade ?? item.DIAS_INATIVIDADE ?? 
      item.dias_sem_acesso ?? item.DIAS_SEM_ACESSO ?? 
      item.ultimo_acesso_dias ?? item.ULTIMO_ACESSO_DIAS ?? 
      item.dias ?? item.DIAS ?? 0
    );

    const cargaTotal = Number(item.carga_horaria || item.CARGA_HORARIA || 60);
    const horasConcluidas = Number(item.horas_cumpridas || item.HORAS_CUMPRIDAS || 0);

    let ultAcessoStr = String(item.ultimo_acesso || item.ULTIMO_ACESSO || item.data_ultimo_acesso || '').trim();
    if (!ultAcessoStr) {
      if (diasInativo === 0) ultAcessoStr = 'Hoje';
      else if (diasInativo === 1) ultAcessoStr = 'Ontem';
      else ultAcessoStr = `Há ${diasInativo} dias`;
    }

    // Classificação de criticidade pelas regras de faltas e inatividade
    const ehSabado = diasAulas.toLowerCase().includes('sáb') || diasAulas.toLowerCase().includes('sab');
    let criticidadeCalculada: NivelCriticidade = 'NORMAL';

    if (ehSabado) {
      if (diasInativo >= 14 || faltas >= 3) criticidadeCalculada = 'CRÍTICO';
      else if (diasInativo >= 7 || faltas === 2) criticidadeCalculada = 'MODERADO';
      else if (diasInativo > 5 || faltas === 1) criticidadeCalculada = 'ATENÇÃO';
    } else {
      if (diasInativo >= 10 || faltas >= 3) criticidadeCalculada = 'CRÍTICO';
      else if (diasInativo >= 5 || faltas === 2) criticidadeCalculada = 'MODERADO';
      else if (diasInativo >= 3 || faltas === 1) criticidadeCalculada = 'ATENÇÃO';
    }

    const criticidadeRecebida = String(item.criticidade || item.CRITICIDADE || '').toUpperCase();
    if (criticidadeRecebida.includes('CRÍTICO') || criticidadeRecebida.includes('CRITICO')) criticidadeCalculada = 'CRÍTICO';
    else if (criticidadeRecebida.includes('MODERADO')) criticidadeCalculada = 'MODERADO';
    else if (criticidadeRecebida.includes('ATENÇÃO') || criticidadeRecebida.includes('ATENCAO')) criticidadeCalculada = 'ATENÇÃO';
    else if (criticidadeRecebida.includes('NORMAL')) criticidadeCalculada = 'NORMAL';

    const idCalculado = `${contratoFinal}_${idx}`;
    const ocSalva = mapaOcorrencias[contratoFinal] || mapaOcorrencias[nomeFinal] || (idCalculado ? mapaOcorrencias[idCalculado] : undefined);

    // Associação universal com todas as reposições persistidas
    const repsDoAluno = associarReposicoesAoAluno(
      { id: idCalculado, contrato: contratoFinal, nome: nomeFinal },
      todasReposicoes
    );

    let faltasFinais = faltas;
    let reposRealizadas = Number(item.reposicoes_realizadas ?? item.reposicoesRealizadas ?? 0);
    let reposAgendadas = Number(item.reposicoes_agendadas ?? item.reposicoesAgendadas ?? 0);
    let proximaRep: ReposicaoAgendadaItem | undefined = undefined;
    let historicoReps: ReposicaoAgendadaItem[] = [];

    if (repsDoAluno.length > 0) {
      historicoReps = repsDoAluno;
      const agendadas = repsDoAluno.filter(r => r.status === 'agendada');
      const realizadas = repsDoAluno.filter(r => r.status === 'realizada');
      const agendadasOrdenadas = ordenarReposicoesPorData(agendadas);
      reposAgendadas = agendadas.length;
      reposRealizadas = Math.max(reposRealizadas, realizadas.length);
      proximaRep = agendadasOrdenadas[0] || undefined;
    } else if (ocSalva?.reposicao_agendada) {
      reposAgendadas = Math.max(1, reposAgendadas);
    }

    const reposPendentes = Math.max(0, faltasFinais - reposRealizadas);

    let stTrat: StatusTratativa = 'PENDENTE';
    if (ocSalva?.status_tratativa) {
      stTrat = ocSalva.status_tratativa;
    } else if (item.status_tratativa || item.STATUS_TRATATIVA) {
      const stUpper = String(item.status_tratativa || item.STATUS_TRATATIVA).toUpperCase();
      if (stUpper.includes('CONCLUÍDO') || stUpper.includes('CONCLUIDO')) stTrat = 'CONCLUÍDO';
      else if (stUpper.includes('ANDAMENTO')) stTrat = 'EM ANDAMENTO';
    }

    return {
      id: idCalculado,
      contrato: contratoFinal || 'N/A',
      nome: nomeFinal,
      unidade: und,
      curso: cur,
      disciplina_atual: disc,
      disciplinas_concluidas: discConcluidas,
      disciplinas_pendentes: discPendentes,
      dias_aula: diasAulas,
      horario_aula: horario,
      carga_horaria: cargaTotal,
      horas_cumpridas: horasConcluidas,
      dias_inatividade: diasInativo,
      faltas_acumuladas: faltasFinais,
      ultimo_acesso: ultAcessoStr,
      temReposicao: reposAgendadas > 0,
      reposicoes_realizadas: reposRealizadas,
      reposicoes_pendentes: reposPendentes,
      reposicoes_agendadas: reposAgendadas,
      reposicao_agendada: ocSalva ? Boolean(ocSalva.reposicao_agendada) : Boolean(reposAgendadas > 0),
      proxima_reposicao: proximaRep,
      historico_reposicoes: historicoReps,
      criticidade: criticidadeCalculada,
      status_tratativa: stTrat,
      tratativa: ocSalva ? (ocSalva.anotacao || ocSalva.descricao || '') : (item.tratativa || item.TRATATIVA || ''),
      acao_recomendada: item.acao_recomendada || item.ACAO_RECOMENDADA || (faltasFinais >= 3 || diasInativo >= 10 ? 'Realizar contato telefônico imediato' : 'Acompanhamento pedagógico padrão'),
      link_cgd: item.link_cgd || item.LINK_CGD || `https://app.cgd.com.br/alunos?busca=${encodeURIComponent(nomeFinal)}`
    };
  };

  const carregarDadosCompletos = async () => {
    setLoading(true);
    try {
      // 1. Carrega todas as reposições persistidas (Supabase + localStorage)
      const todasReposicoes = await buscarTodasReposicoes();
      setListaReposicoes(todasReposicoes);

      let mapaOcorrencias: Record<string, any> = {};
      if (supabase) {
        try {
          const { data: ocorrenciasSalvas, error: errOc } = await supabase.from('ocorrencias_cgd').select('*');
          if (ocorrenciasSalvas && ocorrenciasSalvas.length > 0) {
            ocorrenciasSalvas.forEach((oc: any) => { 
              if (oc.contrato) mapaOcorrencias[oc.contrato] = oc; 
            });
          } else if (errOc) {
            // Tenta tabela alternativa 'ocorrencias' se 'ocorrencias_cgd' não estiver disponível
            const { data: ocAlt } = await supabase.from('ocorrencias').select('*');
            if (ocAlt && ocAlt.length > 0) {
              ocAlt.forEach((oc: any) => { 
                const chave = oc.contrato || oc.aluno_id;
                if (chave) {
                  mapaOcorrencias[chave] = {
                    ...oc,
                    anotacao: oc.descricao || oc.titulo || '',
                    status_tratativa: oc.status_tratativa === 'concluido' ? 'CONCLUÍDO' : oc.status_tratativa === 'em_andamento' ? 'EM ANDAMENTO' : 'PENDENTE'
                  };
                }
              });
            }
          }
        } catch (e) {
          console.warn('Tentativa de consulta de ocorrências no Supabase:', e);
        }
      }

      // 2. Tenta carregar registros da tabela real 'alunos' do Supabase via mappers
      let dadosCarregadosDoBanco = false;
      if (supabase) {
        try {
          let alunosDb: any[] | null = null;
          let errAlunos: any = null;

          // Tenta carregar com join de disciplinas
          try {
            const res = await supabase.from('alunos').select('*, aluno_disciplinas(*)');
            alunosDb = res.data;
            errAlunos = res.error;
          } catch {
            alunosDb = null;
          }

          // Se falhou ou deu erro na relação, tenta select simples
          if (!alunosDb || errAlunos) {
            const resSimples = await supabase.from('alunos').select('*');
            alunosDb = resSimples.data;
            errAlunos = resSimples.error;
          }

          if (!errAlunos && alunosDb && alunosDb.length > 0) {
            const listaMapeada: AlunoCGD[] = alunosDb.map((alunoRowRaw: any, idx: number) => {
              const disciplinasRows: AlunoDisciplinaRow[] = alunoRowRaw.aluno_disciplinas || [];
              const alunoMon = mapAlunoRowToAlunoMonitorado(alunoRowRaw as AlunoRow, disciplinasRows);
              const c = alunoMon.contrato || String(idx + 1000);
              const ocSalva = mapaOcorrencias[c];

              let stTrat = 'PENDENTE';
              if (ocSalva?.status_tratativa) {
                stTrat = ocSalva.status_tratativa;
              } else if (alunoMon.statusTratativa) {
                if (alunoMon.statusTratativa === 'concluido') stTrat = 'CONCLUÍDO';
                else if (alunoMon.statusTratativa === 'em_andamento') stTrat = 'EM ANDAMENTO';
              }

              const criticidadeNome = alunoMon.criticidade.toUpperCase() as NivelCriticidade;
              const concluidas = alunoMon.disciplinas.filter(d => d.status === 'concluida').map(d => d.nome);
              const pendentes = alunoMon.disciplinas.filter(d => d.status === 'pendente').map(d => d.nome);

              const repsDoAluno = associarReposicoesAoAluno(
                { id: alunoMon.id || `${c}_${idx}`, contrato: c, nome: alunoMon.nome },
                todasReposicoes
              );

              const agendadas = repsDoAluno.filter(r => r.status === 'agendada');
              const realizadas = repsDoAluno.filter(r => r.status === 'realizada');

              return {
                id: alunoMon.id || `${c}_${idx}`,
                contrato: c,
                nome: alunoMon.nome || 'Aluno Sem Nome',
                unidade: (alunoMon.unidade || 'MATRIZ').toUpperCase(),
                curso: alunoMon.curso || 'Curso Geral',
                disciplina_atual: alunoMon.disciplinaAtual || 'Módulo Geral',
                disciplinas_concluidas: concluidas,
                disciplinas_pendentes: pendentes,
                dias_aula: 'Flexível / CGD',
                horario_aula: 'Horário de Laboratório',
                carga_horaria: alunoMon.totalDisciplinasGrade * 10,
                horas_cumpridas: alunoMon.disciplinasConcluidas * 10,
                dias_inatividade: alunoMon.diasEmCurso || 0,
                faltas_acumuladas: alunoMon.faltasTotais || 0,
                ultimo_acesso: alunoMon.ultimoAcesso || 'Hoje',
                reposicoes_realizadas: (alunoMon.reposicoesRealizadas || 0) + realizadas.length,
                reposicoes_pendentes: Math.max(0, (alunoMon.faltasTotais || 0) - ((alunoMon.reposicoesRealizadas || 0) + realizadas.length)),
                reposicoes_agendadas: agendadas.length,
                reposicao_agendada: ocSalva ? ocSalva.reposicao_agendada : (agendadas.length > 0),
                proxima_reposicao: agendadas[0] || (alunoMon.proximaReposicao ? {
                  id: alunoMon.proximaReposicao.id,
                  aluno_id: alunoMon.id,
                  aluno_nome: alunoMon.nome,
                  contrato: alunoMon.contrato,
                  unidade: (alunoMon.unidade || 'MATRIZ').toUpperCase(),
                  data: alunoMon.proximaReposicao.data,
                  horario_inicio: alunoMon.proximaReposicao.horarioInicio || '16:00',
                  horario_fim: alunoMon.proximaReposicao.horarioFim || '18:00',
                  duracao_horas: alunoMon.proximaReposicao.duracaoHoras || 2,
                  disciplina: alunoMon.proximaReposicao.disciplina,
                  professor: alunoMon.proximaReposicao.professorNome,
                  status: alunoMon.proximaReposicao.status as any,
                  observacao: alunoMon.proximaReposicao.descricao,
                } : undefined),
                historico_reposicoes: repsDoAluno.length > 0 ? repsDoAluno : (alunoMon.historicoReposicoes || []).map(r => ({
                  id: r.id,
                  aluno_id: alunoMon.id,
                  aluno_nome: alunoMon.nome,
                  contrato: alunoMon.contrato,
                  unidade: (alunoMon.unidade || 'MATRIZ').toUpperCase(),
                  data: r.data,
                  horario_inicio: r.horarioInicio || '16:00',
                  horario_fim: r.horarioFim || '18:00',
                  duracao_horas: r.duracaoHoras || 2,
                  disciplina: r.disciplina,
                  professor: r.professorNome,
                  status: r.status as any,
                  observacao: r.descricao,
                })),
                criticidade: criticidadeNome,
                status_tratativa: stTrat as StatusTratativa,
                tratativa: ocSalva ? ocSalva.anotacao : (alunoMon.observacaoTratativa || ''),
                acao_recomendada: alunoMon.faltasTotais > 2 ? 'Realizar contato telefônico imediato' : 'Acompanhamento pedagógico padrão',
                link_cgd: alunoMon.cgdUrl,
              };
            });

            if (listaMapeada.length > 0) {
              setAlunos(listaMapeada);
              setUltimaAtualizacao(new Date().toLocaleString('pt-BR'));
              dadosCarregadosDoBanco = true;
            }
          }
        } catch (e) {
          console.warn('Tentativa de consulta de alunos no Supabase:', e);
        }
      }

      // 3. Se o banco Supabase estiver vazio ou inacessível, executa o fallback transparente resiliente
      if (!dadosCarregadosDoBanco) {
        let listaArray: any[] = [];

        // Tentativa 1: GitHub branch main
        try {
          const resposta = await fetch(DATA_URL_GITHUB);
          if (resposta.ok) {
            const dadosBrutos = await resposta.json();
            if (Array.isArray(dadosBrutos) && dadosBrutos.length > 0) {
              listaArray = dadosBrutos;
            } else if (dadosBrutos && typeof dadosBrutos === 'object') {
              const extraidos = dadosBrutos.alunos || dadosBrutos.relatorio || dadosBrutos.dados || [];
              if (Array.isArray(extraidos) && extraidos.length > 0) {
                listaArray = extraidos;
              }
            }
          }
        } catch (e) {
          console.warn('GitHub main vazio ou com erro:', e);
        }

        // Tentativa 2: Snapshot histórica de dados reais do CGD no GitHub
        if (listaArray.length === 0) {
          try {
            const URL_SNAPSHOT_ESTAVEL = "https://raw.githubusercontent.com/RONALDOVAS/google-ia-studio-CCFIS/c1e974fe9f0adf1067f216acbb63fec043007864/dados_alunos.json";
            const respSnapshot = await fetch(URL_SNAPSHOT_ESTAVEL);
            if (respSnapshot.ok) {
              const dadosSnapshot = await respSnapshot.json();
              if (Array.isArray(dadosSnapshot) && dadosSnapshot.length > 0) {
                listaArray = dadosSnapshot;
              }
            }
          } catch (e) {
            console.warn('Snapshot do GitHub inacessível:', e);
          }
        }

        // Tentativa 3: Base local de contingência do projeto (dados reais do CGD)
        if (listaArray.length === 0 && Array.isArray(dadosAlunosBackup) && dadosAlunosBackup.length > 0) {
          listaArray = dadosAlunosBackup;
        }

        if (listaArray.length > 0) {
          const listaFormatada: AlunoCGD[] = listaArray.map((item: any, idx: number) => 
            formatarAlunoItemBruto(item, idx, mapaOcorrencias, todasReposicoes)
          );

          setAlunos(listaFormatada);
          setUltimaAtualizacao(new Date().toLocaleString('pt-BR'));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar os dados:', err);
      // Em caso de falha catastrófica de rede, garante a base local
      if (Array.isArray(dadosAlunosBackup) && dadosAlunosBackup.length > 0) {
        const listaFormatada: AlunoCGD[] = dadosAlunosBackup.map((item: any, idx: number) => 
          formatarAlunoItemBruto(item, idx, {}, [])
        );
        setAlunos(listaFormatada);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosCompletos();
  }, []);

  const salvarOcorrenciaSupabase = async (aluno: AlunoCGD, novoStatus?: StatusTratativa, novaAnotacao?: string, novaReposicao?: boolean) => {
    const statusFinal = novoStatus ?? statusLocais[aluno.id] ?? aluno.status_tratativa;
    const anotacaoFinal = novaAnotacao ?? tratativasLocais[aluno.id] ?? aluno.tratativa;
    const reposicaoFinal = novaReposicao ?? reposicoesLocais[aluno.id] ?? aluno.reposicao_agendada;

    // Atualiza otimista os estados locais para resposta visual instantânea
    if (novoStatus) setStatusLocais(prev => ({ ...prev, [aluno.id]: novoStatus }));
    if (novaAnotacao !== undefined) setTratativasLocais(prev => ({ ...prev, [aluno.id]: novaAnotacao }));
    if (novaReposicao !== undefined) setReposicoesLocais(prev => ({ ...prev, [aluno.id]: novaReposicao }));

    if (!supabase) return;
    setSalvandoId(aluno.id);

    try {
      const { error: errUpsert } = await supabase.from('ocorrencias_cgd').upsert(
        {
          contrato: aluno.contrato,
          aluno_nome: aluno.nome,
          status_tratativa: statusFinal,
          anotacao: anotacaoFinal,
          reposicao_agendada: reposicaoFinal,
          atualizado_em: new Date().toISOString()
        },
        { onConflict: 'contrato' }
      );

      if (errUpsert) {
        // Fallback para a tabela 'ocorrencias' se 'ocorrencias_cgd' não estiver criada
        await supabase.from('ocorrencias').upsert(
          {
            contrato: aluno.contrato,
            aluno_nome: aluno.nome,
            curso: aluno.curso,
            turma_nome: aluno.disciplina_atual,
            tipo: 'acompanhamento',
            titulo: `Tratativa - ${statusFinal}`,
            descricao: anotacaoFinal || 'Tratativa registrada',
            tratativa_aplicada: 'acompanhamento',
            status_tratativa: statusFinal === 'CONCLUÍDO' ? 'concluido' : statusFinal === 'EM ANDAMENTO' ? 'em_andamento' : 'pendente',
            sincronizado_cgd: false,
          }
        );
      }
    } catch (err) {
      console.error('Erro ao salvar no Supabase:', err);
    } finally {
      setSalvandoId(null);
    }
  };

  const handleEnviarParaCgd = async (aluno: AlunoCGD, textoCustom?: string) => {
    const anotacaoFinal = textoCustom ?? tratativasLocais[aluno.id] ?? aluno.tratativa ?? 'Acompanhamento pedagógico de rotina';
    const statusTrat = statusLocais[aluno.id] ?? aluno.status_tratativa;
    const reposicao = reposicoesLocais[aluno.id] ?? aluno.reposicao_agendada;

    // Proteção de múltiplos cliques e estado de envio
    if (statusEnvioCgd[aluno.id] === 'ENVIANDO') return;

    setStatusEnvioCgd(prev => ({ ...prev, [aluno.id]: 'ENVIANDO' }));

    const resultado = await enviarOcorrenciaParaCgd(
      {
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        contrato: aluno.contrato,
        curso: aluno.curso,
        turmaNome: aluno.disciplina_atual,
        professorId: currentUser.id,
        professorNome: currentUser.nome,
        tipo: 'pedagogica',
        titulo: `Ocorrência Pedagógica - ${aluno.contrato}`,
        descricao: anotacaoFinal,
        tratativaAplicada: reposicao ? 'atividade_pratica' : 'normal',
        statusTratativa: statusTrat === 'CONCLUÍDO' ? 'concluido' : statusTrat === 'EM ANDAMENTO' ? 'em_andamento' : 'pendente',
        unidade: aluno.unidade?.toLowerCase().includes('matriz') ? 'matriz' : 'filial',
      },
      currentUser
    );

    if (resultado.success && resultado.protocolo) {
      setStatusEnvioCgd(prev => ({ ...prev, [aluno.id]: 'ENVIADO' }));
      setProtocolosCgd(prev => ({ ...prev, [aluno.id]: resultado.protocolo! }));
      setMensagemEnvioCgd({
        tipo: 'sucesso',
        texto: `✓ Ocorrência enviada ao CGD com sucesso para ${aluno.nome}. Protocolo Oficial: ${resultado.protocolo}`
      });
      // Sincroniza também com o Supabase
      salvarOcorrenciaSupabase(aluno, statusTrat, anotacaoFinal, reposicao);
    } else {
      setStatusEnvioCgd(prev => ({ ...prev, [aluno.id]: 'ERRO' }));
      setMensagemEnvioCgd({
        tipo: 'erro',
        texto: `⚠️ Não foi possível enviar a ocorrência ao CGD: ${resultado.mensagem}. A ocorrência foi preservada no CFIS.`
      });
    }
  };

  const alternarSinoAluno = (id: string) => {
    setSinoDesativadoLocais(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper centralizado para recalcular o estado de reposições de um aluno de forma pura e consistente
  const recalcularAlunoComReposicoes = (alunoBase: AlunoCGD, sessoes: ReposicaoAgendadaItem[]): AlunoCGD => {
    const mapa = new Map<string, ReposicaoAgendadaItem>();
    (sessoes || []).forEach(r => {
      if (r && r.id) mapa.set(r.id, r);
    });
    const todasSessoes = Array.from(mapa.values());
    const agendadas = todasSessoes.filter(r => r.status === 'agendada');
    const realizadas = todasSessoes.filter(r => r.status === 'realizada');
    const agendadasOrdenadas = ordenarReposicoesPorData(agendadas);

    const repAgendadasCount = agendadas.length;
    const repRealizadasCount = Math.max(alunoBase.reposicoes_realizadas || 0, realizadas.length);
    const repPendentesCount = Math.max(0, alunoBase.faltas_acumuladas - repRealizadasCount);
    const proximaRep = agendadasOrdenadas[0] || undefined;

    return {
      ...alunoBase,
      temReposicao: repAgendadasCount > 0,
      reposicao_agendada: repAgendadasCount > 0,
      reposicoes_agendadas: repAgendadasCount,
      reposicoes_realizadas: repRealizadasCount,
      reposicoes_pendentes: repPendentesCount,
      proxima_reposicao: proximaRep,
      historico_reposicoes: todasSessoes,
    };
  };

  const handleAbrirAgendamento = (aluno: AlunoCGD, reposicaoExistente?: ReposicaoAgendadaItem) => {
    setModalAgendamentoAluno(aluno);
    if (reposicaoExistente && reposicaoExistente.id) {
      setReposicaoEmEdicao(reposicaoExistente);
      setFormReposicao({
        data: reposicaoExistente.data || '03/09/2026',
        horario_inicio: reposicaoExistente.horario_inicio || '16:00',
        horario_fim: reposicaoExistente.horario_fim || '18:00',
        disciplina: reposicaoExistente.disciplina || aluno.disciplina_atual || 'Módulo Geral',
        professor: reposicaoExistente.professor || currentUser?.nome || 'Ronaldo Vasconcelos',
        observacao: reposicaoExistente.observacao || '',
        status: reposicaoExistente.status || 'agendada',
      });
    } else {
      setReposicaoEmEdicao(null);
      const hoje = new Date();
      const diaStr = String(hoje.getDate()).padStart(2, '0');
      const mesStr = String(hoje.getMonth() + 1).padStart(2, '0');
      const anoStr = hoje.getFullYear();
      setFormReposicao({
        data: `${diaStr}/${mesStr}/${anoStr}`,
        horario_inicio: '16:00',
        horario_fim: '18:00',
        disciplina: aluno.disciplina_atual || 'Módulo Geral',
        professor: currentUser?.nome || 'Ronaldo Vasconcelos',
        observacao: 'Reposição agendada de laboratório',
        status: 'agendada',
      });
    }
  };

  const handleSalvarAgendamento = async (aluno: AlunoCGD) => {
    let duracao = 2;
    try {
      const [hIni, mIni] = formReposicao.horario_inicio.split(':').map(Number);
      const [hFim, mFim] = formReposicao.horario_fim.split(':').map(Number);
      const diffMin = (hFim * 60 + mFim) - (hIni * 60 + mIni);
      if (diffMin > 0) duracao = Math.round(diffMin / 60);
    } catch {
      duracao = 2;
    }

    // Se estiver editando, usa rigorosamente o ID daquela sessão; se for nova, gera novo ID exclusivo
    const repId = reposicaoEmEdicao?.id || `rep_${aluno.contrato || aluno.id || 'aluno'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const unidadeNormalizada = (aluno.unidade || 'MATRIZ').toUpperCase();

    const novaReposicaoItem: ReposicaoAgendadaItem = {
      id: repId,
      aluno_id: aluno.id,
      aluno_nome: aluno.nome,
      contrato: aluno.contrato && aluno.contrato !== 'N/A' ? String(aluno.contrato).trim() : undefined,
      unidade: unidadeNormalizada,
      data: formReposicao.data,
      horario_inicio: formReposicao.horario_inicio,
      horario_fim: formReposicao.horario_fim,
      duracao_horas: duracao,
      disciplina: formReposicao.disciplina,
      professor: formReposicao.professor,
      status: formReposicao.status,
      observacao: formReposicao.observacao,
      updated_at: new Date().toISOString(),
    };

    // 1. Atualização Otimista Imediata em todos os estados locais reativos
    setListaReposicoes(prev => {
      const filtrada = prev.filter(r => r.id !== novaReposicaoItem.id);
      return [novaReposicaoItem, ...filtrada];
    });

    setAgendamentosLocais(prev => {
      const listaAtual = prev[aluno.id] || (aluno.contrato ? prev[aluno.contrato] : undefined) || (aluno.historico_reposicoes ? [...aluno.historico_reposicoes] : []);
      const filtrada = listaAtual.filter(r => r.id !== novaReposicaoItem.id);
      const novaLista = [novaReposicaoItem, ...filtrada];
      const res: Record<string, ReposicaoAgendadaItem[]> = { ...prev, [aluno.id]: novaLista };
      if (aluno.contrato) res[aluno.contrato] = novaLista;
      return res;
    });

    const isAgendada = formReposicao.status === 'agendada';
    setReposicoesLocais(prev => {
      const res = { ...prev, [aluno.id]: isAgendada };
      if (aluno.contrato) res[aluno.contrato] = isAgendada;
      return res;
    });

    // Atualiza diretamente o array de alunos no estado
    setAlunos(prevAlunos => prevAlunos.map(a => {
      const match = 
        (a.id && aluno.id && a.id === aluno.id) ||
        (a.contrato && aluno.contrato && a.contrato !== 'N/A' && String(a.contrato).trim() === String(aluno.contrato).trim()) ||
        (a.nome && aluno.nome && a.nome.toLowerCase().trim() === aluno.nome.toLowerCase().trim());
      
      if (match) {
        const histAtual = (a.historico_reposicoes || []).filter(r => r.id !== novaReposicaoItem.id);
        const novoHist = [novaReposicaoItem, ...histAtual];
        return recalcularAlunoComReposicoes(a, novoHist);
      }
      return a;
    }));

    if (alunoSelecionado) {
      setAlunoSelecionado(prev => {
        if (!prev) return null;
        const matchSel = 
          (prev.id && aluno.id && prev.id === aluno.id) ||
          (prev.contrato && aluno.contrato && prev.contrato !== 'N/A' && String(prev.contrato).trim() === String(aluno.contrato).trim()) ||
          (prev.nome && aluno.nome && prev.nome.toLowerCase().trim() === aluno.nome.toLowerCase().trim());
        if (matchSel) {
          const histAtual = (prev.historico_reposicoes || []).filter(r => r.id !== novaReposicaoItem.id);
          const novoHist = [novaReposicaoItem, ...histAtual];
          return recalcularAlunoComReposicoes(prev, novoHist);
        }
        return prev;
      });
    }

    // 2. Persistência real no Supabase (tabela reposicoes_agendadas) e backup localStorage
    try {
      await persistirReposicao(novaReposicaoItem);
    } catch (e) {
      console.warn('Persistência de reposição assíncrona:', e);
    }

    // 3. Atualização de ocorrência no Supabase para sincronia com ocorrências_cgd
    salvarOcorrenciaSupabase(
      aluno, 
      undefined, 
      `Reposição ${formReposicao.status} para ${formReposicao.data} (${formReposicao.horario_inicio} às ${formReposicao.horario_fim}) - Prof. ${formReposicao.professor}`, 
      isAgendada
    );

    setModalAgendamentoAluno(null);
    setReposicaoEmEdicao(null);
  };

  const handleMarcarReposicaoComoRealizada = async (aluno: AlunoCGD, reposicao: ReposicaoAgendadaItem) => {
    const reposicaoAtualizada: ReposicaoAgendadaItem = {
      ...reposicao,
      unidade: (reposicao.unidade || aluno.unidade || 'MATRIZ').toUpperCase(),
      status: 'realizada',
      updated_at: new Date().toISOString(),
    };

    setListaReposicoes(prev => prev.map(r => r.id === reposicao.id ? reposicaoAtualizada : r));

    setAgendamentosLocais(prev => {
      const listaAtual = prev[aluno.id] || (aluno.contrato ? prev[aluno.contrato] : undefined) || (aluno.historico_reposicoes ? [...aluno.historico_reposicoes] : [reposicao]);
      const atualizada = listaAtual.map(r => r.id === reposicao.id ? reposicaoAtualizada : r);
      const res: Record<string, ReposicaoAgendadaItem[]> = { ...prev, [aluno.id]: atualizada };
      if (aluno.contrato) res[aluno.contrato] = atualizada;
      return res;
    });

    setAlunos(prevAlunos => prevAlunos.map(a => {
      const match = 
        (a.id && aluno.id && a.id === aluno.id) ||
        (a.contrato && aluno.contrato && a.contrato !== 'N/A' && String(a.contrato).trim() === String(aluno.contrato).trim()) ||
        (a.nome && aluno.nome && a.nome.toLowerCase().trim() === aluno.nome.toLowerCase().trim());
      
      if (match) {
        const histAtual = (a.historico_reposicoes || [reposicao]).map(r => r.id === reposicao.id ? reposicaoAtualizada : r);
        return recalcularAlunoComReposicoes(a, histAtual);
      }
      return a;
    }));

    if (alunoSelecionado) {
      setAlunoSelecionado(prev => {
        if (!prev) return null;
        const matchSel = 
          (prev.id && aluno.id && prev.id === aluno.id) ||
          (prev.contrato && aluno.contrato && prev.contrato !== 'N/A' && String(prev.contrato).trim() === String(aluno.contrato).trim()) ||
          (prev.nome && aluno.nome && prev.nome.toLowerCase().trim() === aluno.nome.toLowerCase().trim());
        if (matchSel) {
          const histAtual = (prev.historico_reposicoes || [reposicao]).map(r => r.id === reposicao.id ? reposicaoAtualizada : r);
          return recalcularAlunoComReposicoes(prev, histAtual);
        }
        return prev;
      });
    }

    try {
      await persistirReposicao(reposicaoAtualizada);
    } catch (e) {
      console.warn('Erro ao persistir reposição realizada:', e);
    }

    salvarOcorrenciaSupabase(aluno, 'CONCLUÍDO', `Reposição realizada em ${reposicao.data} (${reposicao.horario_inicio} às ${reposicao.horario_fim})`, false);
  };

  const handleCancelarReposicao = async (aluno: AlunoCGD, reposicao: ReposicaoAgendadaItem) => {
    const reposicaoAtualizada: ReposicaoAgendadaItem = {
      ...reposicao,
      unidade: (reposicao.unidade || aluno.unidade || 'MATRIZ').toUpperCase(),
      status: 'cancelada',
      updated_at: new Date().toISOString(),
    };

    setListaReposicoes(prev => prev.map(r => r.id === reposicao.id ? reposicaoAtualizada : r));

    setAgendamentosLocais(prev => {
      const listaAtual = prev[aluno.id] || (aluno.contrato ? prev[aluno.contrato] : undefined) || (aluno.historico_reposicoes ? [...aluno.historico_reposicoes] : [reposicao]);
      const atualizada = listaAtual.map(r => r.id === reposicao.id ? reposicaoAtualizada : r);
      const res: Record<string, ReposicaoAgendadaItem[]> = { ...prev, [aluno.id]: atualizada };
      if (aluno.contrato) res[aluno.contrato] = atualizada;
      return res;
    });

    setAlunos(prevAlunos => prevAlunos.map(a => {
      const match = 
        (a.id && aluno.id && a.id === aluno.id) ||
        (a.contrato && aluno.contrato && a.contrato !== 'N/A' && String(a.contrato).trim() === String(aluno.contrato).trim()) ||
        (a.nome && aluno.nome && a.nome.toLowerCase().trim() === aluno.nome.toLowerCase().trim());
      
      if (match) {
        const histAtual = (a.historico_reposicoes || [reposicao]).map(r => r.id === reposicao.id ? reposicaoAtualizada : r);
        return recalcularAlunoComReposicoes(a, histAtual);
      }
      return a;
    }));

    if (alunoSelecionado) {
      setAlunoSelecionado(prev => {
        if (!prev) return null;
        const matchSel = 
          (prev.id && aluno.id && prev.id === aluno.id) ||
          (prev.contrato && aluno.contrato && prev.contrato !== 'N/A' && String(prev.contrato).trim() === String(aluno.contrato).trim()) ||
          (prev.nome && aluno.nome && prev.nome.toLowerCase().trim() === aluno.nome.toLowerCase().trim());
        if (matchSel) {
          const histAtual = (prev.historico_reposicoes || [reposicao]).map(r => r.id === reposicao.id ? reposicaoAtualizada : r);
          return recalcularAlunoComReposicoes(prev, histAtual);
        }
        return prev;
      });
    }

    try {
      await persistirReposicao(reposicaoAtualizada);
    } catch (e) {
      console.warn('Erro ao persistir reposição cancelada:', e);
    }

    salvarOcorrenciaSupabase(aluno, undefined, `Agendamento de reposição cancelado (${reposicao.data})`, false);
  };

  const alunosBase = alunos.map(aluno => {
    const repsDaListaGeral = associarReposicoesAoAluno(
      { id: aluno.id, contrato: aluno.contrato, nome: aluno.nome },
      listaReposicoes
    );

    const agendamentosLocaisAluno = [
      ...(agendamentosLocais[aluno.id] || []),
      ...(aluno.contrato && aluno.contrato !== 'N/A' ? (agendamentosLocais[aluno.contrato] || []) : [])
    ];

    const historicoPre = aluno.historico_reposicoes || [];

    // Unifica todas as fontes de reposições sem duplicar por ID
    const mapaSessoes = new Map<string, ReposicaoAgendadaItem>();
    [...historicoPre, ...repsDaListaGeral, ...agendamentosLocaisAluno].forEach(r => {
      if (r && r.id) {
        mapaSessoes.set(r.id, r);
      }
    });

    const agendamentosAluno = Array.from(mapaSessoes.values());
    return recalcularAlunoComReposicoes(aluno, agendamentosAluno);
  });

  const unidadesUnicas = Array.from(new Set(alunosBase.map(a => a.unidade).filter(Boolean)));
  const disciplinasUnicas = Array.from(new Set(alunosBase.map(a => a.disciplina_atual).filter(Boolean)));

  // Filtro completo dos alunos
  const alunosFiltrados = alunosBase.filter(a => {
    const statusAtual = statusLocais[a.id] ?? a.status_tratativa;
    const bateUnidade = filtroUnidade === 'TODAS' || a.unidade === filtroUnidade;
    const bateDisciplina = filtroDisciplina === 'TODAS' || a.disciplina_atual === filtroDisciplina;
    const bateStatus = filtroStatus === 'TODOS' || statusAtual === filtroStatus;
    const bateCriticidade = filtroCriticidade === 'TODOS' || a.criticidade === filtroCriticidade;
    const bateTexto = (a.nome || '').toLowerCase().includes(busca.toLowerCase()) || 
                       (a.contrato || '').toLowerCase().includes(busca.toLowerCase()) ||
                       (a.disciplina_atual || '').toLowerCase().includes(busca.toLowerCase()) ||
                       (a.dias_aula || '').toLowerCase().includes(busca.toLowerCase());
    return bateUnidade && bateDisciplina && bateStatus && bateCriticidade && bateTexto;
  });

  // Cálculo das Métricas DINÂMICAS com base nos dados FILTRADOS
  const countCritico = alunosFiltrados.filter(a => a.criticidade === 'CRÍTICO').length;
  const countModerado = alunosFiltrados.filter(a => a.criticidade === 'MODERADO').length;
  const countAviso = alunosFiltrados.filter(a => a.criticidade === 'ATENÇÃO').length;
  const countNormal = alunosFiltrados.filter(a => a.criticidade === 'NORMAL').length;

  const totalFaltasAcumuladas = alunosFiltrados.reduce((acc, a) => acc + a.faltas_acumuladas, 0);
  const totalAlunosComReposicao = alunosFiltrados.filter(a => a.temReposicao || (a.reposicoes_agendadas || 0) > 0).length;
  const totalSessoesAgendadas = alunosFiltrados.reduce((acc, a) => acc + (a.reposicoes_agendadas || 0), 0);

  const countPendentes = alunosFiltrados.filter(a => (statusLocais[a.id] ?? a.status_tratativa) === 'PENDENTE').length;
  const countEmAndamento = alunosFiltrados.filter(a => (statusLocais[a.id] ?? a.status_tratativa) === 'EM ANDAMENTO').length;
  const countConcluido = alunosFiltrados.filter(a => (statusLocais[a.id] ?? a.status_tratativa) === 'CONCLUÍDO').length;

  const totalAlunosFiltrados = alunosFiltrados.length || 1;
  const pctResolvido = Math.round((countConcluido / totalAlunosFiltrados) * 100);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 font-sans">
      <style>{`
        @keyframes vibrateRing {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(12deg); }
          20% { transform: rotate(-12deg); }
          30% { transform: rotate(8deg); }
          40% { transform: rotate(-8deg); }
          50% { transform: rotate(4deg); }
          60% { transform: rotate(-4deg); }
          70% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .sino-vibrando {
          animation: vibrateRing 0.7s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO COM AUTENTICAÇÃO E RBAC */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100">
                CFIS - Painel de Criticidade & Gestão Acadêmica CGD
              </h1>
              {countCritico > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Activity size={10} /> {countCritico} CRÍTICOS
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Última sincronização: <span className="text-amber-500 font-mono font-semibold">{ultimaAtualizacao}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Bloco de Usuário Autenticado e Papel RBAC */}
            <div className="flex items-center gap-2 bg-[#131b2e] border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                {currentUser.nome.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">{currentUser.nome}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    currentUser.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                    currentUser.role === 'coordenador' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Building2 size={10} className="text-amber-400" />
                  Unidade: <strong className="text-slate-300 uppercase">{currentUser.unidade}</strong>
                </span>
              </div>

              {/* Botão de Logout ou Troca de Sessão */}
              {session && (
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar Sessão Supabase"
                  className="ml-2 text-slate-400 hover:text-red-400 transition-colors p-1 cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>

            <button 
              onClick={carregarDadosCompletos} 
              className="bg-[#131b2e] hover:bg-slate-800 border border-slate-700/60 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-amber-500' : 'text-amber-500'} /> Sincronizar Dados
            </button>
          </div>
        </div>

        {/* Modal de Autenticação para Usuários Não Autenticados */}
        {authChecked && !session && !isGuestMode && (
          <AuthModal
            isSupabaseReady={isSupabaseConfigured}
            onLoginSuccess={() => {
              carregarDadosCompletos();
            }}
            onContinueAsGuest={() => {
              setIsGuestMode(true);
            }}
          />
        )}

        {/* BANNER DE NOTIFICAÇÃO CGD */}
        {mensagemEnvioCgd && (
          <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            mensagemEnvioCgd.tipo === 'sucesso' 
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' 
              : 'bg-red-950/50 border-red-500/50 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {mensagemEnvioCgd.tipo === 'sucesso' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-400 shrink-0" />
              )}
              <span className="font-semibold">{mensagemEnvioCgd.texto}</span>
            </div>
            <button 
              onClick={() => setMensagemEnvioCgd(null)} 
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* MÉTRICAS SUPERIORES RECALCULADAS DINAMICAMENTE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Total de Faltas (Seleção)</span>
              <div className="text-xl font-bold text-red-400 mt-1 flex items-center gap-1.5">
                <UserX size={18} /> {totalFaltasAcumuladas} faltas
              </div>
            </div>
          </div>

          <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Reposições Agendadas</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalSessoesAgendadas} sessão(ões)
              </span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CalendarCheck size={18} /> {totalAlunosComReposicao} aluno(s)
            </div>
            {alunosFiltrados.find(a => a.proxima_reposicao?.status === 'agendada') && (
              <div className="text-[10px] text-slate-300 bg-[#131b2e] px-2 py-1 rounded border border-slate-700/60 mt-1.5 truncate">
                Próxima: <strong className="text-amber-400">{alunosFiltrados.find(a => a.proxima_reposicao?.status === 'agendada')?.nome.split(' ')[0]}</strong> ({alunosFiltrados.find(a => a.proxima_reposicao?.status === 'agendada')?.proxima_reposicao?.data} às {alunosFiltrados.find(a => a.proxima_reposicao?.status === 'agendada')?.proxima_reposicao?.horario_inicio})
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400 font-medium">Progresso de Tratativas</span>
              <span className="text-xs text-amber-500 font-bold">{pctResolvido}% Concluído</span>
            </div>
            <div className="w-full bg-[#070b14] h-2.5 rounded-full overflow-hidden border border-slate-800 flex">
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${pctResolvido}%` }} />
              <div className="bg-amber-500 transition-all duration-500" style={{ width: `${Math.round((countEmAndamento / totalAlunosFiltrados) * 100)}%` }} />
              <div className="bg-red-500 transition-all duration-500" style={{ width: `${Math.round((countPendentes / totalAlunosFiltrados) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* CARDS DE CRITICIDADE DINÂMICOS */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div className="md:col-span-4 bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-red-500 rounded-r-lg">
                <span className="text-[10px] text-red-500 font-bold block uppercase">CRÍTICO</span>
                <span className="text-xl font-bold text-white mt-1 block">{countCritico}</span>
              </div>
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-orange-500 rounded-r-lg">
                <span className="text-[10px] text-orange-500 font-bold block uppercase">MODERADO</span>
                <span className="text-xl font-bold text-white mt-1 block">{countModerado}</span>
              </div>
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-yellow-500 rounded-r-lg">
                <span className="text-[10px] text-yellow-500 font-bold block uppercase">ATENÇÃO</span>
                <span className="text-xl font-bold text-white mt-1 block">{countAviso}</span>
              </div>
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-emerald-500 rounded-r-lg">
                <span className="text-[10px] text-emerald-500 font-bold block uppercase">NORMAL</span>
                <span className="text-xl font-bold text-white mt-1 block">{countNormal}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-[#0d1322] border border-slate-800/80 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-red-500 rounded-r-lg">
                <span className="text-[10px] text-slate-300 font-bold uppercase flex items-center gap-1">
                  <Clock size={12} className="text-red-500" /> PENDENTES
                </span>
                <span className="text-xl font-bold text-white mt-1 block">{countPendentes}</span>
              </div>
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-amber-500 rounded-r-lg">
                <span className="text-[10px] text-slate-300 font-bold uppercase flex items-center gap-1">
                  <Hourglass size={12} className="text-amber-500" /> ANDAMENTO
                </span>
                <span className="text-xl font-bold text-white mt-1 block">{countEmAndamento}</span>
              </div>
              <div className="p-3 bg-[#131b2e] border-l-4 border-l-emerald-500 rounded-r-lg">
                <span className="text-[10px] text-slate-300 font-bold uppercase flex items-center gap-1">
                  <CheckCircle size={12} className="text-emerald-500" /> CONCLUÍDOS
                </span>
                <span className="text-xl font-bold text-white mt-1 block">{countConcluido}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES DE BUSCA E FILTRO POR UNIDADE */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por aluno, disciplina, contrato ou dia..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#0d1322] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              value={filtroUnidade}
              onChange={(e) => setFiltroUnidade(e.target.value)}
              className="bg-[#0d1322] border border-amber-500/50 text-amber-400 font-bold rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Unidades</option>
              {unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <select
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
              className="bg-[#0d1322] border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none max-w-[200px] truncate"
            >
              <option value="TODAS">Todas as Disciplinas</option>
              {disciplinasUnicas.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filtroCriticidade}
              onChange={(e) => setFiltroCriticidade(e.target.value)}
              className="bg-[#0d1322] border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              <option value="TODOS">Todas as Criticidades</option>
              <option value="CRÍTICO">CRÍTICO</option>
              <option value="MODERADO">MODERADO</option>
              <option value="ATENÇÃO">ATENÇÃO</option>
              <option value="NORMAL">NORMAL</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-[#0d1322] border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">PENDENTE</option>
              <option value="EM ANDAMENTO">EM ANDAMENTO</option>
              <option value="CONCLUÍDO">CONCLUÍDO</option>
            </select>
          </div>
        </div>

        {/* TABELA DE ALUNOS COM REGISTROS CORRETOS */}
        <div className="bg-[#0d1322] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-200">Base Acadêmica CGD</h3>
            <span className="text-xs bg-[#131b2e] text-amber-400 px-3 py-1 rounded-md font-mono font-bold border border-amber-500/20">
              {alunosFiltrados.length} / {alunosBase.length} registros exibidos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#070b14] text-slate-400 font-semibold border-b border-slate-800 uppercase text-[11px]">
                <tr>
                  <th className="p-4 text-center">SINO</th>
                  <th className="p-4">ALUNO / CONTRATO</th>
                  <th className="p-4">DISCIPLINA / DIA E HORÁRIO</th>
                  <th className="p-4">ÚLTIMO ACESSO</th>
                  <th className="p-4">FALTAS</th>
                  <th className="p-4">CRITICIDADE</th>
                  <th className="p-4">REPOSIÇÃO</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4">REGISTRO PEDAGÓGICO</th>
                  <th className="p-4 text-center">DESPACHO CGD</th>
                  <th className="p-4 text-center">FICHA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {alunosFiltrados.map((aluno) => {
                  const stTratativa = statusLocais[aluno.id] ?? aluno.status_tratativa;
                  const txtTratativa = tratativasLocais[aluno.id] ?? aluno.tratativa;
                  const desativado = sinoDesativadoLocais[aluno.id] ?? false;
                  const envioStatus = statusEnvioCgd[aluno.id] || 'PENDENTE';
                  const protocolo = protocolosCgd[aluno.id];

                  let corSino = 'text-emerald-400';
                  let bgSino = 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]';

                  if (aluno.criticidade === 'CRÍTICO') {
                    corSino = 'text-red-500';
                    bgSino = 'bg-red-500/10 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.25)]';
                  } else if (aluno.criticidade === 'MODERADO') {
                    corSino = 'text-orange-400';
                    bgSino = 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)]';
                  } else if (aluno.criticidade === 'ATENÇÃO') {
                    corSino = 'text-yellow-400';
                    bgSino = 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.25)]';
                  }

                  return (
                    <tr key={aluno.id} className="hover:bg-[#131b2e]/50 transition-colors">
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => alternarSinoAluno(aluno.id)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            desativado 
                              ? 'bg-slate-800/40 border-slate-700/40 text-slate-600' 
                              : bgSino
                          }`}
                        >
                          <Bell 
                            size={16} 
                            className={!desativado ? `sino-vibrando ${corSino}` : 'text-slate-600'} 
                          />
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-amber-400 text-sm flex items-center gap-1">
                          <span>{aluno.contrato}</span>
                          {aluno.link_cgd && (
                            <a href={aluno.link_cgd} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-amber-400">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-200 font-medium">{aluno.nome}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">{aluno.unidade}</div>
                      </td>

                      <td className="p-4">
                        <div className="text-amber-400 font-semibold flex items-center gap-1.5 text-xs">
                          <BookOpen size={13} className="shrink-0 text-amber-400" />
                          <span>{aluno.disciplina_atual}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-medium mt-1 flex flex-wrap gap-1.5">
                          <span className="bg-[#131b2e] px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                            🗓️ {aluno.dias_aula}
                          </span>
                          <span className="bg-[#131b2e] px-2 py-0.5 rounded border border-slate-700 text-amber-300 flex items-center gap-1">
                            <Clock3 size={10} /> {aluno.horario_aula}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{aluno.curso}</div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <Calendar size={13} className="text-amber-500 shrink-0" />
                          <span>{aluno.ultimo_acesso}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">
                          {aluno.dias_inatividade === 0 ? 'Acessou Hoje' : `${aluno.dias_inatividade} dia(s) sem acesso`}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`font-bold font-mono text-xs ${aluno.faltas_acumuladas > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {aluno.faltas_acumuladas} faltas
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded border inline-block ${
                          aluno.criticidade === 'CRÍTICO' ? 'bg-red-950/60 text-red-400 border-red-900' :
                          aluno.criticidade === 'MODERADO' ? 'bg-orange-950/60 text-orange-400 border-orange-900' :
                          aluno.criticidade === 'ATENÇÃO' ? 'bg-yellow-950/60 text-yellow-400 border-yellow-900' :
                          'bg-emerald-950/60 text-emerald-400 border-emerald-900'
                        }`}>
                          {aluno.criticidade}
                        </span>
                      </td>

                      <td className="p-4">
                        {aluno.temReposicao && aluno.proxima_reposicao ? (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleAbrirAgendamento(aluno, aluno.proxima_reposicao)}
                              className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/60 text-emerald-300 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                              title="Clique para ver ou editar detalhes do agendamento"
                            >
                              <CalendarCheck size={12} className="text-emerald-400 shrink-0" />
                              <span>{aluno.proxima_reposicao.data.slice(0, 5)} • {aluno.proxima_reposicao.horario_inicio}</span>
                            </button>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {aluno.proxima_reposicao.duracao_horas}h ({aluno.proxima_reposicao.horario_inicio}-{aluno.proxima_reposicao.horario_fim})
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAbrirAgendamento(aluno)}
                            className="px-2 py-1 bg-[#131b2e] hover:bg-slate-700/70 border border-slate-700 text-slate-400 hover:text-amber-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Calendar size={12} />
                            <span>+ Agendar</span>
                          </button>
                        )}
                      </td>

                      <td className="p-4">
                        <select
                          value={stTratativa}
                          onChange={(e) => {
                            const val = e.target.value as StatusTratativa;
                            setStatusLocais(prev => ({ ...prev, [aluno.id]: val }));
                            salvarOcorrenciaSupabase(aluno, val, undefined, undefined);
                          }}
                          className="bg-red-950/40 border border-red-900 text-red-400 font-bold rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="PENDENTE">PENDENTE</option>
                          <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                          <option value="CONCLUÍDO">CONCLUÍDO</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <div className="relative">
                          <textarea
                            placeholder="Adicionar anotação..."
                            value={txtTratativa}
                            onChange={(e) => setTratativasLocais(prev => ({ ...prev, [aluno.id]: e.target.value }))}
                            onBlur={(e) => salvarOcorrenciaSupabase(aluno, undefined, e.target.value, undefined)}
                            className="w-full bg-[#070b14] border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none h-10 resize-none pr-6"
                          />
                          {salvandoId === aluno.id && (
                            <Save size={12} className="absolute right-2 top-2 text-amber-500 animate-spin" />
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {envioStatus === 'ENVIADO' ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
                              <CheckCircle2 size={11} className="text-emerald-400" /> CGD OK
                            </span>
                            {protocolo && (
                              <span className="text-[9px] text-slate-400 font-mono" title={protocolo}>
                                {protocolo.split('-').slice(-2).join('-')}
                              </span>
                            )}
                          </div>
                        ) : envioStatus === 'ENVIANDO' ? (
                          <button
                            disabled
                            className="px-2.5 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-wait opacity-80"
                          >
                            <RefreshCw size={12} className="animate-spin text-amber-400" />
                            <span>Enviando...</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEnviarParaCgd(aluno)}
                            className="px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-all shadow-xs hover:shadow-emerald-900/40 cursor-pointer"
                            title="Despachar ocorrência e anotação diretamente ao CGD"
                          >
                            <Send size={11} />
                            <span>Enviar para o CGD</span>
                          </button>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setAlunoSelecionado(aluno)} 
                          className="p-2 bg-[#131b2e] hover:bg-slate-700 text-amber-500 rounded transition-colors cursor-pointer"
                        >
                          <BookOpen size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL FICHA DO ALUNO COMPLETA */}
      {alunoSelecionado && (() => {
        const alunoExibicao = alunosBase.find(a => a.id === alunoSelecionado.id || (alunoSelecionado.contrato && a.contrato === alunoSelecionado.contrato)) || alunoSelecionado;
        return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{alunoExibicao.nome}</h2>
                  <p className="text-xs text-slate-400">Ficha Completa de Acompanhamento</p>
                </div>
              </div>
              <button onClick={() => setAlunoSelecionado(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Contrato / Matrícula</span>
                <span className="text-sm font-bold text-amber-400 font-mono">{alunoExibicao.contrato}</span>
              </div>
              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase flex items-center gap-1">
                  <Building2 size={10} /> Unidade
                </span>
                <span className="text-sm font-bold text-slate-200">{alunoExibicao.unidade}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase flex items-center gap-1 mb-1">
                  <BookOpen size={10} className="text-amber-500" /> Disciplina em Andamento
                </span>
                <span className="text-xs font-bold text-amber-400">{alunoExibicao.disciplina_atual}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{alunoExibicao.curso}</span>
              </div>

              {/* LISTAS DE DISCIPLINAS (CONCLUÍDAS E PENDENTES) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase flex items-center gap-1 mb-1">
                    <CheckSquare size={10} /> Concluídas
                  </span>
                  {alunoExibicao.disciplinas_concluidas.length > 0 ? (
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {alunoExibicao.disciplinas_concluidas.map((d, i) => (
                        <li key={i} className="flex items-center gap-1 text-emerald-300/80">✓ {d}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[11px] text-slate-500">Nenhuma registrada</span>
                  )}
                </div>

                <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-orange-400 font-bold block uppercase flex items-center gap-1 mb-1">
                    <ListOrdered size={10} /> Faltam Cursar
                  </span>
                  {alunoExibicao.disciplinas_pendentes.length > 0 ? (
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {alunoExibicao.disciplinas_pendentes.map((d, i) => (
                        <li key={i} className="flex items-center gap-1 text-slate-400">• {d}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[11px] text-slate-500">Nenhuma pendente</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Dias de Aula</span>
                  <span className="text-xs font-bold text-amber-300">{alunoExibicao.dias_aula}</span>
                </div>
                <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Horário de Aula</span>
                  <span className="text-xs font-bold text-amber-300">{alunoExibicao.horario_aula}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Criticidade</span>
                  <span className={`text-sm font-bold ${
                    alunoExibicao.criticidade === 'CRÍTICO' ? 'text-red-400' :
                    alunoExibicao.criticidade === 'MODERADO' ? 'text-orange-400' :
                    alunoExibicao.criticidade === 'ATENÇÃO' ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>
                    {alunoExibicao.criticidade}
                  </span>
                </div>
                <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Faltas Efetivas</span>
                  <span className="text-sm font-bold text-red-400">{alunoExibicao.faltas_acumuladas} falta(s)</span>
                </div>
              </div>

              <div className="bg-[#131b2e] p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase flex items-center gap-1 mb-1">
                  <FileText size={10} className="text-slate-400" /> Ação Recomendada
                </span>
                <span className="text-xs font-semibold text-emerald-400">{alunoExibicao.acao_recomendada}</span>
              </div>

              {/* SEÇÃO DE REPOSIÇÕES E AGENDAMENTOS */}
              <div className="bg-[#131b2e] p-3.5 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-400 font-bold uppercase flex items-center gap-1.5">
                    <CalendarCheck size={13} className="text-amber-400" /> Reposições & Aulas de Reforço
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAbrirAgendamento(alunoExibicao)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Calendar size={11} />
                    <span>+ Agendar Nova Reposição</span>
                  </button>
                </div>

                {alunoExibicao.proxima_reposicao && alunoExibicao.proxima_reposicao.status === 'agendada' ? (
                  <div className="bg-[#0b101d] p-3 rounded border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" /> Próxima Reposição Confirmada
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAbrirAgendamento(alunoExibicao, alunoExibicao.proxima_reposicao!)}
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/40 transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {alunoExibicao.proxima_reposicao.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Data & Horário:</span>
                        <strong className="text-white font-mono">{alunoExibicao.proxima_reposicao.data}</strong>
                        <span className="text-slate-300 text-[11px] block">{alunoExibicao.proxima_reposicao.horario_inicio} às {alunoExibicao.proxima_reposicao.horario_fim} ({alunoExibicao.proxima_reposicao.duracao_horas}h)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Professor Responsável:</span>
                        <strong className="text-slate-200">{alunoExibicao.proxima_reposicao.professor || 'Ronaldo Vasconcelos'}</strong>
                        <span className="text-[10px] text-slate-400 block">{alunoExibicao.proxima_reposicao.disciplina || alunoExibicao.disciplina_atual}</span>
                      </div>
                    </div>

                    {alunoExibicao.proxima_reposicao.observacao && (
                      <p className="text-[11px] text-slate-300 italic bg-[#131b2e] p-1.5 rounded border border-slate-800">
                        "{alunoExibicao.proxima_reposicao.observacao}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleMarcarReposicaoComoRealizada(alunoExibicao, alunoExibicao.proxima_reposicao!)}
                        className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={12} /> Marcar como Realizada
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelarReposicao(alunoExibicao, alunoExibicao.proxima_reposicao!)}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 font-semibold rounded text-[11px] border border-slate-700 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0b101d] p-2.5 rounded border border-slate-800 text-center">
                    <span className="text-xs text-slate-400">Nenhuma reposição pendente de realização no momento.</span>
                  </div>
                )}

                {/* Histórico Anterior de Reposições */}
                {alunoExibicao.historico_reposicoes && alunoExibicao.historico_reposicoes.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Histórico de Sessões ({alunoExibicao.historico_reposicoes.length})</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {alunoExibicao.historico_reposicoes.map((rep) => (
                        <div key={rep.id} className="bg-[#0b101d] p-2 rounded border border-slate-800/80 flex items-center justify-between text-xs gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-200 font-bold">{rep.data}</span>
                              <span className="text-slate-400 text-[10px]">({rep.horario_inicio} - {rep.horario_fim})</span>
                            </div>
                            {rep.observacao && <p className="text-[10px] text-slate-400 truncate italic">{rep.observacao}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              rep.status === 'realizada' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                              rep.status === 'cancelada' ? 'bg-slate-800 text-slate-400' :
                              'bg-blue-950 text-blue-300 border border-blue-800'
                            }`}>
                              {rep.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAbrirAgendamento(alunoExibicao, rep)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-400 px-2 py-0.5 rounded border border-slate-700 font-semibold cursor-pointer transition-colors"
                            >
                              Editar
                            </button>
                            {rep.status === 'agendada' && (
                              <button
                                type="button"
                                title="Marcar como realizada"
                                onClick={() => handleMarcarReposicaoComoRealizada(alunoExibicao, rep)}
                                className="text-[10px] bg-emerald-950 hover:bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold cursor-pointer transition-colors"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO DE DESPACHO AUTOMÁTICO AO CGD */}
              <div className="bg-[#0b101d] p-3.5 rounded-lg border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                    <Zap size={13} className="text-emerald-400" /> Despacho Automático ao CGD
                  </span>
                  {protocolosCgd[alunoExibicao.id] && (
                    <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/40">
                      ✓ {protocolosCgd[alunoExibicao.id]}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Envie o registro pedagógico e tratativa diretamente para o sistema central CGD com um clique. Não é necessário abrir o CGD ou fazer login manual.
                </p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[10px] text-slate-400">
                    Destino: <strong className="text-slate-300 uppercase">{alunoExibicao.unidade}</strong>
                  </div>
                  <button
                    type="button"
                    disabled={statusEnvioCgd[alunoExibicao.id] === 'ENVIANDO'}
                    onClick={() => handleEnviarParaCgd(alunoExibicao)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    {statusEnvioCgd[alunoExibicao.id] === 'ENVIANDO' ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-white" />
                        <span>Enviando ao CGD...</span>
                      </>
                    ) : statusEnvioCgd[alunoExibicao.id] === 'ENVIADO' ? (
                      <>
                        <CheckCircle2 size={13} className="text-white" />
                        <span>Reenviar ao CGD</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Enviar para o CGD</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {alunoExibicao.link_cgd && (
                <a 
                  href={alunoExibicao.link_cgd} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 p-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors block text-center mt-2"
                >
                  <ExternalLink size={14} /> Abrir Registro no Portal CGD
                </a>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setAlunoSelecionado(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
        );
      })()}

      {/* MODAL DE AGENDAMENTO / EDIÇÃO DE REPOSIÇÃO */}
      {modalAgendamentoAluno && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1322] border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {reposicaoEmEdicao ? 'Editar Reposição' : 'Agendar Nova Reposição'}
                  </h2>
                  <p className="text-xs text-slate-400">{modalAgendamentoAluno.nome} ({modalAgendamentoAluno.contrato})</p>
                </div>
              </div>
              <button onClick={() => { setModalAgendamentoAluno(null); setReposicaoEmEdicao(null); }} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSalvarAgendamento(modalAgendamentoAluno); }} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Data da Reposição (DD/MM/AAAA)</label>
                <input
                  type="text"
                  required
                  value={formReposicao.data}
                  onChange={(e) => setFormReposicao({ ...formReposicao, data: e.target.value })}
                  placeholder="Ex: 03/09/2026"
                  className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Horário Início</label>
                  <input
                    type="text"
                    required
                    value={formReposicao.horario_inicio}
                    onChange={(e) => setFormReposicao({ ...formReposicao, horario_inicio: e.target.value })}
                    placeholder="16:00"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Horário Fim</label>
                  <input
                    type="text"
                    required
                    value={formReposicao.horario_fim}
                    onChange={(e) => setFormReposicao({ ...formReposicao, horario_fim: e.target.value })}
                    placeholder="18:00"
                    className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Disciplina / Módulo</label>
                <input
                  type="text"
                  value={formReposicao.disciplina}
                  onChange={(e) => setFormReposicao({ ...formReposicao, disciplina: e.target.value })}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Professor Responsável</label>
                <input
                  type="text"
                  value={formReposicao.professor}
                  onChange={(e) => setFormReposicao({ ...formReposicao, professor: e.target.value })}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Status da Sessão</label>
                <select
                  value={formReposicao.status}
                  onChange={(e) => setFormReposicao({ ...formReposicao, status: e.target.value as any })}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="agendada">AGENDADA (Sessão futura)</option>
                  <option value="realizada">REALIZADA (Compensa falta)</option>
                  <option value="cancelada">CANCELADA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Observações do Reforço</label>
                <textarea
                  rows={2}
                  value={formReposicao.observacao}
                  onChange={(e) => setFormReposicao({ ...formReposicao, observacao: e.target.value })}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setModalAgendamentoAluno(null); setReposicaoEmEdicao(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-md"
                >
                  {reposicaoEmEdicao ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}