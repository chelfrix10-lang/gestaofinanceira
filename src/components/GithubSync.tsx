/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Github, 
  CloudUpload, 
  CloudDownload, 
  ExternalLink, 
  Lock, 
  Key, 
  Check, 
  AlertCircle, 
  AlertTriangle,
  Info, 
  Sparkles,
  RefreshCw,
  Copy,
  Trash2,
  Database,
  Server
} from 'lucide-react';
import { FinancialData } from '../types';
import { isFirebaseConfigured, firebaseConfig } from '../firebase';

interface GithubSyncProps {
  financialData: FinancialData;
  onRestoreData: (restoredData: FinancialData) => void;
}

export default function GithubSync({ financialData, onRestoreData }: GithubSyncProps) {
  // Sync state
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem('fp_github_token') || '');
  const [gistId, setGistId] = useState<string>(() => localStorage.getItem('fp_github_gist_id') || '');
  const [saveToken, setSaveToken] = useState<boolean>(true);
  
  // UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedGistId, setCopiedGistId] = useState<boolean>(false);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Handle saving token to localStorage
  const handleSaveTokenLocally = (token: string) => {
    setGithubToken(token);
    if (saveToken) {
      localStorage.setItem('fp_github_token', token);
    } else {
      localStorage.removeItem('fp_github_token');
    }
  };

  const handleClearCredentials = () => {
    setGithubToken('');
    setGistId('');
    localStorage.removeItem('fp_github_token');
    localStorage.removeItem('fp_github_gist_id');
    setSuccessMsg('Credenciais locais removidas com sucesso.');
  };

  // 1. Export in-app database to GitHub Gist
  const handleExportToGist = async () => {
    if (!githubToken.trim()) {
      setErrorMsg('Por favor, informe seu GitHub Personal Access Token (PAT).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Content of the database backup
      const fileContent = JSON.stringify(financialData, null, 2);
      
      const gistData = {
        description: 'Backup - Sistema de Gestão Financeira Pessoal (Finanças Pessoais)',
        public: false, // Create private gist by default for financial privacy
        files: {
          'financas_pessoais_backup.json': {
            content: fileContent
          }
        }
      };

      // Determine method and URL based on whether we already have a gistId
      const url = gistId.trim() 
        ? `https://api.github.com/gists/${gistId}` 
        : 'https://api.github.com/gists';
      const method = gistId.trim() ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${githubToken.trim()}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(gistData)
      });

      if (!response.ok) {
        const errorDetail = await response.json().catch(() => ({}));
        throw new Error(errorDetail?.message || `Erro da API GitHub: Status ${response.status}`);
      }

      const responseData = await response.json();
      const generatedGistId = responseData.id;
      
      setGistId(generatedGistId);
      localStorage.setItem('fp_github_gist_id', generatedGistId);
      
      setSuccessMsg(`Backup exportado com sucesso para o GitHub Gist! ${gistId ? 'Gist atualizado.' : 'Novo Gist criado.'}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao exportar backup para o GitHub: ${err.message}. Verifique a validade do seu token.`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Import database from GitHub Gist
  const handleImportFromGist = async () => {
    if (!githubToken.trim()) {
      setErrorMsg('Por favor, informe seu GitHub Personal Access Token (PAT) para puxar o Gist privado.');
      return;
    }
    if (!gistId.trim()) {
      setErrorMsg('Por favor, forneça o ID do Gist que deseja restaurar.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${githubToken.trim()}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (!response.ok) {
        throw new Error(`Gist não encontrado ou token inválido. Status: ${response.status}`);
      }

      const gistData = await response.json();
      const backupFile = gistData.files['financas_pessoais_backup.json'];

      if (!backupFile || !backupFile.content) {
        throw new Error('Arquivo de backup "financas_pessoais_backup.json" não encontrado neste Gist.');
      }

      const parsedBackup = JSON.parse(backupFile.content);
      
      // Update local storage in browser if option is true
      if (saveToken) {
        localStorage.setItem('fp_github_gist_id', gistId.trim());
      }

      // Sync backend state
      const backendResponse = await fetch('/api/sync/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsedBackup })
      });

      const backendJson = await backendResponse.json();
      if (backendJson.success) {
        onRestoreData(backendJson.data);
        setSuccessMsg('O banco de dados foi restaurado com sucesso do seu backup sincronizado no GitHub!');
      } else {
        throw new Error(backendJson.error || 'Erro na gravação remota do servidor.');
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro na restauração dos dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Copy Gist ID to clipboard helper
  const handleCopyGistId = () => {
    if (!gistId) return;
    navigator.clipboard.writeText(gistId);
    setCopiedGistId(true);
    setTimeout(() => setCopiedGistId(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Intro banner */}
      <div className="bg-white border border-zinc-150 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-zinc-950 text-white rounded-2xl flex items-center justify-center font-black">
              <Github size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 leading-tight">Integração com GitHub</h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                Exporte, salve e carregue sua base de faturas e transações diretamente do GitHub. Essa funcionalidade permite o backup e restauração na nuvem para garantir a longevidade dos seus dados.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="py-1.5 px-3 border border-zinc-150 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              Criar Conta no Github
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column 1: Workspace export info & Firebase Status */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Source Code Card */}
          <div className="bg-white border border-zinc-150 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Exportar Código Fonte do App</h3>
            </div>
            
            <div className="space-y-4 text-xs text-zinc-650 leading-relaxed">
              <p>
                O sistema <strong>Finanças Pessoais</strong> está operando em um container Cloud Run. Você pode controlar e exportar todo o código-fonte desse aplicativo para o seu próprio GitHub pessoal em qualquer momento de forma nativa.
              </p>
              
              <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-zinc-800 flex items-center gap-1.5">
                  <Info size={14} className="text-zinc-500" />
                  Como exportar o repositório?
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-zinc-600">
                  <li>Localize a aba lateral de <strong>Settings (Configurações)</strong> na interface do AI Studio Build.</li>
                  <li>Clique em <strong>Export to GitHub</strong> ou <strong>Download como ZIP</strong>.</li>
                  <li>Siga as instruções rápidas na interface da plataforma para clonar ou conectar o repositório à sua conta pessoal.</li>
                </ol>
              </div>

              <p className="border-t border-zinc-100 pt-3 text-[10px] text-zinc-400 italic">
                *Nota: A sincronização do código pelo AI Studio Build permite que você continue desenvolvendo ou hospede suas finanças em sua própria infraestrutura de forma ilimitada.
              </p>
            </div>
          </div>

          {/* Firebase Connection Card */}
          <div className="bg-white border border-zinc-150 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className={isFirebaseConfigured ? "text-emerald-500" : "text-zinc-400"} />
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Banco de Dados Cloud</h3>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  {isFirebaseConfigured ? "Firebase Ativo" : "Armazenamento Local"}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-zinc-650 leading-relaxed">
              {isFirebaseConfigured ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl text-emerald-800 space-y-1">
                    <p className="font-bold">Totalmente Sincronizado!</p>
                    <p className="text-[11px] leading-relaxed">
                      Seus dados de transações e faturas estão sendo persistidos de forma segura no Firestore Database.
                    </p>
                  </div>
                  <div className="p-1 space-y-1 text-zinc-500">
                    <p><strong>Projeto Conectado:</strong></p>
                    <code className="block bg-zinc-50 border border-zinc-150 p-2 rounded-lg font-mono text-[10px] text-zinc-700 break-all select-all">
                      {firebaseConfig.projectId}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>
                    Por padrão, os dados estão salvos de forma resiliente e temporária em arquivo JSON no container local. Para ter um banco de dados persistente robusto, conecte o seu próprio Firebase.
                  </p>
                  
                  <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-zinc-800 flex items-center gap-1.5 font-sans">
                      <Server size={14} className="text-zinc-500" />
                      Como conectar seu Firebase?
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-zinc-600 text-[11px]">
                      <li>Crie um projeto web em seu <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-zinc-900 border-b border-zinc-900 font-semibold inline-flex items-center gap-0.5">Firebase Console <ExternalLink size={10} /></a>.</li>
                      <li>Habilite o **Firestore Database** em modo de produção ou teste.</li>
                      <li>Acesse a engrenagem de **Configurações de Projeto** e copie as credenciais do aplicativo web.</li>
                      <li>Clique em **Settings** na barra lateral do AI Studio, adicione as variáveis correspondentes no painel de segredos de ambiente:
                        <div className="mt-1.5 grid grid-cols-1 gap-1 text-[10px] font-mono text-zinc-500 pl-4">
                          <div>• VITE_FIREBASE_API_KEY</div>
                          <div>• VITE_FIREBASE_PROJECT_ID</div>
                          <div>• VITE_FIREBASE_AUTH_DOMAIN</div>
                          <div>• VITE_FIREBASE_APP_ID</div>
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Column 2: Interactive Sync and Backup Gist */}
        <div className="lg:col-span-7 bg-white border border-zinc-150 p-6 rounded-2xl shadow-sm space-y-5">
          
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-bold uppercase">Cloud Storage</span>
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Backup de Dados em Tempo Real</h3>
            </div>
            
            {githubToken && (
              <button
                onClick={handleClearCredentials}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-all cursor-pointer"
                title="Limpar credenciais mantidas localmente"
              >
                <Trash2 size={12} />
                Desconectar
              </button>
            )}
          </div>

          <div className="space-y-4">
            
            {/* Form Fields */}
            <div className="space-y-3.5">
              
              {/* Token Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 block flex items-center gap-1.5">
                  <Key size={13} className="text-zinc-500" />
                  GitHub Personal Access Token (PAT)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => handleSaveTokenLocally(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 pl-3 pr-10 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                  />
                  <div className="absolute top-2.5 right-3 text-zinc-400 pointer-events-none">
                    <Lock size={14} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 px-1">
                  <p className="text-[10px] text-zinc-400">
                    O token necessita ter apenas permissão <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700 font-mono">gist</code> para funcionamento.
                  </p>
                  <label className="text-[10px] text-zinc-500 flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveToken}
                      onChange={(e) => {
                        setSaveToken(e.target.checked);
                        if (e.target.checked) {
                          localStorage.setItem('fp_github_token', githubToken);
                        } else {
                          localStorage.removeItem('fp_github_token');
                        }
                      }}
                      className="accent-zinc-950 rounded"
                    />
                    Salvar token localmente
                  </label>
                </div>
              </div>

              {/* Gist ID Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 block flex items-center gap-1.5">
                  <Github size={13} className="text-zinc-500" />
                  Gist ID de Backup
                </label>
                <div className="relative flex gap-2">
                  <input
                    type="text"
                    placeholder="Deixe em branco para criar um novo, ou insira ID para restaurar"
                    value={gistId}
                    onChange={(e) => {
                      setGistId(e.target.value);
                      localStorage.setItem('fp_github_gist_id', e.target.value);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                  />
                  
                  {gistId && (
                    <button
                      onClick={handleCopyGistId}
                      className="border border-zinc-200 rounded-xl py-2 px-3 text-xs flex items-center gap-1 hover:bg-zinc-50 text-zinc-600 transition-colors"
                      title="Copiar Gist ID"
                    >
                      {copiedGistId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span className="sr-only">Copiar</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400">
                  Os backups são gravados em gists secretos por padrão visando resguardar a privacidade do seu orçamento.
                </p>
              </div>

            </div>

            {/* Notifications alerts */}
            {successMsg && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
                <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-normal">{successMsg}</div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-normal">{errorMsg}</div>
              </div>
            )}

            {/* Actions button strip */}
            <div className="flex gap-3 border-t border-zinc-100 pt-4 flex-col sm:flex-row">
              
              {/* Back up / Export to GitHub */}
              <button
                onClick={handleExportToGist}
                disabled={loading}
                className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-950 text-white rounded-xl py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 transition-all transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <CloudUpload size={14} />}
                {gistId ? 'Atualizar Cloud Backup (Gist)' : 'Criar Cloud Backup (Novo Gist)'}
              </button>

              {/* Restore / Import from GitHub */}
              <button
                onClick={handleImportFromGist}
                disabled={loading || !gistId}
                className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl py-2.5 px-4 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                title={!gistId ? 'É necessário ter um Gist ID para puxar os dados salvos' : 'Restaurar backup do GitHub'}
              >
                {loading ? <RefreshCw className="animate-spin" size={14} /> : <CloudDownload size={14} />}
                Importar Backup do Nuvem
              </button>

            </div>

            {/* Quick guide bubble */}
            <div className="bg-zinc-50 border border-zinc-100 py-3 px-4 rounded-xl flex gap-3 items-center">
              <Sparkles size={16} className="text-purple-500 shrink-0" />
              <div className="text-[10px] text-zinc-500 leading-normal">
                <strong>Sugestão prática:</strong> Gere um token clássico na sua conta GitHub em <span className="font-semibold text-zinc-700">Settings &gt; Developer Settings &gt; Personal Access Tokens &gt; Tokens (classic)</span> e ative apenas o escopo <span className="font-semibold text-emerald-600">gist</span>. É rápido!
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
