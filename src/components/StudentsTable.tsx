import React, { useState, useMemo, useEffect } from 'react';
import { AlunoMonitorado, NivelCriticidade, StatusTratativa, UserProfile } from '../types';
import { calculateAcademicStatus } from '../utils/academicCalculations';
import {
  Search,
  Filter,
  Send,
  Eye,
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  Lock,
  Unlock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Repeat,
  Bell,
  BellRing,
  Zap,
  Gauge,
  HelpCircle,
  Flame,
  Hourglass,
  FlaskConical,
} from 'lucide-react';

interface StudentsTableProps {
  alunos: AlunoMonitorado[];
  unidadeAtiva?: string;
  activeUnidade?: string;
  selectedNivel: NivelCriticidade | 'todos';
  onSelectNivel: (nivel: NivelCriticidade | 'todos') => void;
  currentUser: UserProfile;
  isLoading?: boolean;
  onOpenDetailModal: (aluno: AlunoMonitorado) => void;
  onOpenNewOcorrencia: (aluno?: AlunoMonitorado) => void;
  onQuickAddPureTextOcorrencia?: (alunoId: string, textoPuro: string) => void;
  onToggleBloqueio: (alunoId: string) => void;
  onUpdateStatusTratativa: (alunoId: string, status: StatusTratativa) => void;
  onOpenTestCgdSyncModal?: (aluno?: AlunoMonitorado) => void;
  onOpenScannerModal?: () => void;
  onOpenAbsenceBlockingModal?: () => void;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  alunos,
  unidadeAtiva,
  activeUnidade,
  selectedNivel,
  onSelectNivel,
  currentUser,
  isLoading = false,
  onOpenDetailModal,
  onOpenNewOcorrencia,
  onQuickAddPureTextOcorrencia,
  onToggleBloqueio,
  onUpdateStatusTratativa,
  onOpenTestCgdSyncModal,
  onOpenScannerModal,
  onOpenAbsenceBlockingModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'todos' | 'alertas_sino' | 'cliques_rapidos' | 'avanco_lento' | 'bloqueados' | 'pendentes' | 'em_andamento' | 'concluidos'
  >('todos');
  const [professorFilter, setProfessorFilter] = useState<string>('todos');
  const [openCgdMenuId, setOpenCgdMenuId] = useState<string | null>(null);
  const [activeBellPopoverId, setActiveBellPopoverId] = useState<string | null>(null);
  
  // Fast Pure-Text Occurrence States
  const [activeQuickOcorrAlunoId, setActiveQuickOcorrAlunoId] = useState<string | null>(null);
  const [quickOcorrText, setQuickOcorrText] = useState<string>('');
  const [isSubmittingQuickOcorr, setIsSubmittingQuickOcorr] = useState<boolean>(false);
  const [quickOcorrSuccessId, setQuickOcorrSuccessId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.cgd-dropdown-container') && !target.closest('.bell-popover-container')) {
        setOpenCgdMenuId(null);
        setActiveBellPopoverId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtro estrito por Unidade
  const unidadeAtual = unidadeAtiva || activeUnidade;
  const alunosFiltrados = useMemo(() => {
    if (!unidadeAtual) return alunos;
    return alunos.filter((a) => a.unidade?.toLowerCase() === unidadeAtual.toLowerCase());
  }, [alunos, unidadeAtual]);

  // List of distinct professors
  const professores = useMemo(() => {
    const set = new Set(
      alunosFiltrados
        .map((a) => a.professorResponsavel)
        .filter((p): p is string => Boolean(p && typeof p === 'string' && p.trim() !== ''))
    );
    return Array.from(set).sort();
  }, [alunosFiltrados]);

  // Rhythm Statistics
  const rhythmStats = useMemo(() => {
    let cliques = 0;
    let lentos = 0;
    let normais = 0;
    alunosFiltrados.forEach((a) => {
      const ac = calculateAcademicStatus(a);
      if (ac.anomaliaRitmo === 'cliques_rapidos') cliques++;
      else if (ac.anomaliaRitmo === 'avanco_lento') lentos++;
      else normais++;
    });
    return { cliques, lentos, normais, totalAlertas: cliques + lentos };
  }, [alunosFiltrados]);

  // Blocked Students Count using calculateAcademicStatus
  const blockedCount = useMemo(() => {
    return alunosFiltrados.filter((a) => calculateAcademicStatus(a).isBloqueado).length;
  }, [alunosFiltrados]);

  // Filtered Alunos
  const filteredAlunos = useMemo(() => {
    return alunosFiltrados.filter((aluno) => {
      const academic = calculateAcademicStatus(aluno);

      // Search term
      if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch =
          (aluno.nome && aluno.nome.toLowerCase().includes(term)) ||
          (aluno.contrato && aluno.contrato.toLowerCase().includes(term)) ||
          (aluno.curso && aluno.curso.toLowerCase().includes(term)) ||
          (aluno.disciplinaAtual && aluno.disciplinaAtual.toLowerCase().includes(term)) ||
          (aluno.turmaNome && aluno.turmaNome.toLowerCase().includes(term)) ||
          (aluno.professorResponsavel && aluno.professorResponsavel.toLowerCase().includes(term));

        if (!matchesSearch) return false;
      }

      // Nivel Criticidade (computed) - when 'todos' or 'todas' is selected, show all
      const isAllNiveis = !selectedNivel || selectedNivel === 'todos' || (selectedNivel as string) === 'todas' || (selectedNivel as string) === 'Todas';
      if (!isAllNiveis && academic.criticidade !== selectedNivel) {
        return false;
      }

      // Status Filter & Bell Anomaly filters - when 'todos' or 'todas' is selected, show all
      const isAllStatus = !statusFilter || statusFilter === 'todos' || (statusFilter as string) === 'todas' || (statusFilter as string) === 'Todas';
      if (!isAllStatus) {
        if (statusFilter === 'alertas_sino') {
          if (!academic.temAlertaSino) return false;
        } else if (statusFilter === 'cliques_rapidos') {
          if (academic.anomaliaRitmo !== 'cliques_rapidos') return false;
        } else if (statusFilter === 'avanco_lento') {
          if (academic.anomaliaRitmo !== 'avanco_lento') return false;
        } else if (statusFilter === 'bloqueados') {
          if (!academic.isBloqueado) return false;
        } else if (statusFilter === 'pendentes') {
          if (aluno.statusTratativa !== 'pendente') return false;
        } else if (statusFilter === 'em_andamento') {
          if (aluno.statusTratativa !== 'em_andamento') return false;
        } else if (statusFilter === 'concluidos') {
          if (aluno.statusTratativa !== 'concluido') return false;
        }
      }

      // Professor Filter - NO automatic professor filter by default, and when 'todos' / '' / 'todas' is selected, show all
      const isAllProfessores = !professorFilter || professorFilter === 'todos' || professorFilter === 'todas' || professorFilter === 'Todas' || professorFilter === 'Todos' || professorFilter === '';
      if (!isAllProfessores && aluno.professorResponsavel !== professorFilter) {
        return false;
      }

      return true;
    });
  }, [alunosFiltrados, searchTerm, selectedNivel, statusFilter, professorFilter]);

  // Helper for contract number formatting
  const getContractNumber = (contratoStr: string) => {
    const match = contratoStr.match(/\d+/);
    return match ? match[0] : contratoStr;
  };

  const getTratativaLabel = (tratativa: string) => {
    switch (tratativa) {
      case 'aulao':
        return 'Aulão';
      case 'atividade_pratica':
        return 'Atividade Prática';
      case 'acompanhamento':
        return 'Acompanhamento';
      case 'normal':
        return 'Normal';
      default:
        return tratativa;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-gradient-to-b from-slate-50/50 to-white space-y-4">
        {/* Top Row: Title, Bell Stat Pills & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Alunos Monitorados
                </h3>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {filteredAlunos.length} de {alunosFiltrados.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle de faltas, reposições de aula, ritmo de avanço e sincronização com CGD
              </p>
            </div>
          </div>

          {/* Action Buttons: Scanner CGD, Test Sync CGD & New Occurrence */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenAbsenceBlockingModal && (
              <button
                type="button"
                onClick={onOpenAbsenceBlockingModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all border border-red-800"
                title="Auditar, revisar e reconciliar bloqueios por faltas de acordo com as regras oficiais do CGD"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
                <span>Revisar Bloqueios ({blockedCount})</span>
              </button>
            )}

            {onOpenScannerModal && (
              <button
                type="button"
                onClick={onOpenScannerModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all border border-slate-700"
                title="Conectar e buscar alunos não listados no portal CGD (Filial e Matriz)"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buscar Alunos no CGD</span>
              </button>
            )}

            {onOpenTestCgdSyncModal && (
              <button
                type="button"
                onClick={() => onOpenTestCgdSyncModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all"
                title="Escolha um aluno da filial para testar ocorrência e validar sincronização com CGD"
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-300" />
                <span>Testar Sincronização CGD</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenNewOcorrencia()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Lançar Ocorrência CGD</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Pill Buttons (Including Pacing Bell Alerts) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtros:
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 ${
              statusFilter === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Todos ({alunosFiltrados.length})
          </button>

          {/* Bell Rhythm Alerts Filter */}
          <button
            type="button"
            onClick={() => setStatusFilter('alertas_sino')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all shrink-0 border ${
              statusFilter === 'alertas_sino'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
            title="Alunos com anomalia de ritmo detectada (cliques rápidos ou avanço lento)"
          >
            <BellRing className={`w-3.5 h-3.5 ${statusFilter === 'alertas_sino' ? 'text-white' : 'text-amber-600'}`} />
            <span>Sino de Ritmo ({rhythmStats.totalAlertas})</span>
          </button>

          {/* Quick Filter: Fast clicks */}
          <button
            type="button"
            onClick={() => setStatusFilter('cliques_rapidos')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
              statusFilter === 'cliques_rapidos'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
            }`}
          >
            <Zap className="w-3 h-3 text-rose-600" />
            <span>⚡ Cliques Rápidos ({rhythmStats.cliques})</span>
          </button>

          {/* Quick Filter: Slow advance */}
          <button
            type="button"
            onClick={() => setStatusFilter('avanco_lento')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
              statusFilter === 'avanco_lento'
                ? 'bg-amber-700 text-white border-amber-700'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            <Hourglass className="w-3 h-3 text-amber-600" />
            <span>⏳ Avanço Lento ({rhythmStats.lentos})</span>
          </button>

          {/* Quick Filter: Blocked */}
          <button
            type="button"
            onClick={() => setStatusFilter('bloqueados')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
              statusFilter === 'bloqueados'
                ? 'bg-red-700 text-white border-red-700'
                : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
            }`}
          >
            <Lock className="w-3 h-3 text-red-600" />
            <span>Bloqueados Faltas ({blockedCount})</span>
          </button>
        </div>

        {/* Filters Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar aluno, curso, contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-emerald-600"
            >
              <option value="todos">Status Geral: Todos</option>
              <option value="alertas_sino">🔔 Todos Alertas de Ritmo (Sino)</option>
              <option value="cliques_rapidos">⚡ Ritmo: Cliques Rápidos</option>
              <option value="avanco_lento">⏳ Ritmo: Avanço Lento / Estagnado</option>
              <option value="bloqueados">🚨 Bloqueados (&gt; 3 faltas/mês)</option>
              <option value="pendentes">Tratativa: Pendente</option>
              <option value="em_andamento">Tratativa: Em Andamento</option>
              <option value="concluidos">Tratativa: Concluída</option>
            </select>
          </div>

          {/* Criticidade Filter */}
          <div>
            <select
              value={selectedNivel}
              onChange={(e) => onSelectNivel(e.target.value as any)}
              className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-emerald-600"
            >
              <option value="todos">Criticidade: Todas</option>
              <option value="critico">🔴 CRÍTICO (&gt; 90 dias / Aulão)</option>
              <option value="moderado">🟠 MODERADO (60-89 dias / Atividade Prática)</option>
              <option value="atencao">🟡 ATENÇÃO (30-59 dias / Acompanhamento)</option>
              <option value="normal">🟢 NORMAL (&lt; 30 dias)</option>
            </select>
          </div>

          {/* Professor Filter */}
          <div>
            <select
              value={professorFilter}
              onChange={(e) => setProfessorFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-emerald-600"
            >
              <option value="todos">Professor: Todos</option>
              {professores.map((prof) => (
                <option key={prof} value={prof}>
                  Prof. {prof}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Component with High Density and Bold Visuals */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead className="bg-slate-50/95 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              <th className="px-3 py-3 text-center w-14">Contrato</th>
              <th className="px-4 py-3 min-w-[190px]">Aluno</th>
              <th className="px-3 py-3 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ritmo & Sino</span>
                </div>
              </th>
              <th className="px-3 py-3 min-w-[200px]">Disciplina Atual & Curso</th>
              <th className="px-2 py-3 text-center whitespace-nowrap">Último Acesso</th>
              <th className="px-2 py-3 text-center min-w-[85px]">Faltas Totais</th>
              <th className="px-2 py-3 text-center min-w-[95px]">Faltas Mês</th>
              <th className="px-2 py-3 text-center min-w-[90px]">Reposições</th>
              <th className="px-2 py-3 text-center min-w-[80px]">Dias</th>
              <th className="px-3 py-3 text-center min-w-[110px]">Criticidade</th>
              <th className="px-3 py-3 text-center min-w-[115px]">Tratativa</th>
              <th className="px-3 py-3 text-center min-w-[140px]">Ações CGD</th>
              <th className="px-3 py-3 text-center min-w-[95px]">Ocorrência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={13} className="px-4 py-16 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-3 border-emerald-200 border-t-emerald-700 animate-spin" />
                      <RefreshCw className="w-5 h-5 text-emerald-700 absolute animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm tracking-tight">
                        Carregando dados reais...
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        Consultando campo JSON <code className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">dados_completos</code> / <code className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">relatorio</code> da tabela <code className="text-emerald-700 font-semibold">resumo_cgd</code> no Supabase
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredAlunos.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-14 text-center text-slate-400">
                  <div className="max-w-sm mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Nenhum aluno encontrado na consulta do Supabase.
                    </p>
                    <p className="text-xs text-slate-400">
                      Verifique os filtros selecionados ou clique em &quot;Sincronizar Supabase&quot; para atualizar a extração de dados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAlunos.map((aluno) => {
                const academic = calculateAcademicStatus(aluno);
                const isBloqueado = aluno.statusMatricula === 'bloqueado_faltas' || academic.deveBloquear;
                const isMenuOpen = openCgdMenuId === aluno.id;
                const isBellPopoverOpen = activeBellPopoverId === aluno.id;

                return (
                  <React.Fragment key={aluno.id}>
                    <tr
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isBloqueado
                          ? 'bg-rose-50/30'
                          : academic.anomaliaRitmo === 'cliques_rapidos'
                          ? 'bg-rose-50/15'
                          : academic.anomaliaRitmo === 'avanco_lento'
                          ? 'bg-amber-50/15'
                          : ''
                      }`}
                    >
                    {/* 1. Contrato */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          {getContractNumber(aluno.contrato)}
                        </span>
                        {aluno.cgdUrl ? (
                          <a
                            href={aluno.cgdUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-[9px] font-mono text-blue-600 hover:text-blue-800 hover:underline"
                            title={`Acessar no CGD: ${aluno.cgdUrl}`}
                          >
                            <span>CGD</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : null}
                      </div>
                    </td>

                    {/* 2. Nome do Aluno */}
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="hover:text-emerald-700 cursor-pointer transition-colors font-bold text-slate-900 text-xs"
                          onClick={() => onOpenDetailModal(aluno)}
                        >
                          {aluno.nome}
                        </span>
                        {isBloqueado && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[9px] font-black"
                            title="Bloqueio preventivo por faltas (>3 no mês sem reposição)"
                          >
                            <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                        <span>Prof. {aluno.professorResponsavel}</span>
                        <span>•</span>
                        <span>Turma: {aluno.turmaNome}</span>
                      </div>
                    </td>

                    {/* 3. Ritmo & Sino de Alerta */}
                    <td className="px-3 py-3 text-center">
                      <div className="bell-popover-container relative inline-block">
                        {academic.anomaliaRitmo === 'cliques_rapidos' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBellPopoverId(isBellPopoverOpen ? null : aluno.id)
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100/90 hover:bg-rose-200 border border-rose-300 text-rose-900 rounded-lg text-[10px] font-black transition-all shadow-2xs animate-pulse"
                            title="Clique para inspecionar anomalia de ritmo (cliques rápidos)"
                          >
                            <BellRing className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>⚡ {academic.tempoMedioPorAulaMinutos.toFixed(1)}m/aula</span>
                          </button>
                        ) : academic.anomaliaRitmo === 'avanco_lento' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBellPopoverId(isBellPopoverOpen ? null : aluno.id)
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 text-amber-950 rounded-lg text-[10px] font-black transition-all shadow-2xs"
                            title="Clique para inspecionar anomalia de ritmo (avanço lento)"
                          >
                            <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>⏳ {academic.percentualAvancoDisciplina}% avanço</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveBellPopoverId(isBellPopoverOpen ? null : aluno.id)
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition-all"
                            title="Ritmo adequado ao plano pedagógico"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Ritmo OK</span>
                          </button>
                        )}

                        {/* Interactive Bell Popover with Diagnostic Details */}
                        {isBellPopoverOpen && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-8 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 text-left animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <Bell className="w-3.5 h-3.5 text-amber-600" />
                                <span>Diagnóstico de Ritmo</span>
                              </div>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  academic.anomaliaRitmo === 'cliques_rapidos'
                                    ? 'bg-rose-100 text-rose-800'
                                    : academic.anomaliaRitmo === 'avanco_lento'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {academic.anomaliaRitmo.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-700">
                              <div className="text-[11px] font-medium text-slate-600">
                                <strong>Disciplina:</strong> {academic.disciplinaAtual}
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase">
                                    Velocidade
                                  </span>
                                  <strong>{academic.tempoMedioPorAulaMinutos.toFixed(1)} min/aula</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase">
                                    Progresso
                                  </span>
                                  <strong>
                                    {academic.horasCursadasDisciplinaAtual}h / {academic.cargaHorariaDisciplinaAtual}h
                                  </strong>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-600 leading-snug">
                                {academic.detalheAnomaliaRitmo ||
                                  'Aluno progride com absorção adequada da carga horária sem retenção ou velocidade excessiva.'}
                              </p>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                {onOpenTestCgdSyncModal && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenTestCgdSyncModal(aluno);
                                      setActiveBellPopoverId(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                                  >
                                    <FlaskConical className="w-3 h-3" />
                                    <span>Testar CGD</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenNewOcorrencia(aluno);
                                    setActiveBellPopoverId(null);
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-semibold transition-colors"
                                >
                                  + Ocorrência
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Disciplina Atual & Curso */}
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-bold text-slate-900 text-xs line-clamp-1">
                        {aluno.disciplinaAtual || aluno.curso}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                        {aluno.curso}
                      </div>
                    </td>

                    {/* 5. Último Acesso & Dias sem Acesso */}
                    <td className="px-2 py-3 text-center whitespace-nowrap">
                      <div className="text-[11px] font-mono font-semibold text-slate-700">
                        {aluno.ultimoAcesso !== '—' && aluno.ultimoAcesso ? aluno.ultimoAcesso.split(' ')[0] : '—'}
                      </div>
                      {academic.diasSemAcesso > 0 ? (
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black ${
                            academic.diasSemAcesso >= 30
                              ? 'bg-red-100 text-red-800'
                              : academic.diasSemAcesso >= 15
                              ? 'bg-amber-100 text-amber-800'
                              : 'text-slate-400 font-semibold'
                          }`}
                        >
                          {academic.diasSemAcesso}d s/ acesso
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-700">
                          Acesso recente
                        </span>
                      )}
                    </td>

                    {/* 6. Faltas Totais (Efetivas vs Brutas) */}
                    <td className="px-2 py-3 text-center">
                      <div className="font-black text-slate-800 text-xs">
                        {academic.faltasEfetivasTotais}
                      </div>
                      {academic.reposicoesRealizadas > 0 && (
                        <div
                          className="text-[9px] text-emerald-700 font-medium"
                          title={`${academic.faltasBrutasTotais} faltas brutas - ${academic.reposicoesRealizadas} reposições`}
                        >
                          ({academic.faltasBrutasTotais} - {academic.reposicoesRealizadas} rep)
                        </div>
                      )}
                    </td>

                    {/* 7. Faltas Mês com badge / bloqueio */}
                    <td className="px-2 py-3 text-center">
                      {isBloqueado ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black tracking-wide shadow-2xs">
                            {academic.faltasEfetivasMes} BLOQ
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {aluno.mesReferenciaFaltas}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-black text-xs ${
                              academic.faltasEfetivasMes >= 3 ? 'text-amber-600' : 'text-slate-800'
                            }`}
                          >
                            {academic.faltasEfetivasMes}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {aluno.mesReferenciaFaltas}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 8. Reposições de Aula */}
                    <td className="px-2 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            academic.reposicoesRealizadas > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {academic.reposicoesRealizadas} comp.
                        </span>
                        {academic.reposicoesAgendadas > 0 && (
                          <span
                            className="px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                            title="Reposição agendada"
                          >
                            +{academic.reposicoesAgendadas} ag.
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 9. Dias em curso */}
                    <td className="px-2 py-3 text-center">
                      {aluno.diasTotalPrevisto ? (
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[11px]">
                          {aluno.diasEmCurso} / {aluno.diasTotalPrevisto}
                        </span>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs shadow-2xs ${
                            academic.criticidade === 'critico'
                              ? 'bg-red-600 text-white'
                              : academic.criticidade === 'moderado'
                              ? 'bg-orange-500 text-white'
                              : academic.criticidade === 'atencao'
                              ? 'bg-amber-400 text-slate-900'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                          title={`${aluno.diasEmCurso} dias em curso`}
                        >
                          {aluno.diasEmCurso}d
                        </span>
                      )}
                    </td>

                    {/* 10. Criticidade & Tratativa Badge */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        {academic.criticidade === 'critico' ? (
                          <>
                            <span className="px-2.5 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-full shadow-2xs uppercase tracking-wider">
                              CRÍTICO
                            </span>
                            <span className="text-[10px] font-bold text-red-700">
                              {getTratativaLabel(academic.tratativaSugerida)} (&gt; 90d)
                            </span>
                          </>
                        ) : academic.criticidade === 'moderado' ? (
                          <>
                            <span className="px-2.5 py-0.5 text-[10px] font-black bg-orange-500 text-white rounded-full shadow-2xs uppercase tracking-wider">
                              MODERADO
                            </span>
                            <span className="text-[10px] font-bold text-orange-700">
                              {getTratativaLabel(academic.tratativaSugerida)} (60-89d)
                            </span>
                          </>
                        ) : academic.criticidade === 'atencao' ? (
                          <>
                            <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-400 text-slate-900 rounded-full shadow-2xs uppercase tracking-wider">
                              ATENÇÃO
                            </span>
                            <span className="text-[10px] font-bold text-amber-800">
                              {getTratativaLabel(academic.tratativaSugerida)} (30-59d)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-600 text-white rounded-full shadow-2xs uppercase tracking-wider">
                              NORMAL
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">Normal (&lt; 30d)</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 11. Status Tratativa Dropdown */}
                    <td className="px-3 py-3 text-center">
                      <select
                        value={aluno.statusTratativa}
                        onChange={(e) =>
                          onUpdateStatusTratativa(aluno.id, e.target.value as StatusTratativa)
                        }
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-hidden cursor-pointer transition-colors ${
                          aluno.statusTratativa === 'concluido'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : aluno.statusTratativa === 'em_andamento'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="pendente">● Pendente</option>
                        <option value="em_andamento">● Em Andamento</option>
                        <option value="concluido">● Concluído</option>
                      </select>
                    </td>

                    {/* 12. Ações CGD (Botão Cadastro + Dropdown CGD) */}
                    <td className="px-3 py-3 text-center">
                      <div className="cgd-dropdown-container relative inline-flex items-center gap-1.5">
                        {/* Botão Cadastro */}
                        <button
                          type="button"
                          onClick={() => onOpenDetailModal(aluno)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                          title="Abrir Cadastro & Grade de Disciplinas"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Cadastro</span>
                        </button>

                        {/* Botão Dropdown CGD */}
                        <button
                          type="button"
                          onClick={() => setOpenCgdMenuId(isMenuOpen ? null : aluno.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <span>CGD</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Popover Dropdown CGD */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-50 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-left animate-in fade-in zoom-in-95">
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Ações CGD & Validação
                            </div>

                            {/* Link Direto para o Portal CGD do Aluno */}
                            {aluno.cgdUrl ? (
                              <a
                                href={aluno.cgdUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full px-3 py-1.5 text-xs text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-between border-b border-slate-100"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Abrir no CGD ({aluno.unidade === 'filial' ? 'Contrato 832852' : 'Contrato 836410'})</span>
                                </span>
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                                  {aluno.unidade === 'filial' ? 'Filial' : aluno.cgdLaboratorio === 'lab_matriz_01' ? 'Matriz Lab 1' : 'Matriz Lab 2'}
                                </span>
                              </a>
                            ) : null}

                            {onOpenTestCgdSyncModal && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenTestCgdSyncModal(aluno);
                                  setOpenCgdMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-emerald-800 font-bold hover:bg-emerald-50 flex items-center justify-between border-b border-slate-100 mb-1"
                              >
                                <span className="flex items-center gap-1.5">
                                  <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                                  Testar Sincronização CGD
                                </span>
                                <ExternalLink className="w-3 h-3 text-emerald-400" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onOpenDetailModal(aluno);
                                setOpenCgdMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                            >
                              <span>Contrato & Grade</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenNewOcorrencia(aluno);
                                setOpenCgdMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                            >
                              <span>Ocorrências</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenDetailModal(aluno);
                                setOpenCgdMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                            >
                              <span>Frequência & Reposições</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>

                            <div className="border-t border-slate-100 my-1 pt-1">
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Bloqueio Preventivo
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleBloqueio(aluno.id);
                                  setOpenCgdMenuId(null);
                                }}
                                className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 font-medium ${
                                  isBloqueado
                                    ? 'text-emerald-700 hover:bg-emerald-50'
                                    : 'text-red-700 hover:bg-red-50'
                                }`}
                              >
                                {isBloqueado ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Desbloquear Aluno</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Bloquear ({academic.faltasEfetivasMes} faltas efetivas)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 13. Ocorrência (Texto Puro & Sincronização CGD) */}
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeQuickOcorrAlunoId === aluno.id) {
                            setActiveQuickOcorrAlunoId(null);
                            setQuickOcorrText('');
                          } else {
                            setActiveQuickOcorrAlunoId(aluno.id);
                            setQuickOcorrText('');
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs ${
                          activeQuickOcorrAlunoId === aluno.id
                            ? 'bg-emerald-700 text-white border border-emerald-800'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-emerald-600'
                        }`}
                        title="Digitar ocorrência em texto puro e sincronizar com CGD"
                      >
                        <FileText className="w-3 h-3 text-emerald-600" />
                        <span>{activeQuickOcorrAlunoId === aluno.id ? 'Fechar' : '+ Ocorrência'}</span>
                      </button>
                    </td>
                  </tr>

                  {/* Sub-row: Inline Pure-Text Occurrence & CGD Button Automation */}
                  {activeQuickOcorrAlunoId === aluno.id && (
                    <tr className="bg-emerald-50/40 border-y-2 border-emerald-500/40 animate-in fade-in duration-150">
                      <td colSpan={13} className="p-4">
                        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                                <Zap className="w-4 h-4 text-amber-300" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                  <span>Lançar Ocorrência em Texto Puro — {aluno.nome}</span>
                                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {aluno.contrato}
                                  </span>
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  O texto digitado abaixo será enviado como texto puro para o campo do CGD e sincronizado com 1 clique.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Automação CGD: txtDescricaoOcorrencia ➔ btnSalvarOcorrencia</span>
                            </div>
                          </div>

                          {/* Editable Pure Text Field */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Texto da Ocorrência (Texto Puro do Instrutor) *
                            </label>
                            <textarea
                              rows={2}
                              value={quickOcorrText}
                              onChange={(e) => setQuickOcorrText(e.target.value)}
                              placeholder="Digite a ocorrência aqui (ex: 'Teste' ou observação pedagógica do instrutor)..."
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-hidden focus:border-emerald-600 focus:bg-white transition-colors"
                              autoFocus
                            />
                          </div>

                          {/* Quick Chips & Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-slate-400 text-[10px] font-semibold uppercase">Atalhos rápidos:</span>
                              <button
                                type="button"
                                onClick={() => setQuickOcorrText('Teste')}
                                className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded text-[11px] transition-colors"
                              >
                                ⚡ Inserir "Teste"
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickOcorrText(`Convocação para reposição de aula prática da disciplina ${academic.disciplinaAtual}.`)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                              >
                                Reposição de Aula
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickOcorrText(`Orientação pedagógica: Ritmo acelerado detectado em ${academic.disciplinaAtual}. Aluno instruído sobre exercícios.`)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                              >
                                Orientação de Ritmo
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickOcorrText(`Aluno com faltas justificadas no mês ${aluno.mesReferenciaFaltas}. Reposições agendadas.`)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                              >
                                Justificativa de Faltas
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveQuickOcorrAlunoId(null);
                                  setQuickOcorrText('');
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                              >
                                Cancelar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onOpenNewOcorrencia(aluno);
                                  setActiveQuickOcorrAlunoId(null);
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-lg text-xs transition-colors"
                              >
                                Painel Completo
                              </button>

                              <button
                                type="button"
                                disabled={!quickOcorrText.trim() || isSubmittingQuickOcorr}
                                onClick={() => {
                                  if (!quickOcorrText.trim()) return;
                                  setIsSubmittingQuickOcorr(true);
                                  setTimeout(() => {
                                    if (onQuickAddPureTextOcorrencia) {
                                      onQuickAddPureTextOcorrencia(aluno.id, quickOcorrText);
                                    }
                                    setQuickOcorrSuccessId(aluno.id);
                                    setIsSubmittingQuickOcorr(false);
                                    setActiveQuickOcorrAlunoId(null);
                                    setQuickOcorrText('');
                                  }, 400);
                                }}
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isSubmittingQuickOcorr ? 'Enviando ao CGD...' : 'Enviar para o CGD'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 bg-slate-50/90 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Auditoria CGD:</strong> {rhythmStats.totalAlertas} alerta(s) de ritmo detectados ({rhythmStats.cliques} cliques rápidos, {rhythmStats.lentos} avanço lento).
          </span>
        </div>
        <div className="text-slate-600 font-medium">
          Mostrando <strong>{filteredAlunos.length}</strong> alunos na visão atual
        </div>
      </div>
    </div>
  );
};
