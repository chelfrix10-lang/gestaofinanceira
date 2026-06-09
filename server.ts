/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { RAW_CSV_DATA } from './src/data/raw_data';
import { parseFinancialData } from './src/utils/parser';
import { Transaction } from './src/types';

import fs from 'fs';

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'database.json');

// Memory state loaded from local JSON file if exists, otherwise fallback to CSV parsing
let parsedData: any;
try {
  if (fs.existsSync(DB_FILE_PATH)) {
    const rawContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    parsedData = JSON.parse(rawContent);
    if (!parsedData.updatedAt) {
      parsedData.updatedAt = Date.now();
    }
  } else {
    parsedData = parseFinancialData(RAW_CSV_DATA);
    parsedData.updatedAt = Date.now();
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(parsedData, null, 2), 'utf-8');
  }
} catch (error) {
  console.error("Erro ao carregar o banco de dados JSON, usando os dados padrão:", error);
  parsedData = parseFinancialData(RAW_CSV_DATA);
  parsedData.updatedAt = Date.now();
}

// Helper to save server-side JSON database state to disk
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(parsedData, null, 2), 'utf-8');
  } catch (error) {
    console.error("Erro ao persistir o banco de dados JSON no disco:", error);
  }
}

// Helper to recalculate summary based on debited state of custom and original transactions
function recalculateSummary(data: typeof parsedData) {
  const totalAccountBalance = data.bankAccounts.reduce((acc, b) => {
    const extrasSum = b.extras ? b.extras.reduce((s, e) => s + e, 0) : 0;
    return acc + b.value + extrasSum;
  }, 0);

  const totalSpent = data.transactions.filter(t => t.debited !== false).reduce((acc, t) => acc + t.value, 0);

  const customTxs = data.transactions.filter(t => t.id.startsWith('custom-'));
  const debitedCustomTxsSum = customTxs.filter(t => t.debited).reduce((acc, t) => acc + t.value, 0);

  data.summary.saldoBrutoTotal = totalAccountBalance - debitedCustomTxsSum;
  data.summary.despesasMensais = totalSpent;
  data.summary.saldoLiquidoTotal = (totalAccountBalance - debitedCustomTxsSum) - totalSpent;
}

// Lazy-loaded Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_MISSING');
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get all financial data
  app.get('/api/data', (req, res) => {
    try {
      res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Reset to initial data
  app.post('/api/reset', (req, res) => {
    try {
      parsedData = parseFinancialData(RAW_CSV_DATA);
      parsedData.updatedAt = Date.now();
      saveDatabase();
      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Sync and restore entire database from backup
  app.post('/api/sync/restore', (req, res) => {
    try {
      const { data, force } = req.body;
      if (!data || typeof data !== 'object' || !data.transactions || !data.bankAccounts) {
        return res.status(400).json({ success: false, error: 'Dados de backup inválidos ou mal estruturados.' });
      }
      
      const serverTime = parsedData.updatedAt || 0;
      const clientTime = data.updatedAt || 0;
      
      // If the client's backup payload is older than the server's current state, do not overwrite it!
      if (!force && clientTime < serverTime) {
        return res.json({
          success: false,
          conflict: true,
          serverData: parsedData,
          message: 'O servidor possui dados mais recentes.'
        });
      }
      
      parsedData = data;
      if (!parsedData.updatedAt) {
        parsedData.updatedAt = Date.now();
      }
      recalculateSummary(parsedData);
      saveDatabase();
      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Add a new transaction or bulk transactions
  app.post('/api/transactions', (req, res) => {
    try {
      const payload = req.body;
      
      if (Array.isArray(payload)) {
        const addedTxs: Transaction[] = [];
        payload.forEach((item, index) => {
          const { local, date, month, year, form, value, card, category, debited } = item;
          if (local && value && card) {
            addedTxs.push({
              id: `custom-${Date.now()}-${index}`,
              local,
              date: date || new Date().toLocaleDateString('pt-BR'),
              year: parseInt(year) || 2026,
              month: month || 'Junho',
              form: form || 'À Vista',
              value: parseFloat(value),
              card,
              category: category || 'Outros & Transferências',
              isMom: local.toLowerCase().includes('(mãe)'),
              debited: debited === true || debited === 'true',
            });
          }
        });

        if (addedTxs.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Nenhum lançamento válido enviado.',
          });
        }

        parsedData.transactions = [...addedTxs, ...parsedData.transactions];
        parsedData.updatedAt = Date.now();
        recalculateSummary(parsedData);
        saveDatabase();
        return res.json({ success: true, transactions: addedTxs, data: parsedData });
      } else {
        const { local, date, month, year, form, value, card, category, debited } = payload;
        
        if (!local || !value || !card) {
          return res.status(400).json({
            success: false,
            error: 'Local, Valor e Cartão são campos obrigatórios.',
          });
        }

        const newTx: Transaction = {
          id: `custom-${Date.now()}`,
          local,
          date: date || new Date().toLocaleDateString('pt-BR'),
          year: parseInt(year) || 2026,
          month: month || 'Junho',
          form: form || 'À Vista',
          value: parseFloat(value),
          card,
          category: category || 'Outros & Transferências',
          isMom: local.toLowerCase().includes('(mãe)'),
          debited: debited === true || debited === 'true',
        };

        parsedData.transactions.unshift(newTx);
        parsedData.updatedAt = Date.now();
        recalculateSummary(parsedData);
        saveDatabase();

        return res.json({ success: true, transaction: newTx, data: parsedData });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Edit category of an existing transaction
  app.put('/api/transactions/:id/category', (req, res) => {
    try {
      const { id } = req.params;
      const { category } = req.body;

      const tx = parsedData.transactions.find((t) => t.id === id);
      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transação não encontrada.' });
      }

      tx.category = category;
      parsedData.updatedAt = Date.now();
      saveDatabase();
      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Edit debited status of an existing transaction
  app.put('/api/transactions/:id/debited', (req, res) => {
    try {
      const { id } = req.params;
      const { debited } = req.body;

      const tx = parsedData.transactions.find((t) => t.id === id);
      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transação não encontrada.' });
      }

      tx.debited = debited === true || debited === 'true';

      parsedData.updatedAt = Date.now();

      // Recalculate summary dynamically
      recalculateSummary(parsedData);
      saveDatabase();

      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Delete a transaction
  app.delete('/api/transactions/:id', (req, res) => {
    try {
      const { id } = req.params;

      const initialLength = parsedData.transactions.length;
      parsedData.transactions = parsedData.transactions.filter((t) => t.id !== id);

      if (parsedData.transactions.length === initialLength) {
        return res.status(404).json({ success: false, error: 'Transação não encontrada.' });
      }

      parsedData.updatedAt = Date.now();

      // Recalculate summary dynamically
      recalculateSummary(parsedData);
      saveDatabase();

      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: AI Assistant chat
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, error: 'Mensagem vazia.' });
      }

      let aiClient;
      try {
        aiClient = getGeminiClient();
      } catch (err: any) {
        if (err.message === 'GEMINI_API_KEY_MISSING') {
          return res.json({
            success: true,
            reply: 'Olá! Sou seu assistente de finanças pessoais. Reparei que a chave API (**GEMINI_API_KEY**) ainda não foi configurada nos painéis de segredos de desenvolvimento ou produção da plataforma. Para que possamos conversar com inteligência, configure-a no painel lateral de **Secrets**.',
            isNoKey: true,
          });
        }
        throw err;
      }

      // We serialize the entire budget & transactions list cleanly as prompt context.
      // To keep tokens under control but still provide high accuracy:
      // We will summarize the dataset for the model.
      const bankSummaryStr = parsedData.bankAccounts
        .map((b) => `- ${b.name}: R$ ${b.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${b.extras.length ? `(Extras: ${b.extras.join(', ')})` : ''}`)
        .join('\n');

      // Group transactions to give a high-level view
      const totalTxsCount = parsedData.transactions.length;
      
      // Select last 100 transactions or any transaction containing user keywords to ensure exact math context!
      // This is extremely clever: filter transactions that match query keywords to include in the context
      const queryLower = message.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter((w: string) => w.length > 2);
      
      const relevantTxs = parsedData.transactions.filter((tx) => {
        // Always include matches to search terms
        const matchesName = keywords.some((kw: string) => tx.local.toLowerCase().includes(kw));
        const matchesCategory = keywords.some((kw: string) => tx.category.toLowerCase().includes(kw));
        const matchesMonth = keywords.some((kw: string) => tx.month.toLowerCase().includes(kw));
        return matchesName || matchesCategory || matchesMonth;
      });

      // Also get a sample of 40 general transactions
      const sampleTxs = parsedData.transactions.slice(0, 40);
      const combinedTxs = Array.from(new Set([...relevantTxs, ...sampleTxs]));

      const transactionsContextStr = combinedTxs
        .map((t) => `[${t.card}] ${t.date} | ${t.local} | R$ ${t.value.toFixed(2)} | Forma: ${t.form} | Categoria: ${t.category} ${t.isMom ? '(Para Mãe)' : ''}`)
        .join('\n');

      const systemInstruction = `Você é o analisador oficial e especialista de finanças pessoais do usuário.
Sua tarefa é ler atentamente os dados financeiros fornecidos (contas bancárias e transações de faturas de Nubank, Inter e Neon de 2024 a 2026) e responder com extrema precisão, educação e clareza em português do Brasil.

INTRUÇÕES IMPORTANTES:
1. Responda de forma altamente estruturada. Use subtítulos, tabelas em Markdown, negrito ou listas com bullet points.
2. Seja matematicamente preciso. Faça as somas você mesmo com base no contexto relevante de transações anexos.
3. Se o usuário perguntar quanto gastou com algo específico (ex: "São Jorge Supermercados", "iFood", "SHEIN" ou "gasolina"), procure criteriosamente por esses termos na lista de transações fornecida abaixo. Se encontrar, liste cada um com data e valor e dê a soma final!
4. Lembre que o usuário pode adicionar novas transações que têm id começando com "custom-". Considere-as igualmente.
5. Se não houver dados sobre o termo pesquisado, responda educadamente informando que não há registros sobre isso no histórico de faturas atual.
6. Mantenha as respostas focadas e evite floreios. Evite gírias robóticas e jargões excessivos. Adote o tom de um assessor financeiro de primeira linha.
7. Quando apropriado, apresente análises em seções organizadas como "Resumo do Gasto", "Detalhamento das Transações", "Dica Financeira".`;

      const prompt = `Aqui está o resumo financeiro atual do usuário:
Saldos das Contas:
${bankSummaryStr}

Balanço Geral Recente:
- Saldo Bruto Total: R$ ${parsedData.summary.saldoBrutoTotal.toFixed(2)}
- Despesas Mensais: R$ ${parsedData.summary.despesasMensais.toFixed(2)}
- Saldo Líquido Total: R$ ${parsedData.summary.saldoLiquidoTotal.toFixed(2)}

Total de transações no histórico: ${totalTxsCount}
Transações mais relevantes para a consulta recente ou amostra recente:
${transactionsContextStr}

Histórico completo resumido de despesas correspondentes ao filtro:
${relevantTxs.length > 0 ? `Foram encontradas ${relevantTxs.length} transações diretamente casadas com sua dúvida no histórico completo.` : 'Não houve correspondências imediatas com termos de busca nos filtros prévios, favor responder com base na amostra disponível e histórico.'}

Sua conversa com o usuário de finanças:
Histórico de Conversas Prévias (se houver):
${(history || []).map((h: any) => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`).join('\n')}

Pergunta atual do usuário: "${message}"

Por favor, faça uma análise estruturada, calcule as somas corretas e ofereça uma resposta organizada em Markdown.`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1, // Low temp for accurate mathematical extraction
        },
      });

      res.json({
        success: true,
        reply: aiResponse.text || 'Não consegui formular uma resposta adequada.',
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static assets in production or Vite Dev Server in development
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  
  if (isProd) {
    process.env.NODE_ENV = 'production';
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

startServer();
