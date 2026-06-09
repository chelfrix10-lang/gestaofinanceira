/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  History, 
  PlusCircle, 
  Bot, 
  RotateCcw,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Percent,
  CloudLightning,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  totalSpent: number;
  userSessionInfo?: string;
  onLogout?: () => void;
  activeUser?: any;
}

export default function Header({ currentTab, onSelectTab, totalSpent, userSessionInfo, onLogout, activeUser }: HeaderProps) {
  const [imgError, setImgError] = React.useState(false);
  
  const userAvatarUrl = activeUser?.user_metadata?.avatar_url || activeUser?.avatar_url;
  const avatarSource = userAvatarUrl || "https://i.postimg.cc/6qt06wLR/IMG-20260605-100329.png";

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: <LayoutDashboard size={16} /> },
    { id: 'history', name: 'Histórico & Faturas', icon: <History size={16} /> },
    { id: 'add', name: 'Lançar Gasto', icon: <PlusCircle size={16} /> },
    { id: 'ai-chat', name: 'Assistente IA', icon: <Bot size={16} /> },
    { id: 'github', name: 'Nuvem e Sincronização', icon: <RefreshCw size={16} /> },
  ];

  return (
    <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo and info */}
          <div className="flex items-center gap-3">
            {avatarSource && !imgError ? (
              <img 
                src={avatarSource} 
                alt="Perfil do Usuário" 
                onError={() => setImgError(true)}
                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-150 shadow-md hover:scale-105 transition-all duration-300"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-zinc-950 text-white rounded-full flex items-center justify-center font-black tracking-tighter text-lg shadow-md shrink-0">
                FP
              </div>
            )}
            <div>
              <h1 className="font-bold text-zinc-900 text-lg leading-tight">
                Finanças Pessoais
              </h1>
              <p className="text-xs text-zinc-500 leading-none mt-1">Análise, faturas dos cartões e assistente IA integrado</p>
            </div>
          </div>

          {/* Quick Actions at header level */}
          <div className="flex items-center gap-3 flex-wrap">

            {/* User Session Token Tag */}
            {userSessionInfo && (
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-150 py-1.5 px-3 rounded-xl text-[10px] font-semibold text-zinc-600">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="truncate max-w-[120px] font-mono" title={userSessionInfo}>{userSessionInfo}</span>
              </div>
            )}
            
            {/* Quick spent metrics visual indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-zinc-100 py-1.5 px-3 rounded-xl">
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Histórico Total:</span>
              <span className="text-xs font-bold text-zinc-800">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Logout Action Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="py-1.5 px-3 border border-zinc-200 rounded-xl text-[10px] font-extrabold text-zinc-650 hover:text-red-600 hover:bg-rose-50/50 hover:border-red-200 transition-all flex items-center gap-1 focus:outline-none cursor-pointer"
                title="Sair e Bloquear Carteira"
              >
                <LogOut size={11} />
                Sair
              </button>
            )}

          </div>

        </div>

        {/* Tab navigation tabs bar */}
        <div className="flex gap-2 border-t border-zinc-50 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === currentTab;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive 
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
