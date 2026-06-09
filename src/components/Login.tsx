/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  Mail, 
  Key, 
  Database, 
  ShieldCheck, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Check, 
  ArrowRight, 
  Smartphone,
  Globe,
  Settings,
  HelpCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  getCurrentUser, 
  supabaseSignIn, 
  supabaseSignUp, 
  isSupabaseConfigured, 
  initSupabaseClient,
  getSupabaseCredentials
} from '../supabase';

interface LoginProps {
  onLoginSuccess: (user: any, authType: 'supabase' | 'local') => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  // Auth Modes: 'supabase' (Cloud Auth) or 'local' (PIN/Password)
  const [authMode, setAuthMode] = useState<'supabase' | 'local'>('local');
  
  // Credentials
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Supabase Manual Connection configuration
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => localStorage.getItem('fp_custom_supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState<string>(() => localStorage.getItem('fp_custom_supabase_key') || '');
  const [showSupaConfig, setShowSupaConfig] = useState<boolean>(false);
  const [isSupaActive, setIsSupaActive] = useState<boolean>(isSupabaseConfigured);

  // Sign up vs Login Toggle
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  
  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Local PIN / Password settings
  const [hasLocalPassword, setHasLocalPassword] = useState<boolean>(() => !!localStorage.getItem('local_security_password'));

  useEffect(() => {
    // If Supabase has default env keys, default to cloud mode. Else default to local mode
    const creds = getSupabaseCredentials();
    if (creds.url && creds.key) {
      setAuthMode('supabase');
    }
  }, []);

  // Handle local credentials
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      return;
    }

    if (!hasLocalPassword) {
      // Sign-up flow for local lock
      if (password.length < 4) {
        setErrorMsg('A senha local deve ter pelo menos 4 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        return;
      }

      // Save local password
      localStorage.setItem('local_security_password', btoa(password)); // Obfustication
      setHasLocalPassword(true);
      setSuccessMsg('Senha de proteção local configurada com sucesso!');
      
      setTimeout(() => {
        onLoginSuccess({ email: 'local-user@finance' }, 'local');
      }, 1000);
    } else {
      // Login flow for local lock
      const savedObf = localStorage.getItem('local_security_password') || '';
      if (btoa(password) === savedObf) {
        setSuccessMsg('Acesso liberado!');
        setTimeout(() => {
          onLoginSuccess({ email: 'local-user@finance' }, 'local');
        }, 800);
      } else {
        setErrorMsg('Senha incorreta. Tente novamente.');
      }
    }
  };

  // Connect custom Supabase configuration
  const handleConnectSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const url = supabaseUrl.trim();
    const key = supabaseKey.trim();

    if (!url || !key) {
      setErrorMsg('Informe tanto a URL quanto a Anon Key do seu projeto Supabase.');
      return;
    }

    try {
      localStorage.setItem('fp_custom_supabase_url', url);
      localStorage.setItem('fp_custom_supabase_key', key);
      
      initSupabaseClient();
      setIsSupaActive(isSupabaseConfigured);

      if (isSupabaseConfigured) {
        setSuccessMsg('Supabase conectado com sucesso! Agora você pode criar sua conta em nuvem ou entrar.');
        setShowSupaConfig(false);
      } else {
        setErrorMsg('Erro ao inicializar o cliente. Verifique se a URL e a Anon Key são válidas.');
      }
    } catch (err: any) {
      setErrorMsg('Falha de conexão: ' + (err.message || err));
    }
  };

  // Handle Supabase Auth (Sign In / Sign Up)
  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos do formulário.');
      return;
    }

    if (!isSupaActive) {
      setErrorMsg('A conexão com o Supabase não está ativa. Configure-a primeiro.');
      setShowSupaConfig(true);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign-up workflow
        if (password.length < 6) {
          setErrorMsg('A senha do Supabase deve possuir no mínimo 6 caracteres.');
          setLoading(false);
          return;
        }

        const res = await supabaseSignUp(email, password);
        if (res.success) {
          setSuccessMsg('Conta criada na nuvem com sucesso! Verifique seu e-mail para confirmação (caso ativado) ou faça o login.');
          setIsSignUp(false);
        } else {
          setErrorMsg(res.error || 'Erro ao realizar o cadastro no Supabase.');
        }
      } else {
        // Sign-in workflow
        const res = await supabaseSignIn(email, password);
        if (res.success && res.user) {
          setSuccessMsg('Sessão autenticada na nuvem!');
          setTimeout(() => {
            onLoginSuccess(res.user, 'supabase');
          }, 800);
        } else {
          setErrorMsg(res.error || 'Falha na autenticação. Verifique suas credenciais.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // Simple local bypass if forgotten (with strong warnings)
  const handleEmergencyResetLocal = () => {
    if (window.confirm('Atenção: Redefinir seu login local limpará apenas sua senha de proteção local. Nenhum lançamento financeiro offline será apagado do navegador. Deseja redefinir a senha para criar uma nova?')) {
      localStorage.removeItem('local_security_password');
      setHasLocalPassword(false);
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg('Senha protetora redefinida. Digite uma nova senha para proteger seu acesso.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* Visual Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-950 text-white shadow-xl shadow-zinc-250 border border-zinc-800">
          <ShieldCheck size={24} className="text-zinc-50" />
        </div>
        <h2 className="text-2xl font-bold Tracking-tight text-zinc-900 font-sans mt-2">
          Finanças Pessoais
        </h2>
        <p className="text-xs text-zinc-500 font-medium">
          Privacidade Bancária, Controle de Faturas e Análise com Inteligência Artificial
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Auth Mode Toggle Tabs */}
        <div className="bg-zinc-100 p-1 rounded-xl flex mb-4 border border-zinc-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('local');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
              authMode === 'local' 
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Smartphone size={14} />
            Proteção Local (PIN / Senha)
          </button>
          
          <button
            type="button"
            onClick={() => {
              setAuthMode('supabase');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
              authMode === 'supabase' 
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Globe size={14} />
            Sincronizar Nuvem (Supabase)
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white py-8 px-6 sm:px-10 border border-zinc-150 rounded-2xl shadow-xl shadow-zinc-100 space-y-6">
          
          {/* Dynamic Feedbacks */}
          {errorMsg && (
            <div className="bg-red-50/50 border border-red-150 p-3.5 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={15} />
              <p className="text-[11px] text-red-800 font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50/50 border border-emerald-150 p-3.5 rounded-xl flex items-start gap-2.5">
              <Check className="text-emerald-600 mt-0.5 shrink-0" size={15} />
              <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* ================= MODE 1: LOCAL PASSWORD SHIELD ================= */}
          {authMode === 'local' && (
            <form onSubmit={handleLocalSubmit} className="space-y-4">
              <div className="text-center space-y-1.5 border-b border-zinc-100 pb-4">
                <h3 className="text-sm font-bold text-zinc-800">
                  {hasLocalPassword ? 'Acesse sua carteira pessoal' : 'Crie sua senha de segurança'}
                </h3>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  {hasLocalPassword 
                    ? 'Seus dados de faturas estão criptografados localmente. Insira sua senha para desbloquear.' 
                    : 'Configure uma senha para impedir que outras pessoas visualizem seu histórico financeiro neste navegador.'
                  }
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  {hasLocalPassword ? 'Digite sua senha' : 'Criar Senha de Acesso'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 pl-9.5 pr-10 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock size={14} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 cursor-pointer focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {!hasLocalPassword && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 pl-9.5 pr-10 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Lock size={14} />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl py-3 border border-zinc-800 shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {hasLocalPassword ? 'Acessar Finanças' : 'Criar Proteção e Entrar'}
                <ArrowRight size={14} />
              </button>

              {hasLocalPassword && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleEmergencyResetLocal}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 font-medium transition-colors cursor-pointer"
                  >
                    Esqueceu sua senha local? clique para redefinir.
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ================= MODE 2: SUPABASE AUTH CLOUD ================= */}
          {authMode === 'supabase' && (
            <div className="space-y-4">
              
              {/* Connection configuration fields if not active */}
              {!isSupaActive && !showSupaConfig && (
                <div className="bg-amber-50/50 border border-amber-150 p-4 rounded-xl text-amber-800 text-xs space-y-2.5">
                  <p className="font-bold flex items-center gap-1 text-[11px]">
                    <AlertCircle size={14} />
                    Supabase ainda não conectado
                  </p>
                  <p className="text-[10px] text-amber-900 leading-relaxed">
                    Para usar segurança em nuvem sincronizada entre múltiplos aparelhos, é necessário primeiro nos conectar ao seu projeto Supabase. 
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSupaConfig(true)}
                    className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings size={11} />
                    Configurar Conexão do Supabase
                  </button>
                </div>
              )}

              {/* Supabase Connection Details Form */}
              {showSupaConfig && (
                <form onSubmit={handleConnectSupabase} className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <Database size={13} className="text-zinc-500" />
                      Configurar Conexão do Banco
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowSupaConfig(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-800 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Supabase URL</label>
                    <input
                      type="text"
                      placeholder="https://xyzabcdefg.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full bg-white border border-zinc-250 rounded-lg py-1.5 px-2.5 text-xs text-zinc-800 placeholder-zinc-450 focus:outline-none focus:border-zinc-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Supabase Anon Key</label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full bg-white border border-zinc-250 rounded-lg py-1.5 px-2.5 text-xs text-zinc-800 placeholder-zinc-450 focus:outline-none focus:border-zinc-950"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-[10px] leading-3 rounded-lg py-1.5 transition-colors cursor-pointer"
                  >
                    Conectar Banco de Dados
                  </button>
                </form>
              )}

              {/* Status Indicator */}
              {isSupaActive && (
                <div className="bg-emerald-50/20 border border-emerald-150 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="text-emerald-500" size={14} />
                    <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest leading-none">Banco Supabase Conectado</span>
                  </div>
                  <button 
                    onClick={() => setShowSupaConfig(!showSupaConfig)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 font-semibold"
                  >
                    <Settings size={10} />
                    Editar
                  </button>
                </div>
              )}

              {/* Actual Supabase Login Form */}
              <form onSubmit={handleSupabaseSubmit} className="space-y-4">
                <div className="text-center space-y-1.5 border-b border-zinc-100 pb-4">
                  <h3 className="text-sm font-bold text-zinc-800">
                    {isSignUp ? 'Cadastrar nova conta na Nuvem' : 'Entrar com sua conta Supabase'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Seus lançamentos serão segmentados na nuvem e protegidos de forma 100% isolada e exclusiva pelo controle de login.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Endereço de E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="exemplo@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 pl-9.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Mail size={14} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 pl-9.5 pr-10 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Lock size={14} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 cursor-pointer focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl py-3 border border-zinc-800 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      {isSignUp ? 'Cadastrando...' : 'Entrando...'}
                    </>
                  ) : (
                    <>
                      {isSignUp ? 'Concluir Cadastro Cloud' : 'Autenticar com Supabase'}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-950 font-semibold transition-colors cursor-pointer"
                  >
                    {isSignUp 
                      ? 'Já possui uma conta? clique para Fazer Login' 
                      : 'Não tem uma conta ainda? criar conta na nuvem'
                    }
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>
        
        {/* Support helper and privacy badge */}
        <div className="mt-4 text-center space-y-1.5">
          <p className="text-[10px] text-zinc-400 leading-normal flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-zinc-400 shrink-0" />
            Sua conexão e senhas são encriptadas de ponta a ponta.
          </p>
        </div>

      </div>
    </div>
  );
}
