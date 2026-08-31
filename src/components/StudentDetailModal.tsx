import React from 'react';
import { AlunoMonitorado, OcorrenciaCGD, UserProfile } from '../types';
import { calculateAcademicStatus } from '../utils/academicCalculations';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldAlert,
  Repeat,
  Activity,
  Layers,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

interface StudentDetailModalProps {
  aluno: AlunoMonitorado | null;
  onClose: () => void;
  ocorrencias: OcorrenciaCGD[];
  onOpenNewOcorrencia: (aluno: AlunoMonitorado) => void;
  onToggleBloqueio: (alunoId: string) => void;
  currentUser: UserProfile;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  aluno,
  onClose,
  ocorrencias,
  onOpenNewOcorrencia,
  onToggleBloqueio,
  currentUser,
}) => {
  if (!aluno) return null;

  const academic = calculateAcademicStatus(aluno);
  const isBloqueado = academic.isBloqueado;

  // Cálculo de tempo de contrato e disciplinas
  const dataInicio = new Date(aluno.dataInicio);
  const dataHoje = new Date('2026-08-19'); // Timestamp atual do sistema
  const diffTime = Math.abs(dataHoje.getTime() - dataInicio.getTime());
  const mesesDecorridos = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));
  const mesesRestantes = Math.max(0, aluno.mesesContratoTotal - mesesDecorridos);

  const totalDisciplinas = aluno.totalDisciplinasGrade || aluno.disciplinas.length;
  const concluidas = aluno.disciplinas.filter((d) => d.status === 'concluida').length;
  const emAndamento = aluno.disciplinas.filter((d) => d.status === 'em_andamento').length;
  const pendentes = aluno.disciplinas.filter((d) => d.status === 'pendente').length;

  const progressoPercent = Math.round((concluidas / (totalDisciplinas || 1)) * 100);

  // Ritmo necessário
  const disciplinasRestantesTotal = pendentes + emAndamento;
  const ritmoNecessarioMes = mesesRestantes > 0 ? (disciplinasRestantesTotal / mesesRestantes).toFixed(1) : '0';
  const ritmoAtualMes = (concluidas / mesesDecorridos).toFixed(1);

  const emRiscoAtraso = Number(ritmoNecessarioMes) > Number(ritmoAtualMes) || (mesesRestantes <= 2 && disciplinasRestantesTotal > 2);

  // Filtrar ocorrências do aluno
  const alunoOcorrencias = ocorrencias.filter((o) => o.alunoId === aluno.id);
  const historicoReposicoes = aluno.historicoReposicoes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-700/80 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                {aluno.contrato}
              </span>
              {aluno.cgdUrl && (
                <a
                  href={aluno.cgdUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600/90 hover:bg-blue-600 text-white px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title={`Abrir contrato ${aluno.unidade === 'filial' ? '832852 (Filial)' : '836410 (Matriz)'} no CGD`}
                >
                  <span>CGD Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <span className="text-xs text-emerald-200 font-medium">
                • Início em {dataInicio.toLocaleDateString('pt-BR')} ({aluno.diasEmCurso} dias em curso)
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              {aluno.nome}
              {isBloqueado && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado por Faltas
                </span>
              )}
            </h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              {aluno.curso} • {aluno.turmaNome} • Prof. {aluno.professorResponsavel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card Destacado: Disciplina Atual & Frequência */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-700 text-white rounded-lg shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Disciplina Atual em Andamento
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {aluno.disciplinaAtual || aluno.curso}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Curso: <span className="font-semibold">{aluno.curso}</span> • Última aula em: <span className="font-semibold">{aluno.ultimaAula}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-emerald-200 sm:pl-4">
              <div className="text-right">
                <div className="text-[11px] font-medium text-slate-500">Último Acesso</div>
                <div className="text-xs font-bold font-mono text-slate-800">
                  {aluno.ultimoAcesso || '—'}
                </div>
                {academic.diasSemAcesso > 0 ? (
                  <span className={`text-[10px] font-bold ${academic.diasSemAcesso >= 15 ? 'text-red-600' : 'text-slate-500'}`}>
                    {academic.diasSemAcesso} dias sem acesso
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700">Acesso recente</span>
                )}
              </div>
            </div>
          </div>

          {/* Top Metric Cards: Contrato vs Disciplinas Faltantes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Progresso da Grade */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Progresso Curricular</span>
                <span className="text-emerald-700 font-black">{progressoPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressoPercent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Concluídas</div>
                  <div className="font-bold text-emerald-700">{concluidas}</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Andamento</div>
                  <div className="font-bold text-amber-600">{emAndamento}</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Pendentes</div>
                  <div className="font-bold text-slate-700">{pendentes}</div>
                </div>
              </div>
            </div>

            {/* 2. Tempo de Contrato */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Vigência do Contrato</span>
                <span className="text-slate-900 font-black">{aluno.mesesContratoTotal} meses</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((mesesDecorridos / aluno.mesesContratoTotal) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Decorridos</div>
                  <div className="font-bold text-slate-800">{mesesDecorridos} meses</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Restantes</div>
                  <div className="font-bold text-slate-800">{mesesRestantes} meses</div>
                </div>
              </div>
            </div>

            {/* 3. Cálculo Preditivo: Ritmo Necessário */}
            <div
              className={`p-4 rounded-xl border ${
                emRiscoAtraso
                  ? 'bg-red-50/70 border-red-200'
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Cálculo de Conclusão</span>
                {emRiscoAtraso ? (
                  <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded">
                    Risco de Atraso
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                    No Prazo
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Ritmo Atual:</span>
                  <span className="font-bold text-slate-800">{ritmoAtualMes} disc/mês</span>
                </div>
                <div className="flex justify-between">
                  <span>Ritmo Necessário:</span>
                  <span className="font-bold text-slate-900">{ritmoNecessarioMes} disc/mês</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200/60 leading-tight">
                {emRiscoAtraso
                  ? `Necessita de ${disciplinasRestantesTotal} disciplinas em ${mesesRestantes} meses. Recomendado Aulão ou Atividade Prática.`
                  : 'Aluno cumprindo a grade curricular em ritmo compatível com o contrato.'}
              </p>
            </div>
          </div>

          {/* Seção Nova: Contabilização de Faltas & Reposições de Aula */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-700" />
                <span>Tratativa de Faltas & Reposições de Aula</span>
              </h3>
              <span className="text-xs text-slate-500">
                Regra: Reposições compensam faltas no cômputo da criticidade e bloqueio
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Faltas Brutas</div>
                <div className="text-base font-black text-slate-800 mt-0.5">
                  {academic.faltasBrutasTotais}
                </div>
                <div className="text-[10px] text-slate-400">Registradas no diário</div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <div className="text-[10px] font-semibold text-emerald-800 uppercase">Reposições Realizadas</div>
                <div className="text-base font-black text-emerald-700 mt-0.5">
                  {academic.reposicoesRealizadas}
                </div>
                <div className="text-[10px] text-emerald-600">Presenças compensadas</div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-[10px] font-semibold text-blue-800 uppercase">Faltas Efetivas</div>
                <div className="text-base font-black text-blue-900 mt-0.5">
                  {academic.faltasEfetivasTotais}
                </div>
                <div className="text-[10px] text-blue-600">Saldo real (Brutas - Rep.)</div>
              </div>

              <div className={`p-3 border rounded-lg text-center ${
                academic.faltasEfetivasMes >= 3 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] font-semibold text-slate-600 uppercase">Faltas Mês Efetivas</div>
                <div className={`text-base font-black mt-0.5 ${
                  academic.faltasEfetivasMes >= 3 ? 'text-red-700' : 'text-slate-800'
                }`}>
                  {academic.faltasEfetivasMes} / 3
                </div>
                <div className="text-[10px] text-slate-500">Mês {aluno.mesReferenciaFaltas}</div>
              </div>
            </div>

            {/* Histórico de Reposições */}
            <div className="mt-3">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Histórico de Reposições ({historicoReposicoes.length})</span>
                {academic.reposicoesAgendadas > 0 && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {academic.reposicoesAgendadas} reposição(ões) agendada(s)
                  </span>
                )}
              </h4>

              {historicoReposicoes.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                  Nenhuma reposição de aula registrada para este aluno.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Disciplina</th>
                        <th className="px-3 py-2">Professor</th>
                        <th className="px-3 py-2 text-center">Horas</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historicoReposicoes.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                            <div>
                              {rep.data.includes('/') 
                                ? rep.data 
                                : new Date(rep.data.includes('T') ? rep.data : `${rep.data}T12:00:00`).toLocaleDateString('pt-BR')}
                            </div>
                            {rep.horarioInicio && rep.horarioFim && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {rep.horarioInicio} - {rep.horarioFim}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="capitalize text-slate-600 font-medium">
                              {rep.tipo === 'atividade' ? 'Atividade Prática' : rep.tipo === 'aulao' ? 'Aulão' : rep.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {rep.disciplina}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            Prof. {rep.professorNome}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                            {rep.horasCompensadas}h
                          </td>
                          <td className="px-3 py-2 text-center">
                            {rep.status === 'realizada' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" /> Realizada
                              </span>
                            ) : rep.status === 'agendada' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                <Clock className="w-3 h-3" /> Agendada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                Cancelada
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bloqueio Notice if applicable */}
          {isBloqueado && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-red-900">
                  Bloqueio Ativo por Excesso de Faltas Efetivas no Mês ({academic.faltasEfetivasMes} faltas no mês {aluno.mesReferenciaFaltas})
                </div>
                <p className="text-red-700 mt-0.5">
                  {aluno.motivoBloqueio ||
                    'O aluno atingiu 3 ou mais faltas efetivas no mês corrente (considerando reposições). A matrícula foi retida no CGD e necessita de comparecimento pedagógico antes da liberação.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleBloqueio(aluno.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors shrink-0"
              >
                Desbloquear Aluno
              </button>
            </div>
          )}

          {/* Grade Curricular: Disciplinas Detalhadas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Grade Curricular e Disciplinas ({aluno.disciplinas.length} Módulos)</span>
              </h3>
              <span className="text-xs text-slate-500">
                Sincronizado automaticamente do CGD
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Disciplina</th>
                    <th className="px-3 py-2.5">Carga</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-center">Nota</th>
                    <th className="px-3 py-2.5 text-center">Frequência</th>
                    <th className="px-4 py-2.5 text-right">Conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aluno.disciplinas.map((disc, idx) => (
                    <tr key={disc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        <span className="text-slate-400 font-mono text-[11px] mr-2">
                          #{idx + 1}
                        </span>
                        {disc.nome}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {disc.cargaHoraria}h
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {disc.status === 'concluida' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Concluída
                          </span>
                        )}
                        {disc.status === 'em_andamento' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> Em Andamento
                          </span>
                        )}
                        {disc.status === 'pendente' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold">
                        {disc.nota !== undefined ? (
                          <span
                            className={
                              disc.nota >= 7.0 ? 'text-emerald-700' : 'text-red-600'
                            }
                          >
                            {disc.nota.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {disc.frequenciaPercent !== undefined ? (
                          <span
                            className={`font-semibold ${
                              disc.frequenciaPercent >= 75 ? 'text-slate-700' : 'text-red-600'
                            }`}
                          >
                            {disc.frequenciaPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        {disc.dataConclusao || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ocorrências Registradas para este aluno */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Histórico de Ocorrências & Tratativas CGD ({alunoOcorrencias.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => onOpenNewOcorrencia(aluno)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 transition-colors"
              >
                + Nova Ocorrência
              </button>
            </div>

            {alunoOcorrencias.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Nenhuma ocorrência registrada para este aluno no CGD.
              </div>
            ) : (
              <div className="space-y-2.5">
                {alunoOcorrencias.map((ocorr) => (
                  <div
                    key={ocorr.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{ocorr.titulo}</span>
                      <span className="text-[10px] text-slate-500">{ocorr.data}</span>
                    </div>
                    <p className="text-slate-600">{ocorr.descricao}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-emerald-800 font-medium">
                        Por: {ocorr.professorNome}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono text-[10px]">
                        {ocorr.protocoloCGD || 'Sincronizado CGD'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Sincronização bidirecional com CGD ativa (Contrato {aluno.contrato}).
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleBloqueio(aluno.id)}
              className={`px-4 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs ${
                isBloqueado
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isBloqueado ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Desbloquear Aluno</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear por Faltas ({academic.faltasEfetivasMes} efetivas)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
