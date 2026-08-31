import React, { useState, useMemo } from 'react';
import { AlunoMonitorado, UserProfile } from '../types';
import { calculateAcademicStatus } from '../utils/academicCalculations';
import {
  X,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Building2,
} from 'lucide-react';

interface CgdAbsenceBlockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  alunos: AlunoMonitorado[];
  activeUnidade: 'filial' | 'matriz';
  currentUser: UserProfile;
  onToggleBloqueio: (alunoId: string) => void;
  onReconcileAllBloqueios: () => void;
  onOpenDetailModal: (aluno: AlunoMonitorado) => void;
}

export const CgdAbsenceBlockingModal: React.FC<CgdAbsenceBlockingModalProps> = ({
  isOpen,
  onClose,
  alunos = [],
  activeUnidade = 'filial',
  currentUser,
  onToggleBloqueio,
  onReconcileAllBloqueios,
  onOpenDetailModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'todos' | 'bloqueados' | 'compensados' | 'risco' | 'regulares'>('todos');
  const [selectedUnidadeFilter, setSelectedUnidadeFilter] = useState<'todas' | 'filial' | 'matriz'>(activeUnidade);

  if (!isOpen) return null;

  const safeAlunos = Array.isArray(alunos) ? alunos : [];

  // Analyze all students with calculation rules
  const analyzedAlunos = useMemo(() => {
    return safeAlunos.map((aluno) => {
      const academic = calculateAcademicStatus(aluno);
      const isBloqueado = academic.isBloqueado;
      const deveBloquear = academic.deveBloquear; // faltasEfetivasMes > 3
      const isCompensado = (aluno.faltasBrutasMes ?? aluno.faltasMesAtual ?? 0) > 3 && academic.faltasEfetivasMes <= 3;
      const emRisco = academic.faltasEfetivasMes >= 2 && academic.faltasEfetivasMes <= 3;
      const isRegular = academic.faltasEfetivasMes <= 1;

      // Check if there is discrepancy between current status and rules
      const needsBlock = deveBloquear && !isBloqueado;
      const needsUnblock = !deveBloquear && isBloqueado;

      return {
        aluno,
        academic,
        isBloqueado,
        deveBloquear,
        isCompensado,
        emRisco,
        isRegular,
        needsBlock,
        needsUnblock,
      };
    });
  }, [alunos]);

  // Totals for metrics
  const totalAnalyzed = analyzedAlunos.length;
  const countBloqueados = analyzedAlunos.filter((item) => item.isBloqueado).length;
  const countDeveBloquear = analyzedAlunos.filter((item) => item.deveBloquear).length;
  const countCompensados = analyzedAlunos.filter((item) => item.isCompensado).length;
  const countEmRisco = analyzedAlunos.filter((item) => item.emRisco).length;
  const countRegulares = analyzedAlunos.filter((item) => item.isRegular).length;
  const countDiscrepancies = analyzedAlunos.filter((item) => item.needsBlock || item.needsUnblock).length;

  // Filtered list
  const filteredList = useMemo(() => {
    return analyzedAlunos.filter((item) => {
      // Unidade filter
      if (selectedUnidadeFilter !== 'todas' && item.aluno.unidade !== selectedUnidadeFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.aluno.nome.toLowerCase().includes(query);
        const matchesContract = item.aluno.contrato.toLowerCase().includes(query);
        const matchesCourse = item.aluno.curso.toLowerCase().includes(query);
        const matchesTurma = item.aluno.turmaNome.toLowerCase().includes(query);
        if (!matchesName && !matchesContract && !matchesCourse && !matchesTurma) {
          return false;
        }
      }

      // Tab filter
      if (filterTab === 'bloqueados') return item.isBloqueado || item.deveBloquear;
      if (filterTab === 'compensados') return item.isCompensado;
      if (filterTab === 'risco') return item.emRisco;
      if (filterTab === 'regulares') return item.isRegular;

      return true;
    });
  }, [analyzedAlunos, selectedUnidadeFilter, searchTerm, filterTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Auditoria & Revisão de Bloqueios por Faltas (Regras CGD)
                </h2>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  Limite: Máx 3 Faltas/Mês
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                  Reposições Abatem Faltas
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Validação oficial de frequência: bloqueio preventivo automático para &gt; 3 faltas efetivas no mês com compensação de reposições.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules Explanatory Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Regra Pedagógica Oficial do CGD: </span>
              <span>
                Faltas Efetivas no Mês = <strong>Faltas Brutas do Mês - Reposições Concluídas</strong>. Se as faltas efetivas forem <strong>maiores que 3 (4 ou mais)</strong>, o aluno deve ser bloqueado preventivamente no CGD. Se o aluno tinha 4 ou 5 faltas mas fez reposições, o saldo cai e o aluno é <strong>automaticamente regularizado/liberado</strong>.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onReconcileAllBloqueios}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0"
            title="Executa a regra em lote em todos os alunos da base"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconciliar Todos pelas Regras</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            onClick={() => setFilterTab('todos')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'todos'
                ? 'bg-white border-slate-400 shadow-xs ring-1 ring-slate-400'
                : 'bg-white/60 border-slate-200 hover:bg-white'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase">Base Auditada</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totalAnalyzed}</div>
            <div className="text-[10px] text-slate-400">Total de alunos</div>
          </div>

          <div
            onClick={() => setFilterTab('bloqueados')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'bloqueados'
                ? 'bg-red-50 border-red-400 shadow-xs ring-1 ring-red-400'
                : 'bg-white border-slate-200 hover:bg-red-50/50'
            }`}
          >
            <div className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1">
              <Lock className="w-3 h-3" /> Bloqueados
            </div>
            <div className="text-xl font-black text-red-700 mt-0.5">{countBloqueados}</div>
            <div className="text-[10px] text-red-600">&gt; 3 faltas efetivas no mês</div>
          </div>

          <div
            onClick={() => setFilterTab('compensados')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'compensados'
                ? 'bg-emerald-50 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                : 'bg-white border-slate-200 hover:bg-emerald-50/50'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
              <Repeat className="w-3 h-3" /> Compensados
            </div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{countCompensados}</div>
            <div className="text-[10px] text-emerald-700">Liberados por reposição</div>
          </div>

          <div
            onClick={() => setFilterTab('risco')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'risco'
                ? 'bg-amber-50 border-amber-400 shadow-xs ring-1 ring-amber-400'
                : 'bg-white border-slate-200 hover:bg-amber-50/50'
            }`}
          >
            <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Em Risco
            </div>
            <div className="text-xl font-black text-amber-700 mt-0.5">{countEmRisco}</div>
            <div className="text-[10px] text-amber-700">2 ou 3 faltas no mês</div>
          </div>

          <div
            onClick={() => setFilterTab('regulares')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              filterTab === 'regulares'
                ? 'bg-slate-100 border-slate-400 shadow-xs ring-1 ring-slate-400'
                : 'bg-white border-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Regulares
            </div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{countRegulares}</div>
            <div className="text-[10px] text-slate-500">0 a 1 falta no mês</div>
          </div>
        </div>

        {/* Controls & Filter Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aluno, contrato ou curso..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Unidade Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUnidadeFilter('todas')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedUnidadeFilter === 'todas'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({alunos.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnidadeFilter('filial')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedUnidadeFilter === 'filial'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Filial (832852)
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnidadeFilter('matriz')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedUnidadeFilter === 'matriz'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Matriz (836410)
              </button>
            </div>

            <span className="text-xs text-slate-500 font-semibold shrink-0">
              {filteredList.length} exibidos
            </span>
          </div>
        </div>

        {/* Student Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3">Contrato & Unidade</th>
                  <th className="px-4 py-3">Aluno & Turma</th>
                  <th className="px-3 py-3 text-center">Faltas Brutas</th>
                  <th className="px-3 py-3 text-center">Reposições</th>
                  <th className="px-3 py-3 text-center">Faltas Efetivas</th>
                  <th className="px-3 py-3 text-center">Regra CGD</th>
                  <th className="px-3 py-3 text-center">Status Matrícula</th>
                  <th className="px-3 py-3 text-center">Ações CGD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      Nenhum aluno corresponde aos critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredList.map(({ aluno, academic, isBloqueado, deveBloquear, isCompensado }) => (
                    <tr
                      key={aluno.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBloqueado
                          ? 'bg-red-50/30'
                          : isCompensado
                          ? 'bg-emerald-50/20'
                          : ''
                      }`}
                    >
                      {/* Contrato & Unidade */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-800">
                            {aluno.contrato}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            {aluno.unidade === 'filial' ? 'Filial (832852)' : 'Matriz (836410)'}
                          </span>
                        </div>
                      </td>

                      {/* Aluno & Turma */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span
                            onClick={() => onOpenDetailModal(aluno)}
                            className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                          >
                            {aluno.nome}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {aluno.curso} • Prof. {aluno.professorResponsavel}
                          </span>
                        </div>
                      </td>

                      {/* Faltas Brutas */}
                      <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded">
                          {academic.faltasBrutasMes} brutas
                        </span>
                      </td>

                      {/* Reposições Concluídas */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                            academic.reposicoesRealizadas > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {academic.reposicoesRealizadas > 0
                            ? `-${academic.reposicoesRealizadas} compensada(s)`
                            : '0'}
                        </span>
                      </td>

                      {/* Faltas Efetivas */}
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-xs ${
                              academic.faltasEfetivasMes > 3
                                ? 'bg-red-600 text-white shadow-2xs'
                                : academic.faltasEfetivasMes >= 2
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {academic.faltasEfetivasMes} falta(s)
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            Mês {aluno.mesReferenciaFaltas || '08/2026'}
                          </span>
                        </div>
                      </td>

                      {/* Regra CGD */}
                      <td className="px-3 py-3 text-center">
                        {deveBloquear ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px] border border-red-200">
                            <Lock className="w-2.5 h-2.5" /> Excesso (&gt;3 faltas)
                          </span>
                        ) : isCompensado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Liberado por Reposição
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Regular (&le;3 faltas)
                          </span>
                        )}
                      </td>

                      {/* Status Matrícula Atual */}
                      <td className="px-3 py-3 text-center">
                        {isBloqueado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white rounded font-bold text-[10px] shadow-2xs">
                            <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]">
                            <Unlock className="w-2.5 h-2.5" /> ATIVO
                          </span>
                        )}
                      </td>

                      {/* Ações CGD */}
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onToggleBloqueio(aluno.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs ${
                              isBloqueado
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                            title={isBloqueado ? 'Desbloquear aluno no CGD' : 'Bloquear aluno no CGD'}
                          >
                            {isBloqueado ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Desbloquear</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Bloquear</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(aluno)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver Cadastro & Reposições"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Auditando <strong>{alunos.length} alunos</strong> nas unidades Filial (Contrato 832852) e Matriz (Contrato 836410).
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReconcileAllBloqueios}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Aplicar & Reconciliar Regras em Lote</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
