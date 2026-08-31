import React, { useState, useMemo } from 'react';
import { AlunoMonitorado } from '../types';
import { calculateAcademicStatus } from '../utils/academicCalculations';
import {
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Bell,
  BellRing,
} from 'lucide-react';

interface DisciplinasContratoPanelProps {
  alunos: AlunoMonitorado[];
  onOpenDetailModal: (aluno: AlunoMonitorado) => void;
  onOpenNewOcorrencia: (aluno: AlunoMonitorado) => void;
}

export const DisciplinasContratoPanel: React.FC<DisciplinasContratoPanelProps> = ({
  alunos,
  onOpenDetailModal,
  onOpenNewOcorrencia,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisco, setFilterRisco] = useState<'todos' | 'risco_alto' | 'atencao' | 'no_prazo'>('todos');

  const alunosComCalculo = useMemo(() => {
    return alunos.map((aluno) => {
      const dataInicio = new Date(aluno.dataInicio);
      const dataHoje = new Date('2026-08-19');
      const diffTime = Math.abs(dataHoje.getTime() - dataInicio.getTime());
      const mesesDecorridos = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));
      const mesesRestantes = Math.max(0, aluno.mesesContratoTotal - mesesDecorridos);

      const totalDisciplinas = aluno.totalDisciplinasGrade || aluno.disciplinas.length;
      const concluidas = aluno.disciplinas.filter((d) => d.status === 'concluida').length;
      const emAndamento = aluno.disciplinas.filter((d) => d.status === 'em_andamento').length;
      const pendentes = aluno.disciplinas.filter((d) => d.status === 'pendente').length;
      const restantes = pendentes + emAndamento;

      const progressoPct = Math.round((concluidas / (totalDisciplinas || 1)) * 100);
      const ritmoNecessario = mesesRestantes > 0 ? Number((restantes / mesesRestantes).toFixed(1)) : 0;
      const ritmoAtual = Number((concluidas / mesesDecorridos).toFixed(1));

      let nivelRisco: 'risco_alto' | 'atencao' | 'no_prazo' = 'no_prazo';
      if (mesesRestantes <= 2 && restantes > 2 || ritmoNecessario > 1.5) {
        nivelRisco = 'risco_alto';
      } else if (ritmoNecessario > ritmoAtual || mesesRestantes <= 4 && restantes > 4) {
        nivelRisco = 'atencao';
      }

      return {
        ...aluno,
        mesesDecorridos,
        mesesRestantes,
        totalDisciplinas,
        concluidas,
        emAndamento,
        pendentes,
        restantes,
        progressoPct,
        ritmoNecessario,
        ritmoAtual,
        nivelRisco,
      };
    });
  }, [alunos]);

  const filteredAlunos = useMemo(() => {
    return alunosComCalculo.filter((item) => {
      const matchesSearch =
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.curso.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filterRisco !== 'todos' && item.nivelRisco !== filterRisco) return false;

      return true;
    });
  }, [alunosComCalculo, searchTerm, filterRisco]);

  const totalRiscoAlto = alunosComCalculo.filter((a) => a.nivelRisco === 'risco_alto').length;
  const totalAtencao = alunosComCalculo.filter((a) => a.nivelRisco === 'atencao').length;
  const totalNoPrazo = alunosComCalculo.filter((a) => a.nivelRisco === 'no_prazo').length;

  return (
    <div className="space-y-6">
      {/* Header & KPI Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-700" />
            <span>Painel de Disciplinas Faltantes & Tempo de Contrato</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo automatizado em tempo real da velocidade de conclusão versus meses restantes de contrato
          </p>
        </div>

        {/* Live summary badge */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg border border-red-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {totalRiscoAlto} Risco de Atraso
          </span>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
            {totalAtencao} Atenção
          </span>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
            {totalNoPrazo} No Prazo
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por aluno, contrato ou curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterRisco}
            onChange={(e) => setFilterRisco(e.target.value as any)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:border-emerald-600"
          >
            <option value="todos">Todos os Riscos ({alunosComCalculo.length})</option>
            <option value="risco_alto">🚨 Alto Risco de Estourar Contrato ({totalRiscoAlto})</option>
            <option value="atencao">⚠️ Atenção Pedagógica ({totalAtencao})</option>
            <option value="no_prazo">✅ No Prazo Regulamentar ({totalNoPrazo})</option>
          </select>
        </div>
      </div>

      {/* Grid of Student Cards with Contract Speed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlunos.map((aluno) => {
          const isHighRisk = aluno.nivelRisco === 'risco_alto';
          const isAtencao = aluno.nivelRisco === 'atencao';

          return (
            <div
              key={aluno.id}
              className={`bg-white rounded-xl p-4 border shadow-xs transition-all flex flex-col justify-between ${
                isHighRisk
                  ? 'border-red-300 ring-1 ring-red-200'
                  : isAtencao
                  ? 'border-amber-300'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header: Name and Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                      {aluno.contrato}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">
                      {aluno.nome}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{aluno.curso}</p>
                  </div>

                  {isHighRisk && (
                    <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold shrink-0">
                      Risco Alto
                    </span>
                  )}
                  {isAtencao && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold shrink-0">
                      Atenção
                    </span>
                  )}
                  {!isHighRisk && !isAtencao && (
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold shrink-0">
                      No Prazo
                    </span>
                  )}
                </div>

                {/* Contract Progress Bar */}
                <div className="my-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Grade Curricular</span>
                    <span className="text-slate-900 font-bold">
                      {aluno.concluidas} de {aluno.totalDisciplinas} disc ({aluno.progressoPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        isHighRisk ? 'bg-red-500' : isAtencao ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${aluno.progressoPct}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs my-3">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-medium">Restantes</div>
                    <div className="font-black text-slate-800 text-sm">{aluno.restantes}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-medium">Meses Rest.</div>
                    <div className="font-black text-slate-800 text-sm">{aluno.mesesRestantes}m</div>
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      isHighRisk
                        ? 'bg-red-50 border-red-100 text-red-900'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-900'
                    }`}
                  >
                    <div className="text-[10px] opacity-80 font-medium">Ritmo Necess.</div>
                    <div className="font-black text-sm">{aluno.ritmoNecessario}/mês</div>
                  </div>
                </div>

                {/* Predictive Diagnostic & Rhythm Bell */}
                {(() => {
                  const academic = calculateAcademicStatus(aluno);
                  return (
                    <div className="space-y-2">
                      {academic.temAlertaSino && (
                        <div className={`p-2 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
                          academic.anomaliaRitmo === 'cliques_rapidos'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}>
                          {academic.anomaliaRitmo === 'cliques_rapidos' ? (
                            <BellRing className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span>
                            {academic.anomaliaRitmo === 'cliques_rapidos'
                              ? `Sino: Cliques rápidos (${academic.tempoMedioPorAulaMinutos.toFixed(1)}m/aula) em ${academic.disciplinaAtual}`
                              : `Sino: Avanço lento (${academic.horasCursadasDisciplinaAtual}h de ${academic.cargaHorariaDisciplinaAtual}h)`}
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        {isHighRisk ? (
                          <span className="text-red-700 font-medium">
                            ⚠️ Necessita acelerar {aluno.restantes} disciplinas nos próximos {aluno.mesesRestantes} meses. Recomendado <strong>Aulão de Recuperação</strong>.
                          </span>
                        ) : isAtencao ? (
                          <span className="text-amber-800 font-medium">
                            ⏳ Aplicar <strong>Atividade Prática</strong> para acelerar a conclusão dos módulos pendentes.
                          </span>
                        ) : (
                          <span className="text-emerald-800 font-medium">
                            ✨ Ritmo regular. Previsão de formatura dentro do prazo contratual.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenDetailModal(aluno)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs text-center transition-colors"
                >
                  Ver Grade Completa
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNewOcorrencia(aluno)}
                  className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Tratar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
