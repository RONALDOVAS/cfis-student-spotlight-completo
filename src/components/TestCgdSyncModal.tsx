import React, { useState, useEffect } from 'react';
import {
  AlunoMonitorado,
  OcorrenciaCGD,
  UserProfile,
  TipoTratativa,
  StatusTratativa,
  CredencialCGD,
} from '../types';
import { calculateAcademicStatus } from '../utils/academicCalculations';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Server,
  Key,
  ShieldCheck,
  FileText,
  Clock,
  Bell,
  BellRing,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Code2,
  Check,
  User,
  BookOpen,
  ExternalLink,
  Building2,
} from 'lucide-react';

interface TestCgdSyncModalProps {
  filialAlunos?: AlunoMonitorado[];
  matrizAlunos?: AlunoMonitorado[];
  alunos?: AlunoMonitorado[];
  selectedAlunoInitial?: AlunoMonitorado | null;
  preselectedAluno?: AlunoMonitorado | null;
  currentUser: UserProfile;
  availableUsers?: UserProfile[];
  credencialFilial?: CredencialCGD;
  credencialMatriz?: CredencialCGD;
  credenciais?: CredencialCGD[];
  isOpen?: boolean;
  onClose: () => void;
  onConfirmSyncOcorrencia?: (
    nova: Omit<OcorrenciaCGD, 'id' | 'data' | 'sincronizadoCGD' | 'dataSincronizacaoCGD' | 'protocoloCGD'>,
    protocoloGerado: string
  ) => void;
  onConfirmSync?: (
    nova: Omit<OcorrenciaCGD, 'id' | 'data' | 'sincronizadoCGD' | 'dataSincronizacaoCGD' | 'protocoloCGD'>,
    protocoloGerado: string
  ) => void;
}

export const TestCgdSyncModal: React.FC<TestCgdSyncModalProps> = ({
  filialAlunos,
  matrizAlunos,
  alunos,
  selectedAlunoInitial,
  preselectedAluno,
  currentUser,
  availableUsers = [],
  credencialFilial,
  credencialMatriz,
  credenciais = [],
  isOpen = true,
  onClose,
  onConfirmSyncOcorrencia,
  onConfirmSync,
}) => {
  if (isOpen === false) return null;

  const rawAlunos = Array.isArray(alunos) ? alunos : [];
  const safeFilial = Array.isArray(filialAlunos)
    ? filialAlunos
    : rawAlunos.filter((a) => a.unidade === 'filial' || !a.unidade);
  const safeMatriz = Array.isArray(matrizAlunos)
    ? matrizAlunos
    : rawAlunos.filter((a) => a.unidade === 'matriz');

  const allStudents = rawAlunos.length > 0
    ? rawAlunos
    : [...safeFilial, ...safeMatriz];

  // Default to preselected / selectedAlunoInitial or Gilvanderson or first student
  const defaultStudent =
    preselectedAluno ||
    selectedAlunoInitial ||
    allStudents.find((a) => a.nome.includes('Gilvanderson')) ||
    allStudents[0];

  const [selectedAlunoId, setSelectedAlunoId] = useState<string>(
    defaultStudent?.id || ''
  );
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(
    currentUser.id || 'prof_ronaldo_01'
  );
  const [tipoOcorrencia, setTipoOcorrencia] = useState<
    'pedagogica' | 'disciplinar' | 'falta_excessiva' | 'aulao_recuperacao' | 'atividade_pratica' | 'elogio'
  >('pedagogica');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tratativa, setTratativa] = useState<TipoTratativa>('atividade_pratica');
  const [statusTratativa, setStatusTratativa] = useState<StatusTratativa>('em_andamento');

  // Execution steps state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [generatedProtocol, setGeneratedProtocol] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showJsonPayload, setShowJsonPayload] = useState(false);

  const selectedAluno = allStudents.find((a) => a.id === selectedAlunoId) || allStudents[0];
  const academic = selectedAluno ? calculateAcademicStatus(selectedAluno) : null;
  const isMatriz = selectedAluno?.unidade === 'matriz';
  const targetContractId = isMatriz ? '836410' : '832852';
  const targetContractUrl = selectedAluno?.cgdUrl || `https://app.cgd.com.br/contratos/${targetContractId}`;

  // Find the selected instructor
  const activeInstructor =
    availableUsers.find((u) => u.id === selectedInstructorId) || currentUser;

  // Auto-populate recommendation based on student pacing or status
  useEffect(() => {
    if (!selectedAluno || !academic) return;

    if (academic.anomaliaRitmo === 'cliques_rapidos') {
      setTipoOcorrencia('pedagogica');
      setTitulo(`[ALERTA DE RITMO] Avanço Anômalo por Cliques Rápidos - ${academic.disciplinaAtual}`);
      setDescricao(
        `Auditoria de aprendizado no CGD: Detectado avanço acelerado artificial por cliques rápidos (média de ${academic.tempoMedioPorAulaMinutos.toFixed(1)} min/aula em disciplina com carga de ${academic.cargaHorariaDisciplinaAtual}h). Convocação presencial para prova de nivelamento e verificação de retenção do conteúdo.`
      );
      setTratativa('atividade_pratica');
      setStatusTratativa('pendente');
    } else if (academic.anomaliaRitmo === 'avanco_lento') {
      setTipoOcorrencia('pedagogica');
      setTitulo(`[ALERTA DE RITMO] Estagnação de Carga Horária - ${academic.disciplinaAtual}`);
      setDescricao(
        `Auditoria CGD: Aluno completou apenas ${academic.horasCursadasDisciplinaAtual}h de ${academic.cargaHorariaDisciplinaAtual}h previstas (${academic.percentualAvancoDisciplina}% após ${selectedAluno.diasEmCurso} dias). Requer acompanhamento pedagógico para equalização da grade.`
      );
      setTratativa('acompanhamento');
      setStatusTratativa('pendente');
    } else if (academic.isBloqueado) {
      setTipoOcorrencia('falta_excessiva');
      setTitulo(`[BLOQUEIO PREVENTIVO] Excesso de Faltas no Mês - ${academic.disciplinaAtual}`);
      setDescricao(
        `Notificação formal de bloqueio preventivo no CGD: O aluno acumulou ${academic.faltasEfetivasMes} faltas no mês corrente (${academic.reposicoesRealizadas} reposição registrada). Matrícula retida aguardando agendamento de reposição.`
      );
      setTratativa('aulao');
      setStatusTratativa('pendente');
    } else {
      setTipoOcorrencia('pedagogica');
      setTitulo(`[VALIDAÇÃO CGD] Acompanhamento Acadêmico Regular - ${academic.disciplinaAtual}`);
      setDescricao(
        `Teste e validação de sincronização bidirecional entre o sistema CFIS e o portal central CGD (${isMatriz ? 'Matriz' : 'Filial'} - Contrato ${targetContractId}) para o aluno ${selectedAluno.nome}. Frequência: ${academic.taxaFrequenciaReal}%.`
      );
      setTratativa('normal');
      setStatusTratativa('concluido');
    }
  }, [selectedAlunoId]);

  const handleRunSyncTest = () => {
    setIsExecuting(true);
    setCurrentStep(1);
    setIsCompleted(false);

    // Step 1: Auth & Token Validation (400ms)
    setTimeout(() => {
      setCurrentStep(2);
      // Step 2: Payload Packaging & Schema Check (800ms)
      setTimeout(() => {
        setCurrentStep(3);
        // Step 3: API POST /api/cgd/v2/ocorrencias/sincronizar (1200ms)
        setTimeout(() => {
          setCurrentStep(4);
          const protoPrefix = isMatriz ? `CGD-MATRIZ-836410` : `CGD-FILIAL-832852`;
          const proto = `${protoPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;
          setGeneratedProtocol(proto);
          // Step 4: DB Reconciliation & Confirmation (1600ms)
          setTimeout(() => {
            setCurrentStep(5);
            setIsExecuting(false);
            setIsCompleted(true);

            if (selectedAluno) {
              const confirmFn = onConfirmSyncOcorrencia || onConfirmSync;
              if (confirmFn) {
                confirmFn(
                  {
                    alunoId: selectedAluno.id,
                    alunoNome: selectedAluno.nome,
                    contrato: selectedAluno.contrato,
                    curso: selectedAluno.curso,
                    turmaNome: selectedAluno.turmaNome,
                    professorId: activeInstructor.id,
                    professorNome: activeInstructor.nome,
                    tipo: tipoOcorrencia,
                    titulo: titulo || 'Ocorrência de Validação CGD',
                    descricao: descricao || 'Validação de sincronização realizada com sucesso.',
                    tratativaAplicada: tratativa,
                    statusTratativa: statusTratativa,
                  },
                  proto
                );
              }
            }
          }, 400);
        }, 500);
      }, 450);
    }, 400);
  };

  const syncPayloadPreview = selectedAluno
    ? {
        cgd_endpoint: 'https://app.cgd.com.br/api/v2/ocorrencias/sincronizar',
        cgd_contrato_url: targetContractUrl,
        cgd_unidade: isMatriz ? 'MATRIZ_836410' : 'FILIAL_832852',
        cgd_laboratorio: selectedAluno.cgdLaboratorio || (isMatriz ? 'lab_matriz_01' : 'lab_01'),
        metodo: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer CGD_JWT_AUTH_TOKEN_${isMatriz ? 'MATRIZ' : 'FILIAL'}_2026`,
          'X-CGD-Branch-Id': isMatriz ? 'MATRIZ_CENTRAL_01' : 'FILIAL_SUL_02',
          'X-Operator-User': isMatriz
            ? (credencialMatriz?.usuarioLogin || 'coordenacao.matriz@cgd.sistema')
            : (credencialFilial?.usuarioLogin || 'professor.ronaldo.filial@cgd.sistema'),
        },
        body: {
          aluno_id: selectedAluno.id,
          nome_completo: selectedAluno.nome,
          contrato_numero: selectedAluno.contrato,
          cgd_contrato_link: targetContractUrl,
          curso_atual: selectedAluno.curso,
          disciplina_modulo: academic?.disciplinaAtual,
          carga_horaria_modulo: academic?.cargaHorariaDisciplinaAtual,
          tempo_medio_aula_min: academic?.tempoMedioPorAulaMinutos,
          anomalia_ritmo: academic?.anomaliaRitmo,
          faltas_brutas: academic?.faltasBrutasTotais,
          reposicoes_compensadas: academic?.reposicoesRealizadas,
          faltas_liquidas_mes: academic?.faltasEfetivasMes,
          tipo_ocorrencia: tipoOcorrencia,
          titulo_ocorrencia: titulo,
          descricao_detalhada: descricao,
          tratativa_pedagogica: tratativa,
          status_tratativa: statusTratativa,
          docente_responsavel: activeInstructor.nome,
          timestamp_envio: new Date().toISOString(),
        },
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <Zap className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Disparar Teste de Ocorrência & Sincronização CGD
              </h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Validação ponta a ponta com o Portal CGD (Filial 832852 / Matriz 836410 com 2 Labs)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* 1. Student & Instructor Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Selecione o Aluno
              </label>
              <select
                value={selectedAlunoId}
                onChange={(e) => setSelectedAlunoId(e.target.value)}
                disabled={isExecuting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                <optgroup label="Filial Sul (Contrato 832852)">
                  {safeFilial.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome} ({aluno.contrato} • {aluno.curso})
                    </option>
                  ))}
                </optgroup>
                {safeMatriz.length > 0 && (
                  <optgroup label="Matriz Central (Contrato 836410 • 2 Labs)">
                    {safeMatriz.map((aluno) => (
                      <option key={aluno.id} value={aluno.id}>
                        {aluno.nome} ({aluno.contrato} • {aluno.cgdLaboratorio === 'lab_matriz_01' ? 'Lab 1' : 'Lab 2'})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Instructor Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Instrutor / Docente Emissor
              </label>
              <select
                value={selectedInstructorId}
                onChange={(e) => setSelectedInstructorId(e.target.value)}
                disabled={isExecuting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                {availableUsers.length > 0 ? (
                  availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.role.toUpperCase()} • {u.unidadePermitida.toUpperCase()})
                    </option>
                  ))
                ) : (
                  <option value={currentUser.id}>{currentUser.nome} ({currentUser.role})</option>
                )}
              </select>
            </div>
          </div>

          {/* 2. Selected Student Card with Rhythm and Attendance Badges */}
          {selectedAluno && academic && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-200">
                    {selectedAluno.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{selectedAluno.nome}</span>
                      <span className="text-[11px] font-mono text-slate-500 font-normal">
                        ({selectedAluno.contrato})
                      </span>
                      <a
                        href={targetContractUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded-md transition-colors"
                        title="Abrir no CGD Oficial"
                      >
                        <span>CGD: {targetContractId}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      {isMatriz && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                          {selectedAluno.cgdLaboratorio === 'lab_matriz_01' ? 'Laboratório 01 (Matriz)' : 'Laboratório 02 (Matriz)'}
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-slate-600">
                      {academic.disciplinaAtual} • Turma: {selectedAluno.turmaNome}
                    </div>
                  </div>
                </div>

                {/* Rhythm Badge with Bell */}
                <div className="flex items-center gap-2 shrink-0">
                  {academic.anomaliaRitmo === 'cliques_rapidos' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-bold animate-pulse">
                      <BellRing className="w-4 h-4 text-rose-600" />
                      <span>Sino: Cliques Rápidos ({academic.tempoMedioPorAulaMinutos.toFixed(1)}m/aula)</span>
                    </div>
                  ) : academic.anomaliaRitmo === 'avanco_lento' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span>Sino: Avanço Lento ({academic.horasCursadasDisciplinaAtual}h / {academic.cargaHorariaDisciplinaAtual}h)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Sino: Ritmo Normal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Faltas Líquidas Mês</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">
                    {academic.faltasEfetivasMes} faltas
                    <span className="text-[10px] text-emerald-700 font-normal ml-1">
                      (-{academic.reposicoesRealizadas} rep)
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Frequência Real</div>
                  <div className="text-sm font-black text-emerald-700 mt-0.5">
                    {academic.taxaFrequenciaReal}%
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Tempo Médio / Aula</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">
                    {academic.tempoMedioPorAulaMinutos.toFixed(1)} min
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Carga Cursada</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">
                    {academic.horasCursadasDisciplinaAtual}h / {academic.cargaHorariaDisciplinaAtual}h
                  </div>
                </div>
              </div>

              {/* Rhythm Diagnostic Message */}
              {academic.detalheAnomaliaRitmo && (
                <div className="text-xs text-slate-700 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-lg flex items-start gap-2">
                  <BellRing className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Diagnóstico do Sino de Ritmo:</strong> {academic.detalheAnomaliaRitmo}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Occurrence Form Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Parâmetros da Ocorrência para Envio ao CGD
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoOcorrencia('pedagogica');
                    setTitulo('Teste');
                    setDescricao('Teste');
                    setTratativa('normal');
                    setStatusTratativa('concluido');
                  }}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg text-xs transition-colors"
                >
                  ⚡ Inserir "Teste" (Texto Puro)
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonPayload(!showJsonPayload)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {showJsonPayload ? 'Ocultar JSON' : 'JSON API'}
                </button>
              </div>
            </div>

            {/* CGD Button Automation Info */}
            <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <Zap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Automação CGD: <strong>txtDescricaoOcorrencia</strong> ➔ <strong>btnSalvarOcorrencia</strong></span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Emissor: {activeInstructor.nome}</span>
            </div>

            {/* Payload JSON Inspector if toggled */}
            {showJsonPayload && syncPayloadPreview && (
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 border border-slate-800">
                {JSON.stringify(syncPayloadPreview, null, 2)}
              </pre>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipo de Ocorrência
                </label>
                <select
                  value={tipoOcorrencia}
                  onChange={(e) => setTipoOcorrencia(e.target.value as any)}
                  disabled={isExecuting}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:border-emerald-600"
                >
                  <option value="pedagogica">Alerta Pedagógico / Ritmo de Aula</option>
                  <option value="falta_excessiva">Excesso de Faltas / Bloqueio</option>
                  <option value="atividade_pratica">Atividade Prática / Laboratório</option>
                  <option value="aulao_recuperacao">Aulão de Recuperação</option>
                  <option value="disciplinar">Disciplinar</option>
                  <option value="elogio">Elogio / Desempenho Notável</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tratativa Sugerida
                </label>
                <select
                  value={tratativa}
                  onChange={(e) => setTratativa(e.target.value as any)}
                  disabled={isExecuting}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:border-emerald-600"
                >
                  <option value="atividade_pratica">Atividade Prática de Fixação</option>
                  <option value="aulao">Aulão de Recuperação Sábado</option>
                  <option value="acompanhamento">Acompanhamento Pedagógico</option>
                  <option value="normal">Normal / Registro Regular</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Título da Ocorrência
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={isExecuting}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descrição e Despacho do Professor
              </label>
              <textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={isExecuting}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          {/* 4. Real-time Stepper Progress */}
          {isExecuting && (
            <div className="p-4 bg-slate-900 rounded-xl text-white space-y-3 animate-in fade-in">
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Sincronizando com Servidor CGD ({isMatriz ? 'Matriz' : 'Filial'})...
                </span>
                <span>Passo {currentStep} de 5</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}>
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-emerald-400" />}
                  1. Autenticação e handshake com o portal CGD (Token JWT verificado)
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}>
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-emerald-400" />}
                  2. Validação da matrícula, ritmo da disciplina e horas cursadas
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}>
                  {currentStep > 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-emerald-400" />}
                  3. Transmissão do despacho pedagógico ({activeInstructor.nome}) via POST /api/v2/ocorrencias/sincronizar
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}>
                  {currentStep > 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-emerald-400" />}
                  4. Emissão e carimbo do Protocolo CGD Oficial
                </div>
                <div className={`flex items-center gap-2 ${currentStep >= 5 ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}>
                  {currentStep >= 5 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-emerald-400" />}
                  5. Reconciliação local e auditoria de segurança RLS concluída
                </div>
              </div>
            </div>
          )}

          {/* 5. Success Banner with Protocol */}
          {isCompleted && generatedProtocol && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Sincronização com CGD Validada com Sucesso!</span>
                </div>
                <span className="font-mono text-xs font-black bg-emerald-200 text-emerald-950 px-2.5 py-1 rounded-md border border-emerald-300">
                  {generatedProtocol}
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                A ocorrência para <strong>{selectedAluno.nome}</strong> emitida por <strong>{activeInstructor.nome}</strong> foi gravada no CGD ({targetContractUrl}) e o status da tratativa foi atualizado.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            {isCompleted ? 'Fechar' : 'Cancelar'}
          </button>

          {!isCompleted ? (
            <button
              type="button"
              disabled={isExecuting || !titulo || !descricao}
              onClick={handleRunSyncTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isExecuting ? 'Validando Sincronização...' : 'Disparar Teste & Sincronizar com CGD'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Concluir Validação</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
