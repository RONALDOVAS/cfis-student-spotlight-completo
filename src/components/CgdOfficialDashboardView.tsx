import React, { useState } from 'react';
import { DashboardMetricsCGD, UserProfile } from '../types';
import {
  Building2,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Users,
  GraduationCap,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';

interface CgdOfficialDashboardViewProps {
  metrics: DashboardMetricsCGD;
  allMetrics: Record<'filial' | 'matriz', DashboardMetricsCGD>;
  activeUnidade: 'filial' | 'matriz';
  onChangeUnidade: (unidade: 'filial' | 'matriz') => void;
  currentUser: UserProfile;
  onSyncNow: () => void;
  isSyncing: boolean;
  onTriggerAutoOcorrencia?: () => void;
}

export const CgdOfficialDashboardView: React.FC<CgdOfficialDashboardViewProps> = ({
  metrics,
  allMetrics,
  activeUnidade,
  onChangeUnidade,
  currentUser,
  onSyncNow,
  isSyncing,
  onTriggerAutoOcorrencia,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('Agosto 2026');

  // Chart data normalization
  const maxChartValue = activeUnidade === 'matriz' ? 250 : 25;
  const chartPoints = metrics.evolucaoMatriculas;

  // SVG coordinate calculations for the line chart
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 40;
  const paddingY = 20;

  const getCoordinates = (index: number, value: number) => {
    const stepX = (svgWidth - 2 * paddingX) / (chartPoints.length - 1);
    const x = paddingX + index * stepX;
    const y =
      svgHeight -
      paddingY -
      (value / maxChartValue) * (svgHeight - 2 * paddingY);
    return { x, y };
  };

  const pointsString = chartPoints
    .map((pt, idx) => {
      const { x, y } = getCoordinates(idx, pt.quantidade);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
            <span>Início</span>
            <span>•</span>
            <span>Dashboards</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">Visão Geral (app.cgd.com.br/dashboard)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Espelhamento Oficial CGD Gestão — {metrics.nomeUnidade}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Unit Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => onChangeUnidade('matriz')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeUnidade === 'matriz'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-blue-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Matriz (949 Contratos)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeUnidade('filial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeUnidade === 'filial'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-blue-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Filial (97 Contratos)</span>
            </button>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={onSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Reconciliando CGD...' : 'Reconciliar Dados CGD'}</span>
          </button>

          {/* Direct link */}
          <a
            href="https://app.cgd.com.br/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
          >
            <span>Abrir CGD Web</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Regra de Ocorrência Banner: 1ª Automática e Próximas com os Instrutores */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4 rounded-xl border border-blue-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-blue-200 shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white">
                Fluxo Oficial de Ocorrências CGD ({activeUnidade.toUpperCase()})
              </h4>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                1ª Ocorrência: Automática pelo Sistema
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                Próximas: Gestão dos Instrutores
              </span>
            </div>
            <p className="text-xs text-blue-100/90 mt-1">
              O motor CGD efetua o primeiro disparo no portal no momento em que a criticidade é identificada. As ocorrências e tratativas subsequentes são registradas diretamente pelos docentes com preenchimento assistido e emissão de protocolo.
            </p>
          </div>
        </div>

        {onTriggerAutoOcorrencia && (
          <button
            type="button"
            onClick={onTriggerAutoOcorrencia}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Disparar 1ª Ocorrência de Teste no CGD</span>
          </button>
        )}
      </div>

      {/* Top 6 Blue Metric Cards (Exact replica of CGD Gestão Dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Contratos totais */}
        <div className="bg-[#1e88e5] text-white p-4 rounded-lg shadow-xs flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex justify-end">
            <span className="text-3xl font-extrabold tracking-tight">
              {metrics.contratosTotais}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Contratos totais</span>
            <Users className="w-5 h-5 opacity-40" />
          </div>
        </div>

        {/* Card 2: Contratos EAD */}
        <div className="bg-[#1e88e5] text-white p-4 rounded-lg shadow-xs flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex justify-end">
            <span className="text-3xl font-extrabold tracking-tight">
              {metrics.contratosEAD}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Contratos EAD</span>
            <GraduationCap className="w-5 h-5 opacity-40" />
          </div>
        </div>

        {/* Card 3: Contratos presenciais */}
        <div className="bg-[#1e88e5] text-white p-4 rounded-lg shadow-xs flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex justify-end">
            <span className="text-3xl font-extrabold tracking-tight">
              {metrics.contratosPresenciais}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Contratos presenciais</span>
            <Users className="w-5 h-5 opacity-40" />
          </div>
        </div>

        {/* Card 4: Em turmas */}
        <div className="bg-[#1e88e5] text-white p-4 rounded-lg shadow-xs flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex justify-end">
            <span className="text-3xl font-extrabold tracking-tight">
              {metrics.emTurmas}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Em turmas</span>
            <Users className="w-5 h-5 opacity-40" />
          </div>
        </div>

        {/* Card 5: Individuais */}
        <div className="bg-[#1e88e5] text-white p-4 rounded-lg shadow-xs flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex justify-end">
            <span className="text-3xl font-extrabold tracking-tight">
              {metrics.individuais}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Individuais</span>
            <Users className="w-5 h-5 opacity-40" />
          </div>
        </div>

        {/* Card 6: Em negociação */}
        <div className="bg-[#1e88e5] text-white p-4 rounded-lg shadow-xs flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex justify-end">
            <span className="text-3xl font-extrabold tracking-tight">
              {metrics.emNegociacao}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Em negociação</span>
            <Clock className="w-5 h-5 opacity-40" />
          </div>
        </div>
      </div>

      {/* Middle Grid: Monthly Summary & Evolução das Matrículas Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Monthly Metrics List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Month Header with Arrows */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-semibold text-slate-700">
                {selectedMonth}
              </div>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* List of 4 Monthly Metrics */}
            <div className="divide-y divide-slate-100">
              <div className="py-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Matrículas</span>
                <span className="text-xl font-bold text-blue-600">
                  {metrics.matriculasMes}
                </span>
              </div>
              <div className="py-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Encerramentos</span>
                <span className="text-xl font-bold text-blue-600">
                  {metrics.encerramentosMes}
                </span>
              </div>
              <div className="py-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">A encerrar</span>
                <span className="text-xl font-bold text-blue-600">
                  {metrics.aEncerrarMes}
                </span>
              </div>
              <div className="py-3.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Negócios perdidos</span>
                <span className="text-xl font-bold text-blue-600">
                  {metrics.negociosPerdidosMes}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Base CGD: {metrics.unidade === 'matriz' ? 'Contrato 836410' : 'Contrato 832852'}</span>
            <span className="text-emerald-700 font-semibold">✓ Dados Sincronizados</span>
          </div>
        </div>

        {/* Right: Evolução das Matrículas Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Evolução das Matrículas
              </h3>
              <button
                type="button"
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors border border-slate-200"
              >
                Detalhes
              </button>
            </div>

            {/* SVG Line Chart */}
            <div className="w-full relative h-48">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
              >
                {/* Horizontal Grid lines */}
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={svgWidth - paddingX}
                  y2={paddingY}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <line
                  x1={paddingX}
                  y1={svgHeight / 2}
                  x2={svgWidth - paddingX}
                  y2={svgHeight / 2}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingY}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />

                {/* Y Axis Labels */}
                <text
                  x={paddingX - 10}
                  y={paddingY + 4}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {maxChartValue}
                </text>
                <text
                  x={paddingX - 10}
                  y={svgHeight / 2 + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {Math.round(maxChartValue / 2)}
                </text>
                <text
                  x={paddingX - 10}
                  y={svgHeight - paddingY + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  0
                </text>

                {/* The Trend Line */}
                <polyline
                  fill="none"
                  stroke="#90caf9"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsString}
                />

                {/* Data Points and X labels */}
                {chartPoints.map((pt, idx) => {
                  const { x, y } = getCoordinates(idx, pt.quantidade);
                  return (
                    <g key={pt.mes}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        className="fill-blue-500 stroke-white stroke-2"
                      />
                      <text
                        x={x}
                        y={svgHeight - 4}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-500 font-semibold"
                      >
                        {pt.mes}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Última sincronização: <strong>{metrics.ultimoUpdate}</strong></span>
            <span className="font-mono text-blue-600 font-bold">
              Total Mês Atual ({selectedMonth.split(' ')[0]}): {metrics.matriculasMes} matrículas
            </span>
          </div>
        </div>
      </div>

      {/* Bottom 4 Indicators / Alerts Cards (Exact replica of CGD Gestão Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Indicator 1: Passaram do prazo */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div
              className={`text-3xl font-extrabold ${
                metrics.passaramDoPrazo > 0 ? 'text-red-500' : 'text-slate-700'
              }`}
            >
              {metrics.passaramDoPrazo}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Passaram do prazo
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Indicator 2: Ativos e sem parcelas */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div
              className={`text-3xl font-extrabold ${
                metrics.ativosSemParcelas > 0 ? 'text-red-500' : 'text-slate-700'
              }`}
            >
              {metrics.ativosSemParcelas}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Ativos e sem parcelas
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Indicator 3: Sem turmas E sem cursos */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div
              className={`text-3xl font-extrabold ${
                metrics.semTurmasESemCursos > 0 ? 'text-red-500' : 'text-slate-700'
              }`}
            >
              {metrics.semTurmasESemCursos}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Sem turmas E sem cursos
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Indicator 4: Apenas em turmas arquivadas */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div
              className={`text-3xl font-extrabold ${
                metrics.apenasEmTurmasArquivadas > 0 ? 'text-red-500' : 'text-slate-700'
              }`}
            >
              {metrics.apenasEmTurmasArquivadas}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Apenas em turmas arquivadas
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
