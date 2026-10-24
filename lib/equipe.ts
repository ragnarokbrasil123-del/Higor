/* ============================================================
   Acesso a `app_users` pelo lado do cliente: login da equipe,
   convite e cadastro de professor.

   Mesmo desenho de `lib/alunos.ts`: tenta a rota de servidor e só
   cai no caminho antigo (chave publishable) quando a rota responde
   503 com `fallback: true`, ou seja, enquanto as variáveis de
   ambiente não estiverem configuradas.

   ⚠️ Enquanto o fallback puder rodar, o RLS de `app_users` não pode
   ser ligado. Ver LGPD.md, item 3.1.
   ============================================================ */

import { supabase } from '@/lib/supabase';
import { paginado } from '@/lib/paginado';
import {
  contaLiberada, conviteExpirado, gerarCodigoConvite, normalizarCodigo, validadeConvite,
} from '@/lib/acesso';

async function usarFallback(resp: Response | null) {
  if (!resp || resp.status !== 503) return false;
  const corpo = await resp.json().catch(() => null);
  return corpo?.fallback === true;
}

function avisar(onde: string) {
  console.warn(
    `[equipe] ${onde}: usando a chave publishable porque o servidor não está ` +
    'configurado (SUPABASE_SERVICE_ROLE_KEY / SESSION_SECRET). Ver LGPD.md.'
  );
}

async function postar(corpo: any, url = '/api/equipe') {
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  }).catch(() => null);
}

/** Erro já pronto para a tela. */
async function erroDaResposta(resp: Response, padrao: string) {
  if (resp.status === 401) return new Error('Sua sessão expirou. Entre de novo.');
  const corpo = await resp.json().catch(() => null);
  return new Error(corpo?.erro || padrao);
}

/* ================= login e convite ================= */

export type MotivoLogin = 'credencial' | 'bloqueada' | 'erro';

export const MENSAGEM_LOGIN: Record<MotivoLogin, string> = {
  credencial: 'Acesso negado. Verifique usuário e senha.',
  bloqueada: 'Esta conta não está liberada. Fale com a administração.',
  erro: 'Não conseguimos entrar agora. Tente de novo em instantes.',
};

export type ResultadoEquipe =
  | { ok: true; usuario: any }
  | { ok: false; motivo: MotivoLogin };

export async function loginEquipe(usuario: string, senha: string): Promise<ResultadoEquipe> {
  const resp = await postar(
    { acao: 'login', usuario, senha },
    '/api/login-equipe'
  );

  if (resp?.ok) return { ok: true, usuario: (await resp.json()).usuario };

  if (resp && !(await usarFallback(resp))) {
    const corpo = await resp.json().catch(() => null);
    return { ok: false, motivo: (corpo?.motivo as MotivoLogin) || 'erro' };
  }
  avisar('loginEquipe');

  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('username', usuario.toLowerCase().trim())
    .eq('password', senha)
    .maybeSingle();

  if (error) return { ok: false, motivo: 'erro' };
  if (!data) return { ok: false, motivo: 'credencial' };
  if (!contaLiberada(data)) return { ok: false, motivo: 'bloqueada' };
  return { ok: true, usuario: data };
}

export type MotivoConvite = 'nao-encontrado' | 'usado' | 'expirado' | 'usuario-em-uso' | 'usuario-curto' | 'senha-curta' | 'erro';

export const MENSAGEM_CONVITE: Record<MotivoConvite, string> = {
  'nao-encontrado': 'Código não encontrado. Confira as letras e tente de novo.',
  usado: 'Este convite já foi usado.',
  expirado: 'Este convite venceu. Peça um código novo à administração.',
  'usuario-em-uso': 'Este usuário já está em uso. Escolha outro.',
  'usuario-curto': 'O usuário precisa de pelo menos 4 caracteres.',
  'senha-curta': 'A senha precisa de pelo menos 6 caracteres.',
  erro: 'Não deu para criar o acesso. Tente de novo.',
};

export async function conferirCodigo(
  codigo: string
): Promise<{ ok: true; convidado: { name: string; role: string } } | { ok: false; motivo: MotivoConvite }> {
  const resp = await postar({ acao: 'conferir-codigo', codigo }, '/api/login-equipe');

  if (resp?.ok) return { ok: true, convidado: (await resp.json()).convidado };
  if (resp && !(await usarFallback(resp))) {
    const corpo = await resp.json().catch(() => null);
    return { ok: false, motivo: (corpo?.motivo as MotivoConvite) || 'erro' };
  }
  avisar('conferirCodigo');

  const { data } = await supabase
    .from('app_users')
    .select('id, name, role, status, convite_codigo, convite_expira_em')
    .eq('convite_codigo', normalizarCodigo(codigo))
    .maybeSingle();

  if (!data) return { ok: false, motivo: 'nao-encontrado' };
  if (data.status !== 'convidado') return { ok: false, motivo: 'usado' };
  if (conviteExpirado(data.convite_expira_em)) return { ok: false, motivo: 'expirado' };
  return { ok: true, convidado: { name: data.name, role: data.role } };
}

export async function criarAcesso(
  codigo: string, usuario: string, senha: string
): Promise<{ ok: true; usuario: any } | { ok: false; motivo: MotivoConvite }> {
  const resp = await postar({ acao: 'criar-acesso', codigo, usuario, senha }, '/api/login-equipe');

  if (resp?.ok) return { ok: true, usuario: (await resp.json()).usuario };
  if (resp && !(await usarFallback(resp))) {
    const corpo = await resp.json().catch(() => null);
    return { ok: false, motivo: (corpo?.motivo as MotivoConvite) || 'erro' };
  }
  avisar('criarAcesso');

  const u = usuario.toLowerCase().trim();
  const { data: convidado } = await supabase
    .from('app_users').select('id, status').eq('convite_codigo', normalizarCodigo(codigo)).maybeSingle();
  if (!convidado) return { ok: false, motivo: 'nao-encontrado' };

  const { data: existe } = await supabase
    .from('app_users').select('id').eq('username', u).maybeSingle();
  if (existe && existe.id !== convidado.id) return { ok: false, motivo: 'usuario-em-uso' };

  const { data, error } = await supabase
    .from('app_users')
    .update({
      username: u, password: senha, status: 'aprovado',
      convite_codigo: null, convite_expira_em: null,
      liberado_em: new Date().toISOString(),
    })
    .eq('id', convidado.id)
    .eq('status', 'convidado')
    .select()
    .maybeSingle();

  if (error || !data) return { ok: false, motivo: 'erro' };
  return { ok: true, usuario: data };
}

/** Encerra a sessão de servidor. O cookie é HttpOnly: só a rota apaga. */
export async function logoutServidor() {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
}

/* ================= leitura e CRUD ================= */

/** `role` filtra (ex.: só professores). */
export async function lerEquipe(role?: 'teacher' | 'admin'): Promise<any[]> {
  const url = role ? `/api/equipe?role=${role}` : '/api/equipe';
  const resp = await fetch(url, { credentials: 'same-origin' }).catch(() => null);

  if (resp?.ok) return (await resp.json()).equipe ?? [];
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui carregar a equipe.');
  avisar('lerEquipe');

  const todos = await paginado<any>('app_users', '*', 'name');
  return role ? todos.filter(u => u.role === role) : todos;
}

/** Operações de escrita. Devolve o código quando a ação gera um. */
async function acaoEquipe(corpo: any, fallback: () => Promise<any>): Promise<any> {
  const resp = await postar(corpo);
  if (resp?.ok) return resp.json();
  if (resp && !(await usarFallback(resp))) throw await erroDaResposta(resp, 'Não consegui concluir.');
  avisar(corpo.acao);
  return fallback();
}

export const salvarProfessor = (p: { id?: string; name: string; active: boolean; schedule: any }) =>
  acaoEquipe({ acao: 'salvar-professor', ...p }, async () => {
    const payload = { name: p.name.trim(), active: p.active, schedule: p.schedule };
    const { error } = p.id
      ? await supabase.from('app_users').update(payload).eq('id', p.id)
      : await supabase.from('app_users').insert([{ ...payload, role: 'teacher' }]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const semearProfessores = (professores: any[]) =>
  acaoEquipe({ acao: 'semear-professores', professores }, async () => {
    const rows = professores.map(p => ({ name: p.name, role: 'teacher', active: true, schedule: p.schedule }));
    const { error } = await supabase.from('app_users').insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const definirLogin = (id: string, username: string, password: string) =>
  acaoEquipe({ acao: 'definir-login', id, username, password }, async () => {
    const { error } = await supabase.from('app_users')
      .update({ username: username.toLowerCase().trim(), password: password.trim() }).eq('id', id);
    if (error) {
      throw new Error(error.message.includes('duplicate')
        ? 'Esse nome de usuário já está em uso por outra pessoa.'
        : error.message);
    }
    return { ok: true };
  });

export const removerLogin = (id: string) =>
  acaoEquipe({ acao: 'remover-login', id }, async () => {
    const { error } = await supabase.from('app_users')
      .update({ username: null, password: null }).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apagarConta = (id: string) =>
  acaoEquipe({ acao: 'apagar', id }, async () => {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarAtivo = (id: string, active: boolean) =>
  acaoEquipe({ acao: 'alternar-ativo', id, active }, async () => {
    const { error } = await supabase.from('app_users').update({ active }).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Só o master. Devolve `{ codigo }`. */
export const convidar = (p: { id?: string; name: string; role: 'teacher' | 'admin' }) =>
  acaoEquipe({ acao: 'convidar', ...p }, async () => {
    const codigo = gerarCodigoConvite();
    const convite = {
      status: 'convidado', convite_codigo: codigo, convite_expira_em: validadeConvite(),
      role: p.role, active: true,
    };
    const { error } = p.id
      ? await supabase.from('app_users').update(convite).eq('id', p.id)
      : await supabase.from('app_users').insert([{ ...convite, name: p.name.trim() }]);
    if (error) throw new Error(error.message);
    return { ok: true, codigo };
  });

export const novoCodigo = (id: string) =>
  acaoEquipe({ acao: 'novo-codigo', id }, async () => {
    const codigo = gerarCodigoConvite();
    const { error } = await supabase.from('app_users')
      .update({ convite_codigo: codigo, convite_expira_em: validadeConvite(), status: 'convidado' })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true, codigo };
  });

export const revogar = (id: string) =>
  acaoEquipe({ acao: 'revogar', id }, async () => {
    const { error } = await supabase.from('app_users')
      .update({ status: 'revogado', convite_codigo: null, convite_expira_em: null }).eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reativar = (id: string, meuNome: string) =>
  acaoEquipe({ acao: 'reativar', id }, async () => {
    const { error } = await supabase.from('app_users')
      .update({ status: 'aprovado', liberado_em: new Date().toISOString(), liberado_por: meuNome })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
