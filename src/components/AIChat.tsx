/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Markdown from 'react-markdown';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  HelpCircle, 
  Trash2, 
  BrainCircuit,
  MessageCircleQuestion,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIChatProps {
  onSendMessage: (message: string, history: ChatMessage[]) => Promise<{ reply: string; isNoKey?: boolean }>;
}

const PRESET_PROMPTS = [
  { label: '🛒 Gastos no São Jorge', text: 'Quanto gastei com as compras no São Jorge Supermercados no total?' },
  { label: '🏆 Maior gasto de 2025', text: 'Qual foi o meu maior gasto registrado em 2025?' },
  { label: '🙋‍♀️ Fatura da Mãe', text: 'Quanto gastei no total em compras para a minha mãe (contendo Mãe ou Mãe)? Detalhe algumas compras.' },
  { label: '📊 Faturas em 2026', text: 'Faça um resumo estruturado mês a mês das faturas de 24, 25 e 26. Qual foi o mês de maior gasto?' },
  { label: '🚗 Gastos com Posto/Transp.', text: 'Quanto gastei com Posto JB e combustível no histórico total? Faça uma tabela.' },
];

const LOADING_STEPS = [
  'Analisando registros de faturas da base...',
  'Filtrando transações relevantes no histórico...',
  'Calculando somas exatas no servidor...',
  'Gerando relatório estruturado com o Gemini AI...',
];

export default function AIChat({ onSendMessage }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Olá! Sou o seu consultor inteligente de finanças pessoais.\n\nFui carregado com todos os dados de suas faturas dos cartões de crédito (Nubank, Inter e Neon) de 2024 a 2026, além dos seus saldos em conta.\n\nVocê pode me fazer perguntas diretas sobre o orçamento. Por exemplo:\n- *"Quanto gastei com farmácia?"*\n- *"Qual foi o maior gasto de 2025 e em qual cartão?"*\n- *"Resuma as compras que fiz para a minha mãe."*\n\nComo posso ajudar você a otimizar suas finanças hoje?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Rotate loading instructions during AI gen for nice feeling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      // Send message along with user history context (excluding first welcome)
      const queryHistory = messages.filter(m => m.id !== 'welcome');
      const response = await onSendMessage(textToSend, queryHistory);

      const aiMsg: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        role: 'model',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        role: 'model',
        content: 'Ops, tive uma falha ao conectar com o serviço de processamento inteligente. Por favor, tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: 'Histórico de chat limpo. Sou o seu assistente inteligente. Como posso analisar o seu orçamento pessoal agora?',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  return (
    <div id="ai-chat-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-230px)] min-h-[500px]">
      
      {/* Suggestions and info on left (Col-4) */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto pr-1">
        
        {/* Suggestion Chips Box */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-55 text-sm flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500" /> Perguntas Frequentes
          </h4>
          <p className="text-xs text-zinc-550 dark:text-zinc-450 font-sans">Clique em qualquer sugestão sugerida para extrair relatórios diretamente da Inteligência Artificial:</p>
          <div className="flex flex-col gap-2">
            {PRESET_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSend(p.text)}
                disabled={loading}
                className="w-full text-left py-2.5 px-3 border border-zinc-150 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-750 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer block truncate"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Security explanation box */}
        <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-5 space-y-3 shadow-md flex-1">
          <div className="flex items-center gap-2 text-amber-400">
            <BrainCircuit size={18} />
            <span className="font-semibold text-xs uppercase tracking-wider">Como o modelo funciona</span>
          </div>
          <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
            <p>O Assistente utiliza o modelo <strong>Gemini 3.5 Flash</strong> diretamente no servidor, garantindo privacidade e agilidade nas consultas.</p>
            <p>Em cada pergunta, o motor de IA correlaciona registros históricos completos, faturas mensais agregadas e novas transações criadas por você para deduzir somas exatas, tabelas e respostas.</p>
          </div>
        </div>

      </div>

      {/* Main Chat Feed on right (Col-8) */}
      <div className="lg:col-span-8 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm h-full overflow-hidden">
        
        {/* Chat Feed Header */}
        <div className="p-4 border-b border-zinc-50 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 flex items-center justify-center font-bold">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Consultor Inteligente</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Análise estruturada de despesas com Gemini 3.5 Flash</p>
            </div>
          </div>
          
          <button 
            onClick={clearChat}
            className="text-zinc-400 hover:text-rose-500 p-2 rounded-xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
            title="Limpar Conversa"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Message scroll container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const isAi = m.role === 'model';
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[85%] ${isAi ? 'self-start' : 'self-end flex-row-reverse ml-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs ${
                    isAi ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700' : 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950'
                  }`}>
                    {isAi ? <Bot size={14} /> : <User size={14} />}
                  </div>

                  <div className="space-y-1">
                    <div className={`rounded-2xl p-4 text-sm ${
                      isAi 
                        ? 'bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200' 
                        : 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-medium shadow-sm'
                    }`}>
                      {isAi ? (
                        <div className="markdown-body text-zinc-850 dark:text-zinc-200">
                          <Markdown>{m.content}</Markdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      )}
                    </div>
                    <span className={`text-[9px] text-zinc-400 font-mono block ${isAi ? 'text-left' : 'text-right'}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Thinking skeleton */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[80%]"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-650 dark:text-zinc-350">
                  <Bot size={14} />
                </div>
                <div className="space-y-2">
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-zinc-600 dark:text-zinc-400" />
                    <span>{LOADING_STEPS[loadingStepIndex]}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input prompt footer */}
        <div className="p-4 border-t border-zinc-50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte ao Gemini: 'Quanto gastei no Nubank em 2025?'"
              className="flex-1 px-4 py-3 bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-700 rounded-xl text-xs text-zinc-750 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-600 placeholder-zinc-400 dark:placeholder-zinc-500 font-medium"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className={`p-3 rounded-xl shadow-md flex items-center justify-center text-white transition-all ${
                !inputValue.trim() || loading 
                  ? 'bg-zinc-300 dark:bg-zinc-800 cursor-not-allowed shadow-none' 
                  : 'bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-900 dark:hover:bg-zinc-250 text-white dark:text-zinc-950 active:scale-95 cursor-pointer'
              }`}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

      </div>

      </div>
    );
  }
