/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  Tag, 
  Baby, 
  User, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Undo2,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceExplorerProps {
  transactions: Transaction[];
  onUpdateCategory: (id: string, newCategory: string) => Promise<void>;
  onUpdateDebited: (id: string, debited: boolean) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  categories: string[];
}

const ORDERED_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function InvoiceExplorer({ transactions, onUpdateCategory, onUpdateDebited, onDeleteTransaction, categories }: InvoiceExplorerProps) {
  // Extract all unique month-years in chronological/reverse order
  const monthYears = useMemo(() => {
    const list: { month: string; year: number; key: string }[] = [];
    const keys = new Set<string>();

    transactions.forEach(t => {
      const key = `${t.month} ${t.year}`;
      if (!keys.has(key)) {
        keys.add(key);
        list.push({ month: t.month, year: t.year, key });
      }
    });

    // Sort descending by year, then descending by month index
    return list.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return ORDERED_MONTH_NAMES.indexOf(b.month) - ORDERED_MONTH_NAMES.indexOf(a.month);
    });
  }, [transactions]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [onlyMom, setOnlyMom] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<'Inter' | 'Nubank'>('Inter');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Fallback to first available key if current selected doesn't exist anymore or is empty
  const activeMonthKey = useMemo(() => {
    if (monthYears.length === 0) return '';
    const keys = monthYears.map(my => my.key);
    if (!selectedMonthKey || !keys.includes(selectedMonthKey)) {
      return monthYears[0].key;
    }
    return selectedMonthKey;
  }, [monthYears, selectedMonthKey]);

  // Group by chosen month-year key
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      const key = `${t.month} ${t.year}`;
      if (key !== activeMonthKey) return false;

      // Filter by card folder (Inter vs Nubank)
      if (t.card !== activeFolder) return false;

      // Search filters
      const matchesSearch = t.local.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.form.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategory === 'Todos' || t.category === selectedCategory;

      // Mom filter
      const matchesMom = !onlyMom || t.isMom;

      return matchesSearch && matchesCategory && matchesMom;
    });
  }, [transactions, activeMonthKey, searchTerm, selectedCategory, onlyMom, activeFolder]);

  // Statistics for the chosen month bill
  const monthlyStats = useMemo(() => {
    let neonTotal = 0;
    let interTotal = 0;
    let nubankTotal = 0;
    let momTotal = 0;

    transactions.forEach(t => {
      const key = `${t.month} ${t.year}`;
      if (key !== activeMonthKey) return;

      if (t.card === 'Neon') neonTotal += t.value;
      if (t.card === 'Inter') interTotal += t.value;
      if (t.card === 'Nubank') nubankTotal += t.value;
      if (t.isMom) momTotal += t.value;
    });

    const totalBill = neonTotal + interTotal + nubankTotal;

    return {
      neonTotal,
      interTotal,
      nubankTotal,
      momTotal,
      totalBill
    };
  }, [transactions, activeMonthKey]);

  return (
    <div id="explorer-view" className="space-y-6">
      
      {/* Month Selector Horizontal Slider bar */}
      <div id="month-slider-panel" className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm">
        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-3 flex items-center gap-1">
          <SlidersHorizontal size={14} /> Selecione o Mês de Referência
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x [-webkit-overflow-scrolling:touch]">
          {monthYears.map((my) => {
            const isActive = my.key === activeMonthKey;
            return (
              <button
                key={my.key}
                onClick={() => {
                  setSelectedMonthKey(my.key);
                  setSearchTerm('');
                  setSelectedCategory('Todos');
                }}
                className={`snap-center shrink-0 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-zinc-900 text-white shadow-md' 
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-100'
                }`}
              >
                {my.month} {my.year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Left Column Filters & Selected Month stats, Right Column: Transactions list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Summary & Filters Container (Col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Month Statements Board */}
          <div id="month-summary-capsule" className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <span className="text-zinc-600 text-xs font-semibold uppercase tracking-wider block mb-1">Fatura Total do Mês</span>
              <h2 className="text-2xl font-bold text-zinc-900">
                R$ {monthlyStats.totalBill.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-[10px] text-zinc-400 mt-0.5">Soma acumulada de todos os cartões ativos no ciclo</p>
            </div>

            <div className="border-t border-zinc-50 pt-3 space-y-2.5">
              {monthlyStats.nubankTotal > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Nubank
                  </span>
                  <span className="font-semibold text-zinc-800">
                    R$ {monthlyStats.nubankTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {monthlyStats.interTotal > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Inter
                  </span>
                  <span className="font-semibold text-zinc-800">
                    R$ {monthlyStats.interTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {monthlyStats.neonTotal > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Neon
                  </span>
                  <span className="font-semibold text-zinc-800">
                    R$ {monthlyStats.neonTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {monthlyStats.momTotal > 0 && (
                <div className="flex items-center justify-between text-xs bg-amber-50/50 p-2 border border-amber-100 rounded-lg">
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    🙋‍♀️ Reembolso Mãe
                  </span>
                  <span className="font-bold text-amber-800">
                    R$ {monthlyStats.momTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Filters Panel */}
          <div id="filters-cap" className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-semibold text-zinc-800 text-sm flex items-center gap-1.5">
              <Filter size={16} /> Filtros Rápidos
            </h4>

            {/* Keyword Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar comércio, forma..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 text-xs border border-zinc-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all text-zinc-700 placeholder-zinc-400"
              />
            </div>

            {/* Categories Select Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-zinc-50 text-xs border border-zinc-100 rounded-xl p-2 focus:outline-none text-zinc-750 font-medium pointer-events-auto"
              >
                <option value="Todos">Todas as Categorias</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Reembolso / Mom Toggle Button */}
            <button
              onClick={() => setOnlyMom(!onlyMom)}
              className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                onlyMom 
                  ? 'bg-amber-100 border-amber-200 text-amber-800 shadow-sm' 
                  : 'bg-zinc-50 border-zinc-100 text-zinc-650 hover:bg-zinc-100'
              }`}
            >
              🙋‍♀️ Apenas gastos da mãe (reembolsável)
            </button>
          </div>

        </div>

        {/* Right Side: Interactive Table & list of Transactions (Col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-50 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-zinc-900 text-base">Transações Registradas</h3>
                <p className="text-xs text-zinc-400">Listagem de débitos de {activeMonthKey || 'Nenhum mês ativo'}</p>
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                Mostrando <strong>{filteredTxs.length}</strong> compras
              </span>
            </div>

            {/* Pastas de Cartões (Folders for Inter & Nubank) */}
            <div className="flex border-b border-zinc-100 bg-zinc-50/50 p-2.5 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveFolder('Inter')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  activeFolder === 'Inter'
                    ? 'bg-amber-500 border-amber-600/20 text-white shadow-sm font-bold'
                    : 'bg-white border-zinc-100 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                }`}
              >
                {activeFolder === 'Inter' ? <FolderOpen size={14} /> : <Folder size={14} />}
                Pasta Inter 🍊
              </button>
              <button
                type="button"
                onClick={() => setActiveFolder('Nubank')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  activeFolder === 'Nubank'
                    ? 'bg-purple-600 border-purple-700/20 text-white shadow-sm font-bold'
                    : 'bg-white border-zinc-100 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                }`}
              >
                {activeFolder === 'Nubank' ? <FolderOpen size={14} /> : <Folder size={14} />}
                Pasta Nubank 🍇
              </button>
            </div>

            {/* Data container */}
            {filteredTxs.length > 0 ? (
              <div className="divide-y divide-zinc-50 max-h-[500px] overflow-y-auto">
                {filteredTxs.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-50/50 transition-colors"
                  >
                    
                    {/* Left block: Checkbox, Icon, Name and metadata */}
                    <div className="flex items-start gap-3">
                      
                      {/* Checkbox for Debitada Option */}
                      <div className="flex items-center self-center shrink-0 mr-1">
                        <button
                          type="button"
                          onClick={() => onUpdateDebited(tx.id, tx.debited === false)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                            tx.debited !== false
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-zinc-50 border-zinc-300 text-transparent hover:border-zinc-400'
                          }`}
                          title={tx.debited !== false ? "Marcar como não debitada" : "Marcar como debitada"}
                        >
                          <svg className="w-3.5 h-3.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>

                      <div className={`mt-0.5 rounded-xl p-2.5 shrink-0 ${
                        tx.card === 'Nubank' ? 'bg-purple-50 text-purple-600' :
                        tx.card === 'Inter' ? 'bg-amber-50 text-amber-600' :
                        'bg-cyan-50 text-cyan-600'
                      }`}>
                        <div className="text-xs font-bold font-mono tracking-tight">{tx.card.substring(0, 2).toUpperCase()}</div>
                      </div>
 
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-800 text-sm leading-tight">{tx.local}</span>
                          {tx.isMom && (
                            <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              Mãe
                            </span>
                          )}
                          {tx.id.startsWith('custom-') && (
                            <span className="bg-zinc-900 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                              Lançamento
                            </span>
                          )}
                          {tx.debited !== false ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold text-[9px] px-1.5 py-0.5 rounded-full">
                              Debitado
                            </span>
                          ) : (
                            <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 font-semibold text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> Não Debitado
                            </span>
                          )}
                        </div>
 
                        <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>{tx.form}</span>
                          <span>•</span>
                          <span className="text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded text-[10px]">{tx.card}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right block: Value & Category Dropdown & Delete Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-zinc-100/50 pt-2.5 sm:border-0 sm:pt-0">
                      
                      {/* Categorization dynamic select */}
                      <div className="flex items-center gap-1.5">
                        <Tag size={12} className="text-zinc-400" />
                        <select
                          value={tx.category}
                          onChange={(e) => onUpdateCategory(tx.id, e.target.value)}
                          className="bg-zinc-100 border border-transparent text-[10px] sm:text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-all rounded-lg p-1.5 focus:outline-none cursor-pointer"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Currency absolute numerical value */}
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-zinc-900 block">
                          R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Excluir / Delete Button */}
                      {confirmDeleteId === tx.id ? (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-0.5 rounded-lg shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteTransaction(tx.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded-md text-[10px] font-bold hover:bg-red-700 transition-all cursor-pointer shadow-sm"
                          >
                            Excluir?
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-zinc-200 text-zinc-600 hover:bg-zinc-300 rounded-md text-[10px] font-medium transition-all cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-rose-50/50 hover:border-red-200 transition-all focus:outline-none cursor-pointer shrink-0"
                          title="Excluir lançamento"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <HelpCircle size={40} className="text-zinc-300 stroke-[1.5]" />
                <span className="text-sm font-medium">Nenhuma transação encontrada para os filtros aplicados</span>
                <p className="text-xs">Tente alterar seu campo de busca ou selecionar outra categoria.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
