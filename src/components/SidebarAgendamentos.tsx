import React from 'react';
import { AlunoMonitorado, RotinaScrapingCGD, UserProfile } from '../types';
import { calculateAcademicStatus } from '../utils/academicCalculations';
import {
  Calendar,
  RefreshCw,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  ExternalLink,
  Lock,
  Sparkles,
  Zap,
  Power,
  Timer,
  Check,
  Eye,
} from 'lucide-react';

interface SidebarAgendamentosProps {
  alunos: AlunoMonitorado[];
  rotinas: RotinaScrapingCGD[];
  currentUser: UserProfile;
  onExecuteRotina: (rotinaId: string) => void;
  onSyncAll: () => void;
  onBlockCriticos: () => void;
  isSyncing: boolean;
  onOpenTestCgdSyncModal?: () => void;
  onOpenAbsenceBlockingModal?: () => void;
  autoSyncOnLogin?: boolean;
  onToggleAutoSyncOnLogin?: (val: boolean) => void;
  autoSyncScheduled?: boolean;
  onToggleAutoSyncScheduled?: (val: boolean) => void;
  syncIntervalMinutes?: number;
  onChangeSyncIntervalMinutes?: (min: number) => void;
  secondsUntilNextSync?: number;
  lastSyncTime?: string;
  lastSyncTrigger?: 'login' | 'agendado' | 'manual' | 'inicial';
}

export const SidebarAgendamentos: React.FC<SidebarAgendamentosProps> = ({
  alunos,
  rotinas,
  currentUser,
  onExecuteRotina,
  onSyncAll,
  onBlockCriticos,
  isSyncing,
  onOpenTestCgdSyncModal,
  onOpenAbsenceBlockingModal,
  autoSyncOnLogin = true,
  onToggleAutoSyncOnLogin,
  autoSyncScheduled = true,
  onToggleAutoSyncScheduled,
  syncIntervalMinutes = 5,
  onChangeSyncIntervalMinutes,
  secondsUntilNextSync = 300,
  lastSyncTime = '19/08/2026 21:02:14',
  lastSyncTrigger = 'inicial',
}) => {
  const total = alunos.length || 1;

  // Status das Tratativas counts
  const countPendente = alunos.filter((a) => a.statusTratativa === 'pendente').length;
  const countEmAndamento = alunos.filter((a) => a.statusTratativa === 'em_andamento').length;
  const countConcluido = alunos.filter((a) => a.statusTratativa === 'concluido').length;

  const pctPendente = Math.round((countPendente / total) * 100);
  const pctEmAndamento = Math.round((countEmAndamento / total) * 100);
  const pctConcluido = Math.round((countConcluido / total) * 100);

  // Alunos com mais de 3 faltas efetivas no mês (após compensação de reposições)
  const alunosCriticosFaltas = alunos.filter((a) => calculateAcademicStatus(a).faltasEfetivasMes > 3);

  // Format seconds to mm:ss
  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const syncPercent = Math.max(
    0,
    Math.min(100, Math.round(((syncIntervalMinutes * 60 - secondsUntilNextSync) / (syncIntervalMinutes * 60)) * 100))
  );

  return (
    <div className="space-y-4">
      {/* 1. Status das Tratativas Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900">Status das Tratativas</h3>
        <p className="text-xs text-slate-500 mb-3">Andamento das ações pedagógicas</p>

        {/* Stacked Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex mb-3.5">
          <div
            className="bg-slate-400 h-full transition-all duration-500"
            style={{ width: `${pctPendente}%` }}
            title={`Pendente: ${countPendente} (${pctPendente}%)`}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${pctEmAndamento}%` }}
            title={`Em Andamento: ${countEmAndamento} (${pctEmAndamento}%)`}
          />
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${pctConcluido}%` }}
            title={`Concluído: ${countConcluido} (${pctConcluido}%)`}
          />
        </div>

        {/* List of Statuses */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span className="font-medium">Pendente</span>
            </div>
            <span className="font-bold text-slate-800">
              {countPendente} · {pctPendente}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-medium">Em Andamento</span>
            </div>
            <span className="font-bold text-slate-800">
              {countEmAndamento} · {pctEmAndamento}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="font-medium">Concluído</span>
            </div>
            <span className="font-bold text-slate-800">
              {countConcluido} · {pctConcluido}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Motor de Auto-Sincronização & Agendamentos CGD */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3.5">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
              <h3 className="text-sm font-bold text-slate-900">Sincronização CGD em Tempo Real</h3>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Ativo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Sincroniza automaticamente ao logar e em horários agendados</p>
        </div>

        {/* Live Auto-Sync Configuration Controls */}
        <div className="p-3 bg-gradient-to-br from-emerald-50/90 to-teal-50/60 rounded-xl border border-emerald-200 space-y-3">
          {/* Toggle: Sincronizar ao Logar */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-700" />
                <span>Auto-Sync ao Logar</span>
              </div>
              <p className="text-[10px] text-emerald-800">
                Dispara extração do CGD sempre que um usuário entra no sistema
              </p>
            </div>
            {onToggleAutoSyncOnLogin ? (
              <button
                type="button"
                onClick={() => onToggleAutoSyncOnLogin(!autoSyncOnLogin)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSyncOnLogin ? 'bg-emerald-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoSyncOnLogin ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            ) : (
              <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded">
                ATIVO
              </span>
            )}
          </div>

          {/* Toggle: Sincronizar Agendado (Cron) */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Auto-Sync Agendado</span>
              </div>
              <p className="text-[10px] text-emerald-800">
                Frequência de atualização periódica em background
              </p>
            </div>
            {onChangeSyncIntervalMinutes && (
              <select
                value={syncIntervalMinutes}
                onChange={(e) => onChangeSyncIntervalMinutes(Number(e.target.value))}
                className="text-[11px] font-bold bg-white border border-emerald-300 text-emerald-900 rounded-lg px-2 py-1 outline-hidden"
              >
                <option value={3}>A cada 3 min</option>
                <option value={5}>A cada 5 min</option>
                <option value={10}>A cada 10 min</option>
                <option value={15}>A cada 15 min</option>
              </select>
            )}
          </div>

          {/* Next Sync Countdown Bar */}
          {autoSyncScheduled && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-emerald-900 font-semibold">
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3 text-emerald-700" />
                  Próxima Sincronização Agendada:
                </span>
                <span className="font-mono font-black text-emerald-950 text-xs">
                  {formatCountdown(secondsUntilNextSync)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-emerald-200/80 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-700 h-full transition-all duration-1000"
                  style={{ width: `${syncPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Trigger Details */}
          <div className="text-[10px] text-emerald-800 flex items-center justify-between pt-1">
            <span>Última Execução: <strong>{lastSyncTime.split(' ')[1] || 'Recente'}</strong></span>
            <span className="capitalize text-emerald-900 font-bold">
              Gatilho: {lastSyncTrigger === 'login' ? 'Pós-Login' : lastSyncTrigger === 'agendado' ? 'Cron Agendado' : 'Manual'}
            </span>
          </div>

          <button
            type="button"
            onClick={onSyncAll}
            disabled={isSyncing}
            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Extraindo do CGD...' : 'Sincronizar Manualmente Agora'}</span>
          </button>
        </div>

        {/* Item 2: Relatório do Professor */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Relatório do Professor</h4>
              <p className="text-[11px] text-slate-500">{currentUser.nome} · semanal</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>app.cgd.com.br/relatorios/alunos-professor</span>
          </p>
          <button
            type="button"
            onClick={() => onExecuteRotina('rot_alunos_prof')}
            disabled={isSyncing}
            className="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Calendar className="w-3 h-3" />
            <span>Agendar / Executar Agora</span>
          </button>
        </div>

        {/* Item 3: Alunos Demorando a Encerrar */}
        <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Alunos Demorando a Encerrar</h4>
              <p className="text-[11px] text-slate-500">Faltas & último acesso · automático</p>
            </div>
          </div>
          <p className="text-[10px] text-amber-700/80 font-mono flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>aluno-demorando-a-encerrar</span>
          </p>
          <button
            type="button"
            onClick={() => onExecuteRotina('rot_demorando_encerrar')}
            disabled={isSyncing}
            className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Agendar / Executar Agora</span>
          </button>
        </div>

        {/* Item 4: Bloqueio por Faltas no Mês */}
        <div className="p-3 bg-red-50/40 rounded-xl border border-red-200/70 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-800 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Bloqueio por Faltas no Mês</h4>
              <p className="text-[11px] text-red-700">Regra: &gt;3 faltas líquidas (com reposições)</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            {alunosCriticosFaltas.length > 0 ? (
              <span className="font-semibold text-red-700">
                {alunosCriticosFaltas.length} aluno(s) com excesso (&gt;3 faltas efetivas)
              </span>
            ) : (
              'Nenhum aluno em violação no momento'
            )}
          </p>
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {onOpenAbsenceBlockingModal && (
              <button
                type="button"
                onClick={onOpenAbsenceBlockingModal}
                className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Eye className="w-3 h-3 text-red-400" />
                <span>Auditar & Revisar Bloqueios</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBlockCriticos}
              className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Bloquear Alunos pelas Regras</span>
            </button>
          </div>
        </div>

        {/* Item 5: Teste de Sincronização CGD (Filial) */}
        {onOpenTestCgdSyncModal && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Validar Sincronização CGD</h4>
                <p className="text-[11px] text-emerald-800">Teste de ocorrência em aluno da Filial</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-600">
              Escolha um aluno da filial para emitir ocorrência e auditar o handshake em tempo real.
            </p>
            <button
              type="button"
              onClick={onOpenTestCgdSyncModal}
              className="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Testar Ocorrência CGD</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
