'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Phone, ArrowRight, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginModuleProps {
  onLogin: (role: 'admin' | 'teacher' | 'client', data: any) => void;
}

export function LoginModule({ onLogin }: LoginModuleProps) {
  const [loginType, setLoginType] = useState<'none' | 'team' | 'client'>('none');
  
  // Equipe
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showTeamPassword, setShowTeamPassword] = useState(false);
  
  // Cliente
  const [phone, setPhone] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    
    const { data, error: dbError } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('password', password)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError('Acesso negado. Verifique usuário e senha.');
    } else {
      onLogin(data.role as 'admin' | 'teacher', data);
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setError('Digite um número de telefone válido.');
      setLoading(false);
      return;
    }
    
    // Busca o aluno pelo telefone e valida a senha
    const { data, error: dbError } = await supabase
      .from('students')
      .select('*, evaluations(*)')
      .ilike('phone', `%${cleanPhone}%`)
      .eq('password', clientPassword)
      .limit(1)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError('Telefone ou Senha incorretos. Tente novamente.');
    } else {
      onLogin('client', data);
    }
  };

  const handleForgotPassword = () => {
    alert("Para sua segurança, as senhas só podem ser redefinidas presencialmente ou pelo WhatsApp oficial da recepção do Clube Olimpo. Por favor, entre em contato conosco!");
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900 to-amber-900/20 opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="Clube Olimpo" className="w-48 h-auto object-contain drop-shadow-2xl mb-4" />
          <h1 className="text-white text-2xl font-bold tracking-widest uppercase">Portal de Acesso</h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {loginType === 'none' ? (
            <motion.div key="selector" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
              <button onClick={() => setLoginType('team')} className="w-full p-5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl backdrop-blur-md transition-all flex items-center justify-between group active:scale-95">
                <div className="flex items-center gap-4 text-white">
                  <div className="p-3 bg-amber-500 rounded-xl text-black shadow-lg shadow-amber-500/30"><ShieldCheck className="w-6 h-6" /></div>
                  <div className="text-left"><p className="font-bold text-lg">Sou da Equipe</p><p className="text-xs text-slate-300">Professores e Administração</p></div>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </button>

              <button onClick={() => setLoginType('client')} className="w-full p-5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl backdrop-blur-md transition-all flex items-center justify-between group active:scale-95">
                <div className="flex items-center gap-4 text-white">
                  <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/30"><User className="w-6 h-6" /></div>
                  <div className="text-left"><p className="font-bold text-lg">Sou Aluno/Responsável</p><p className="text-xs text-slate-300">Acessar ficha de avaliação</p></div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ) : loginType === 'team' ? (
            
            /* --- LOGIN DA EQUIPE --- */
            <motion.div key="team-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-md">
              <button onClick={() => {setLoginType('none'); setError('');}} className="mb-6 text-amber-500 flex items-center gap-2 text-sm font-bold"><ArrowLeft className="w-4 h-4"/> Voltar</button>
              <form onSubmit={handleTeamLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Usuário</label>
                  <div className="relative mt-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" placeholder="Ex: admin" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Senha</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type={showTeamPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-amber-500 transition-colors" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowTeamPassword(!showTeamPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                      {showTeamPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-amber-500 text-black font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-amber-500/20">{loading ? "Entrando..." : "Entrar no Sistema"}</button>
              </form>
            </motion.div>

          ) : (
            
            /* --- LOGIN DO CLIENTE/PAI --- */
            <motion.div key="client-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-md">
              <button onClick={() => {setLoginType('none'); setError('');}} className="mb-6 text-blue-400 flex items-center gap-2 text-sm font-bold"><ArrowLeft className="w-4 h-4"/> Voltar</button>
              <form onSubmit={handleClientLogin} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-white font-bold text-lg mb-1">Dossiê do Aluno</h2>
                  <p className="text-slate-300 text-xs">Digite os dados cadastrados na secretaria.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">WhatsApp</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="(DDD) 99999-9999" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Senha de Acesso</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type={showClientPassword ? "text" : "password"} required value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowClientPassword(!showClientPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors">
                      {showClientPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-400 font-medium hover:underline">Esqueci a senha</button>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-blue-500/20">{loading ? "Buscando ficha..." : "Acessar Ficha"}</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
