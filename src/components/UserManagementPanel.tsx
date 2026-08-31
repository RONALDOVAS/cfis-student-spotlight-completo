import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  UserPlus,
  Users,
  KeyRound,
  Shield,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  Search,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Check,
  Copy,
} from 'lucide-react';

interface UserManagementPanelProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onAddUser: (newUser: Omit<UserProfile, 'id' | 'dataCadastro'>, initialPassword?: string) => void;
  onUpdateUserStatus: (userId: string, status: 'ativo' | 'inativo') => void;
  onResetPassword: (userId: string, newPassword?: string) => void;
  onSelectActiveUser: (user: UserProfile) => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  currentUser,
  users,
  onAddUser,
  onUpdateUserStatus,
  onResetPassword,
  onSelectActiveUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('todos');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for new user
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('professor');
  const [cargoDescricao, setCargoDescricao] = useState('Docente de Informática');
  const [unidade, setUnidade] = useState<'filial' | 'matriz'>('filial');
  const [senha, setSenha] = useState('Cfis@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [disciplinas, setDisciplinas] = useState('Windows 10, Office 365, Hardware');

  // Reset Password Modal
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [copiedAccountInfo, setCopiedAccountInfo] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha.trim()) return;

    const discList = disciplinas
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    onAddUser(
      {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        role,
        cargoDescricao: cargoDescricao.trim(),
        unidade,
        status: 'ativo',
        tipoAutenticacao: 'email_senha',
        disciplinasMinistradas: discList,
        permissoes:
          role === 'admin'
            ? ['Acesso Total', 'Cofre CGD', 'Gerenciamento de Equipe', 'Políticas RLS']
            : role === 'coordenador'
            ? ['Gestão de Alunos', 'Auditoria de Ocorrências', 'Desbloqueio de Matrículas', 'Criação de Turmas']
            : ['Lançar Ocorrências', 'Consultar Turmas', 'Visualizar Alunos'],
      },
      senha
    );

    setNome('');
    setEmail('');
    setSenha('Cfis@2026!');
    setShowCreateModal(false);
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    const finalPassword = newPasswordInput.trim() || `Cfis@${Math.floor(1000 + Math.random() * 9000)}`;

    onResetPassword(selectedUserForReset.id, finalPassword);
    setResetSuccessMessage(
      `Nova senha definida com sucesso para ${selectedUserForReset.nome}: "${finalPassword}"`
    );

    setTimeout(() => {
      setResetSuccessMessage(null);
      setSelectedUserForReset(null);
      setNewPasswordInput('');
    }, 2500);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let res = 'Cfis@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSenha(res);
  };

  const handleCopyAccessInstructions = (user: UserProfile) => {
    const text = `=== CREDENCIAIS DE ACESSO CFIS - PORTAL CGD ===\nNome: ${user.nome}\nCargo: ${user.role.toUpperCase()} (${user.cargoDescricao || ''})\nE-mail de Acesso: ${user.email}\nUnidade: ${user.unidade.toUpperCase()}\nTipo de Login: E-mail e Senha Próprios (Sem vínculo com Google)\nLink do Portal: https://cgd-monitor.cfis.edu.br\n================================================`;
    navigator.clipboard.writeText(text);
    setCopiedAccountInfo(user.id);
    setTimeout(() => setCopiedAccountInfo(null), 2000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cargoDescricao && u.cargoDescricao.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;
    const matchesUnidade = unidadeFilter === 'todos' || u.unidade === unidadeFilter;

    return matchesSearch && matchesRole && matchesUnidade;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>Gestão de Usuários & Contas da Equipe (Sem Google)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie e gerencie contas individuais de professores, coordenação e diretoria com e-mail e senha independentes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Security & Independence Banner */}
      <div className="bg-emerald-900 text-white p-5 rounded-2xl border border-emerald-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Autenticação Própria CFIS (E-mail & Senha Criptografada)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">
                  Supabase Auth Nativo
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-3xl">
                Não é necessário possuir conta Google ou vincular contas pessoais. Cada professor, coordenador e diretor possui suas credenciais institucionais com hash seguro (Bcrypt) e isolamento automático por <strong>Row Level Security (RLS)</strong>.
              </p>
            </div>
          </div>

          <div className="bg-emerald-800/60 p-3 rounded-xl border border-emerald-700/60 text-[11px] text-emerald-100 space-y-1 shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contas Ativas: {users.filter((u) => u.status === 'ativo').length} de {users.length}</span>
            </div>
            <div className="text-emerald-200">
              Perfil Ativo: <strong>{currentUser.nome}</strong> ({currentUser.role})
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail institucional ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Cargo Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-hidden text-slate-700 font-semibold"
          >
            <option value="todos">Todos os Cargos</option>
            <option value="professor">Professores</option>
            <option value="coordenador">Coordenação</option>
            <option value="admin">Administração</option>
          </select>

          {/* Unidade Filter */}
          <select
            value={unidadeFilter}
            onChange={(e) => setUnidadeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-hidden text-slate-700 font-semibold"
          >
            <option value="todos">Todas as Unidades</option>
            <option value="filial">Filial Sul (59 Alunos)</option>
            <option value="matriz">Matriz Central (240 Alunos)</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const isCurrentUser = currentUser.id === user.id;
          const isCopied = copiedAccountInfo === user.id;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                isCurrentUser
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Top: Avatar, Name, Role Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs ${
                        user.role === 'admin'
                          ? 'bg-amber-600'
                          : user.role === 'coordenador'
                          ? 'bg-blue-600'
                          : 'bg-emerald-700'
                      }`}
                    >
                      {user.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-black text-slate-900 leading-tight">
                          {user.nome}
                        </h3>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{user.cargoDescricao || user.role}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : user.role === 'coordenador'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Account Details Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] space-y-1.5 text-slate-600 mb-3 font-mono">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 font-sans">E-mail:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[170px]" title={user.email}>
                      {user.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 font-sans">Unidade:</span>
                    <span className="font-semibold text-emerald-800 capitalize font-sans">
                      {user.unidade === 'filial' ? 'Filial Sul' : 'Matriz Central'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 font-sans">Autenticação:</span>
                    <span className="text-slate-800 font-sans font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" /> Senha Própria
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500 font-sans">Último Acesso:</span>
                    <span className="text-slate-500 font-sans">{user.ultimoAcesso || 'Recentemente'}</span>
                  </div>
                </div>

                {/* Disciplines tags */}
                {user.disciplinasMinistradas && user.disciplinasMinistradas.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold text-slate-500 mb-1">
                      Disciplinas / Atuação:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.disciplinasMinistradas.map((d, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForReset(user)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    title="Redefinir Senha do Usuário"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAccessInstructions(user)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    title="Copiar Ficha de Acesso para Enviar ao Professor"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateUserStatus(user.id, user.status === 'ativo' ? 'inativo' : 'ativo')}
                    className={`p-1.5 rounded-md transition-colors ${
                      user.status === 'ativo'
                        ? 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                    title={user.status === 'ativo' ? 'Desativar Conta' : 'Ativar Conta'}
                  >
                    {user.status === 'ativo' ? <UserCheck className="w-3.5 h-3.5 text-emerald-700" /> : <UserX className="w-3.5 h-3.5 text-red-600" />}
                  </button>
                </div>

                {!isCurrentUser ? (
                  <button
                    type="button"
                    onClick={() => onSelectActiveUser(user)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-md text-[11px] transition-colors flex items-center gap-1"
                  >
                    <span>Acessar Como</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Sessão Conectada
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <span>Cadastrar Novo Usuário da Equipe</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                Sem Login Google
              </span>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Prof. Marcos André Oliveira"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcos.andre@cfiscursos.com.br"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cargo / Função *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setRole(newRole);
                      if (newRole === 'coordenador') setCargoDescricao('Coordenador(a) Pedagógico(a)');
                      else if (newRole === 'admin') setCargoDescricao('Administrador(a) do Sistema');
                      else setCargoDescricao('Docente de Informática & Cursos');
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="professor">Professor (Docente)</option>
                    <option value="coordenador">Coordenador Pedagógico</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Descrição do Cargo
                  </label>
                  <input
                    type="text"
                    value={cargoDescricao}
                    onChange={(e) => setCargoDescricao(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unidade de Atuação *
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="filial">Filial Sul (59 Alunos)</option>
                    <option value="matriz">Matriz Central (240 Alunos)</option>
                  </select>
                </div>
              </div>

              {/* Password configuration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Senha Inicial de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-emerald-700 hover:underline font-bold"
                  >
                    Gerar Senha Segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full p-2 pr-9 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  O usuário poderá alterar essa senha no primeiro acesso à plataforma.
                </p>
              </div>

              {/* Disciplines */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Disciplinas / Especialidades (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={disciplinas}
                  onChange={(e) => setDisciplinas(e.target.value)}
                  placeholder="Windows 10, Hardware, Excel, Gestão"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors"
                >
                  Criar Conta de Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-700" />
              <span>Redefinir Senha de Acesso</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Usuário: <strong>{selectedUserForReset.nome}</strong> ({selectedUserForReset.email})
            </p>

            {resetSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="text"
                    placeholder="Digite a nova senha ou deixe em branco para gerar aleatória"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForReset(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg"
                  >
                    Confirmar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
