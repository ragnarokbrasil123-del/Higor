# Clube Olimpo — guia do projeto

PWA de gestão para uma escola de natação. Foco: **avaliação para troca de touca** e **informar os pais**. Também cobre checklists de limpeza/manutenção e grade de horários.

App em produção: `https://higor-blush.vercel.app` (deploy pela Vercel).

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Estilo | Tailwind CSS v4 |
| Backend | Supabase (Postgres + Realtime) — sem camada de servidor própria |
| Animação | `motion` (framer-motion) |
| PDF | `jspdf` (boletim de avaliação) |
| Push | `web-push` + Service Worker (`public/sw.js`) |

## Comandos

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção (roda checagem de tipos)
npx tsc --noEmit   # só checagem de tipos
npm run lint
```

> `npm run dev`/`build` local usam o **Supabase de produção** (chaves fixas no código).

## Arquitetura

- **Uma página** (`app/page.tsx`) com navegação por abas. O conteúdo de cada aba é um módulo em `components/`.
- **Papéis** (guardados em `localStorage` na chave **`olimpo_session`**, formato `{ role, data }`):
  - `admin` — tudo, inclusive aba Professores e criação de turmas.
  - `teacher` — vê só os alunos das próprias turmas (filtro via `classes.teacher_name` → `class_slots`).
  - `client` (aluno/responsável) — cai direto no `ClientPortal`, só leitura.
- Login: equipe usa `app_users` (usuário/senha); responsável usa `students` (telefone + senha).

### Módulos (`components/`)

| Arquivo | Aba | Função |
|---|---|---|
| `registration-module.tsx` | Cadastro Alunos | matrícula individual, **importação em massa** (colar planilha/CSV com prévia), gerenciar/editar alunos |
| `swimming-module.tsx` | Avaliação Natação | ficha de avaliação por touca, salva em `evaluations`, promove de touca, gera PDF |
| `checklist-module.tsx` | Checklist Limpeza | checklist diário + foto (base64 no banco) + realtime |
| `maintenance-module.tsx` | Manutenção | igual ao de limpeza, dispara push |
| `professors-module.tsx` | Professores | CRUD de professores: nome, horário por dia (turno duplo), ativo/inativo, login opcional; view **Disponibilidade** (grade professores × dias) |
| `schedule-module.tsx` | Grade de Horários | cria turmas (professor + touca + horário), **cruza com o horário de trabalho do professor** (aviso, não bloqueio) |
| `client-portal.tsx` | — | portal do responsável: histórico de avaliações com fundamentos ✔/✖ |
| `install-prompt.tsx` | — | **órfão** (não importado) — prompt de "instalar app" PWA, pronto para ligar quando quiser |

## Banco (Supabase)

Não há acesso a DDL nem à service-role key. **Mudança de schema = SQL rodado à mão no SQL Editor do Supabase.** Leitura/escrita de dados dá pra fazer via chave publishable (`lib/supabase.ts`).

| Tabela | Colunas relevantes |
|---|---|
| `app_users` | `id, username (nullable), password (texto puro), role ('admin'\|'teacher'), name, active, schedule (jsonb)` — professor sem login tem `username` null |
| `students` | `id, name, age, level (CapLevel), guardian_name, phone, password` (+ legado `class_day`, `class_time` não usados) |
| `evaluations` | `id, student_id, date, notes, level, scores (jsonb {critId: 'passed'\|'failed'\|'pending'}), approved (bool)` |
| `classes` | `id, teacher_name (texto), day_of_week, start_time, end_time` |
| `class_slots` | `id, class_id, cap_color (**chave do nível**, ex. `'orange'`), student_id (nullable)` |
| `cleaning_tasks` / `maintenance_tasks` | `id, title, completed, date, photo_url` |
| `push_subscriptions` | `id, subscription (jsonb)` |

`schedule` (jsonb) em `app_users`:
```jsonc
{ "seg": { "enabled": true, "shifts": [{ "start": "07:45", "end": "11:30" }] }, "ter": {...}, ... "sab": {...} }
```

## Convenções

- **Toucas**: fonte única em `types/index.ts` — `levels` (7 níveis, `yellow`→`black`) e `capLevelOrder`. **Não existe Prata/silver.** `class_slots.cap_color` guarda a chave (`'orange'`), nunca o rótulo PT.
- **Critérios de avaliação** por touca: `lib/evaluation-criteria.ts` (usado pela Avaliação e pelo Portal dos Pais).
- `cn()` (clsx + tailwind-merge) é redefinido localmente em cada módulo — padrão atual, não é bug.
- Troca de aba por outro módulo: `window.dispatchEvent(new CustomEvent('jumpToTab', { detail: 'swimming' }))` + `localStorage['olympus_jump_eval']`.

## Pendências / dívida técnica

- **Segurança**: senhas em texto puro; sem RLS no Supabase (a chave publishable lê tudo). Chave VAPID privada fixa em `app/api/push/route.ts`.
- `lib/utils.ts` é uma cópia acidental de `lib/supabase.ts` (não importado).
- `components/install-prompt.tsx` e `hooks/use-mobile.ts` estão órfãos.
- Grade de turmas ainda não montada; lista real de alunos pendente de importação.
