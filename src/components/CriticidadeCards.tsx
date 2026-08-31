import React from 'react';
import { NivelCriticidade, AlunoMonitorado } from '../types';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Database,
  RefreshCw,
  Building2,
  Users,
} from 'lucide-react';

interface CriticidadeCardsProps {
  alunos: AlunoMonitorado[];
  selectedNivel: NivelCriticidade | 'todos';
  onSelectNivel: (nivel: NivelCriticidade | 'todos') => void;
  totalMatriz?: number | null;
  totalFilial?: number | null;
  alunosCriticos?: number | null;
  alunosModerados?: number | null;
  activeUnidade?: 'filial' | 'matriz';
  onChangeUnidade?: (unidade: 'filial' | 'matriz') => void;
  isSupabaseSyncing?: boolean;
  onSyncSupabase?: () => void;
  lastSupabaseSyncTime?: string;
  supabaseStatusMessage?: string;
}

export const CriticidadeCards: React.FC<CriticidadeCardsProps> = ({
  alunos,
  selectedNivel,
  onSelectNivel,
  totalMatriz = null,
  totalFilial = null,
  alunosCriticos = null,
  alunosModerados = null,
  activeUnidade = 'filial',
  onChangeUnidade,
  isSupabaseSyncing = false,
  onSyncSupabase,
  lastSupabaseSyncTime = 'Sincronizado',
  supabaseStatusMessage = 'Conectado à tabela resumo_cgd do Supabase',
}) => {
  // Use dynamic count from loaded students array if students are present, otherwise direct column numbers
  const countCritico = alunos.length > 0
    ? alunos.filter((a) => a.criticidade === 'critico').length
    : (typeof alunosCriticos === 'number' ? alunosCriticos : 0);

  const countModerado = alunos.length > 0
    ? alunos.filter((a) => a.criticidade === 'moderado').length
    : (typeof alunosModerados === 'number' ? alunosModerados : 0);

  const countAtencao = alunos.filter((a) => a.criticidade === 'atencao').length;
  const countNormal = alunos.filter((a) => a.criticidade === 'normal').length;

  const total = (countCritico + countModerado + countAtencao + countNormal) || alunos.length || 0;

  const pctCritico = total > 0 ? Math.round((countCritico / total) * 100) : 0;
  const pctModerado = total > 0 ? Math.round((countModerado / total) * 100) : 0;
  const pctAtencao = total > 0 ? Math.round((countAtencao / total) * 100) : 0;
  const pctNormal = total > 0 ? Math.round((countNormal / total) * 100) : 0;

  const cards = [
    {
      id: 'critico' as NivelCriticidade,
      title: 'Crítico',
      badgeText: 'CRÍTICO',
      count: countCritico,
      percent: pctCritico,
      tratativa: 'Aulão',
      range: 'mais de 90 dias em curso (> 90d)',
      description: 'Convocação imediata para aulão de recuperação de conteúdo.',
      borderColor: 'border-red-500',
      activeBg: 'bg-red-50/70 border-red-500 ring-2 ring-red-400',
      badgeBg: 'bg-red-600 text-white',
      accentColor: 'text-red-600',
      barColor: 'bg-red-600',
      icon: AlertCircle,
      supabaseColumn: 'alunos_criticos',
    },
    {
      id: 'moderado' as NivelCriticidade,
      title: 'Moderado',
      badgeText: 'MODERADO',
      count: countModerado,
      percent: pctModerado,
      tratativa: 'Atividade Prática',
      range: '60 a 89 dias em curso (60-89d)',
      description: 'Aplicação de atividade prática para acelerar o encerramento.',
      borderColor: 'border-orange-500',
      activeBg: 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-400',
      badgeBg: 'bg-orange-600 text-white',
      accentColor: 'text-orange-600',
      barColor: 'bg-orange-500',
      icon: AlertTriangle,
      supabaseColumn: 'alunos_moderados',
    },
    {
      id: 'atencao' as NivelCriticidade,
      title: 'Atenção',
      badgeText: 'ATENÇÃO',
      count: countAtencao,
      percent: pctAtencao,
      tratativa: 'Acompanhamento',
      range: '30 a 59 dias em curso (30-59d)',
      description: 'Acompanhamento pedagógico e contato direto com o responsável.',
      borderColor: 'border-amber-500',
      activeBg: 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-400',
      badgeBg: 'bg-amber-500 text-white',
      accentColor: 'text-amber-600',
      barColor: 'bg-amber-500',
      icon: Clock,
    },
    {
      id: 'normal' as NivelCriticidade,
      title: 'Normal',
      badgeText: 'NORMAL',
      count: countNormal,
      percent: pctNormal,
      tratativa: 'Normal',
      range: 'menos de 30 dias em curso (< 30d)',
      description: 'Fluxo regular do curso sem necessidade de tratativa especial.',
      borderColor: 'border-emerald-600',
      activeBg: 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-400',
      badgeBg: 'bg-emerald-700 text-white',
      accentColor: 'text-emerald-700',
      barColor: 'bg-emerald-600',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Top Header & Supabase Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Níveis de Criticidade & Totais por Unidade</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados alimentados diretamente pelas colunas <code className="font-mono text-emerald-700 font-semibold">total_matriz</code>, <code className="font-mono text-emerald-700 font-semibold">total_filial</code>, <code className="font-mono text-emerald-700 font-semibold">alunos_criticos</code> e <code className="font-mono text-emerald-700 font-semibold">alunos_moderados</code> da tabela <code className="font-mono text-emerald-700 font-semibold">resumo_cgd</code>.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Supabase status badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900">
            <Database className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Supabase:</span>
            <span className="text-emerald-700 font-bold">resumo_cgd</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {onSyncSupabase && (
            <button
              type="button"
              id="btn-sync-supabase-resumo"
              onClick={onSyncSupabase}
              disabled={isSupabaseSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              title="Buscar dados mais recentes da tabela resumo_cgd no Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSupabaseSyncing ? 'animate-spin' : ''}`} />
              <span>{isSupabaseSyncing ? 'Buscando Supabase...' : 'Atualizar do Supabase'}</span>
            </button>
          )}

          {selectedNivel !== 'todos' && (
            <button
              type="button"
              onClick={() => onSelectNivel('todos')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg transition-colors"
            >
              Limpar Filtro
            </button>
          )}
        </div>
      </div>

      {/* Direct Supabase Summary Cards: Total Filial & Total Matriz & Totais de Criticidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Filial Card */}
        <div
          onClick={() => onChangeUnidade && onChangeUnidade('filial')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeUnidade === 'filial'
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Total Alunos Filial</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
              total_filial
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {typeof totalFilial === 'number' ? totalFilial : alunos.filter((a) => a.unidade?.toLowerCase() === 'filial').length}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              {activeUnidade === 'filial' ? '● Unidade Ativa' : 'Clique para alternar'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Unidade Filial - Castanhal</div>
        </div>

        {/* Total Matriz Card */}
        <div
          onClick={() => onChangeUnidade && onChangeUnidade('matriz')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeUnidade === 'matriz'
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Total Alunos Matriz</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
              total_matriz
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {typeof totalMatriz === 'number' ? totalMatriz : alunos.filter((a) => a.unidade?.toLowerCase() === 'matriz').length}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              {activeUnidade === 'matriz' ? '● Unidade Ativa' : 'Clique para alternar'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Unidade Matriz - Central</div>
        </div>

        {/* Total Alunos Críticos (Supabase coluna alunos_criticos) */}
        <div
          onClick={() => onSelectNivel(selectedNivel === 'critico' ? 'todos' : 'critico')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            selectedNivel === 'critico'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-400'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Alunos Críticos</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-red-100 text-red-800 rounded">
              alunos_criticos
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-600">
              {countCritico}
            </span>
            <span className="text-xs font-semibold text-red-700">
              Tratativa: Aulão
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">90+ dias em curso</div>
        </div>

        {/* Total Alunos Moderados (Supabase coluna alunos_moderados) */}
        <div
          onClick={() => onSelectNivel(selectedNivel === 'moderado' ? 'todos' : 'moderado')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            selectedNivel === 'moderado'
              ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-400'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span>Alunos Moderados</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded">
              alunos_moderados
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-orange-600">
              {countModerado}
            </span>
            <span className="text-xs font-semibold text-orange-700">
              Atividade Prática
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">60 a 89 dias em curso</div>
        </div>
      </div>

      {/* 4 Níveis Detalhados de Criticidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const isSelected = selectedNivel === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onSelectNivel(isSelected ? 'todos' : card.id)}
              className={`bg-white rounded-xl p-4 border transition-all cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? card.activeBg
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Top Row: Badge & Large Count */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider ${card.badgeBg}`}
                  >
                    {card.badgeText}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900">
                      {card.count}
                    </span>
                    {card.supabaseColumn && (
                      <span className="text-[9px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                        {card.supabaseColumn}
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle & % of total */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-medium text-slate-700">{card.range}</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                    {card.percent}%
                  </span>
                </div>

                {/* Tratativa Section */}
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 mb-2">
                  <div className="text-[11px] font-bold text-slate-700 mb-0.5">
                    Tratativa: <span className={card.accentColor}>{card.tratativa}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Bottom action indicator */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                <span>{isSelected ? 'Filtro aplicado' : 'Clique para ver apenas este nível'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              </div>

              {/* Visual Bottom Border Accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${card.barColor}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

