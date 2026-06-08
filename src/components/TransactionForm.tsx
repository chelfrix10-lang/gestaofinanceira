/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PlusCircle, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  Tag, 
  User, 
  CheckCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionFormProps {
  onAddTransaction: (data: {
    local: string;
    value: number;
    date: string;
    card: string;
    category: string;
    form: string;
    month: string;
    year: number;
    debited: boolean;
  }) => Promise<boolean>;
  categories: string[];
}

const PORTUGUESE_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function TransactionForm({ onAddTransaction, categories }: TransactionFormProps) {
  const [local, setLocal] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [card, setCard] = useState('Nubank');
  const [category, setCategory] = useState('Alimentação');
  const [form, setForm] = useState('À Vista');
  const [month, setMonth] = useState('Junho');
  const [year, setYear] = useState('2026');
  const [debited, setDebited] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    if (!local.trim()) {
      setErrorMsg('Por favor, informe o local da despesa.');
      return;
    }

    const numericValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numericValue) || numericValue <= 0) {
      setErrorMsg('Por favor, informe um valor numérico válido maior que zero.');
      return;
    }

    setLoading(true);

    // Format date string from yyyy-mm-dd to dd/mm/yyyy
    const parts = date.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';

    const res = await onAddTransaction({
      local: local.trim(),
      value: numericValue,
      date: formattedDate,
      card,
      category,
      form,
      month,
      year: parseInt(year),
      debited
    });

    setLoading(false);

    if (res) {
      setSuccess(true);
      setLocal('');
      setValue('');
      setDebited(false);
      // Auto-disappear success alert
      setTimeout(() => setSuccess(false), 4000);
    } else {
      setErrorMsg('Houve um erro ao registrar a transação no servidor.');
    }
  };

  return (
    <div id="add-transaction-view" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* Intro descriptive Card (Columns 5) */}
      <div className="md:col-span-5 bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-900 rounded-2xl p-6 shadow-xl text-white flex flex-col justify-between h-auto md:min-h-[460px]">
        <div className="space-y-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <PlusCircle size={22} />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-white">Lançar Novo Gasto</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deseja adicionar compras, parcelas extras ou pagamentos que não estão no histórico estático inicial?
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O formulário insere a despesa na memória do servidor e atualiza os gráficos, totais e o assistente de inteligência artificial instantaneamente.
            </p>
          </div>
        </div>

        {/* Digital Receipt mock aesthetic */}
        <div className="mt-8 pt-6 border-t border-zinc-800 border-dashed space-y-3 font-mono text-[11px] text-zinc-500">
          <div className="flex justify-between">
            <span>TERMINAL ID:</span>
            <span>AIS-BUILD-3000</span>
          </div>
          <div className="flex justify-between">
            <span>PROVEDOR:</span>
            <span>MEMÓRIA_EXPRESS</span>
          </div>
          <div className="flex justify-between">
            <span>STATUS CONEXÃO:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">● ONLINE</span>
          </div>
          <div className="text-center text-[10px] text-zinc-650 pt-2 select-none">
            - OBRIGADO PELO CONTROLE FINANCEIRO -
          </div>
        </div>
      </div>

      {/* Main input form (Columns 7) */}
      <div className="md:col-span-7 bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <h3 className="font-semibold text-zinc-900 text-lg border-b border-zinc-50 pb-3">Detalhes do Gasto</h3>

          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center gap-2"
              >
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>Gasto registrado com sucesso! Atualizamos seus painéis e gráficos.</span>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2"
              >
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Local / Estabelecimento</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                  <FileSpreadsheet size={14} />
                </span>
                <input
                  type="text"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Ex: iFood, Farmácia Pague Menos"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs text-zinc-750"
                  required
                />
              </div>
            </div>

            {/* Value */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Valor (R$)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                  <DollarSign size={14} />
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ex: 85,90"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs text-zinc-750"
                  required
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Data da Compra</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                  <Calendar size={14} />
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs text-zinc-720 cursor-pointer pointer-events-auto"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Categoria</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                  <Tag size={14} />
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none text-xs text-zinc-720 cursor-pointer pointer-events-auto"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Cartão de Crédito</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
                  <CreditCard size={14} />
                </span>
                <select
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none text-xs text-zinc-720 cursor-pointer pointer-events-auto"
                >
                  <option value="Nubank">Nubank (Roxo)</option>
                  <option value="Inter">Inter (Laranja)</option>
                  <option value="Neon">Neon (Azul)</option>
                </select>
              </div>
            </div>

            {/* Payment Forma */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Forma / Parcelas</label>
              <input
                type="text"
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="Ex: À Vista, Em 3x (parcl 1)"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 text-xs text-zinc-750"
              />
            </div>

            {/* Month selector for billing statement */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Mês da Fatura de Lançamento</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none text-xs text-zinc-720 cursor-pointer pointer-events-auto"
              >
                {PORTUGUESE_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Year selector for billing */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Ano de Cobrança</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none text-xs text-zinc-720 cursor-pointer pointer-events-auto"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            {/* Debitar da Conta Toggle option */}
            <div className="sm:col-span-2 flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-100/80 rounded-xl mt-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-800 block">Debitar imediatamente do patrimônio?</span>
                <span className="text-[10px] text-zinc-400 block max-w-sm">
                  Se ativado, desconta o valor do seu patrimônio bruto. Se desativado, não altera seu saldo bruto nem o líquido até que você debite manualmente no histórico.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDebited(!debited)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  debited ? 'bg-emerald-600' : 'bg-zinc-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    debited ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-6 py-3 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-white ${
              loading ? 'bg-zinc-700 cursor-not-allowed' : 'bg-zinc-950 hover:bg-zinc-900'
            }`}
          >
            {loading ? 'Salvando no Banco...' : 'Adicionar Transação'}
          </button>

        </form>
      </div>

    </div>
  );
}
