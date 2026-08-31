import React, { useState } from 'react';
import { OcorrenciaCGD, AlunoMonitorado, UserProfile, TipoTratativa, StatusTratativa } from '../types';
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Lock,
  User,
  Shield,
  Search,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';

interface OcorrenciasPanelProps {
  ocorrencias: OcorrenciaCGD[];
  alunos: AlunoMonitorado[];
  currentUser: UserProfile;
  onAddOcorrencia: (nova: Omit<OcorrenciaCGD, 'id' | 'data' | 'sincronizadoCGD'>) => void;
  onQuickAddPureTextOcorrencia?: (alunoId: string, textoPuro: string) => void;
  onEditAndSyncOcorrencia?: (id: string, novoTexto: string) => void;
  onSyncOcorrencia: (id: string) => void;
  onSyncAllOcorrencias: () => void;
  selectedAlunoPreload?: AlunoMonitorado | null;
  onClearPreload?: () => void;
}

export const OcorrenciasPanel: React.FC<OcorrenciasPanelProps> = ({
  ocorrencias,
  alunos,
  currentUser,
  onAddOcorrencia,
  onQuickAddPureTextOcorrencia,
  onEditAndSyncOcorrencia,
  onSyncOcorrencia,
  onSyncAllOcorrencias,
  selectedAlunoPreload,
  onClearPreload,
}) => {
  const [filterOrigem, setFilterOrigem] = useState<'todos' | 'sistema_automatico' | 'instrutor'>('todos');
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>(
    selectedAlunoPreload?.id || (alunos[0]?.id ?? '')
  );
  const [entryMode, setEntryMode] = useState<'texto_puro' | 'detalhado'>('texto_puro');
  const [pureText, setPureText] = useState<string>('');
  const [tipoOcorrencia, setTipoOcorrencia] = useState<OcorrenciaCGD['tipo']>('pedagogica');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tratativa, setTratativa] = useState<TipoTratativa>('atividade_pratica');
  const [statusTratativa, setStatusTratativa] = useState<StatusTratativa>('em_andamento');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Inline editing state for existing occurrences
  const [editingOcorrId, setEditingOcorrId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Selected student details
  const currentAluno = alunos.find((a) => a.id === selectedAlunoId) || alunos[0];

  // Count existing occurrences for current student to set sequence
  const studentOcorrCount = currentAluno ? ocorrencias.filter((o) => o.alunoId === currentAluno.id).length : 0;
  const nextSeq = studentOcorrCount + 1;

  const handleCreatePureText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pureText.trim() || !currentAluno) return;

    setIsSubmitting(true);
    setTimeout(() => {
      if (onQuickAddPureTextOcorrencia) {
        onQuickAddPureTextOcorrencia(currentAluno.id, pureText.trim());
      } else {
        onAddOcorrencia({
          alunoId: currentAluno.id,
          alunoNome: currentAluno.nome,
          contrato: currentAluno.contrato,
          curso: currentAluno.curso,
          turmaNome: currentAluno.turmaNome,
          professorId: currentUser.id,
          professorNome: currentUser.nome,
          tipo: 'pedagogica',
          titulo: pureText.trim().length > 60 ? pureText.trim().substring(0, 57) + '...' : pureText.trim(),
          descricao: pureText.trim(),
          tratativaAplicada: 'normal',
          statusTratativa: 'em_andamento',
          origemOcorrencia: 'instrutor',
          sequencialOcorrencia: nextSeq,
        });
      }

      setPureText('');
      setIsSubmitting(false);
      if (onClearPreload) onClearPreload();
    }, 400);
  };

  const handleCreateDetailed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim() || !currentAluno) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onAddOcorrencia({
        alunoId: currentAluno.id,
        alunoNome: currentAluno.nome,
        contrato: currentAluno.contrato,
        curso: currentAluno.curso,
        turmaNome: currentAluno.turmaNome,
        professorId: currentUser.id,
        professorNome: currentUser.nome,
        tipo: tipoOcorrencia,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tratativaAplicada: tratativa,
        statusTratativa: statusTratativa,
        origemOcorrencia: 'instrutor',
        sequencialOcorrencia: nextSeq,
      });

      setTitulo('');
      setDescricao('');
      setIsSubmitting(false);
      if (onClearPreload) onClearPreload();
    }, 400);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    setIsSavingEdit(true);
    setTimeout(() => {
      if (onEditAndSyncOcorrencia) {
        onEditAndSyncOcorrencia(id, editingText);
      }
      setIsSavingEdit(false);
      setEditingOcorrId(null);
      setEditingText('');
    }, 400);
  };

  const filteredOcorrencias = ocorrencias.filter((o) => {
    const matchSearch =
      o.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.alunoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.professorNome.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (filterOrigem === 'sistema_automatico') {
      return o.origemOcorrencia === 'sistema_automatico' || o.sequencialOcorrencia === 1 || o.titulo.includes('[1ª Ocorrência');
    }
    if (filterOrigem === 'instrutor') {
      return o.origemOcorrencia === 'instrutor' || (o.sequencialOcorrencia && o.sequencialOcorrencia > 1) || (!o.titulo.includes('[1ª Ocorrência') && o.origemOcorrencia !== 'sistema_automatico');
    }
    return true;
  });

  const getTratativaBadge = (trat: TipoTratativa) => {
    switch (trat) {
      case 'aulao':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">Aulão</span>;
      case 'atividade_pratica':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-bold text-[10px]">Atividade Prática</span>;
      case 'acompanhamento':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">Acompanhamento</span>;
      case 'normal':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Normal</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700" />
            <span>Central de Ocorrências & Tratativas CGD</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro com sincronização direta ao sistema CGD e aplicação das regras de segurança RLS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSyncAllOcorrencias}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar Todas com o CGD</span>
          </button>
        </div>
      </div>

      {/* RLS Security Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Regra RLS do CGD Ativa:</strong> Você está conectado como <strong>{currentUser.nome}</strong> ({currentUser.role}). Você pode consultar todas as ocorrências da unidade, mas a edição é restrita apenas às ocorrências criadas por você.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to Create/Sync Occurrence */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Lançar Ocorrência CGD
              </h3>
            </div>

            {/* Mode Switch */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setEntryMode('texto_puro')}
                className={`px-2 py-1 rounded-md transition-all ${
                  entryMode === 'texto_puro'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Texto Puro
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('detalhado')}
                className={`px-2 py-1 rounded-md transition-all ${
                  entryMode === 'detalhado'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Detalhado
              </button>
            </div>
          </div>

          {/* Student Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selecionar Aluno Monitorado *
            </label>
            <select
              value={selectedAlunoId}
              onChange={(e) => setSelectedAlunoId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-emerald-600 focus:bg-white"
              required
            >
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} ({a.contrato} - {a.curso})
                </option>
              ))}
            </select>
          </div>

          {/* Readonly info of selected student */}
          {currentAluno && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Turma:</span>
                <span className="font-semibold text-slate-800">{currentAluno.turmaNome}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Criticidade Atual:</span>
                <span className="font-bold uppercase text-red-600">
                  {currentAluno.criticidade} ({currentAluno.diasEmCurso}d)
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Faltas Efetivas (com reposições):</span>
                <span className="font-bold text-slate-800">
                  {Math.max(0, currentAluno.faltasMesAtual - currentAluno.reposicoesRealizadas)} falta(s)
                </span>
              </div>
            </div>
          )}

          {/* Mode 1: Pure Text (Instructor Focused) */}
          {entryMode === 'texto_puro' && (
            <form onSubmit={handleCreatePureText} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Texto Puro da Ocorrência (Instrutor) *
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">1 clique para sincronizar</span>
                </div>
                <textarea
                  value={pureText}
                  onChange={(e) => setPureText(e.target.value)}
                  rows={4}
                  placeholder="Digite aqui o texto puro da ocorrência que será sincronizado no CGD..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white resize-none"
                  required
                />
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase w-full">Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setPureText('Teste')}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded text-[11px] transition-colors"
                >
                  ⚡ Inserir "Teste"
                </button>
                <button
                  type="button"
                  onClick={() => setPureText(`Aluno compareceu para reposição de conteúdo prático em ${currentAluno?.curso || 'disciplina'}. Faltas regularizadas.`)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                >
                  Reposição Feita
                </button>
                <button
                  type="button"
                  onClick={() => setPureText(`Orientação pedagógica individual: Ritmo de avanço e exercícios práticos revisados com sucesso.`)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                >
                  Orientação de Ritmo
                </button>
              </div>

              {/* CGD Automation Telemetry Info */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Automação Direta CGD:</span>
                </div>
                <p className="text-[10px] text-emerald-800 font-mono">
                  txtDescricaoOcorrencia ➔ btnSalvarOcorrencia ➔ HTTP 200 OK (Protocolo Oficial)
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !pureText.trim()}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando para o CGD...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar para o CGD</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mode 2: Detailed Mode */}
          {entryMode === 'detalhado' && (
            <form onSubmit={handleCreateDetailed} className="space-y-3 text-xs">
              {/* Tipo de Ocorrência */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de Ocorrência *
                </label>
                <select
                  value={tipoOcorrencia}
                  onChange={(e) => setTipoOcorrencia(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white"
                >
                  <option value="pedagogica">📘 Ocorrência Pedagógica</option>
                  <option value="aulao_recuperacao">🔴 Aulão de Recuperação</option>
                  <option value="atividade_pratica">🟠 Atividade Prática</option>
                  <option value="falta_excessiva">🚨 Alerta de Faltas Excessivas</option>
                  <option value="disciplinar">⚠️ Ocorrência Disciplinar</option>
                  <option value="elogio">⭐ Elogio / Destaque</option>
                </select>
              </div>

              {/* Tratativa Vinculada */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tratativa
                  </label>
                  <select
                    value={tratativa}
                    onChange={(e) => setTratativa(e.target.value as TipoTratativa)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="aulao">Aulão</option>
                    <option value="atividade_pratica">Atividade Prática</option>
                    <option value="acompanhamento">Acompanhamento</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusTratativa}
                    onChange={(e) => setStatusTratativa(e.target.value as StatusTratativa)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título do Registro *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Convocação para Aulão de Reposição..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrição Detalhada para o CGD *
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descreva a tratativa aplicada, contato com responsável ou reposição..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enviando para o CGD...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar para o CGD</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: List of Occurrences */}
        <div className="lg:col-span-2 space-y-3">
          {/* Origin Tabs & Search Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            {/* Origin Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterOrigem('todos')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterOrigem === 'todos'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({ocorrencias.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOrigem('sistema_automatico')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                    filterOrigem === 'sistema_automatico'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>1ª Automática (Sistema)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOrigem('instrutor')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                    filterOrigem === 'instrutor'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Próximas (Instrutores)</span>
                </button>
              </div>

              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {filteredOcorrencias.length} exibidas
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar ocorrência por aluno, contrato, professor ou texto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredOcorrencias.map((ocorr, idx) => {
              const canEdit =
                currentUser.role === 'admin' ||
                currentUser.role === 'coordenador' ||
                ocorr.professorId === currentUser.id;

              const isEditingThis = editingOcorrId === ocorr.id;
              const isAuto =
                ocorr.origemOcorrencia === 'sistema_automatico' ||
                ocorr.sequencialOcorrencia === 1 ||
                ocorr.titulo.includes('[1ª Ocorrência');

              return (
                <div
                  key={`${ocorr.id || 'ocorr'}-${idx}`}
                  className={`bg-white rounded-xl p-4 border shadow-xs transition-all space-y-3 ${
                    isAuto ? 'border-amber-200/80 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top line: Student, Date & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                        {ocorr.contrato}
                      </span>
                      <h4 className="text-xs font-black text-slate-900">{ocorr.alunoNome}</h4>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        • {ocorr.curso}
                      </span>

                      {/* Origin Badge */}
                      {isAuto ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          <Zap className="w-2.5 h-2.5 text-amber-600" />
                          1ª Ocorrência Automática (CGD)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <User className="w-2.5 h-2.5 text-emerald-600" />
                          {ocorr.sequencialOcorrencia ? `${ocorr.sequencialOcorrencia}ª Ocorrência` : 'Ocorrência'} • Instrutor
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {getTratativaBadge(ocorr.tratativaAplicada)}
                      <span className="text-slate-400 text-[11px]">{ocorr.data}</span>
                    </div>
                  </div>

                  {/* Body Content / Inline Editable Mode */}
                  {isEditingThis ? (
                    <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-300 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Editar Texto Puro da Ocorrência:
                      </label>
                      <textarea
                        rows={3}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-hidden focus:border-emerald-600"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOcorrId(null);
                            setEditingText('');
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit || !editingText.trim()}
                          onClick={() => handleSaveEdit(ocorr.id)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow-xs"
                        >
                          {isSavingEdit ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Sincronizando...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Salvar e Sincronizar com CGD</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{ocorr.titulo}</h5>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded-md border border-slate-100 font-mono">
                        {ocorr.descricao}
                      </p>
                    </div>
                  )}

                  {/* Footer: Protocol, Professor & RLS Indicator */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold text-slate-700">
                        Registrado por: {ocorr.professorNome}
                      </span>
                      {canEdit ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                            ✓ Editável
                          </span>
                          {!isEditingThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOcorrId(ocorr.id);
                                setEditingText(ocorr.descricao);
                              }}
                              className="text-emerald-700 hover:text-emerald-900 underline text-[11px] font-semibold"
                            >
                              Editar Texto
                            </button>
                          )}
                        </div>
                      ) : (
                        <span
                          className="text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1"
                          title="RLS Restrito: Outros professores não podem modificar esta ocorrência"
                        >
                          <Lock className="w-3 h-3 text-slate-400" /> Somente Leitura (RLS)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {ocorr.sincronizadoCGD ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> {ocorr.protocoloCGD}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSyncOcorrencia(ocorr.id)}
                          className="inline-flex items-center gap-1 text-amber-700 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Pendente de Sync CGD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
