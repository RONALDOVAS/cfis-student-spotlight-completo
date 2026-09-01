import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export interface CgdSendOccurrencePayload {
  alunoId: string;
  alunoNome: string;
  contrato: string;
  curso: string;
  turmaNome: string;
  professorId: string;
  professorNome: string;
  tipo: 'pedagogica' | 'disciplinar' | 'falta_excessiva' | 'aulao_recuperacao' | 'atividade_pratica' | 'elogio' | 'acompanhamento';
  titulo: string;
  descricao: string;
  tratativaAplicada: 'aulao' | 'atividade_pratica' | 'acompanhamento' | 'normal';
  statusTratativa: 'pendente' | 'em_andamento' | 'concluido';
  unidade: 'filial' | 'matriz';
}

export interface CgdSendResult {
  success: boolean;
  protocolo?: string;
  dataSincronizacao?: string;
  mensagem: string;
  error?: string;
  status: 'PENDENTE' | 'ENVIANDO' | 'ENVIADO' | 'ERRO' | 'REQUER_REENVIO';
}

const activeSubmissionsLock = new Set<string>();

export async function enviarOcorrenciaParaCgd(
  payload: CgdSendOccurrencePayload,
  currentUser: UserProfile
): Promise<CgdSendResult> {
  const lockKey = `${payload.contrato}_${payload.titulo || 'ocorrencia'}`;

  if (activeSubmissionsLock.has(lockKey)) {
    return { success: false, status: 'ENVIANDO', mensagem: 'Envio já em processamento para este contrato.' };
  }

  if (!payload.contrato || !payload.alunoNome || !payload.descricao?.trim()) {
    return { success: false, status: 'ERRO', mensagem: 'Dados incompletos: contrato, nome e descrição são obrigatórios.' };
  }

  if (
    currentUser.role === 'professor' &&
    currentUser.unidade &&
    payload.unidade &&
    currentUser.unidade !== payload.unidade
  ) {
    return {
      success: false,
      status: 'ERRO',
      mensagem: `Acesso negado: professor da unidade ${currentUser.unidade} não pode despachar para ${payload.unidade}.`,
    };
  }

  activeSubmissionsLock.add(lockKey);

  try {
    const response = await fetch('/api/cgd/ocorrencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        professorId: currentUser.id,
        professorNome: currentUser.nome,
      }),
    });

    let jsonRes: any = null;
    try { jsonRes = await response.json(); } catch { jsonRes = null; }

    if (!response.ok || !jsonRes?.success) {
      const mensagem = jsonRes?.error || jsonRes?.mensagem || `Servidor retornou HTTP ${response.status}.`;
      return {
        success: false,
        status: response.status === 409 ? 'REQUER_REENVIO' : 'ERRO',
        mensagem: `O CGD não confirmou o despacho: ${mensagem}`,
      };
    }

    const statusBackend = String(jsonRes.status || '').toUpperCase();
    const backendConfirmouEnvio = statusBackend === 'ENVIADO' && Boolean(jsonRes.protocolo || jsonRes.dados?.protocolo);

    if (!backendConfirmouEnvio) {
      return {
        success: false,
        status: statusBackend === 'PENDENTE' ? 'PENDENTE' : 'REQUER_REENVIO',
        mensagem: jsonRes.mensagem || 'Payload aceito pelo backend, mas o CGD não confirmou o despacho real. Nenhum protocolo foi inventado.',
      };
    }

    const protocolo = jsonRes.protocolo || jsonRes.dados?.protocolo;
    const dataSincronizacao = jsonRes.dataSincronizacao || jsonRes.dados?.dataSincronizacao || new Date().toLocaleString('pt-BR');

    if (supabase) {
      const { error } = await supabase.from('ocorrencias_cgd').upsert({
        contrato: payload.contrato,
        aluno_nome: payload.alunoNome,
        status_tratativa: payload.statusTratativa === 'concluido' ? 'CONCLUÍDO' : payload.statusTratativa === 'em_andamento' ? 'EM ANDAMENTO' : 'PENDENTE',
        anotacao: payload.descricao,
        reposicao_agendada: payload.tratativaAplicada === 'aulao' || payload.tratativaAplicada === 'atividade_pratica',
        protocolo_cgd: protocolo,
        sincronizado_cgd: true,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'contrato' });

      if (error) console.warn('Auditoria CGD no Supabase não gravada:', error.message);
    }

    return {
      success: true,
      status: 'ENVIADO',
      protocolo,
      dataSincronizacao,
      mensagem: 'O CGD confirmou o despacho da ocorrência.',
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'ERRO',
      mensagem: err?.message || 'Falha de comunicação com o backend CGD.',
    };
  } finally {
    activeSubmissionsLock.delete(lockKey);
  }
}
