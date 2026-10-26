'use client';

import { avisar, Button } from '@/components/ui';
import Image from 'next/image';
import React, { useState } from 'react';
import { Lock, User, Phone, ArrowRight, ShieldCheck, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
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

/* ============================================================
   Peças desta tela.

   Os oito campos eram o mesmo bloco de seis linhas copiado, com a
   cadeia de classes repetida em cada um: mudar a altura do campo
   era mudar oito lugares. Ficam fora do componente de propósito —
   declaradas dentro dele, o React as trataria como um tipo novo a
   cada tecla digitada e o campo perderia o foco.
   ============================================================ */

interface CampoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  icone: LucideIcon;
  /** Botão encostado na direita (mostrar/ocultar senha). */
  acao?: React.ReactNode;
  ajuda?: string;
}

function Campo({ rotulo, icone: Icone, acao, ajuda, className, ...props }: CampoProps) {
  return (
    <div>
      <label className="text-xs font-bold text-ink-muted uppercase tracking-wider ml-1">{rotulo}</label>
      <div className="relative mt-1">
        <Icone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-subtle pointer-events-none" />
        <input
          {...props}
          className={cn(
            'w-full pl-12 py-4 bg-surface-sunken border border-line rounded-control text-ink',
            'outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25',
            acao ? 'pr-12' : 'pr-4',
            className
          )}
        />
        {acao}
      </div>
      {ajuda && <p className="text-mini text-ink-subtle mt-1.5 ml-1">{ajuda}</p>}
    </div>
  );
}

/** Mostrar/ocultar senha. O rótulo é lido em voz alta; o ícone sozinho não diz nada. */
function BotaoOlho({ mostrando, aoAlternar }: { mostrando: boolean; aoAlternar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-label={mostrando ? 'Ocultar senha' : 'Mostrar senha'}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-control text-ink-subtle hover:text-brand-text transition-colors"
    >
      {mostrando ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );
}

function BotaoVoltar({ aoClicar }: { aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="mb-5 -ml-2 px-2 py-2 min-h-11 inline-flex items-center gap-2 rounded-control text-sm font-bold text-brand-text hover:bg-brand-soft transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> Voltar
    </button>
  );
}

/**
 * Erro do formulário. O role="alert" faz o leitor de tela anunciar
 * o texto assim que ele aparece — antes era um parágrafo comum, que
 * passava em silêncio para quem não enxerga a cor vermelha.
 */
function Erro({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-sm font-bold text-danger-ink bg-danger-soft border border-danger/25 rounded-control px-3 py-2.5 text-center">
      {texto}
    </p>
  );
}

/** Água no pé da tela. Decoração: invisível para leitor de tela. */
function Ondas() {
  return (
    <svg
      className="fixed bottom-0 left-0 w-full h-44 pointer-events-none"
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path fill="#ffffff" fillOpacity="0.07" d="M0,118 C240,178 480,58 720,98 C960,138 1200,178 1440,118 L1440,200 L0,200 Z" />
      <path fill="#ffffff" fillOpacity="0.10" d="M0,152 C300,102 600,182 900,142 C1140,112 1320,162 1440,152 L1440,200 L0,200 Z" />
    </svg>
  );
}

/** Cartão branco onde moram os formulários. */
function Cartao({ children, chave }: { children: React.ReactNode; chave: string }) {
  return (
    <div key={chave} className="bg-surface rounded-panel shadow-overlay p-6 motion-safe:animate-[surge-lado_.2s_ease-out]">
      {children}
    </div>
  );
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
    avisar("Para sua segurança, as senhas só podem ser redefinidas presencialmente ou pelo WhatsApp oficial da recepção do Clube Olimpo. Por favor, entre em contato conosco!");
  };

  return (
    /* A rolagem fica NESTA caixa, que ocupa a janela inteira, e não no
       bloco do formulário: presa ao bloco, a barra aparecia encostada
       no cartão, no meio da tela.

       O conteúdo é centralizado com `m-auto` e não com `justify-center`:
       num container que rola, centralizar pelo flex empurra o topo para
       fora e ele fica inalcançável — não dá para rolar para cima do
       início. Com margem automática, o excesso sobra para baixo. */
    <div className="fixed inset-0 overflow-y-auto overscroll-contain bg-[#06283f]">
      {/* Instalar antes de entrar é o momento natural — e no iPhone os avisos
          só funcionam com o app na Tela de Início. */}
      <InstallPrompt />

      {/* Fundo: água funda em cima, clareando até a cor da marca embaixo.
          As cores são literais, e não tokens, porque esta é a única tela
          que não muda de tema — ela acontece antes de o app saber quem
          entrou. O cartão branco por cima é que carrega os tokens. */}
      <div className="fixed inset-0 bg-[linear-gradient(165deg,#06283f_0%,#0a4a73_55%,#097cba_100%)]" />
      <Ondas />

      <div className="relative z-10 min-h-full flex">
        <div className="w-full max-w-md p-6 m-auto">
          <div className="flex flex-col items-center mb-7 motion-safe:animate-[desce_.3s_ease-out]">
            {/* `priority`: é o maior elemento desta tela, ou seja, o que o
                navegador usa para medir o LCP. Sem isso ele entra na fila
                comum e o app aparenta demorar mais do que demora. */}
            <Image
              src="/logo.png"
              alt="Clube Olimpo"
              width={176}
              height={176}
              priority
              className="w-28 h-28 md:w-36 md:h-36 object-contain mb-3 drop-shadow-2xl"
            />
            <h1 className="font-titulo text-white text-xl md:text-2xl font-semibold tracking-[0.18em] uppercase text-center">
              Portal de Acesso
            </h1>
            {/* fio de ouro: a cor da conquista aparece uma vez, sem disputar
                com o azul da ação */}
            <span className="mt-3 h-px w-16 bg-ouro" aria-hidden="true" />
          </div>

          {loginType === 'none' ? (
            <div key="selector" className="space-y-3 motion-safe:animate-[cresce_.2s_ease-out]">
              <button
                onClick={() => setLoginType('team')}
                className="w-full p-5 bg-surface rounded-card shadow-overlay border border-line flex items-center justify-between gap-3 text-left group transition-all hover:border-brand-line active:scale-[.98]"
              >
                <span className="flex items-center gap-4 min-w-0">
                  <span className="p-3 bg-brand rounded-control text-brand-ink shrink-0"><ShieldCheck className="w-6 h-6" /></span>
                  <span className="min-w-0">
                    <span className="block font-bold text-lg text-ink leading-tight">Portal do Colaborador</span>
                    <span className="block text-xs text-ink-muted mt-0.5">{LOGIN_PROFESSOR_LIBERADO ? 'Professores e Administração' : 'Somente Administração'}</span>
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 text-brand-text shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setLoginType('client')}
                disabled={!LOGIN_RESPONSAVEL_LIBERADO}
                className={cn(
                  'w-full p-5 bg-surface rounded-card shadow-overlay border border-line flex items-center justify-between gap-3 text-left group transition-all',
                  LOGIN_RESPONSAVEL_LIBERADO ? 'hover:border-brand-line active:scale-[.98]' : 'opacity-60 cursor-not-allowed'
                )}
              >
                <span className="flex items-center gap-4 min-w-0">
                  <span className="p-3 bg-brand rounded-control text-brand-ink shrink-0"><User className="w-6 h-6" /></span>
                  <span className="min-w-0">
                    <span className="block font-bold text-lg text-ink leading-tight">Portal do Aluno</span>
                    <span className="block text-xs text-ink-muted mt-0.5">{LOGIN_RESPONSAVEL_LIBERADO ? 'Alunos e responsáveis' : 'Portal ainda não liberado'}</span>
                  </span>
                </span>
                {LOGIN_RESPONSAVEL_LIBERADO
                  ? <ArrowRight className="w-5 h-5 text-brand-text shrink-0 group-hover:translate-x-1 transition-transform" />
                  : <Lock className="w-5 h-5 text-ink-subtle shrink-0" />}
              </button>
            </div>
          ) : loginType === 'team' ? (

            /* --- LOGIN DA EQUIPE --- */
            <Cartao chave="team-form">
              <BotaoVoltar aoClicar={() => { setLoginType('none'); setError(''); }} />
              <form onSubmit={handleTeamLogin} className="space-y-4">
                <Campo
                  rotulo="Usuário" icone={User} type="text" required
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none" autoComplete="username" placeholder="Ex: admin"
                />
                <Campo
                  rotulo="Senha" icone={Lock} required
                  type={showTeamPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" placeholder="••••••••"
                  acao={<BotaoOlho mostrando={showTeamPassword} aoAlternar={() => setShowTeamPassword(!showTeamPassword)} />}
                />
                <Erro texto={error} />
                <Button type="submit" block size="lg" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </Button>
              </form>
            </Cartao>

          ) : loginType === 'convite' ? (

            /* --- CRIAR ACESSO COM CÓDIGO DE CONVITE --- */
            <Cartao chave="convite-form">
              <BotaoVoltar aoClicar={voltarInicio} />

              {!convidado ? (
                /* passo 1: conferir o código */
                <form onSubmit={handleConferirCodigo} className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-3 bg-brand-soft rounded-card flex items-center justify-center">
                      <KeyRound className="w-7 h-7 text-brand-text" />
                    </div>
                    <h2 className="font-titulo text-ink font-semibold text-lg mb-1">Criar meu acesso</h2>
                    <p className="text-ink-muted text-xs">Digite o código que a administração te passou.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink-muted uppercase tracking-wider ml-1">Código do convite</label>
                    <input
                      type="text" required value={codigo} autoCapitalize="characters" autoComplete="off"
                      onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
                      maxLength={9}
                      className="w-full mt-1 px-4 py-4 bg-surface-sunken border border-line rounded-control text-ink text-center text-2xl font-mono font-black tracking-[0.3em] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
                      placeholder="XXXX-XXXX"
                    />
                  </div>
                  <Erro texto={error} />
                  <Button type="submit" block size="lg" disabled={loading}>
                    {loading ? 'Conferindo...' : 'Continuar'}
                  </Button>
                </form>
              ) : (
                /* passo 2: escolher usuário e senha */
                <form onSubmit={handleCriarAcesso} className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-brand-text text-xs font-bold uppercase tracking-wider">
                      {convidado.role === 'admin' ? 'Administrador' : 'Professor'}
                    </p>
                    <h2 className="font-titulo text-ink font-semibold text-lg mt-1 leading-tight">Olá, {(convidado.name || '').split(' ')[0]}!</h2>
                    <p className="text-ink-muted text-xs mt-1">Escolha como você vai entrar daqui pra frente.</p>
                  </div>
                  <Campo
                    rotulo="Usuário" icone={User} type="text" required
                    value={novoUsuario} autoCapitalize="none" autoComplete="username"
                    onChange={(e) => setNovoUsuario(e.target.value)}
                    placeholder="Ex: maria.silva"
                    ajuda="Mínimo 4 caracteres. Pode ser seu e-mail."
                  />
                  <Campo
                    rotulo="Criar senha" icone={Lock} required
                    type={showTeamPassword ? 'text' : 'password'}
                    value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                    autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                    acao={<BotaoOlho mostrando={showTeamPassword} aoAlternar={() => setShowTeamPassword(!showTeamPassword)} />}
                  />
                  <Campo
                    rotulo="Repetir a senha" icone={Lock} required
                    type={showTeamPassword ? 'text' : 'password'}
                    value={repeteSenha} onChange={(e) => setRepeteSenha(e.target.value)}
                    autoComplete="new-password" placeholder="••••••••"
                  />
                  <Erro texto={error} />
                  <Button type="submit" block size="lg" disabled={loading}>
                    {loading ? 'Criando...' : 'Criar acesso e entrar'}
                  </Button>
                </form>
              )}
            </Cartao>

          ) : (

            /* --- LOGIN DO CLIENTE/PAI --- */
            <Cartao chave="client-form">
              <BotaoVoltar aoClicar={() => { setLoginType('none'); setError(''); }} />
              <form onSubmit={handleClientLogin} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="font-titulo text-ink font-semibold text-lg mb-1">Ficha do Aluno</h2>
                  <p className="text-ink-muted text-xs">Digite os dados cadastrados na secretaria.</p>
                </div>
                <Campo
                  rotulo="WhatsApp" icone={Phone} type="tel" required
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel" placeholder="(DDD) 99999-9999"
                />
                <div>
                  <Campo
                    rotulo="Senha de Acesso" icone={Lock} required
                    type={showClientPassword ? 'text' : 'password'}
                    value={clientPassword} onChange={(e) => setClientPassword(e.target.value)}
                    autoComplete="current-password" placeholder="••••••••"
                    acao={<BotaoOlho mostrando={showClientPassword} aoAlternar={() => setShowClientPassword(!showClientPassword)} />}
                  />
                  <div className="text-right mt-2">
                    <button type="button" onClick={handleForgotPassword} className="text-xs text-brand-text font-bold hover:underline py-1">
                      Esqueci a senha
                    </button>
                  </div>
                </div>
                <Erro texto={error} />
                <Button type="submit" block size="lg" disabled={loading}>
                  {loading ? 'Buscando ficha...' : 'Acessar Ficha'}
                </Button>
              </form>
            </Cartao>
          )}
        </div>
      </div>
    </div>
  );
}
