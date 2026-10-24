/* ============================================================
   Sessão verificável pelo servidor. SÓ NO SERVIDOR.

   O problema que isto resolve, e que é a trava de todo o resto:

   A sessão do app vive em `localStorage['olimpo_session']`, um JSON
   que o próprio navegador escreve. Serve bem para a INTERFACE decidir
   que abas mostrar — mas não vale nada como autorização, porque
   qualquer pessoa edita aquele JSON e se declara admin.

   Logo, uma rota de servidor que devolvesse a ficha dos alunos
   "para o admin" confiando nesse JSON ficaria tão aberta quanto a
   chave publishable está hoje: bastaria chamá-la dizendo ser admin.
   Trocar seis por meia dúzia.

   Aqui a sessão é um cookie HttpOnly ASSINADO (HMAC-SHA256) com um
   segredo que só o servidor conhece. O navegador não consegue forjar
   nem ler o conteúdo por JavaScript, e qualquer alteração invalida a
   assinatura.

   O QUE NÃO MUDA: a credencial. A equipe digita o mesmo usuário e
   senha; o responsável, o mesmo telefone e os mesmos 4 dígitos. O
   cookie é EMITIDO depois de a conferência dar certo — ele substitui
   a confiança no JSON, não a senha.
   ============================================================ */

import { createHmac, timingSafeEqual } from 'crypto';
import type { NextResponse } from 'next/server';

export const COOKIE_SESSAO = 'olimpo_sessao';

/** 30 dias. O pai abre o portal de vez em quando; sessão curta o expulsaria. */
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

export interface Sessao {
  papel: 'admin' | 'teacher' | 'client';
  /** `app_users.id` — só para a equipe. */
  uid?: string;
  /** Nome da equipe, usado para casar turmas (`lecionaEm`). */
  nome?: string;
  /** Admin master (`is_master`): é quem convida e corta acesso. */
  master?: boolean;
  /** Telefone em dígitos — delimita de quais filhos o responsável trata. */
  tel?: string;
  /** Expiração em epoch ms. */
  exp: number;
}

export function temSegredoSessao() {
  return Boolean(process.env.SESSION_SECRET);
}

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET não configurada.');
  return s;
}

const b64url = (b: Buffer) => b.toString('base64url');

function assinar(corpo: string) {
  return b64url(createHmac('sha256', segredo()).update(corpo).digest());
}

/** Monta o valor do cookie: `<payload>.<assinatura>`. */
export function criarToken(dados: Omit<Sessao, 'exp'>): string {
  const sessao: Sessao = { ...dados, exp: Date.now() + VALIDADE_MS };
  const corpo = b64url(Buffer.from(JSON.stringify(sessao)));
  return `${corpo}.${assinar(corpo)}`;
}

/**
 * Confere assinatura e validade. Devolve `null` para qualquer problema
 * — token ausente, remendado, vencido ou malformado dão no mesmo: sem
 * sessão. Nunca lançar aqui, senão um cookie velho derruba a rota.
 */
export function lerToken(token?: string | null): Sessao | null {
  if (!token || !temSegredoSessao()) return null;

  const corte = token.lastIndexOf('.');
  if (corte <= 0) return null;

  const corpo = token.slice(0, corte);
  const assinatura = token.slice(corte + 1);

  let esperada: string;
  try {
    esperada = assinar(corpo);
  } catch {
    return null;
  }

  // comparação em tempo constante: comparar com === permitiria descobrir
  // a assinatura byte a byte pelo tempo de resposta
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const sessao = JSON.parse(Buffer.from(corpo, 'base64url').toString()) as Sessao;
    if (!sessao?.papel || typeof sessao.exp !== 'number') return null;
    if (sessao.exp < Date.now()) return null;
    return sessao;
  } catch {
    return null;
  }
}

/** Lê a sessão de uma requisição de Route Handler. */
export function sessaoDaRequisicao(req: Request): Sessao | null {
  const cru = req.headers.get('cookie') || '';
  const par = cru
    .split(';')
    .map(p => p.trim())
    .find(p => p.startsWith(`${COOKIE_SESSAO}=`));
  if (!par) return null;
  return lerToken(decodeURIComponent(par.slice(COOKIE_SESSAO.length + 1)));
}

/**
 * Grava o cookie na resposta.
 *
 * `httpOnly` para o JavaScript da página não conseguir ler o token (um
 * XSS passaria a roubar sessão, não só a bagunçar a tela). `sameSite:
 * lax` para outro site não conseguir usar a sessão do visitante em
 * requisição própria. `secure` só fora de desenvolvimento, senão o
 * cookie não funciona em http://localhost.
 */
export function gravarSessao(resp: NextResponse, dados: Omit<Sessao, 'exp'>) {
  resp.cookies.set({
    name: COOKIE_SESSAO,
    value: criarToken(dados),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(VALIDADE_MS / 1000),
  });
  return resp;
}

export function apagarSessao(resp: NextResponse) {
  resp.cookies.set({ name: COOKIE_SESSAO, value: '', path: '/', maxAge: 0 });
  return resp;
}

/* ---------------- atalhos de autorização ---------------- */

export const ehEquipe = (s: Sessao | null) => s?.papel === 'admin' || s?.papel === 'teacher';
export const ehAdmin = (s: Sessao | null) => s?.papel === 'admin';
export const ehMaster = (s: Sessao | null) => s?.papel === 'admin' && s.master === true;
