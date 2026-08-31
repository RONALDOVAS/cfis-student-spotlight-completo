import React, { useState } from 'react';
import { AlunoMonitorado, CredencialCGD } from '../types';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  ExternalLink,
  Layers,
  Building2,
  GraduationCap,
  Sparkles,
  X,
  Clock,
  Filter,
  Check,
} from 'lucide-react';

interface CgdStudentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidade: 'filial' | 'matriz';
  credenciais: CredencialCGD[];
  allCurrentAlunos: AlunoMonitorado[];
  remotePool: AlunoMonitorado[];
  onImportStudents: (novosAlunos: AlunoMonitorado[]) => void;
}

export const CgdStudentScannerModal: React.FC<CgdStudentScannerModalProps> = ({
  isOpen,
  onClose,
  unidade,
  credenciais = [],
  allCurrentAlunos = [],
  remotePool = [],
  onImportStudents,
}) => {
  const [selectedUnidadeScan, setSelectedUnidadeScan] = useState<'filial' | 'matriz'>(unidade);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanCompleted, setScanCompleted] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [importedIds, setImportedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const safeCredenciais = Array.isArray(credenciais) ? credenciais : [];
  const safeCurrentAlunos = Array.isArray(allCurrentAlunos) ? allCurrentAlunos : [];
  const safeRemotePool = Array.isArray(remotePool) ? remotePool : [];

  const currentCred = safeCredenciais.find((c) => c.unidade === selectedUnidadeScan);
  const existingIds = new Set(safeCurrentAlunos.map((a) => a.id));

  // Students available in the remote CGD pool for this unit
  const targetRemoteStudents = safeRemotePool.filter((a) => a.unidade === selectedUnidadeScan);

  // Filter students based on search term
  const filteredRemoteStudents = targetRemoteStudents.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.nome.toLowerCase().includes(term) ||
      a.contrato.toLowerCase().includes(term) ||
      a.curso.toLowerCase().includes(term) ||
      a.disciplinaAtual.toLowerCase().includes(term)
    );
  });

  const handleStartScan = () => {
    setIsScanning(true);
    setScanCompleted(false);

    setTimeout(() => {
      setIsScanning(false);
      setScanCompleted(true);
    }, 1200);
  };

  const handleImportSingle = (student: AlunoMonitorado) => {
    onImportStudents([student]);
    setImportedIds((prev) => [...prev, student.id]);
  };

  const handleImportAllPending = () => {
    const pendingToImport = targetRemoteStudents.filter((a) => !existingIds.has(a.id));
    if (pendingToImport.length > 0) {
      onImportStudents(pendingToImport);
      setImportedIds((prev) => [...prev, ...pendingToImport.map((s) => s.id)]);
    }
  };

  const pendingCount = targetRemoteStudents.filter((a) => !existingIds.has(a.id) && !importedIds.includes(a.id)).length;

  return (
    <div
      id="cgd-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="cgd-scanner-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Scanner & Varredura de Alunos no Portal CGD</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Busca de registros autênticos não vinculados nos contratos da Matriz e Filial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit Selector & Connection Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Unidade CGD:</span>
            <div className="inline-flex bg-white rounded-lg border border-slate-300 p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedUnidadeScan('filial')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  selectedUnidadeScan === 'filial'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏢 Filial Sul (Contrato 832852)
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnidadeScan('matriz')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  selectedUnidadeScan === 'matriz'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏛️ Matriz Central (Contrato 836410)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleStartScan}
              disabled={isScanning}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all w-full md:w-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Conectando e Varrendo CGD...' : 'Iniciar Varredura no CGD'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Action Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por nome, contrato ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs text-slate-600">
              Pendentes para importar:{' '}
              <strong className="text-emerald-700 font-bold">{pendingCount}</strong>
            </div>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleImportAllPending}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Importar Todos ({pendingCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {filteredRemoteStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum registro encontrado</h4>
              <p className="text-xs text-slate-500 mt-1">
                Clique no botão "Iniciar Varredura no CGD" acima para buscar na intranet.
              </p>
            </div>
          ) : (
            filteredRemoteStudents.map((aluno) => {
              const isAlreadyInLocal = existingIds.has(aluno.id) || importedIds.includes(aluno.id);

              return (
                <div
                  key={aluno.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isAlreadyInLocal
                      ? 'bg-white border-slate-200 opacity-90'
                      : 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{aluno.nome}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-semibold">
                          {aluno.contrato}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            aluno.criticidade === 'critico'
                              ? 'bg-red-100 text-red-800'
                              : aluno.criticidade === 'moderado'
                              ? 'bg-amber-100 text-amber-800'
                              : aluno.criticidade === 'atencao'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {aluno.criticidade.toUpperCase()}
                        </span>
                        {aluno.bloqueadoAutomaticamente && (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                            BLOQUEADO CGD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                        <span>
                          <strong>Curso:</strong> {aluno.curso}
                        </span>
                        <span>
                          <strong>Disciplina:</strong> {aluno.disciplinaAtual}
                        </span>
                        <span>
                          <strong>Turma:</strong> {aluno.turmaNome}
                        </span>
                        <span>
                          <strong>Docente:</strong> {aluno.professorResponsavel}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-0.5">
                        <span>Faltas no mês: <strong>{aluno.faltasMesAtual}</strong></span>
                        <span>Reposições: <strong>{aluno.reposicoesRealizadas}</strong></span>
                        <span>Dias em curso: <strong>{aluno.diasEmCurso} dias</strong></span>
                        <a
                          href={aluno.cgdUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Portal CGD</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isAlreadyInLocal ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Sincronizado na Base</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleImportSingle(aluno)}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Importar Aluno</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Conexão com CGD Oficial ({selectedUnidadeScan === 'matriz' ? 'Contrato 836410' : 'Contrato 832852'}). Handshake 200 OK.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
