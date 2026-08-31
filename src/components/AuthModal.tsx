import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, AlertCircle, Loader2, KeyRound, Building2 } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: () => void;
  onContinueAsGuest?: () => void;
  isSupabaseReady: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  isSupabaseReady,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, informe o e-mail e a senha.');
      return;
    }

    if (!supabase) {
      setErrorMsg('Serviço Supabase não está configurado.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        setErrorMsg(error.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      } else if (data.session) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocorreu um erro ao tentar realizar o login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0d1322] border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-slate-100">
        
        {/* Header com Ícone e Título */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">CFIS Student Spotlight</h2>
          <p className="text-xs text-slate-400 mt-1">
            Autenticação & Controle de Acesso Acadêmico (RBAC)
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-500" />
              E-mail Institucional
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: professor@cfis.edu.br"
              className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              Senha de Acesso
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isSupabaseReady}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        {/* Informações sobre RBAC e Unidades */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span>Perfis Ativos:</span>
            <span className="font-mono text-slate-400">Admin • Coordenação • Professor</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Isolamento:</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Building2 className="w-3 h-3 text-amber-500" />
              Filial & Matriz (RLS Ativo)
            </span>
          </div>

          {onContinueAsGuest && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-[11px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer transition-colors"
              >
                Acessar em modo demonstração / visitante
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
