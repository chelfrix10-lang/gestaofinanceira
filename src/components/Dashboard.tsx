/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Transaction, BankAccount, BudgetSummary } from '../types';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  CircleDot, 
  Coins,
  ChevronRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  summary: BudgetSummary;
  onSelectTab: (tab: string) => void;
}

export default function Dashboard({ transactions, bankAccounts, summary, onSelectTab }: DashboardProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Core computations
  const totalSpent = useMemo(() => {
    return transactions.reduce((acc, t) => acc + t.value, 0);
  }, [transactions]);

  // Spending by Card Provider
  const cardStats = useMemo(() => {
    const stats: Record<string, { value: number; count: number; color: string }> = {
      'Nubank': { value: 0, count: 0, color: 'bg-purple-600 text-purple-600 border-purple-500' },
      'Inter': { value: 0, count: 0, color: 'bg-amber-500 text-amber-500 border-amber-400' },
      'Neon': { value: 0, count: 0, color: 'bg-cyan-500 text-cyan-500 border-cyan-400' }
    };

    transactions.forEach(t => {
      const card = t.card || 'Outros';
      if (!stats[card]) {
        stats[card] = { value: 0, count: 0, color: 'bg-zinc-500 text-zinc-500 border-zinc-400' };
      }
      stats[card].value += t.value;
      stats[card].count += 1;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      percentage: totalSpent > 0 ? (data.value / totalSpent) * 100 : 0
    })).filter(s => s.value > 0);
  }, [transactions, totalSpent]);

  // Spending by Category
  const categoryStats = useMemo(() => {
    const categories: Record<string, { value: number; color: string; icon: string }> = {
      'Alimentação': { value: 0, color: 'bg-emerald-500', icon: '🍔' },
      'Habitação & Reformas': { value: 0, color: 'bg-indigo-500', icon: '🏠' },
      'Saúde & Cuidados': { value: 0, color: 'bg-rose-500', icon: '❤️' },
      'Transporte & Auto': { value: 0, color: 'bg-blue-500', icon: '🚗' },
      'Compras & Vestuário': { value: 0, color: 'bg-amber-500', icon: '🛍️' },
      'Beleza & Cuidados Pessoais': { value: 0, color: 'bg-pink-500', icon: '✨' },
      'Assinaturas & Serviços': { value: 0, color: 'bg-purple-500', icon: '📱' },
      'Outros & Transferências': { value: 0, color: 'bg-slate-500', icon: '🏷️' }
    };

    transactions.forEach(t => {
      const cat = t.category || 'Outros & Transferências';
      if (!categories[cat]) {
        categories[cat] = { value: 0, color: 'bg-zinc-500', icon: '❓' };
      }
      categories[cat].value += t.value;
    });

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        ...data,
        percentage: totalSpent > 0 ? (data.value / totalSpent) * 100 : 0
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, totalSpent]);

  // Spending timeline by Month-Year for Trendline
  // We want to sort chronologically: 2024 -> 2025 -> 2026
  const monthOrder = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const trendData = useMemo(() => {
    const monthlyMap: Record<string, { total: number; year: number; monthName: string }> = {};

    transactions.forEach(t => {
      const key = `${t.month} ${t.year}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { total: 0, year: t.year, monthName: t.month };
      }
      monthlyMap[key].total += t.value;
    });

    return Object.entries(monthlyMap)
      .map(([key, data]) => ({
        key,
        ...data
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return monthOrder.indexOf(a.monthName) - monthOrder.indexOf(b.monthName);
      })
      .slice(-8); // Show last 8 months with records for neat spacing
  }, [transactions]);

  // Draw SVG circle components
  const svgCircleData = useMemo(() => {
    let accumulatedPercent = 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    return cardStats.map(stat => {
      const strokeDashoffset = circumference - (stat.percentage / 100) * circumference;
      const rotation = (accumulatedPercent / 100) * 360;
      accumulatedPercent += stat.percentage;

      return {
        ...stat,
        strokeDashoffset,
        rotation,
        circumference
      };
    });
  }, [cardStats]);

  // Account balances calculations
  const totalAccountBalance = useMemo(() => {
    return bankAccounts.reduce((acc, b) => {
      const extrasSum = b.extras ? b.extras.reduce((s, e) => s + e, 0) : 0;
      return acc + b.value + extrasSum;
    }, 0);
  }, [bankAccounts]);

  // Dynamic advice based on metrics
  const financialHealthAdvice = useMemo(() => {
    const ratio = totalSpent / (totalAccountBalance || 1);
    if (ratio > 0.4) {
      return {
        title: 'Atenção aos limites',
        description: 'Seus gastos no histórico de faturas representam uma proporção alta do seu saldo em conta. Considere frear compras parceladas.',
        color: 'border-rose-100 bg-rose-50/50 text-rose-800'
      };
    } else if (ratio > 0.2) {
      return {
        title: 'Orçamento equilibrado',
        description: 'Seu ritmo de despesas está saudável em relação às suas reservas totais. Continue acompanhando os vencimentos!',
        color: 'border-blue-100 bg-blue-50/50 text-blue-800'
      };
    } else {
      return {
        title: 'Excelente saúde financeira',
        description: 'Suas economias cobrem confortavelmente suas faturas pendentes. Uma boa oportunidade para planejar pequenos investimentos.',
        color: 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
      };
    }
  }, [totalSpent, totalAccountBalance]);

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Bento Meta Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Net Worth Card */}
        <div id="stat-card-liquido" className="relative overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white shadow-xl flex flex-col justify-between h-[150px]">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-gradient-to-tr from-emerald-500/10 to-emerald-400/20 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Saldo Líquido Total</span>
            <div className="rounded-full bg-zinc-900 p-2 text-emerald-400">
              <Wallet size={20} />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              R$ {summary.saldoLiquidoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <span className="text-emerald-400 flex items-center"><ArrowUpRight size={12} /> Reservas líquidas</span> após faturas debitadas
            </p>
          </div>
        </div>

        {/* Bruto Card */}
        <div id="stat-card-bruto" className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm flex flex-col justify-between h-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-sm font-medium">Patrimônio Bruto</span>
            <div className="rounded-full bg-zinc-50 p-2 text-zinc-700">
              <Coins size={20} />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-1">
              R$ {totalAccountBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h1>
            <p className="text-xs text-zinc-500">
              Soma total de depósitos em contas e espécie
            </p>
          </div>
        </div>

        {/* Expenses Summary Card */}
        <div id="stat-card-spent" className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm flex flex-col justify-between h-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-sm font-medium">Histórico Total de Faturas</span>
            <div className="rounded-full bg-zinc-50 p-2 text-rose-500">
              <CreditCard size={20} />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-1">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1 text-rose-600 font-medium">
              <ArrowDownRight size={14} /> Total acumulado em {transactions.length} lançamentos
            </p>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Category breakdown (Columns 7) */}
        <div id="category-chart-box" className="lg:col-span-7 bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-zinc-900 text-lg">Distribuição por Categoria</h3>
                <p className="text-xs text-zinc-400">Classificação inteligente baseada no nome da despesa</p>
              </div>
              <span className="text-xs bg-zinc-100 text-zinc-600 py-1 px-2.5 rounded-full font-medium">
                {categoryStats.length} Categorias Ativas
              </span>
            </div>

            <div className="space-y-4">
              {categoryStats.slice(0, 6).map((cat) => (
                <div 
                  key={cat.name} 
                  className="space-y-1.5 transition-all"
                  onMouseEnter={() => setHoveredBar(cat.name)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base" role="img" aria-label={cat.name}>{cat.icon}</span>
                      <span className="font-medium text-zinc-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">
                        R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">({cat.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden relative">
                    <motion.div 
                      className={`h-full ${cat.color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${cat.percentage}%`,
                        filter: hoveredBar && hoveredBar !== cat.name ? 'brightness(0.7)' : 'brightness(1)'
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-50 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Gostando das categorias? Categorize mais faturas no menu histórico</span>
            <button 
              onClick={() => onSelectTab('history')}
              className="text-xs text-zinc-800 font-medium flex items-center gap-1 hover:underline"
            >
              Ver Detalhes <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Card Statement Share (Columns 5) */}
        <div id="card-stats-box" className="lg:col-span-5 bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-zinc-900 text-lg">Divisão por Cartão</h3>
              <p className="text-xs text-zinc-400">Onde estão concentrados seus maiores gastos de fatura</p>
            </div>

            {/* Custom SVG Ring Donut Chart */}
            <div className="flex items-center justify-center py-6">
              <div className="relative h-44 w-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    className="stroke-zinc-100 fill-none" 
                    strokeWidth="10" 
                  />
                  {svgCircleData.map((slice) => (
                    <motion.circle
                      key={slice.name}
                      cx="60"
                      cy="60"
                      r="50"
                      className="fill-none cursor-pointer"
                      strokeWidth={hoveredSlice === slice.name ? '14' : '10'}
                      stroke={
                        slice.name === 'Nubank' ? '#9333ea' : 
                        slice.name === 'Inter' ? '#f59e0b' : '#06b6d4'
                      }
                      strokeDasharray={slice.circumference}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{
                        transformOrigin: '60px 60px',
                        transform: `rotate(${slice.rotation}deg)`,
                      }}
                      initial={{ strokeDashoffset: slice.circumference }}
                      animate={{ strokeDashoffset: slice.strokeDashoffset }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      onMouseEnter={() => setHoveredSlice(slice.name)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  ))}
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-zinc-400 font-medium">Faturas</span>
                  <span className="text-lg font-bold text-zinc-800">
                    R$ {totalSpent > 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5">
              {cardStats.map((stat) => (
                <div 
                  key={stat.name}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all ${hoveredSlice === stat.name ? 'bg-zinc-50 border border-zinc-100 shadow-sm' : 'border border-transparent'}`}
                  onMouseEnter={() => setHoveredSlice(stat.name)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${stat.name === 'Nubank' ? 'bg-purple-600' : stat.name === 'Inter' ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                    <span className="text-sm font-medium text-zinc-700">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-zinc-800">
                      R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono ml-2">({stat.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Monthly spending trend & Advice */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* SVG Interactive Line Chart (Trend) (Columns 8) */}
        <div id="trend-plot-box" className="md:col-span-8 bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-zinc-900 text-lg">Evolução de Gastos Recentes</h3>
                <p className="text-xs text-zinc-400">Total somado por fatura mensal faturada (Inter, Nubank, Neon)</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 py-1 px-2.5 rounded-full">
                <TrendingUp size={14} /> Atualizado (2026)
              </span>
            </div>

            {trendData.length > 0 ? (
              <div className="relative h-44 w-full">
                {/* SVG Area Line Chart */}
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f4f4f5" strokeWidth="1" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#f4f4f5" strokeWidth="1" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f4f4f5" strokeWidth="1" />

                  {/* Draw the area and line path */}
                  {(() => {
                    const width = 500;
                    const height = 150;
                    const paddingX = 40;
                    const paddingY = 20;

                    const maxVal = Math.max(...trendData.map(d => d.total)) * 1.1 || 1000;
                    
                    const points = trendData.map((d, index) => {
                      const x = paddingX + (index / (trendData.length - 1)) * (width - paddingX * 2);
                      const y = height - paddingY - (d.total / maxVal) * (height - paddingY * 2);
                      return { x, y, val: d.total, key: d.key };
                    });

                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

                    return (
                      <>
                        {/* Shaded Area */}
                        <path d={areaPath} fill="url(#grad)" opacity="0.3" />

                        {/* Stroke Path */}
                        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />

                        {/* Interactive dots */}
                        {points.map((p, i) => (
                          <g key={p.key} className="group">
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="4" 
                              fill="#6366f1" 
                              className="transition-all duration-150 group-hover:r-6 cursor-pointer" 
                            />
                            {/* Text labels (value) on hover style or static */}
                            <text 
                              x={p.x} 
                              y={p.y - 10} 
                              fontSize="8" 
                              fontWeight="600"
                              textAnchor="middle" 
                              fill="#18181b"
                              className="hidden group-hover:block whitespace-nowrap bg-zinc-900 text-white rounded p-1"
                            >
                              R$ {p.val.toFixed(0)}
                            </text>
                          </g>
                        ))}

                        {/* X Axis Labels */}
                        {points.map((p, i) => (
                          <text 
                            key={`lbl-${p.key}`}
                            x={p.x} 
                            y={height - 2} 
                            fontSize="8" 
                            fill="#71717a" 
                            textAnchor="middle"
                          >
                            {trendData[i].monthName.slice(0, 3)}/{trendData[i].year % 100}
                          </text>
                        ))}

                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#ffffff" />
                          </linearGradient>
                        </defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-zinc-400 text-sm">
                Nenhum dado de histórico mensal suficiente para desenhar tendência.
              </div>
            )}
          </div>
        </div>

        {/* Financial health card, custom advice (Columns 4) */}
        <div id="financial-advice-box" className="md:col-span-4 flex flex-col gap-4">
          
          {/* Advice */}
          <div className={`border rounded-2xl p-5 shadow-sm transition-all flex-1 flex flex-col justify-between ${financialHealthAdvice.color}`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="shrink-0" />
                <h4 className="font-semibold text-sm uppercase tracking-wider">Análise do Consultor</h4>
              </div>
              <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-200/50 pb-1.5 pt-1">
                {financialHealthAdvice.title}
              </h3>
              <p className="text-xs leading-relaxed opacity-95">
                {financialHealthAdvice.description}
              </p>
            </div>
            
            <div className="mt-4 text-xs font-semibold underline flex items-center gap-1 hover:opacity-80 cursor-pointer self-start" onClick={() => onSelectTab('ai-chat')}>
              Perguntar ao Assistente IA
              <ChevronRight size={12} />
            </div>
          </div>

          {/* Quick Balance Breakdown snippet */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-col justify-between h-[120px]">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <Percent size={14} /> Comprometimento Renda
            </span>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold text-zinc-800">
                  {((summary.despesasMensais / (summary.saldoBrutoTotal || 1)) * 100).toFixed(1)}%
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Das receitas totais</p>
              </div>
              <span className="text-xs text-zinc-500 text-right">
                Gasto mensal médio: <strong className="text-zinc-800">R$ {summary.despesasMensais.toFixed(2)}</strong>
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Under bento: Current Bank Accounts lists */}
      <div id="accounts-row" className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-zinc-900 text-lg">Saldos Disponíveis em Contas</h3>
            <p className="text-xs text-zinc-400">Dados declarados das reservas liquidas do orçamento pessoal</p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Total em Conta: R$ {totalAccountBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {bankAccounts.map((account) => {
            const hasExtras = account.extras && account.extras.length > 0;
            const extraTotal = hasExtras ? account.extras.reduce((s, e) => s + e, 0) : 0;
            const totalColor = account.name.includes('Nubank') ? 'border-purple-200 bg-purple-50/20 text-purple-700' :
                              account.name.includes('Inter') ? 'border-amber-200 bg-amber-50/20 text-amber-700' :
                              account.name.includes('Mercado Pago') ? 'border-blue-200 bg-blue-50/20 text-blue-700' :
                              account.name.includes('Banco do Brasil') ? 'border-yellow-200 bg-yellow-55/20 text-yellow-800' :
                              account.name.includes('Faturas Debitadas') ? 'border-rose-200 bg-rose-50/10 text-rose-700' :
                              'border-emerald-200 bg-emerald-50/20 text-emerald-700';

            return (
              <div 
                key={account.name} 
                className={`border rounded-xl p-4 transition-all hover:scale-[1.02] flex flex-col justify-between ${totalColor}`}
              >
                <div>
                  <span className="text-xs font-semibold tracking-wide block truncate opacity-80">{account.name}</span>
                  <span className="text-base font-bold text-zinc-800 mt-1.5 block">
                    R$ {(account.value + extraTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {hasExtras && (
                  <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-100 pt-1 flex flex-col gap-0.5">
                    <span>Base: R$ {account.value.toFixed(0)}</span>
                    <span className="text-zinc-600 font-medium">Extras: R$ {extraTotal.toFixed(0)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
