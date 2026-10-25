'use client';

import React, { useState } from 'react';
import { Award, Droplets, Moon, Sun, Trash2, Users } from 'lucide-react';
import { capLevelOrder, type CapLevel } from '@/types';
import {
  AnelProgresso, Badge, BadgeTouca, BarraProgresso, Button, Card, Chip,
  EmptyState, EsqueletoCartoes, EsqueletoLista, FolhaInferior, IconButton,
  Input, JornadaToucas, Label, Select, Textarea, Toggle,
  avisar, avisarErro, confirmar,
} from '@/components/ui';

/* ============================================================
   /design — vitrine dos componentes, para aprovação no celular.

   É TEMPORÁRIA: apagar depois que o visual for aprovado e aplicado.
   Não tem link para ela em lugar nenhum do app, e não lê nem grava
   nada no banco — todos os dados aqui são de mentira.

   O botão de tema troca `data-escuro` no próprio container, então
   dá para ver claro e escuro lado a lado no mesmo aparelho, sem
   mexer na configuração do sistema.
   ============================================================ */

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-titulo text-base font-semibold text-ink">{titulo}</h2>
        {descricao && <p className="text-sm text-ink-muted leading-snug mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PaginaDesign() {
  const [escuro, setEscuro] = useState(false);
  const [folha, setFolha] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [passos, setPassos] = useState(4);

  return (
    <div
      data-tema="aqua"
      data-escuro={escuro ? 'sim' : 'nao'}
      className="min-h-dvh bg-canvas text-ink"
    >
      {/* cabeçalho com gradiente e textura de raia, o único lugar
          com "vidro" junto da navegação */}
      <header className="sticky top-0 z-20 border-b border-line">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-canvas to-canvas" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='16'%3E%3Cpath d='M0 8q10-6 20 0t20 0 20 0 20 0' fill='none' stroke='%230A84C6' stroke-width='1.5'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative backdrop-blur-sm px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-titulo text-xl font-bold text-ink leading-none">Olimpo Aqua</h1>
            <p className="text-mini text-ink-muted mt-1">vitrine de componentes · tema {escuro ? 'escuro' : 'claro'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEscuro(v => !v)}>
            {escuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {escuro ? 'Claro' : 'Escuro'}
          </Button>
        </div>
      </header>

      <main className="px-5 py-6 space-y-9 max-w-2xl mx-auto pb-24">

        <Secao titulo="Cores" descricao="Todas medidas em contraste. Nenhuma combinação abaixo de AA.">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Névoa', 'bg-canvas border border-line', 'text-ink'],
              ['Superfície', 'bg-surface border border-line', 'text-ink'],
              ['Água', 'bg-brand-hover', 'text-brand-ink'],
              ['Tinta', 'bg-surface-raised', 'text-ink-inverse'],
              ['Ouro', 'bg-ouro', 'text-[#0b1b2b]'],
              ['Afundado', 'bg-surface-sunken border border-line', 'text-ink'],
            ].map(([nome, fundo, texto]) => (
              <div key={nome} className={`${fundo} ${texto} rounded-card p-4 text-sm font-bold`}>{nome}</div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['Sucesso', 'success'], ['Alerta', 'warning'], ['Erro', 'danger']].map(([nome, t]) => (
              <div key={nome} className={`bg-${t}-soft text-${t}-ink rounded-card p-3 text-mini font-black uppercase text-center`}>
                {nome}
              </div>
            ))}
          </div>
        </Secao>

        <Secao titulo="Tipografia" descricao="Sora nos títulos e números; Inter no corpo. Números com largura fixa, para alinhar em coluna.">
          <Card className="p-4 space-y-2">
            <p className="font-titulo text-2xl font-bold text-ink">Avaliação de Natação</p>
            <p className="text-base text-ink">Corpo do texto, 16px, o mínimo para ler no sol.</p>
            <p className="text-sm text-ink-muted">Apoio, 14px.</p>
            <p className="text-mini text-ink-subtle uppercase tracking-wider font-bold">Legenda</p>
            <div className="font-titulo numero text-3xl font-bold text-ink pt-1">07:45 · 11:30</div>
            <div className="numero text-sm text-ink-muted">1.407 vagas · 628 ocupadas · 454 alunos</div>
          </Card>
        </Secao>

        <Secao titulo="Botões" descricao="Todos com 44px de altura mínima no toque.">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Salvar</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">Pular</Button>
            <Button variant="danger">Apagar</Button>
            <Button variant="dark">Salvar e próximo</Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="primary" size="sm">Pequeno</Button>
            <Button variant="primary" size="md">Médio</Button>
            <Button variant="primary" size="lg">Grande</Button>
            <IconButton aria-label="Apagar" tone="danger"><Trash2 className="w-4 h-4" /></IconButton>
          </div>
          <Button variant="primary" block disabled>Desabilitado</Button>
        </Secao>

        <Secao titulo="Toucas" descricao="Cor e nome sempre juntos — informação nunca só por cor.">
          <div className="flex flex-wrap gap-1.5">
            {capLevelOrder.map(n => <BadgeTouca key={n} nivel={n as CapLevel} />)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {capLevelOrder.slice(0, 4).map(n => <BadgeTouca key={n} nivel={n as CapLevel} variante="discreto" />)}
          </div>
        </Secao>

        <Secao titulo="Jornada do aluno" descricao="Para o responsável: de onde veio e o que vem depois.">
          <Card className="p-4">
            <JornadaToucas atual="green" />
          </Card>
        </Secao>

        <Secao titulo="Progresso" descricao="O número vai sempre junto da forma: ninguém estima com a mão molhada.">
          <Card className="p-4 space-y-4">
            <BarraProgresso valor={passos} total={7} rotulo="Critérios" />
            <BarraProgresso valor={7} total={7} rotulo="Concluído" conquista />
            <div className="flex items-center gap-4 pt-1">
              <AnelProgresso valor={passos} total={7} />
              <AnelProgresso valor={7} total={7} tamanho={72} conquista
                centro={<Award className="w-7 h-7 text-ouro-text" />} />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPassos(p => Math.max(0, p - 1))}>−</Button>
                <Button size="sm" variant="secondary" onClick={() => setPassos(p => Math.min(7, p + 1))}>+</Button>
              </div>
            </div>
          </Card>
        </Secao>

        <Secao titulo="Campos" descricao="16px no celular: abaixo disso o iPhone dá zoom sozinho.">
          <Card className="p-4 space-y-3">
            <div><Label>Nome do aluno</Label><Input placeholder="Como está no documento" /></div>
            <div><Label>Touca</Label><Select><option>Laranja</option><option>Verde</option></Select></div>
            <div><Label>Observações</Label><Textarea placeholder="Alergias, combinados com a família..." /></div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-ink">Matrícula ativa</span>
              <Toggle checked={toggle} onChange={setToggle} />
            </div>
          </Card>
        </Secao>

        <Secao titulo="Selos e chips">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="success">Aprovado</Badge>
            <Badge tone="warning">Treinando</Badge>
            <Badge tone="neutral">Pendente</Badge>
            <Badge tone="danger">Cancelado</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active>Todos</Chip>
            <Chip>Segunda</Chip>
            <Chip>Terça</Chip>
          </div>
        </Secao>

        <Secao titulo="Avisos e diálogos" descricao="Sobem de baixo, onde o polegar alcança.">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => avisar('Ficha salva!')}>Aviso</Button>
            <Button variant="secondary" onClick={() => avisarErro('Não consegui salvar.')}>Erro</Button>
            <Button variant="danger" onClick={() => confirmar('A turma e todas as vagas serão apagadas.', { titulo: 'Apagar turma?', acao: 'Apagar', perigo: true })}>
              Confirmação
            </Button>
            <Button variant="secondary" onClick={() => setFolha(true)}>Folha inferior</Button>
          </div>
        </Secao>

        <Secao titulo="Carregando" descricao="Formato do conteúdo, para a tela não dar salto.">
          <EsqueletoCartoes cartoes={2} />
          <EsqueletoLista linhas={2} />
        </Secao>

        <Secao titulo="Vazio">
          <Card className="p-2">
            <EmptyState icon={<Users className="w-8 h-8" />} title="Nenhum aluno encontrado" description="Tente afrouxar os filtros." />
          </Card>
        </Secao>
      </main>

      <FolhaInferior
        aberta={folha}
        aoFechar={() => setFolha(false)}
        titulo="Trocar de turma"
        rodape={
          <>
            <Button variant="secondary" block onClick={() => setFolha(false)}>Cancelar</Button>
            <Button variant="primary" block onClick={() => { setFolha(false); avisar('Turma trocada!'); }}>Confirmar</Button>
          </>
        }
      >
        <div className="space-y-2 py-2">
          {['Segunda 07:45', 'Quarta 08:30', 'Sexta 10:00'].map(t => (
            <button key={t} className="w-full flex items-center justify-between gap-3 p-3 rounded-card border border-line bg-surface-sunken text-left active:scale-[.99] transition-transform">
              <span className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-brand" />
                <span className="numero text-sm font-bold text-ink">{t}</span>
              </span>
              <BadgeTouca nivel="orange" variante="discreto" />
            </button>
          ))}
        </div>
      </FolhaInferior>
    </div>
  );
}
