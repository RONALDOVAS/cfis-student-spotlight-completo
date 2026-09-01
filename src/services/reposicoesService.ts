import { supabase } from '../lib/supabase';
import { ReposicaoAgendadaItem } from '../types';

export type { ReposicaoAgendadaItem };
export const STORAGE_KEY = 'cfis_reposicoes_agendadas_v1';
export const CGD_REPOSICOES_JSON_URL = 'https://raw.githubusercontent.com/RONALDOVAS/google-ia-studio-CCFIS/main/dados_reposicoes.json';

export function extrairTimestampReposicao(rep: ReposicaoAgendadaItem): number {
  try {
    let dia = 1, mes = 1, ano = 2026;
    const s = (rep.data || '').trim();
    if (s.includes('/')) { const p = s.split('/').map(Number); dia = p[0] || 1; mes = p[1] || 1; ano = p[2] || 2026; }
    else if (s.includes('-')) { const p = s.split('-').map(Number); ano = p[0] || 2026; mes = p[1] || 1; dia = p[2] || 1; }
    let h = 16, m = 0;
    if (rep.horario_inicio?.includes(':')) { const p = rep.horario_inicio.split(':').map(Number); h = Number.isFinite(p[0]) ? p[0] : 16; m = Number.isFinite(p[1]) ? p[1] : 0; }
    return new Date(ano, mes - 1, dia, h, m).getTime();
  } catch { return 0; }
}

export function ordenarReposicoesPorData(reposicoes: ReposicaoAgendadaItem[]): ReposicaoAgendadaItem[] {
  return Array.isArray(reposicoes) ? [...reposicoes].sort((a, b) => extrairTimestampReposicao(a) - extrairTimestampReposicao(b)) : [];
}

export function derivarProximaReposicao(reposicoes: ReposicaoAgendadaItem[]): ReposicaoAgendadaItem | undefined {
  return ordenarReposicoesPorData((reposicoes || []).filter(r => r?.status === 'agendada'))[0];
}

export function normalizarReposicaoItem(item: any): ReposicaoAgendadaItem {
  const contrato = item.contrato && String(item.contrato).trim() !== 'N/A' ? String(item.contrato).trim() : undefined;
  const alunoId = item.aluno_id != null && String(item.aluno_id).trim() !== '' ? String(item.aluno_id).trim() : undefined;
  const fallbackId = `rep_${contrato || alunoId || 'aluno'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: String(item.id || fallbackId).trim(), aluno_id: alunoId,
    aluno_nome: String(item.aluno_nome || item.nome || item.aluno || 'Aluno').trim(), contrato,
    unidade: String(item.unidade || 'MATRIZ').trim().toUpperCase(), data: String(item.data || '').trim(),
    horario_inicio: String(item.horario_inicio || item.horarioInicio || '16:00').trim(),
    horario_fim: String(item.horario_fim || item.horarioFim || '18:00').trim(),
    duracao_horas: Number(item.duracao_horas || item.duracaoHoras || 2),
    disciplina: item.disciplina ? String(item.disciplina).trim() : 'Módulo Geral',
    professor: item.professor ? String(item.professor).trim() : (item.professorNome || 'Ronaldo Vasconcelos'),
    status: item.status === 'realizada' || item.status === 'cancelada' ? item.status : 'agendada',
    tipo: item.tipo || 'laboratorio', observacao: item.observacao || item.descricao || '',
    created_at: item.created_at || new Date().toISOString(), updated_at: item.updated_at || new Date().toISOString()
  };
}

export function getReposicoesDoLocalStorage(): ReposicaoAgendadaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return [];
    const parsed = JSON.parse(raw); if (!Array.isArray(parsed)) return [];
    const mapa = new Map<string, ReposicaoAgendadaItem>();
    parsed.forEach((item: any) => { if (item?.id) { const r = normalizarReposicaoItem(item); mapa.set(r.id, r); } });
    return [...mapa.values()];
  } catch { return []; }
}

export function salvarReposicoesNoLocalStorage(reposicoes: ReposicaoAgendadaItem[]) {
  try {
    const mapa = new Map<string, ReposicaoAgendadaItem>();
    reposicoes.forEach(r => { if (r?.id) mapa.set(r.id, normalizarReposicaoItem(r)); });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...mapa.values()]));
  } catch (err) { console.warn('Erro ao salvar reposições:', err); }
}

async function buscarRepositorioPublicoCGD(): Promise<ReposicaoAgendadaItem[]> {
  try {
    const resposta = await fetch(`${CGD_REPOSICOES_JSON_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!resposta.ok) return [];
    const bruto = await resposta.json();
    const registros = Array.isArray(bruto) ? bruto : bruto?.records;
    return Array.isArray(registros) ? registros.filter(Boolean).map(normalizarReposicaoItem) : [];
  } catch (err) { console.warn('Fonte pública CGD indisponível:', err); return []; }
}

export async function buscarTodasReposicoes(): Promise<ReposicaoAgendadaItem[]> {
  const mapa = new Map<string, ReposicaoAgendadaItem>();
  getReposicoesDoLocalStorage().forEach(r => mapa.set(r.id, r));
  const cgd = await buscarRepositorioPublicoCGD(); cgd.forEach(r => mapa.set(r.id, r));
  if (supabase) {
    try {
      const { data, error } = await supabase.from('reposicoes_agendadas').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) data.forEach((item: any) => { const r = normalizarReposicaoItem(item); mapa.set(r.id, r); });
    } catch (err) { console.warn('Supabase de reposições indisponível:', err); }
  }
  const final = [...mapa.values()]; salvarReposicoesNoLocalStorage(final); return final;
}

export async function persistirReposicao(item: ReposicaoAgendadaItem): Promise<boolean> {
  const r = normalizarReposicaoItem({ ...item, updated_at: new Date().toISOString() });
  const atuais = getReposicoesDoLocalStorage(); const mapa = new Map(atuais.map(x => [x.id, x])); mapa.set(r.id, r); salvarReposicoesNoLocalStorage([...mapa.values()]);
  if (supabase) {
    try {
      const { error } = await supabase.from('reposicoes_agendadas').upsert({
        id: r.id, aluno_id: r.aluno_id || null, aluno_nome: r.aluno_nome, contrato: r.contrato || null,
        unidade: r.unidade, data: r.data, horario_inicio: r.horario_inicio, horario_fim: r.horario_fim,
        duracao_horas: r.duracao_horas || 2, disciplina: r.disciplina || null, professor: r.professor || null,
        status: r.status, tipo: r.tipo || 'laboratorio', observacao: r.observacao || null, updated_at: r.updated_at
      }, { onConflict: 'id' });
      if (!error) return true;
    } catch (err) { console.warn('Erro ao persistir reposição:', err); }
  }
  return true;
}

function normalizarChave(valor?: string) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function associarReposicoesAoAluno(identificadores: { id?: string; contrato?: string; nome?: string }, reposicoes: ReposicaoAgendadaItem[]): ReposicaoAgendadaItem[] {
  const id = normalizarChave(identificadores.id), contrato = normalizarChave(identificadores.contrato), nome = normalizarChave(identificadores.nome);
  const mapa = new Map<string, ReposicaoAgendadaItem>();
  for (const rep of reposicoes || []) {
    if (!rep?.id) continue;
    const rid = normalizarChave(rep.aluno_id), rc = normalizarChave(rep.contrato), rn = normalizarChave(rep.aluno_nome);
    if ((id && rid && id === rid) || (contrato && rc && contrato === rc) || (nome && rn && (nome === rn || (nome.length > 5 && (nome.includes(rn) || rn.includes(nome)))))) mapa.set(rep.id, rep);
  }
  return ordenarReposicoesPorData([...mapa.values()]);
}
