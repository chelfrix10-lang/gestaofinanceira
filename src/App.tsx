/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import InvoiceExplorer from './components/InvoiceExplorer';
import TransactionForm from './components/TransactionForm';
import AIChat from './components/AIChat';
import GithubSync from './components/GithubSync';
import { FinancialData, ChatMessage, BankAccount } from './types';
import { Loader2, Bot, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RAW_CSV_DATA } from './data/raw_data';
import { isFirebaseConfigured, loadFromFirebase, saveToFirebase } from './firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Helper to replicate server-side summary recalculation on the offline client
  const recalculateLocalSummary = (data: FinancialData) => {
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
  };

  // Helper to generate a highly responsive offline financial assistant reply
  const getOfflineAIResponse = (message: string, history: any[]): { reply: string; isNoKey?: boolean } => {
    const query = message.toLowerCase();
    
    if (query.includes('ola') || query.includes('olá') || query.includes('oi') || query.includes('bom dia') || query.includes('boa tarde') || query.includes('boa noite')) {
      return {
        reply: `Olá! Sou seu **Assistente de Finanças Pessoais** offline. 🌟
        
Estou operando a partir do banco de dados local armazenado diretamente no seu navegador (**localStorage**).

Como posso ajudar você hoje com seus resumos de faturas, verificação de saldos, ou dicas de economia?`
      };
    }
    
    if (query.includes('saldo') || query.includes('quanto tenho') || query.includes('dinheiro') || query.includes('bruto') || query.includes('liquido') || query.includes('líquido')) {
      const bruto = financialData?.summary.saldoBrutoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
      const liquido = financialData?.summary.saldoLiquidoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
      const despesas = financialData?.summary.despesasMensais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
      
      return {
        reply: `### 📊 Resumo do seu Orçamento Local
        
- **Saldo Bruto Total:** \`${bruto}\` (soma acumulada de suas contas ativas).
- **Despesas de Fatura:** \`${despesas}\` (gastos já debitados).
- **Saldo Líquido Estimado:** \`${liquido}\` (dinheiro restante disponível).

É possível conferir oscilações nas faturas selecionando os meses no painel de **Visão Geral**.`
      };
    }
    
    if (query.includes('gasto') || query.includes('gastar') || query.includes('despesa') || query.includes('fatura') || query.includes('compras')) {
      const despesas = financialData?.summary.despesasMensais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
      const count = financialData?.transactions.length || 0;
      
      return {
        reply: `### 💳 Monitoramento de Gastos
        
Seu acumulado atual é de **${despesas}** distribuído em **${count}** transações.

*Dicas para manter o orçamento equilibrado:*
1. Remova cobranças duplicadas ou desmarque reembolsos marcando ou desmarcando a caixa de débito no **Histórico de Faturas**.
2. Adicione novas compras para simular simulações na aba **Adicionar Despesa**.`
      };
    }

    if (query.includes('hosped') || query.includes('hospedar') || query.includes('netlify') || query.includes('firebase') || query.includes('vercel') || query.includes('erro') || query.includes('servidor') || query.includes('conex')) {
      return {
        reply: `### 🌐 Notas sobre Hospedagem e Cloud do Sistema
        
O sistema de Finanças Pessoais se adapta dinamicamente à sua infraestrutura:
        
1. **Atualmente em Netlify/Static Hosting:** O Netlify serve apenas os arquivos estáticos compilados do react. Graças ao nosso recurso de **resiliência local**, seu orçamento funciona 100% de forma offline pelo **localStorage**.
2. **Sincronização em Nuvem (Multi-dispositivos):**
   - **GitHub Backup:** Vá na aba **Sincronização no GitHub** onde você pode exportar e puxar backups de Gists Privados 100% gratuitamente.
   - **Firebase Integration:** Se desejar uma persistência autêntica e em nuvem automática, basta criar um projeto grátis no Firebase Console e salvar as chaves de API nos segredos (**Secrets**) da sua plataforma de desenvolvimento!`
      };
    }

    return {
      reply: `Excelente pergunta! Percebi que você está interessado na análise de: *"${message}"*.

Como estou rodando em **modo offline resiliente** para garantir que você não perca acesso ao painel de faturas (mesmo que um servidor backend esteja inativo), estou operando a partir do banco de dados local.

**Você pode me perguntar sobre:**
- **"Qual o meu saldo?"** para detalhes das contas bancárias.
- **"Quais são meus gastos?"** para auditar despesas.
- **"Como posso salvar em nuvem?"** para ver instruções do GitHub/Firebase.`
    };
  };

  // Fetch all initial parsed financial statements on app mount
  const fetchFinancialData = async () => {
    try {
      // 1. Try loading from Firestore first if configured
      if (isFirebaseConfigured) {
        const firebaseData = await loadFromFirebase();
        if (firebaseData) {
          setFinancialData(firebaseData);
          localStorage.setItem('user_financial_data', JSON.stringify(firebaseData));
          
          try {
            await fetch('/api/sync/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: firebaseData }),
            });
          } catch (e) {
            console.warn("Backend rest sync skipped: running in serverless environment.");
          }
          setLoading(false);
          return;
        }
      }

      // Check for localStorage cached data
      const localDataStr = localStorage.getItem('user_financial_data');
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr);
          if (localData && localData.transactions && localData.bankAccounts) {
            setFinancialData(localData);
            setLoading(false);
            
            // Background try to sync backend if active
            fetch('/api/sync/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: localData }),
            }).catch(() => {});
            return;
          }
        } catch (e) {
          console.error("Local storage sync error:", e);
        }
      }

      // 2. Default fallback to server JSON disk database
      const response = await fetch('/api/data');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Retorno não-JSON de API.');
      }
      
      const json = await response.json();
      if (json.success) {
        setFinancialData(json.data);
        localStorage.setItem('user_financial_data', JSON.stringify(json.data));
        if (isFirebaseConfigured) {
          await saveToFirebase(json.data);
        }
      } else {
        throw new Error('Erro ao ler a base de dados do provedor.');
      }
    } catch (err: any) {
      console.warn("Conexão direta com servidor indisponível. Carregando parseador local CSV:", err.message);
      
      try {
        const localDataStr = localStorage.getItem('user_financial_data');
        let localData;
        if (localDataStr) {
          localData = JSON.parse(localDataStr);
        } else {
          const { parseFinancialData } = await import('./utils/parser');
          localData = parseFinancialData(RAW_CSV_DATA);
          localStorage.setItem('user_financial_data', JSON.stringify(localData));
        }

        if (localData) {
          setFinancialData(localData);
          if (isFirebaseConfigured) {
            await saveToFirebase(localData);
          }
        } else {
          setErrorMsg('Erro crítico ao instanciar os dados offline do sistema.');
        }
      } catch (nestedErr: any) {
        setErrorMsg(`Falha de recuperação local offline: ${nestedErr.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Sync manual spending inputs to Backend Cache
  const handleAddTransaction = async (data: {
    local: string;
    value: number;
    date: string;
    card: string;
    category: string;
    form: string;
    month: string;
    year: number;
    debited?: boolean;
  }): Promise<boolean> => {
    const newTx = {
      id: `custom-${Date.now()}`,
      local: data.local,
      date: data.date || new Date().toLocaleDateString('pt-BR'),
      year: Number(data.year) || 2026,
      month: data.month || 'Junho',
      form: data.form || 'À Vista',
      value: Number(data.value),
      card: data.card,
      category: data.category || 'Outros & Transferências',
      isMom: data.local.toLowerCase().includes('(mãe)'),
      debited: data.debited === true,
    };

    // Optimistic Local mutation
    let localUpdatedData: any = null;
    if (financialData) {
      const copy = JSON.parse(JSON.stringify(financialData));
      copy.transactions.unshift(newTx);
      recalculateLocalSummary(copy);
      localUpdatedData = copy;
      setFinancialData(localUpdatedData);
      localStorage.setItem('user_financial_data', JSON.stringify(localUpdatedData));
      if (isFirebaseConfigured) {
        saveToFirebase(localUpdatedData).catch(() => {});
      }
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.success) {
          setFinancialData(json.data);
          localStorage.setItem('user_financial_data', JSON.stringify(json.data));
          if (isFirebaseConfigured) {
            await saveToFirebase(json.data);
          }
        }
      }
    } catch (err) {
      console.warn("Server transaction synchronization bypassed, functioning locally.");
    }
    return true;
  };

  // Update categories of transactions on dropdown selection
  const handleUpdateCategory = async (id: string, newCategory: string) => {
    let localUpdatedData: any = null;
    if (financialData) {
      const copy = JSON.parse(JSON.stringify(financialData));
      const tx = copy.transactions.find((t: any) => t.id === id);
      if (tx) {
        tx.category = newCategory;
        localUpdatedData = copy;
        setFinancialData(localUpdatedData);
        localStorage.setItem('user_financial_data', JSON.stringify(localUpdatedData));
        if (isFirebaseConfigured) {
          saveToFirebase(localUpdatedData).catch(() => {});
        }
      }
    }

    try {
      const response = await fetch(`/api/transactions/${id}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.success) {
          setFinancialData(json.data);
          localStorage.setItem('user_financial_data', JSON.stringify(json.data));
          if (isFirebaseConfigured) {
            await saveToFirebase(json.data);
          }
        }
      }
    } catch (err) {
      console.warn("Category update sync bypassed, functioning locally.");
    }
  };

  // Update debited status of a transaction
  const handleUpdateDebited = async (id: string, debited: boolean) => {
    let localUpdatedData: any = null;
    if (financialData) {
      const copy = JSON.parse(JSON.stringify(financialData));
      const tx = copy.transactions.find((t: any) => t.id === id);
      if (tx) {
        tx.debited = debited;
        recalculateLocalSummary(copy);
        localUpdatedData = copy;
        setFinancialData(localUpdatedData);
        localStorage.setItem('user_financial_data', JSON.stringify(localUpdatedData));
        if (isFirebaseConfigured) {
          saveToFirebase(localUpdatedData).catch(() => {});
        }
      }
    }

    try {
      const response = await fetch(`/api/transactions/${id}/debited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debited }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.success) {
          setFinancialData(json.data);
          localStorage.setItem('user_financial_data', JSON.stringify(json.data));
          if (isFirebaseConfigured) {
            await saveToFirebase(json.data);
          }
        }
      }
    } catch (err) {
      console.warn("Debited status update sync bypassed, functioning locally.");
    }
  };

  // Update bank accounts balances
  const handleUpdateBankAccounts = async (updatedAccounts: BankAccount[]) => {
    let localUpdatedData: any = null;
    if (financialData) {
      const copy = JSON.parse(JSON.stringify(financialData));
      copy.bankAccounts = updatedAccounts;
      recalculateLocalSummary(copy);
      localUpdatedData = copy;
      setFinancialData(localUpdatedData);
      localStorage.setItem('user_financial_data', JSON.stringify(localUpdatedData));
      if (isFirebaseConfigured) {
        saveToFirebase(localUpdatedData).catch(() => {});
      }
    }

    try {
      if (localUpdatedData) {
        const response = await fetch('/api/sync/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: localUpdatedData }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (json.success) {
            setFinancialData(json.data);
            localStorage.setItem('user_financial_data', JSON.stringify(json.data));
            if (isFirebaseConfigured) {
              await saveToFirebase(json.data);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Server accounts balance sync bypassed, functioning locally.");
    }
  };

  // Reset to static CSV state from backend memory
  const handleResetData = async () => {
    setResetLoading(true);
    
    // Perform local client-side restore first
    try {
      const { parseFinancialData } = await import('./utils/parser');
      const freshData = parseFinancialData(RAW_CSV_DATA);
      setFinancialData(freshData);
      localStorage.setItem('user_financial_data', JSON.stringify(freshData));
      if (isFirebaseConfigured) {
        await saveToFirebase(freshData);
      }
    } catch (e) {
      console.error("Local reset failed:", e);
    }

    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json.success) {
          setFinancialData(json.data);
          localStorage.setItem('user_financial_data', JSON.stringify(json.data));
          if (isFirebaseConfigured) {
            await saveToFirebase(json.data);
          }
        }
      }
    } catch (err) {
      console.warn("Reset sync bypassed, reset carried out client-side.");
    } finally {
      setResetLoading(false);
    }
  };

  // Interface route logic to trigger GPT-like model responses
  const handleSendMessage = async (
    message: string,
    history: ChatMessage[]
  ): Promise<{ reply: string; isNoKey?: boolean }> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Retorno serverless offline');
      }
      return await response.json();
    } catch (e) {
      console.warn("Server chat error. Returning offline budget assistant reply:", e);
      return getOfflineAIResponse(message, history);
    }
  };

  // Total accumulated spent for header display
  const totalSpent = useMemo(() => {
    return financialData?.transactions.filter(t => t.debited !== false).reduce((acc, t) => acc + t.value, 0) || 0;
  }, [financialData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-zinc-950" size={32} />
        <span className="text-sm text-zinc-500 font-semibold uppercase tracking-wider">Carregando painéis de faturas...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4 max-w-md mx-auto px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
          <AlertTriangle size={26} />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 leading-tight">Servidor Inativo</h2>
        <p className="text-xs text-zinc-500 leading-normal">{errorMsg}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-zinc-950 text-white rounded-xl py-2.5 px-5 font-semibold text-xs shadow-md mt-2"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onResetData={handleResetData}
        resetLoading={resetLoading}
        totalSpent={totalSpent}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentTab === 'overview' && financialData && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard
                transactions={financialData.transactions}
                bankAccounts={financialData.bankAccounts}
                summary={financialData.summary}
                onSelectTab={setCurrentTab}
                onUpdateBankAccounts={handleUpdateBankAccounts}
              />
            </motion.div>
          )}

          {currentTab === 'history' && financialData && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <InvoiceExplorer
                transactions={financialData.transactions}
                onUpdateCategory={handleUpdateCategory}
                onUpdateDebited={handleUpdateDebited}
                categories={financialData.categories}
              />
            </motion.div>
          )}

          {currentTab === 'add' && financialData && (
            <motion.div
              key="add-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <TransactionForm
                onAddTransaction={handleAddTransaction}
                categories={financialData.categories}
              />
            </motion.div>
          )}

          {currentTab === 'ai-chat' && (
            <motion.div
              key="ai-chat-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <AIChat onSendMessage={handleSendMessage} />
            </motion.div>
          )}

          {currentTab === 'github' && financialData && (
            <motion.div
              key="github-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <GithubSync 
                financialData={financialData}
                onRestoreData={(newData) => setFinancialData(newData)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
