# Clube Olimpo — raio-x do projeto

PWA de gestão de uma **escola de natação**. Dois objetivos centrais, nessa ordem:

1. **Avaliar o aluno para troca de touca** (avaliação trimestral por critérios).
2. **Informar os pais** do resultado.

Secundariamente cobre grade de horários, cadastro de alunos/professores e checklists de limpeza e manutenção.

Produção: `https://higor-blush.vercel.app` (Vercel). Desenvolvimento em `localhost:3000`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS v4 |
| Backend | Supabase (Postgres + Realtime) — **não há backend próprio** |
| Animação | `motion` (framer-motion) |
| Ícones | `lucide-react` |
| PDF | `jspdf` |
| Push | `web-push` + Service Worker (`public/sw.js`) |

```bash
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # checagem de tipos — use ESTA para validar
npm run build      # build de produção
```

> ⚠️ **Nunca rode `npm run build` com o `npm run dev` ligado**, nem dois `npm run dev` ao mesmo tempo. Os dois escrevem na mesma pasta `.next`; um apaga os chunks que o outro está servindo e a tela fica branca (HTML 200, JS 404). Conserto: `taskkill /F /IM node.exe` → `rm -rf .next` → `npm run dev`.

> ⚠️ O `npm run dev` local aponta para o **Supabase de produção** (chaves fixas no código). Não existe banco de desenvolvimento.

---

## Arquitetura

**Uma única página** (`app/page.tsx`, ~375 linhas) com navegação por abas na lateral (desktop) e barra inferior (mobile). Cada aba renderiza um módulo de `components/`. Não há rotas além de `/` e `/api/push`.

### Papéis

Sessão em `localStorage`, chave **`olimpo_session`**, formato `{ role, data }`:

| Papel | `data` | Acesso |
|---|---|---|
| `admin` | linha de `app_users` | tudo |
| `teacher` | linha de `app_users` | só os alunos das próprias turmas |
| `client` | **array** de linhas de `students` | cai direto no `ClientPortal`, só leitura |

O `client` é array porque **irmãos compartilham telefone e senha** — 25 famílias têm 2+ filhos.

**Login:** equipe usa `app_users` (username + password); responsável usa `students` (telefone só dígitos + password).

### Abas e módulos

| Aba | Arquivo | Quem vê | O que faz |
|---|---|---|---|
| Painel | `dashboard-module.tsx` | admin | visão geral: resumo → pendências (com atalho para a aba) → evolução → atividades recentes. **Aba inicial do admin.** Nenhum número é inventado: sem dado, mostra Empty State |
| Cadastro Alunos | `registration-module.tsx` | staff | matrícula individual + **importação em massa** (colar planilha/CSV com prévia linha a linha) |
| Alunos | `students-module.tsx` | admin | ficha completa editável: dados, responsável, endereço, observações e **troca de dia/horário** (mexe em `class_slots`) |
| Avaliação Natação | `swimming/SwimmingModule.tsx` | staff | avaliação por **turma do dia** |
| Avulsos & Wellhub | `swimming/` com `escopo="sem-turma"` | admin | os 43 alunos sem horário na grade |
| Avaliação Sábado | `swimming/` com `escopo="sabado"` | admin | sábado **agrupado por horário**, sem professor |
| Checklist Limpeza | `checklist-module.tsx` | staff | checklist diário + foto (base64) + realtime |
| Manutenção | `maintenance-module.tsx` | staff | igual limpeza, dispara push para a equipe |
| Professores | `professors-module.tsx` | admin | CRUD: nome, horário por dia (turno duplo), ativo/inativo, login opcional + view **Disponibilidade** (professores × dias, carga semanal) |
| Grade de Horários | `schedule-module.tsx` | staff | cria turmas; **cruza com o horário de trabalho do professor** (aviso, não bloqueio) |
| — | `client-portal.tsx` | responsável | portal dos pais |

### `components/swimming/` — o coração do app

Era um arquivo de 1047 linhas; hoje são 13. Um componente de entrada, três escopos via prop `escopo`, três telas internas (`view`):

- **`home`** — lista o que avaliar, conforme o escopo.
- **`avaliando`** — fila em sequência ("Aluno 2 de 6"), critérios com botões grandes Passou/Treinar, atalho "marcar todos como Passou", **gerador de observação**, rascunho automático em `localStorage` (`olimpo_draft_aval_<id>`), botão "Salvar e próximo".
- **`aluno`** — ficha do aluno: histórico, PDF, botão de avaliar.

| Arquivo | Responsabilidade |
|---|---|
| `SwimmingModule.tsx` | orquestrador: dados derivados (permissão, agrupamento, filtros, contadores) e escolha da tela |
| `useDadosNatacao.ts` | carga paginada das 4 tabelas, sessão e **trava do professor** (`allowedIds`) |
| `useFilaAvaliacao.ts` | fila, marcação, rascunho, salvar, promoção de touca e push |
| `TelaAvaliacao.tsx` | tela `avaliando` + tela de conclusão |
| `FichaAluno.tsx` | tela `aluno`: histórico, PDF, apagar |
| `PainelTurmas.tsx` | home das abas Avaliação e Sábado |
| `PainelSemTurma.tsx` | home da aba Avulsos & Wellhub |
| `CartaoBloco` · `LinhaAluno` · `ChipsTouca` · `SeloAvaliacao` | peças reutilizadas pelos dois painéis e pela busca |
| `constantes.ts` · `observacao.ts` | tipos/constantes e o gerador de frase (puros, sem React) |

Ao salvar uma avaliação: se passou em **todos** os critérios, grava `approved = true` e o aluno **sobe de touca** automaticamente (via `capLevelOrder`); depois dispara `POST /api/push` com `{ student_id }` para avisar o responsável.

O **gerador de observação** (`gerarObservacao`) é local, sem API: monta a frase a partir do nome, da touca, de quantos critérios passou e **de quais faltaram**, com 3 variações por faixa de desempenho (aprovado / ≥70% / ≥40% / abaixo).

---

## Banco (Supabase)

**Não há acesso a DDL nem à service-role key.** Toda mudança de schema é entregue como SQL para o dono rodar no SQL Editor do Supabase. Leitura/escrita de dados funciona pela chave publishable em `lib/supabase.ts`.

> ⚠️ **PostgREST devolve no máximo 1000 linhas por consulta.** `class_slots` tem 1303. Sempre pagine com `.range(from, from + 999)` em loop — há um helper `page()` dentro dos módulos. Esquecer isso já produziu um diagnóstico errado ("professor com 0 alunos").

| Tabela | Linhas | Colunas |
|---|---:|---|
| `app_users` | 15 | `id, username (nullable), password (texto puro), role ('admin' ou 'teacher'), name, active, schedule (jsonb), created_at` |
| `students` | 429 | `id, name, age (nullable), level (CapLevel), guardian_name, phone, password, modalidade, endereco, observacoes, created_at` + legado não usado `class_day, class_time` |
| `classes` | 312 | `id, teacher_name (texto livre), day_of_week, start_time, end_time, created_at` |
| `class_slots` | 1303 | `id, class_id, cap_color (**chave do nível**, ex. `orange`), student_id (nullable), created_at` |
| `evaluations` | 0 | `id, student_id, date, level, scores (jsonb), notes, approved, created_at` |
| `cleaning_tasks` / `maintenance_tasks` | 2 / 1 | `id, title, completed, date, photo_url, created_at` |
| `push_subscriptions` | 10 | `id, subscription (jsonb), phone, tipo ('admin' ou 'responsavel'), created_at` |

`app_users.schedule` (jsonb):

```jsonc
{ "seg": { "enabled": true, "shifts": [{ "start": "07:45", "end": "11:30" }] }, "ter": {}, "sab": {} }
```

`evaluations.scores` (jsonb): `{ "<criterioId>": "passed" | "failed" | "pending" }`

### Estado atual dos dados

- **429 alunos** — 392 fixo, 24 wellhub, 13 avulso. **386 com turma**, **43 sem**.
- Toucas: vermelha 139 · laranja 99 · verde 99 · amarela 61 · azul claro 22 · azul escuro 9 · preta 0.
- **312 turmas**, 1303 vagas, **587 ocupadas**. Por dia: Seg 48 · Ter 52 · Qua 51 · Qui 43 · Sex 50 · **Sáb 68**.
- **12 professores**, mas **só 1 tem login** (`leticia`). 3 admins: `admin`, `rony`, `souza.higor@gmail.com`.
- **0 avaliações** — o recurso nunca chegou a ser usado em produção.

---

## Convenções

- **Toucas**: fonte única em `types/index.ts` — `levels` (7 níveis, `yellow` → `black`) e `capLevelOrder`. **Não existe Prata/silver** (foi removida a pedido do dono). `class_slots.cap_color` guarda a **chave** (`'orange'`), nunca o rótulo em português.
- **Critérios de avaliação** por touca: `lib/evaluation-criteria.ts` — usado pela Avaliação e pelo Portal dos Pais.
- **Trimestre**: rótulo `2026-T3`, calculado por `Math.floor(mês / 3) + 1`. "Avaliado" significa que existe avaliação no trimestre corrente.
- **PDF do boletim**: `lib/boletim-pdf.ts`, compartilhado entre professor e responsável.
- `cn()` (clsx + tailwind-merge) é **redefinido localmente em cada módulo** — é o padrão atual do projeto, não é bug.
- Troca de aba disparada por outro módulo: `window.dispatchEvent(new CustomEvent('jumpToTab', { detail: 'swimming' }))` + `localStorage['olympus_jump_eval']` com o id do aluno.
- Telefone é sempre gravado **só com dígitos** — o login do responsável busca por dígitos.

## Regras de negócio (vieram do dono, não estão dedutíveis do código)

- **O professor não pode falar com os pais pelo número pessoal.** Qualquer aviso ao responsável sai do número da academia ou do próprio app. Por isso o telefone do responsável **só aparece para admin**; nenhuma tela de professor mostra contato. O `/api/push` recebe só o `student_id` e resolve o telefone **no servidor**, justamente para não expor o número ao navegador do professor.
- **No sábado a escala dos professores gira.** A associação aluno↔professor no sábado **não é confiável** — por isso a aba de sábado agrupa por **horário** e não mostra professor nenhum.
- Turmas de **Amarela, Laranja e Vermelha** são de nível único; de **Verde em diante** podem misturar níveis na mesma turma.
- Senha do responsável = **4 últimos dígitos do telefone**. Decisão consciente (fácil de informar no balcão); o dado exposto é apenas a ficha de natação da criança.

## Origem dos dados

Importados de `Informações para criação do app.xlsx` (3 abas: alunos fixos, professor × horário, avulsos/wellhub) pelo script `_import.mjs`. Aulas de 45 min. "Verde+" na planilha virou vagas de green + lightBlue + darkBlue na mesma turma. Hidroginástica, Apoio, Bebê de colo e adulto foram ignorados.

⚠️ **A planilha não diz qual professor atende cada aluno** — só dia + horário + touca. Onde 2 ou mais professores davam aula no mesmo dia/hora/touca (42 combinações, 119 aulas ≈ 20%), a alocação foi feita por **balanceamento**, ou seja, é um palpite. Os outros 80% são certos, porque só havia um professor possível.

---

## Pendências

### Bloqueios operacionais

1. **11 dos 12 professores não têm login.** Sem isso, nada da aba de avaliação chega até eles.
2. **6 alunos "fixo" ficaram sem turma** — o horário da planilha não bateu com nenhum professor. Aparecem num grupo próprio, com aviso, na aba Avulsos & Wellhub.

> **Deploy:** `origin` é `github.com/ragnarokbrasil123-del/Higor.git` e o Vercel reconstrói sozinho a cada push no `main`. A autenticação já está resolvida: `gh` CLI logado como `ragnarokbrasil123-del` e `gh auth setup-git` ligando essa credencial ao Git — `git push` funciona direto, sem pedir senha.

### Dívida técnica

- **Segurança**: senhas em texto puro; **sem RLS** no Supabase (a chave publishable lê tudo). Chave **VAPID privada** fixa em `app/api/push/route.ts`.
- `lib/utils.ts` é uma cópia acidental de `lib/supabase.ts` — não é importado por ninguém.
- `hooks/use-mobile.ts` está órfão. `components/install-prompt.tsx` só é usado pelo portal dos pais.
- Fotos dos checklists são base64 dentro do Postgres (incha o banco e o payload do realtime) — deveriam ir para o Supabase Storage.
- `GlobalNotifier` está inline dentro de `app/page.tsx` e usa sons hotlinkados de `soundjay.com`.
- `public/cartao-pais.html` é um cartão A4 imprimível (QR + instruções de acesso) servido como estático, fora do React.
