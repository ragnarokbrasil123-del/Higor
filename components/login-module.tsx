'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Phone, ArrowRight, ShieldCheck, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { InstallPrompt } from '@/components/install-prompt';
import { LOGIN_PROFESSOR_LIBERADO, LOGIN_RESPONSAVEL_LIBERADO, normalizarCodigo } from '@/lib/acesso';
import { buscarFilhos, MENSAGEM_FALHA } from '@/lib/login-responsavel';
import {
  conferirCodigo, criarAcesso, loginEquipe,
  MENSAGEM_CONVITE, MENSAGEM_LOGIN,
} from '@/lib/equipe';

interface LoginModuleProps {
  onLogin: (role: 'admin' | 'teacher' | 'client', data: any) => void;
}

export function LoginModule({ onLogin }: LoginModuleProps) {
  const [loginType, setLoginType] = useState<'none' | 'team' | 'client' | 'convite'>('none');

  // Equipe
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showTeamPassword, setShowTeamPassword] = useState(false);

  // Cliente
  const [phone, setPhone] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);

  // Convite: primeiro confere o código, depois a pessoa cria o acesso
  const [codigo, setCodigo] = useState('');
  // sem `id`: o passo 2 do convite reenvia o CÓDIGO e o servidor resolve de
  // quem é. Guardar um id aqui permitiria pedir acesso para outra conta.
  const [convidado, setConvidado] = useState<{ name: string | null; role: string } | null>(null);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [repeteSenha, setRepeteSenha] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const voltarInicio = () => {
    setLoginType('none'); setError('');
    setCodigo(''); setConvidado(null);
    setNovoUsuario(''); setNovaSenha(''); setRepeteSenha('');
  };

  /** Passo 1 do convite: o código existe, é desta pessoa e ainda vale? */
  const handleConferirCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    const r = await conferirCodigo(codigo);

    setLoading(false);

    if (!r.ok) return setError(MENSAGEM_CONVITE[r.motivo]);

    // o id não vem mais do cliente: o passo 2 reenvia o CÓDIGO, e é o
    // servidor que resolve de quem é. Confiar num id daqui permitiria
    // pedir "crie acesso para o id do admin" sem convite nenhum.
    setConvidado({ name: r.convidado.name, role: r.convidado.role });
  };

  /** Passo 2 do convite: define usuário e senha e libera a conta. */
  const handleCriarAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convidado) return;

    const usuario = novoUsuario.toLowerCase().trim();
    if (usuario.length < 4) return setError('O usuário precisa de pelo menos 4 caracteres.');
    if (novaSenha.length < 6) return setError('A senha precisa de pelo menos 6 caracteres.');
    if (novaSenha !== repeteSenha) return setError('As duas senhas não são iguais.');

    setLoading(true); setError('');

    const r = await criarAcesso(codigo, usuario, novaSenha);

    setLoading(false);

    if (!r.ok) return setError(MENSAGEM_CONVITE[r.motivo]);

    if (r.usuario.role === 'teacher' && !LOGIN_PROFESSOR_LIBERADO) {
      setError('Acesso criado! Mas a entrada de professores ainda não foi liberada pela administração.');
      setConvidado(null);
      return;
    }
    onLogin(r.usuario.role as 'admin' | 'teacher', r.usuario);
  };

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    
    const r = await loginEquipe(username, password);

    setLoading(false);

    if (!r.ok) {
      // 'bloqueada' cobre convite não usado, acesso cortado pelo master
      // e conta inativa — a conferência vive em contaLiberada()
      setError(MENSAGEM_LOGIN[r.motivo]);
    } else if (r.usuario.role === 'teacher' && !LOGIN_PROFESSOR_LIBERADO) {
      // trava geral: nenhum professor entra por enquanto
      setError('O acesso de professor ainda não foi liberado. Fale com a administração.');
    } else {
      onLogin(r.usuario.role as 'admin' | 'teacher', r.usuario);
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // trava temporária: nem consulta o banco enquanto o portal está fechado
    if (!LOGIN_RESPONSAVEL_LIBERADO) {
      setError('O portal dos responsáveis ainda não foi liberado.');
      return;
    }

    setLoading(true); setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setError('Digite um número de telefone válido.');
      setLoading(false);
      return;
    }

    // Busca TODOS os filhos daquele telefone (irmãos usam o mesmo login).
    // A regra de casamento vive em lib/login-responsavel.ts — o portal
    // usa a mesma, senão uma correção aqui deixaria o outro lado aberto.
    const r = await buscarFilhos(cleanPhone, clientPassword);

    setLoading(false);

    if (!r.ok) {
      setError(MENSAGEM_FALHA[r.motivo]);
    } else {
      onLogin('client', r.filhos);
    }
  };

  const handleForgotPassword = () => {
    alert("Para sua segurança, as senhas só podem ser redefinidas presencialmente ou pelo WhatsApp oficial da recepção do Clube Olimpo. Por favor, entre em contato conosco!");
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Instalar antes de entrar é o momento natural — e no iPhone os avisos
          só funcionam com o app na Tela de Início. */}
      <InstallPrompt />

      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-surface-raised to-amber-900/20 opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-10">
          {/* `priority`: é o maior elemento desta tela, ou seja, o que o
              navegador usa para medir o LCP. Sem isso ele entra na fila
              comum e o app aparenta demorar mais do que demora. */}
          <Image
            src="/logo.png"
            alt="Clube Olimpo"
            width={176}
            height={176}
            priority
            className="w-44 h-44 object-contain mb-4 drop-shadow-2xl"
          />
          <h1 className="text-white text-2xl font-bold tracking-widest uppercase">Portal de Acesso</h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {loginType === 'none' ? (
            <motion.div key="selector" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
              <button onClick={() => setLoginType('team')} className="w-full p-5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl backdrop-blur-md transition-all flex items-center justify-between group active:scale-95">
                <div className="flex items-center gap-4 text-white">
                  <div className="p-3 bg-brand rounded-xl text-black shadow-lg shadow-brand/30"><ShieldCheck className="w-6 h-6" /></div>
                  <div className="text-left"><p className="font-bold text-lg">Portal do Colaborador</p><p className="text-xs text-ink-on-dark">{LOGIN_PROFESSOR_LIBERADO ? 'Professores e Administração' : 'Somente Administração'}</p></div>
                </div>
                <ArrowRight className="w-5 h-5 text-brand group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setLoginType('client')}
                disabled={!LOGIN_RESPONSAVEL_LIBERADO}
                className={`w-full p-5 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-md transition-all flex items-center justify-between group ${LOGIN_RESPONSAVEL_LIBERADO ? 'hover:bg-white/20 active:scale-95' : 'opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-4 text-white">
                  <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/30"><User className="w-6 h-6" /></div>
                  <div className="text-left"><p className="font-bold text-lg">Portal do Aluno</p><p className="text-xs text-ink-on-dark">{LOGIN_RESPONSAVEL_LIBERADO ? 'Alunos e responsáveis' : 'Portal ainda não liberado'}</p></div>
                </div>
                {LOGIN_RESPONSAVEL_LIBERADO
                  ? <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  : <Lock className="w-5 h-5 text-ink-on-dark-muted" />}
              </button>

            </motion.div>
          ) : loginType === 'team' ? (
            
            /* --- LOGIN DA EQUIPE --- */
            <motion.div key="team-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-md">
              <button onClick={() => {setLoginType('none'); setError('');}} className="mb-6 text-brand flex items-center gap-2 text-sm font-bold"><ArrowLeft className="w-4 h-4"/> Voltar</button>
              <form onSubmit={handleTeamLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Usuário</label>
                  <div className="relative mt-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-brand transition-colors" placeholder="Ex: admin" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Senha</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                    <input type={showTeamPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-brand transition-colors" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowTeamPassword(!showTeamPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-on-dark-muted hover:text-brand transition-colors">
                      {showTeamPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-brand text-black font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-brand/20">{loading ? "Entrando..." : "Entrar no Sistema"}</button>
              </form>
            </motion.div>

          ) : loginType === 'convite' ? (

            /* --- CRIAR ACESSO COM CÓDIGO DE CONVITE --- */
            <motion.div key="convite-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-md">
              <button onClick={voltarInicio} className="mb-6 text-brand flex items-center gap-2 text-sm font-bold"><ArrowLeft className="w-4 h-4"/> Voltar</button>

              {!convidado ? (
                /* passo 1: conferir o código */
                <form onSubmit={handleConferirCodigo} className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-3 bg-brand/20 rounded-2xl flex items-center justify-center">
                      <KeyRound className="w-7 h-7 text-brand" />
                    </div>
                    <h2 className="text-white font-bold text-lg mb-1">Criar meu acesso</h2>
                    <p className="text-ink-on-dark text-xs">Digite o código que a administração te passou.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Código do convite</label>
                    <input
                      type="text" required value={codigo} autoCapitalize="characters" autoComplete="off"
                      onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
                      maxLength={9}
                      className="w-full mt-1 px-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white text-center text-2xl font-mono font-black tracking-[0.3em] outline-none focus:border-brand transition-colors"
                      placeholder="XXXX-XXXX"
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-brand text-black font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-brand/20">
                    {loading ? "Conferindo..." : "Continuar"}
                  </button>
                </form>
              ) : (
                /* passo 2: escolher usuário e senha */
                <form onSubmit={handleCriarAcesso} className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-brand text-xs font-bold uppercase tracking-wider">
                      {convidado.role === 'admin' ? 'Administrador' : 'Professor'}
                    </p>
                    <h2 className="text-white font-bold text-lg mt-1 leading-tight">Olá, {(convidado.name || '').split(' ')[0]}!</h2>
                    <p className="text-ink-on-dark text-xs mt-1">Escolha como você vai entrar daqui pra frente.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Usuário</label>
                    <div className="relative mt-1">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                      <input type="text" required value={novoUsuario} autoCapitalize="none" onChange={(e) => setNovoUsuario(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-brand transition-colors" placeholder="Ex: maria.silva" />
                    </div>
                    <p className="text-[11px] text-ink-on-dark-muted mt-1.5 ml-1">Mínimo 4 caracteres. Pode ser seu e-mail.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Criar senha</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                      <input type={showTeamPassword ? "text" : "password"} required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-brand transition-colors" placeholder="Mínimo 6 caracteres" />
                      <button type="button" onClick={() => setShowTeamPassword(!showTeamPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-on-dark-muted hover:text-brand transition-colors">
                        {showTeamPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Repetir a senha</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                      <input type={showTeamPassword ? "text" : "password"} required value={repeteSenha} onChange={(e) => setRepeteSenha(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-brand transition-colors" placeholder="••••••••" />
                    </div>
                  </div>
                  {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-brand text-black font-bold rounded-xl active:scale-95 transition-transform shadow-lg shadow-brand/20">
                    {loading ? "Criando..." : "Criar acesso e entrar"}
                  </button>
                </form>
              )}
            </motion.div>

          ) : (

            /* --- LOGIN DO CLIENTE/PAI --- */
            <motion.div key="client-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white/10 border border-white/20 p-6 rounded-3xl backdrop-blur-md">
              <button onClick={() => {setLoginType('none'); setError('');}} className="mb-6 text-blue-400 flex items-center gap-2 text-sm font-bold"><ArrowLeft className="w-4 h-4"/> Voltar</button>
              <form onSubmit={handleClientLogin} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-white font-bold text-lg mb-1">Dossiê do Aluno</h2>
                  <p className="text-ink-on-dark text-xs">Digite os dados cadastrados na secretaria.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">WhatsApp</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="(DDD) 99999-9999" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-on-dark uppercase tracking-wider ml-1">Senha de Acesso</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-on-dark-muted" />
                    <input type={showClientPassword ? "text" : "password"} required value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 transition-colors" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowClientPassword(!showClientPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-on-dark-muted hover:text-blue-400 transition-colors">
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
