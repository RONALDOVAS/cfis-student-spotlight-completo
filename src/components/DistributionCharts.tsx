import React from 'react';
import { AlunoMonitorado, RotinaScrapingCGD } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock, ShieldAlert, CheckCircle, RefreshCw, Calendar, ArrowRight } from 'lucide-react';

interface DistributionChartsProps {
  alunos: AlunoMonitorado[];
  rotinas: RotinaScrapingCGD[];
  onOpenRotinasTab: () => void;
}

export const DistributionCharts: React.FC<DistributionChartsProps> = ({
  alunos,
  rotinas,
  onOpenRotinasTab,
}) => {
  const total = alunos.length || 1;

  const countCritico = alunos.filter((a) => a.criticidade === 'critico').length;
  const countModerado = alunos.filter((a) => a.criticidade === 'moderado').length;
  const countAtencao = alunos.filter((a) => a.criticidade === 'atencao').length;
  const countNormal = alunos.filter((a) => a.criticidade === 'normal').length;

  const chartData = [
    { name: 'Crítico', value: countCritico, color: '#DC2626' },
    { name: 'Moderado', value: countModerado, color: '#EA580C' },
    { name: 'Atenção', value: countAtencao, color: '#EAB308' },
    { name: 'Normal', value: countNormal, color: '#15803D' },
  ];

  // Status das Tratativas
  const tratPendente = alunos.filter((a) => a.statusTratativa === 'pendente').length;
  const tratEmAndamento = alunos.filter((a) => a.statusTratativa === 'em_andamento').length;
  const tratConcluido = alunos.filter((a) => a.statusTratativa === 'concluido').length;

  const pctPendente = Math.round((tratPendente / total) * 100);
  const pctEmAndamento = Math.round((tratEmAndamento / total) * 100);
  const pctConcluido = Math.round((tratConcluido / total) * 100);

  // Alunos com bloqueio ativo ou pendente por faltas > 3
  const bloqueadosFaltas = alunos.filter(
    (a) => a.statusMatricula === 'bloqueado_faltas' || a.faltasMesAtual > 3
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Donut Chart: Distribuição por Criticidade */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-800">Distribuição por Criticidade</h3>
            <span className="text-[11px] font-medium text-slate-500">Visão Geral</span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Proporção de alunos por faixa de tempo em curso e risco
          </p>

          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} alunos`, name]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    borderColor: '#E2E8F0',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Total Indicator in Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 leading-none">{total}</span>
              <span className="text-[11px] font-medium text-slate-500">Total</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name}</span>
              </div>
              <span className="font-bold text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Status das Tratativas Pedagógicas */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-800">Status das Tratativas</h3>
            <span className="text-[11px] font-medium text-slate-500">Andamento Pedagógico</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Execução de aulões, atividades práticas e contatos
          </p>

          <div className="space-y-4">
            {/* Pendente */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Pendente
                </span>
                <span className="text-slate-800">
                  {tratPendente} • <span className="text-slate-500">{pctPendente}%</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-slate-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pctPendente}%` }}
                />
              </div>
            </div>

            {/* Em Andamento */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Em Andamento
                </span>
                <span className="text-slate-800">
                  {tratEmAndamento} • <span className="text-slate-500">{pctEmAndamento}%</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pctEmAndamento}%` }}
                />
              </div>
            </div>

            {/* Concluído */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Concluído
                </span>
                <span className="text-slate-800">
                  {tratConcluido} • <span className="text-slate-500">{pctConcluido}%</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pctConcluido}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warning badge if any student triggered the > 3 absences block rule */}
        <div className="mt-4 pt-3 border-t border-slate-100 bg-red-50/60 p-2.5 rounded-lg border border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <div className="text-[11px] font-bold text-red-900">
                Regra &gt; 3 Faltas/Mês: {bloqueadosFaltas} bloqueio(s)
              </div>
              <div className="text-[10px] text-red-700">
                Matrícula retida preventivamente no CGD
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-red-700 bg-white px-2 py-0.5 rounded border border-red-200">
            {bloqueadosFaltas}
          </span>
        </div>
      </div>

      {/* 3. Agendamentos & Sincronização CGD */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-700" />
              Agendamentos & Sincronização
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              CGD Ativo
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Extração automática do banco de dados CGD (Quintas e Sábados)
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
              <div className="flex items-center justify-between font-semibold text-emerald-900 mb-0.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  Próxima Coleta Programada
                </span>
                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                  20/08/2026 21:00
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Rotina automática autenticada na sessão da filial sem expor credenciais.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-800 mb-1">
                Módulos Coletados pelo Scraper:
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['Cursos', 'Ocorrências', 'Frequência', 'Cadastro', 'Turmas', 'Disciplinas', 'Horários', 'Histórico & Notas'].map(
                  (mod) => (
                    <span
                      key={mod}
                      className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium"
                    >
                      {mod}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenRotinasTab}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>Ver Todas as Rotinas & Logs de Extração</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
