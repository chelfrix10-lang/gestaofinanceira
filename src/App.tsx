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
import { FinancialData, ChatMessage } from './types';
import { Loader2, Bot, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isFirebaseConfigured, loadFromFirebase, saveToFirebase } from './firebase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Fetch all initial parsed financial statements on app mount
  const fetchFinancialData = async () => {
    try {
      // 1. Try loading from Firestore first if configured
      if (isFirebaseConfigured) {
        const firebaseData = await loadFromFirebase();
        if (firebaseData) {
          setFinancialData(firebaseData);
          // Sync backend JSON store as cache with Firebase content
          await fetch('/api/sync/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: firebaseData }),
          });
          setLoading(false);
          return;
        }
      }

      // 2. Default fallback to server JSON disk database
      const response = await fetch('/api/data');
      const json = await response.json();
      if (json.success) {
        setFinancialData(json.data);
        // If Firebase is configured but empty on Firestore, initialize/seed it with server cache
        if (isFirebaseConfigured) {
          await saveToFirebase(json.data);
        }
      } else {
        setErrorMsg('Erro ao ler a base de dados.');
      }
    } catch (err: any) {
      setErrorMsg(`Falha de conexão com o servidor: ${err.message}`);
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
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await response.json();
      if (json.success) {
        setFinancialData(json.data);
        if (isFirebaseConfigured) {
          await saveToFirebase(json.data);
        }
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Update categories of transactions on dropdown selection
  const handleUpdateCategory = async (id: string, newCategory: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });
      const json = await response.json();
      if (json.success) {
        setFinancialData(json.data);
        if (isFirebaseConfigured) {
          await saveToFirebase(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update debited status of a transaction
  const handleUpdateDebited = async (id: string, debited: boolean) => {
    try {
      const response = await fetch(`/api/transactions/${id}/debited`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debited }),
      });
      const json = await response.json();
      if (json.success) {
        setFinancialData(json.data);
        if (isFirebaseConfigured) {
          await saveToFirebase(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset to static CSV state from backend memory
  const handleResetData = async () => {
    setResetLoading(true);
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      const json = await response.json();
      if (json.success) {
        setFinancialData(json.data);
        if (isFirebaseConfigured) {
          await saveToFirebase(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };


  // Interface route logic to trigger GPT-like model responses
  const handleSendMessage = async (
    message: string,
    history: ChatMessage[]
  ): Promise<{ reply: string; isNoKey?: boolean }> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    return await response.json();
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
