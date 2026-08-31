import React, { useState } from 'react';
import { TurmaCGD, AlunoMonitorado, UserProfile } from '../types';
import {
  Users,
  Plus,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Search,
  UserPlus,
} from 'lucide-react';

interface TurmasHorariosPanelProps {
  turmas: TurmaCGD[];
  alunos: AlunoMonitorado[];
  currentUser: UserProfile;
  onAddTurma: (novaTurma: Omit<TurmaCGD, 'id' | 'totalAlunosMatriculados'>) => void;
  onMatricularAlunoTurma: (alunoId: string, turmaId: string) => void;
}

export const TurmasHorariosPanel: React.FC<TurmasHorariosPanelProps> = ({
  turmas,
  alunos,
  currentUser,
  onAddTurma,
  onMatricularAlunoTurma,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [nome, setNome] = useState('');
  const [cursoNome, setCursoNome] = useState('Windows 10 - V1809');
  const [professorResponsavel, setProfessorResponsavel] = useState(currentUser.nome);
  const [diasSemana, setDiasSemana] = useState<string[]>(['Sábado']);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('10:00');
  const [sala, setSala] = useState('Lab 01 (Informática)');
  const [limiteAlunos, setLimiteAlunos] = useState(15);
  const [disciplinaAtual, setDisciplinaAtual] = useState('Módulo 01 - Fundamentos');

  // Allocation State
  const [selectedTurmaForAlloc, setSelectedTurmaForAlloc] = useState<TurmaCGD | null>(null);
  const [alunoToAllocId, setAlunoToAllocId] = useState('');

  const diasOpcoes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const handleToggleDia = (dia: string) => {
    if (diasSemana.includes(dia)) {
      setDiasSemana(diasSemana.filter((d) => d !== dia));
    } else {
      setDiasSemana([...diasSemana, dia]);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || diasSemana.length === 0) return;

    onAddTurma({
      nome: nome.trim(),
      cursoNome,
      codigoCurso: `CUR-${cursoNome.slice(0, 4).toUpperCase()}`,
      professorResponsavel,
      professorId: currentUser.id,
      diasSemana,
      horarioInicio,
      horarioFim,
      sala,
      limiteAlunos,
      disciplinaAtual,
      status: 'em_andamento',
      unidade: currentUser.unidade,
    });

    setNome('');
    setShowCreateModal(false);
  };

  const handleAllocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurmaForAlloc || !alunoToAllocId) return;

    onMatricularAlunoTurma(alunoToAllocId, selectedTurmaForAlloc.id);
    setSelectedTurmaForAlloc(null);
    setAlunoToAllocId('');
  };

  const filteredTurmas = turmas.filter(
    (t) =>
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cursoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.professorResponsavel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>Gestão de Turmas, Cursos & Horários CGD</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Criação de turmas integradas ao CGD, controle de capacidade por laboratório e horários semanais
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Turma no CGD</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome da turma, curso ou professor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-emerald-600"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {filteredTurmas.length} turmas ativas
        </span>
      </div>

      {/* Turmas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredTurmas.map((turma) => {
          const alunosNaTurma = alunos.filter((a) => a.turmaId === turma.id);
          const percentOcupacao = Math.round(
            (alunosNaTurma.length / (turma.limiteAlunos || 1)) * 100
          );

          return (
            <div
              key={turma.id}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                      {turma.codigoCurso}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{turma.nome}</h3>
                    <p className="text-xs font-semibold text-slate-600">{turma.cursoNome}</p>
                  </div>

                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    {turma.status === 'em_andamento' ? 'Em Andamento' : turma.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 my-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{turma.diasSemana.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {turma.horarioInicio} às {turma.horarioFim}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{turma.sala}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{turma.disciplinaAtual}</span>
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Ocupação da Turma</span>
                    <span>
                      {alunosNaTurma.length} / {turma.limiteAlunos} vagas ({percentOcupacao}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        percentOcupacao >= 90
                          ? 'bg-red-500'
                          : percentOcupacao >= 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, percentOcupacao)}%` }}
                    />
                  </div>
                </div>

                {/* Students list preview */}
                <div className="border-t border-slate-100 pt-2 text-xs">
                  <div className="font-semibold text-slate-700 mb-1">
                    Alunos nesta turma:
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {alunosNaTurma.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">
                        Nenhum aluno matriculado ainda nesta turma.
                      </span>
                    ) : (
                      alunosNaTurma.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded text-[11px]"
                        >
                          <span className="font-medium text-slate-800 truncate">
                            {a.nome}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {a.contrato}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Professor: <strong>{turma.professorResponsavel}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTurmaForAlloc(turma)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Matricular Aluno</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Turma */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-700" />
              <span>Criar Nova Turma no CGD</span>
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Hardware - Turma Intensiva Sábado"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Curso Vinculado *
                  </label>
                  <select
                    value={cursoNome}
                    onChange={(e) => setCursoNome(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                  >
                    <option value="Windows 10 - V1809">Windows 10 - V1809</option>
                    <option value="Hardware, Montagem & Manutenção">Hardware & Redes</option>
                    <option value="Gestão Empresarial & Administração">Gestão Empresarial</option>
                    <option value="Pacote Office Completo & Excel Pro">Pacote Office & Excel</option>
                    <option value="Design Gráfico & Mídias Digitais">Design Gráfico</option>
                    <option value="Desenvolvimento Web Fullstack">Desenvolvimento Web</option>
                    <option value="Atendente de Farmácia">Atendente de Farmácia</option>
                    <option value="Robótica Educacional & Arduino">Robótica & Arduino</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Professor Responsável *
                  </label>
                  <input
                    type="text"
                    value={professorResponsavel}
                    onChange={(e) => setProfessorResponsavel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              {/* Dias da Semana Checkboxes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dias da Semana *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {diasOpcoes.map((dia) => {
                    const isSelected = diasSemana.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => handleToggleDia(dia)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Início</label>
                  <input
                    type="text"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fim</label>
                  <input
                    type="text"
                    value={horarioFim}
                    onChange={(e) => setHorarioFim(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Limite Vagas</label>
                  <input
                    type="number"
                    value={limiteAlunos}
                    onChange={(e) => setLimiteAlunos(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sala / Lab</label>
                  <input
                    type="text"
                    value={sala}
                    onChange={(e) => setSala(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Disciplina Atual
                  </label>
                  <input
                    type="text"
                    value={disciplinaAtual}
                    onChange={(e) => setDisciplinaAtual(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
                  />
                </div>
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
                  Salvar Turma no CGD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Matricular Aluno */}
      {selectedTurmaForAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Matricular Aluno na Turma
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Turma alvo: <strong>{selectedTurmaForAlloc.nome}</strong> ({selectedTurmaForAlloc.sala})
            </p>

            <form onSubmit={handleAllocSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selecione o Aluno *
                </label>
                <select
                  value={alunoToAllocId}
                  onChange={(e) => setAlunoToAllocId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:border-emerald-600"
                  required
                >
                  <option value="">Escolha um aluno...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} ({a.contrato} - Turma atual: {a.turmaNome})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTurmaForAlloc(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg"
                >
                  Confirmar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
