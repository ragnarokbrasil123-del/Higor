'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Check, Copy, KeyRound, RotateCcw, ShieldCheck, Trash2, UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Badge, Button, Card, EmptyState, IconButton, Input, Label, Loading,
  Modal, PageHeader, PageShell, Select,
} from '@/components/ui';
import {
  CONVITE_DIAS_VALIDADE, LOGIN_PROFESSOR_LIBERADO, conviteExpirado,
  gerarCodigoConvite, validadeConvite,
} from '@/lib/acesso';

/* ============================================================
   Acessos — só o admin master vê esta aba.

   O convite É a aprovação: ninguém pede conta pela internet. O master
   convida, entrega o código, e a pessoa usa o código para definir a
   própria senha.
   ============================================================ */

interface Conta {
  id: string;
  username: string | null;
  name: string | null;
  role: string;
  active: boolean | null;
  status: string | null;
  convite_codigo: string | null;
  convite_expira_em: string | null;
  liberado_em: string | null;
  liberado_por: string | null;
}

const dataCurta = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

export function AccessModule({ meuNome }: { meuNome: string }) {
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [convidando, setConvidando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  // formulário do convite
  const [alvo, setAlvo] = useState('novo');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<'teacher' | 'admin'>('teacher');

  const carregar = async () => {
    const { data, error } = await supabase.from('app_users').select('*').order('name');
    if (error) { setErro(error.message); return; }
    setContas((data ?? []) as Conta[]);
  };

  useEffect(() => { carregar(); }, []);

  const copiar = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    } catch { alert('Não consegui copiar. O código é: ' + codigo); }
  };

  const enviarConvite = async () => {
    const nomeFinal = alvo === 'novo' ? nome.trim() : (contas?.find(c => c.id === alvo)?.name ?? '');
    if (!nomeFinal) return alert('Informe o nome da pessoa.');

    setSalvando(true);
    const convite = {
      status: 'convidado',
      convite_codigo: gerarCodigoConvite(),
      convite_expira_em: validadeConvite(),
      role: papel,
      active: true,
    };

    // pessoa que já existe (os professores vieram da planilha) só recebe o
    // convite na linha dela — criar outra duplicaria o professor na Grade
    const { error } = alvo === 'novo'
      ? await supabase.from('app_users').insert([{ ...convite, name: nomeFinal }])
      : await supabase.from('app_users').update(convite).eq('id', alvo);

    setSalvando(false);
    if (error) return alert('Erro ao convidar: ' + error.message);

    setConvidando(false);
    setNome(''); setAlvo('novo'); setPapel('teacher');
    carregar();
  };

  const novoCodigo = async (c: Conta) => {
    if (!confirm(`Gerar um código novo para ${c.name}? O código anterior deixa de funcionar.`)) return;
    const { error } = await supabase
      .from('app_users')
      .update({ convite_codigo: gerarCodigoConvite(), convite_expira_em: validadeConvite(), status: 'convidado' })
      .eq('id', c.id);
    if (error) return alert('Erro: ' + error.message);
    carregar();
  };

  const revogar = async (c: Conta) => {
    if (!confirm(`Cortar o acesso de ${c.name || c.username}? A pessoa deixa de entrar imediatamente.`)) return;
    const { error } = await supabase
      .from('app_users')
      .update({ status: 'revogado', convite_codigo: null, convite_expira_em: null })
      .eq('id', c.id);
    if (error) return alert('Erro: ' + error.message);
    carregar();
  };

  const reativar = async (c: Conta) => {
    const { error } = await supabase
      .from('app_users')
      .update({ status: 'aprovado', liberado_em: new Date().toISOString(), liberado_por: meuNome })
      .eq('id', c.id);
    if (error) return alert('Erro: ' + error.message);
    carregar();
  };

  if (erro) {
    return (
      <PageShell width="focus">
        <Card className="border-danger/30 bg-danger-soft">
          <p className="font-bold text-danger-ink">Não deu para carregar os acessos.</p>
          <p className="text-sm text-danger-ink/80 mt-1">{erro}</p>
          <p className="text-xs text-ink-muted mt-3">
            Se a mensagem fala em coluna inexistente, o SQL do controle de acesso ainda não foi rodado no Supabase.
          </p>
        </Card>
      </PageShell>
    );
  }

  if (!contas) return <PageShell width="focus"><Loading label="Carregando acessos..." full /></PageShell>;

  const convidados = contas.filter(c => c.status === 'convidado' && c.convite_codigo);
  const ativos = contas.filter(c => (c.status ?? 'aprovado') === 'aprovado');
  const revogados = contas.filter(c => c.status === 'revogado');
  /** Professores da planilha que ainda não têm login nem convite aberto. */
  const semAcesso = contas.filter(c => !c.username && c.status !== 'convidado' && c.role === 'teacher');

  return (
    <PageShell width="focus">
      <PageHeader
        icon={ShieldCheck}
        title="Acessos"
        description="Só você convida. Quem recebe o código define a própria senha."
        action={<Button onClick={() => setConvidando(true)}><UserPlus className="w-4 h-4" /> Convidar</Button>}
      />

      {!LOGIN_PROFESSOR_LIBERADO && (
        <Card className="border-warning/40 bg-warning-soft flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-ink shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-warning-ink text-sm">A trava geral de professores está ligada</p>
            <p className="text-xs text-warning-ink/80 mt-1 leading-relaxed">
              Enquanto ela estiver ativa, <b>nenhum professor entra</b> — nem os que você aprovar aqui.
              Convidar e aprovar continua funcionando; eles só não conseguem usar ainda.
              Para liberar, é trocar <code className="bg-surface px-1 rounded">LOGIN_PROFESSOR_LIBERADO</code> para
              {' '}<code className="bg-surface px-1 rounded">true</code> em <b>lib/acesso.ts</b> — me peça e eu troco.
            </p>
          </div>
        </Card>
      )}

      {/* ---------- convites em aberto ---------- */}
      <section className="space-y-3">
        <h2 className="text-mini font-black text-ink-subtle uppercase tracking-wider">
          Convites em aberto {convidados.length > 0 && `(${convidados.length})`}
        </h2>

        {convidados.length === 0 ? (
          <Card><p className="text-sm text-ink-muted">Nenhum convite aguardando. Toque em <b>Convidar</b> para criar um.</p></Card>
        ) : convidados.map(c => {
          const vencido = conviteExpirado(c.convite_expira_em);
          return (
            <Card key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink text-sm truncate">{c.name || 'Sem nome'}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {c.role === 'admin' ? 'Administrador' : 'Professor'} ·{' '}
                  {vencido
                    ? <span className="text-danger-ink font-bold">convite vencido em {dataCurta(c.convite_expira_em)}</span>
                    : <>vale até {dataCurta(c.convite_expira_em)}</>}
                </p>
              </div>

              <button
                onClick={() => copiar(c.convite_codigo!)}
                title="Copiar código"
                className={cn(
                  'font-mono font-black tracking-widest text-base px-3 py-2 rounded-control border transition-colors shrink-0',
                  vencido ? 'bg-surface-sunken border-line text-ink-subtle line-through'
                          : 'bg-brand-soft border-brand-line text-ink hover:bg-brand/20'
                )}
              >
                {copiado === c.convite_codigo ? <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> copiado</span> : c.convite_codigo}
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <IconButton onClick={() => copiar(c.convite_codigo!)} aria-label="Copiar código"><Copy className="w-4 h-4" /></IconButton>
                <IconButton onClick={() => novoCodigo(c)} aria-label="Gerar código novo"><RotateCcw className="w-4 h-4" /></IconButton>
                <IconButton tone="danger" onClick={() => revogar(c)} aria-label="Cancelar convite"><Trash2 className="w-4 h-4" /></IconButton>
              </div>
            </Card>
          );
        })}
      </section>

      {/* ---------- contas ativas ---------- */}
      <section className="space-y-3">
        <h2 className="text-mini font-black text-ink-subtle uppercase tracking-wider">Contas ativas ({ativos.length})</h2>
        <Card as="panel" flush>
          <ul className="divide-y divide-line">
            {ativos.map(c => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink truncate">{c.name || c.username}</p>
                  <p className="text-xs text-ink-subtle truncate">
                    {c.username ? <>usuário <b>{c.username}</b></> : 'sem login definido'}
                    {c.liberado_em && ` · liberado em ${dataCurta(c.liberado_em)}`}
                  </p>
                </div>
                <Badge tone={c.role === 'admin' ? 'brand' : 'neutral'}>
                  {c.role === 'admin' ? 'Admin' : 'Professor'}
                </Badge>
                {c.username && (
                  <IconButton tone="danger" onClick={() => revogar(c)} aria-label="Cortar acesso">
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* ---------- acessos cortados ---------- */}
      {revogados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-mini font-black text-ink-subtle uppercase tracking-wider">Acessos cortados ({revogados.length})</h2>
          <Card as="panel" flush>
            <ul className="divide-y divide-line">
              {revogados.map(c => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-bold text-ink-muted truncate flex-1">{c.name || c.username}</span>
                  <Button variant="secondary" size="sm" onClick={() => reativar(c)}>Reativar</Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ---------- modal de convite ---------- */}
      <Modal
        open={convidando}
        onClose={() => setConvidando(false)}
        size="md"
        title="Convidar para o sistema"
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConvidando(false)}>Cancelar</Button>
            <Button size="lg" className="flex-1" disabled={salvando} onClick={enviarConvite}>
              {salvando ? 'Gerando...' : 'Gerar código'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Quem vai receber</Label>
            <Select value={alvo} onChange={e => setAlvo(e.target.value)}>
              <option value="novo">➕ Pessoa nova (não está na lista)</option>
              {semAcesso.length > 0 && (
                <optgroup label="Professores já cadastrados, ainda sem login">
                  {semAcesso.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
            </Select>
            {alvo !== 'novo' && (
              <p className="text-xs text-ink-muted mt-1.5">
                O convite entra na ficha que já existe — não cria professor repetido na Grade.
              </p>
            )}
          </div>

          {alvo === 'novo' && (
            <div>
              <Label>Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva Santos" />
            </div>
          )}

          <div>
            <Label>Entra como</Label>
            <Select value={papel} onChange={e => setPapel(e.target.value as 'teacher' | 'admin')}>
              <option value="teacher">Professor — vê só os alunos das turmas dele</option>
              <option value="admin">Administrador — vê e edita tudo</option>
            </Select>
            {papel === 'admin' && (
              <p className="text-xs text-warning-ink font-bold mt-1.5">
                ⚠️ Administrador enxerga o telefone dos responsáveis e pode apagar avaliações.
              </p>
            )}
          </div>

          <Card className="bg-surface-sunken flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-ink-subtle shrink-0 mt-0.5" />
            <p className="text-xs text-ink-muted leading-relaxed">
              O app gera um código. Entregue pessoalmente ou pelo WhatsApp da academia —
              a pessoa usa ele na tela de login, em <b>&quot;Tenho um convite&quot;</b>, para criar a própria senha.
              O código vale {CONVITE_DIAS_VALIDADE} dias.
            </p>
          </Card>
        </div>
      </Modal>
    </PageShell>
  );
}
