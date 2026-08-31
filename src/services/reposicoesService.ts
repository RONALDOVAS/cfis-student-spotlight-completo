import { supabase } from '../lib/supabase';
import { ReposicaoAgendadaItem } from '../types';

export type { ReposicaoAgendadaItem };

export const STORAGE_KEY = 'cfis_reposicoes_agendadas_v1';

// Extrai timestamp numérico para ordenação cronológica precisa de DD/MM/YYYY ou YYYY-MM-DD
export function extrairTimestampReposicao(rep: ReposicaoAgendadaItem): number {
  try {
    let dia = 1;
    let mes = 1;
    let ano = 2026;
    const dataStr = (rep.data || '').trim();

    if (dataStr.includes('/')) {
      const partes = dataStr.split('/').map(Number);
      dia = partes[0] || 1;
      mes = partes[1] || 1;
      ano = partes[2] || 2026;
    } else if (dataStr.includes('-')) {
      const partes = dataStr.split('-').map(Number);
      ano = partes[0] || 2026;
      mes = partes[1] || 1;
      dia = partes[2] || 1;
    }

    let hora = 16;
    let minuto = 0;
    if (rep.horario_inicio && rep.horario_inicio.includes(':')) {
      const hPartes = rep.horario_inicio.split(':').map(Number);
      hora = hPartes[0] || 0;
      minuto = hPartes[1] || 0;
    }

    return new Date(ano, mes - 1, dia, hora, minuto).getTime();
  } catch {
    return 0;
  }
}

// Ordena uma lista de reposições cronologicamente (da mais próxima para a mais distante)
export function ordenarReposicoesPorData(reposicoes: ReposicaoAgendadaItem[]): ReposicaoAgendadaItem[] {
  if (!reposicoes || !Array.isArray(reposicoes)) return [];
  return [...reposicoes].sort((a, b) => extrairTimestampReposicao(a) - extrairTimestampReposicao(b));
}

// Deriva dinamicamente a próxima reposição agendada (somente status 'agendada')
export function derivarProximaReposicao(reposicoes: ReposicaoAgendadaItem[]): ReposicaoAgendadaItem | undefined {
  if (!reposicoes || !Array.isArray(reposicoes) || reposicoes.length === 0) {
    return undefined;
  }
  const agendadas = reposicoes.filter(r => r && r.status === 'agendada');
  if (agendadas.length === 0) {
    return undefined;
  }
  const ordenadas = ordenarReposicoesPorData(agendadas);
  return ordenadas[0] || undefined;
}

// Normaliza um objeto bruto para ReposicaoAgendadaItem preservando rigorosamente o ID único
export function normalizarReposicaoItem(item: any): ReposicaoAgendadaItem {
  const contratoStr = item.contrato && String(item.contrato).trim() !== 'N/A' 
    ? String(item.contrato).trim() 
    : undefined;

  const alunoIdStr = item.aluno_id && String(item.aluno_id).trim() !== '' 
    ? String(item.aluno_id).trim() 
    : undefined;

  const fallbackId = `rep_${contratoStr || alunoIdStr || 'aluno'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: String(item.id || fallbackId).trim(),
    aluno_id: alunoIdStr,
    aluno_nome: String(item.aluno_nome || item.nome || item.aluno || 'Aluno').trim(),
    contrato: contratoStr,
    unidade: String(item.unidade || 'MATRIZ').trim().toUpperCase(),
    data: String(item.data || '').trim(),
    horario_inicio: String(item.horario_inicio || item.horarioInicio || '16:00').trim(),
    horario_fim: String(item.horario_fim || item.horarioFim || '18:00').trim(),
    duracao_horas: Number(item.duracao_horas || item.duracaoHoras || 2),
    disciplina: item.disciplina ? String(item.disciplina).trim() : 'Módulo Geral',
    professor: item.professor ? String(item.professor).trim() : (item.professorNome || 'Ronaldo Vasconcelos'),
    status: (item.status === 'realizada' || item.status === 'cancelada') ? item.status : 'agendada',
    tipo: item.tipo || 'laboratorio',
    observacao: item.observacao || item.descricao || '',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

// Recupera do localStorage com integridade e sem sobrescrever sessões
export function getReposicoesDoLocalStorage(): ReposicaoAgendadaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const mapa = new Map<string, ReposicaoAgendadaItem>();

    parsed.forEach((item: any) => {
      if (item && item.id) {
        const norm = normalizarReposicaoItem(item);
        mapa.set(norm.id, norm);
      }
    });

    return Array.from(mapa.values());
  } catch (err) {
    console.warn('Erro ao ler reposições do localStorage:', err);
    return [];
  }
}

// Salva a lista no localStorage indexada estritamente por ID único
export function salvarReposicoesNoLocalStorage(reposicoes: ReposicaoAgendadaItem[]) {
  try {
    const mapa = new Map<string, ReposicaoAgendadaItem>();
    reposicoes.forEach(r => {
      if (r && r.id) {
        mapa.set(r.id, normalizarReposicaoItem(r));
      }
    });
    const listaLimpa = Array.from(mapa.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listaLimpa));
  } catch (err) {
    console.warn('Erro ao salvar reposições no localStorage:', err);
  }
}

// Busca todas as reposições (Supabase + localStorage)
export async function buscarTodasReposicoes(): Promise<ReposicaoAgendadaItem[]> {
  const mapaUnico = new Map<string, ReposicaoAgendadaItem>();

  // 1. Carrega dados do localStorage primeiro (disponível imediatamente)
  const locais = getReposicoesDoLocalStorage();
  locais.forEach(item => {
    mapaUnico.set(item.id, item);
  });

  // 2. Consulta no Supabase se houver conexão
  if (supabase) {
    try {
      const { data: dadosSupabase, error } = await supabase
        .from('reposicoes_agendadas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(dadosSupabase) && dadosSupabase.length > 0) {
        dadosSupabase.forEach((item: any) => {
          const repItem = normalizarReposicaoItem(item);
          mapaUnico.set(repItem.id, repItem);
        });
      }
    } catch (e) {
      console.warn('Tabela reposicoes_agendadas no Supabase não acessível, usando dados locais:', e);
    }
  }

  const listaFinal = Array.from(mapaUnico.values());
  salvarReposicoesNoLocalStorage(listaFinal);
  return listaFinal;
}

// Persiste uma reposição por chave primária ID (INSERT ou UPDATE exclusivo por ID)
export async function persistirReposicao(item: ReposicaoAgendadaItem): Promise<boolean> {
  const itemNormalizado = normalizarReposicaoItem({
    ...item,
    updated_at: new Date().toISOString()
  });

  // 1. Atualização no localStorage por ID (adiciona nova ou atualiza existente sem substituir outras)
  const atuais = getReposicoesDoLocalStorage();
  const mapa = new Map<string, ReposicaoAgendadaItem>();
  atuais.forEach(r => mapa.set(r.id, r));
  mapa.set(itemNormalizado.id, itemNormalizado);
  
  const atualizados = Array.from(mapa.values());
  salvarReposicoesNoLocalStorage(atualizados);

  // 2. Persistência no Supabase por chave primária id
  if (supabase) {
    try {
      const payload = {
        id: itemNormalizado.id,
        aluno_id: itemNormalizado.aluno_id || null,
        aluno_nome: itemNormalizado.aluno_nome,
        contrato: itemNormalizado.contrato || null,
        unidade: itemNormalizado.unidade,
        data: itemNormalizado.data,
        horario_inicio: itemNormalizado.horario_inicio,
        horario_fim: itemNormalizado.horario_fim,
        duracao_horas: itemNormalizado.duracao_horas || 2,
        disciplina: itemNormalizado.disciplina || null,
        professor: itemNormalizado.professor || 'Ronaldo Vasconcelos',
        status: itemNormalizado.status,
        tipo: itemNormalizado.tipo || 'laboratorio',
        observacao: itemNormalizado.observacao || null,
        updated_at: itemNormalizado.updated_at
      };

      const { error: errRep } = await supabase
        .from('reposicoes_agendadas')
        .upsert(payload, { onConflict: 'id' });

      if (errRep) {
        console.warn('Persistindo na ocorrência do CGD como fallback de persistência remota:', errRep.message);
        // Fallback de ocorrência sem apagar o histórico
        await supabase.from('ocorrencias_cgd').upsert(
          {
            contrato: itemNormalizado.contrato || itemNormalizado.id,
            aluno_nome: itemNormalizado.aluno_nome,
            status_tratativa: itemNormalizado.status === 'realizada' ? 'CONCLUÍDO' : 'EM ANDAMENTO',
            anotacao: `[Reposição ${itemNormalizado.status.toUpperCase()}] Data: ${itemNormalizado.data} das ${itemNormalizado.horario_inicio} às ${itemNormalizado.horario_fim}. Prof: ${itemNormalizado.professor}. Obs: ${itemNormalizado.observacao || ''}`,
            reposicao_agendada: itemNormalizado.status === 'agendada',
            atualizado_em: new Date().toISOString()
          },
          { onConflict: 'contrato' }
        );
      }
      return true;
    } catch (e) {
      console.warn('Erro ao persistir reposição no Supabase:', e);
    }
  }

  return true;
}

/**
 * Associa universalmente todas as reposições pertencentes a um aluno usando identificadores estáveis.
 * Prioridade: 1) aluno_id -> 2) contrato -> 3) nome normalizado.
 * Retorna todas as sessões válidas deduplicadas por ID individual.
 */
export function associarReposicoesAoAluno(
  identificadores: { id?: string; contrato?: string; nome?: string },
  reposicoes: ReposicaoAgendadaItem[]
): ReposicaoAgendadaItem[] {
  if (!reposicoes || !Array.isArray(reposicoes) || reposicoes.length === 0) {
    return [];
  }

  const idNorm = identificadores.id ? String(identificadores.id).trim() : '';
  const contratoNorm = identificadores.contrato && identificadores.contrato !== 'N/A' 
    ? String(identificadores.contrato).trim() 
    : '';
  const nomeNorm = identificadores.nome 
    ? String(identificadores.nome).toLowerCase().trim() 
    : '';

  const mapaUnico = new Map<string, ReposicaoAgendadaItem>();

  reposicoes.forEach(rep => {
    if (!rep || !rep.id) return;

    const rAlunoId = rep.aluno_id ? String(rep.aluno_id).trim() : '';
    const rContrato = rep.contrato && rep.contrato !== 'N/A' ? String(rep.contrato).trim() : '';
    const rNome = rep.aluno_nome ? String(rep.aluno_nome).toLowerCase().trim() : '';

    let associado = false;

    // Prioridade 1: aluno_id
    if (idNorm && rAlunoId && idNorm === rAlunoId) {
      associado = true;
    }
    // Prioridade 2: contrato/matrícula
    else if (contratoNorm && rContrato && contratoNorm === rContrato) {
      associado = true;
    }
    // Prioridade 3: nome normalizado
    else if (nomeNorm && rNome && (nomeNorm === rNome || (nomeNorm.length > 5 && (nomeNorm.includes(rNome) || rNome.includes(nomeNorm))))) {
      associado = true;
    }

    if (associado) {
      mapaUnico.set(rep.id, rep);
    }
  });

  return Array.from(mapaUnico.values());
}


