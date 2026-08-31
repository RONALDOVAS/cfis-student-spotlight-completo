import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middlewares para parsing de corpo de requisições
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// API ROUTES (SERVER-SIDE SEGURA)
// ============================================================================

// 1. Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    servico: 'CFIS Student Spotlight Backend',
    timestamp: new Date().toISOString(),
  });
});

// 2. Status da Configuração CGD (Sem expor credenciais)
app.get('/api/cgd/status', (_req: Request, res: Response) => {
  const cgdBaseUrl = process.env.CGD_BASE_URL || 'https://app.cgd.com.br';
  const filialConfigured = Boolean(
    process.env.CGD_FILIAL_USERNAME && process.env.CGD_FILIAL_PASSWORD
  );
  const matrizConfigured = Boolean(
    process.env.CGD_MATRIZ_USERNAME && process.env.CGD_MATRIZ_PASSWORD
  );
  const generalConfigured = Boolean(
    process.env.CGD_USERNAME && process.env.CGD_PASSWORD
  );

  res.json({
    cgdBaseUrl,
    filialPronta: filialConfigured || generalConfigured,
    matrizPronta: matrizConfigured || generalConfigured,
    autenticacaoRealHabilitada: filialConfigured || matrizConfigured || generalConfigured,
    ambiente: process.env.NODE_ENV || 'development',
  });
});

// 3. Endpoint Server-Side de Recepção e Preparação de Ocorrência CGD
// POST /api/cgd/ocorrencias
app.post('/api/cgd/ocorrencias', async (req: Request, res: Response) => {
  try {
    const {
      alunoId,
      alunoNome,
      contrato,
      curso,
      turmaNome,
      professorId,
      professorNome,
      tipo,
      titulo,
      descricao,
      tratativaAplicada,
      statusTratativa,
      unidade,
    } = req.body;

    // A. Validação de Campos Obrigatórios
    if (!contrato || typeof contrato !== 'string' || !contrato.trim()) {
      return res.status(400).json({
        success: false,
        status: 'ERRO',
        error: 'Campo obrigatório ausente: contrato.',
      });
    }

    if (!alunoNome || typeof alunoNome !== 'string' || !alunoNome.trim()) {
      return res.status(400).json({
        success: false,
        status: 'ERRO',
        error: 'Campo obrigatório ausente: alunoNome.',
      });
    }

    if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
      return res.status(400).json({
        success: false,
        status: 'ERRO',
        error: 'Campo obrigatório ausente: descricao da tratativa.',
      });
    }

    // B. Validação da Unidade (Filial vs Matriz)
    const normalizedUnidade = unidade?.toLowerCase() === 'matriz' ? 'matriz' : 'filial';

    // C. Verificação da Configuração de Credenciais Server-Side (sem expor credenciais)
    const cgdBaseUrl = process.env.CGD_BASE_URL || 'https://app.cgd.com.br';
    const cgdUser =
      normalizedUnidade === 'matriz'
        ? process.env.CGD_MATRIZ_USERNAME || process.env.CGD_USERNAME
        : process.env.CGD_FILIAL_USERNAME || process.env.CGD_USERNAME;
    const cgdPass =
      normalizedUnidade === 'matriz'
        ? process.env.CGD_MATRIZ_PASSWORD || process.env.CGD_PASSWORD
        : process.env.CGD_FILIAL_PASSWORD || process.env.CGD_PASSWORD;

    const credentialsAvailable = Boolean(cgdUser && cgdPass);

    // D. Estruturação da Solicitação para a Etapa de Integração Real
    const timestamp = new Date().toISOString();
    const dataFormatada = new Date().toLocaleString('pt-BR');

    // Se as credenciais do CGD ainda não estiverem injetadas no ambiente server-side,
    // o backend valida os dados, estrutura a solicitação com sucesso e sinaliza o estado PENDENTE para envio.
    if (!credentialsAvailable) {
      return res.status(200).json({
        success: true,
        status: 'PENDENTE',
        mensagem:
          'Payload recebido e validado pela API server-side. Aguardando injeção das credenciais institucionais do CGD no ambiente seguro para despacho direto.',
        dados: {
          alunoId: alunoId || null,
          alunoNome: alunoNome.trim(),
          contrato: contrato.trim(),
          unidade: normalizedUnidade,
          curso: curso || '',
          turmaNome: turmaNome || '',
          professorId: professorId || '',
          professorNome: professorNome || '',
          tipo: tipo || 'pedagogica',
          titulo: titulo || `Ocorrência Pedagógica - ${contrato}`,
          descricao: descricao.trim(),
          tratativaAplicada: tratativaAplicada || 'normal',
          statusTratativa: statusTratativa || 'pendente',
          cgdBaseUrl,
          autenticacaoRealConfigurada: false,
          dataRecebimento: timestamp,
          dataSincronizacao: dataFormatada,
        },
      });
    }

    // E. Estrutura pronta para acoplamento da sessão e despacho HTTP POST real
    return res.status(200).json({
      success: true,
      status: 'PENDENTE',
      mensagem:
        'Payload validado pelo backend. Credenciais institucionais identificadas para a unidade alvo.',
      dados: {
        contrato: contrato.trim(),
        alunoNome: alunoNome.trim(),
        unidade: normalizedUnidade,
        autenticacaoRealConfigurada: true,
        dataRecebimento: timestamp,
        dataSincronizacao: dataFormatada,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno no processamento server-side';
    console.error('Erro na rota /api/cgd/ocorrencias:', errorMsg);
    return res.status(500).json({
      success: false,
      status: 'ERRO',
      error: 'Falha interna no servidor ao processar a ocorrência para o CGD.',
    });
  }
});

// ============================================================================
// VITE MIDDLEWARE & STATIC SERVING
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CFIS Server] Servidor backend ativo na porta ${PORT}`);
  });
}

startServer();
