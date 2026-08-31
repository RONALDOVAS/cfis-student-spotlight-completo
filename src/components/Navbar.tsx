import React from 'react';
import { LogoCfis } from './LogoCfis';
import { UserProfile, CredencialCGD } from '../types';
import {
  ShieldCheck,
  RefreshCw,
  Building2,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  availableUsers: UserProfile[];
  activeUnidade: 'filial' | 'matriz';
  onChangeUnidade: (unidade: 'filial' | 'matriz') => void;
  credenciais: CredencialCGD[];
  activeTab: string;
  onChangeTab: (tab: string) => void;
  isSyncing: boolean;
  onSyncNow: () => void;
  lastSyncTime: string;
  autoSyncOnLogin?: boolean;
  autoSyncScheduled?: boolean;
  secondsUntilNextSync?: number;
  filialCount?: number;
  matrizCount?: number;
  isSupabaseSynced?: boolean;
  onOpenSupabaseSyncModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectUser,
  availableUsers,
  activeUnidade,
  onChangeUnidade,
  credenciais,
  activeTab,
  onChangeTab,
  isSyncing,
  onSyncNow,
  lastSyncTime,
  autoSyncOnLogin = true,
  autoSyncScheduled = true,
  secondsUntilNextSync = 300,
  filialCount,
  matrizCount,
  isSupabaseSynced = true,
  onOpenSupabaseSyncModal,
}) => {
  const currentCred = credenciais.find((c) => c.unidade === activeUnidade);

  // Format seconds to mm:ss
  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'criticidade', label: 'Níveis de Criticidade', icon: '📊' },
    { id: 'disciplinas', label: 'Disciplinas & Contratos', icon: '⏱️' },
    { id: 'ocorrencias', label: 'Ocorrências CGD', icon: '📝' },
    { id: 'cgd_oficial', label: 'Painel Oficial CGD', icon: '🌐' },
    { id: 'turmas', label: 'Turmas & Horários', icon: '👥' },
    { id: 'automacao', label: 'Rotinas & Scraping CGD', icon: '🤖' },
    { id: 'usuarios', label: 'Equipe & Contas (Sem Google)', icon: '🔑' },
    { id: 'seguranca', label: 'Segurança & RLS Supabase', icon: '🛡️' },
  ];

  return (
    <header className="bg-white border-b border-emerald-100 shadow-xs sticky top-0 z-40">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-4">
            <LogoCfis className="h-10" />
            <div className="hidden lg:block border-l border-emerald-200 pl-4">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                Portal de Monitoramento & CGD
              </span>
              <span className="text-xs text-slate-500">
                Gestão Acadêmica e Níveis de Criticidade
              </span>
            </div>
          </div>

          {/* Center Actions: Branch selector & Live CGD Status */}
          <div className="flex items-center gap-3">
            {/* Branch Selector with Dynamic Counts from Supabase/Real Data */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                id="btn-switch-unidade-filial"
                onClick={() => onChangeUnidade('filial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeUnidade === 'filial'
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-emerald-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Filial ({typeof filialCount === 'number' ? filialCount : 0} Alunos)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </button>
              <button
                type="button"
                id="btn-switch-unidade-matriz"
                onClick={() => onChangeUnidade('matriz')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeUnidade === 'matriz'
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-emerald-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Matriz ({typeof matrizCount === 'number' ? matrizCount : 0} Alunos)</span>
              </button>
            </div>


            {/* CGD Quick Sync Button & Scheduled Engine Status */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium transition-colors shadow-xs"
                title="Sincronização bidirecional em background com o portal CGD"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline font-bold">
                  {isSyncing ? 'Sincronizando CGD...' : 'Sincronizar CGD'}
                </span>
                <span className="text-[10px] text-emerald-600 hidden md:inline font-mono">
                  ({lastSyncTime.split(' ')[1] || 'Recente'})
                </span>
              </button>

              {/* Live Scheduled / Login Sync Indicator */}
              {autoSyncScheduled && (
                <div
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/70 border border-emerald-200 text-emerald-900 rounded-lg text-[10px] font-semibold"
                  title="Sincronização automática pós-login e agendada a cada 5 minutos"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  <span>Auto-Sync: {formatCountdown(secondsUntilNextSync)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: User Profile & Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-900/5 px-3 py-1.5 rounded-lg border border-emerald-900/10">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {currentUser.nome.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  {currentUser.nome}
                  {currentUser.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 rounded font-semibold">Admin</span>
                  )}
                  {currentUser.role === 'coordenador' && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-800 rounded font-semibold">Coordenação</span>
                  )}
                  {currentUser.role === 'professor' && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 rounded font-semibold">Professor</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  RLS Ativo • {currentUser.email}
                </div>
              </div>

              {/* Role Dropdown / Switcher */}
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const selected = availableUsers.find((u) => u.id === e.target.value);
                  if (selected) onSelectUser(selected);
                }}
                className="text-xs bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-700 outline-hidden focus:border-emerald-500"
                title="Trocar perfil de usuário para testar permissões RLS"
              >
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
