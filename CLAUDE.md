# Clube Olimpo — raio-x do projeto

PWA de gestão de uma **escola de natação**. Dois objetivos centrais, nessa ordem:

1. **Avaliar o aluno para troca de touca** (avaliação trimestral por critérios).
2. **Informar os pais** do resultado.

Secundariamente cobre grade de horários, cadastro de alunos/professores e checklists de limpeza e manutenção.

Produção: `https://clubeolimpo.vercel.app` (Vercel; `higor-blush.vercel.app` redireciona). Desenvolvimento em `localhost:3000`.

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
| `teacher` | linha de `app_users` | os alunos das próprias turmas **+ todos os sem turma** (avulso, wellhub) |
| `client` | **array** de linhas de `students` | cai direto no `ClientPortal`, só leitura |

O `client` é array porque **irmãos compartilham telefone e senha** — 25 famílias têm 2+ filhos.

**Login:** equipe usa `app_users` (username + password); responsável usa `students` (telefone só dígitos + password).

**Controle de acesso** (`lib/acesso.ts`) — duas camadas independentes:

1. **Travas gerais** — `LOGIN_PROFESSOR_LIBERADO` e `LOGIN_RESPONSAVEL_LIBERADO`. **Ambas em `true` hoje: professor e responsável entram.** Trocar para `false` fecha o papel; nada mais depende delas. Além de recusar o login, derrubam sessão antiga do papel bloqueado na abertura do app.
2. **Convite + aprovação** — não existe auto-cadastro. O **admin master** (`is_master`, hoje só `souza.higor@gmail.com`) convida pela aba Acessos; o app gera um código `XXXX-XXXX` válido por 14 dias; a pessoa usa em "Tenho um convite" na tela de login e define usuário e senha. `status` vira `aprovado`. O código é queimado no uso (`update ... .eq('status','convidado')` impede reuso).

Convidar alguém que **já existe** (os professores que vieram da planilha) preenche a linha existente — não cria professor duplicado na Grade.

> ⚠️ Isso é controle de **interface**, não de banco. Sem RLS, a chave publishable lê `app_users` inteira — códigos de convite e senhas em texto puro inclusive. Organiza quem entra; não impede quem sabe usar a API.

### Abas e módulos

| Aba | Arquivo | Quem vê | O que faz |
|---|---|---|---|
| Painel | `dashboard-module.tsx` | admin | visão geral: resumo → pendências (com atalho para a aba) → evolução → atividades recentes. **Aba inicial do admin.** Nenhum número é inventado: sem dado, mostra Empty State |
| Cadastro Alunos | `registration-module.tsx` | staff | matrícula individual + **importação em massa** (colar planilha/CSV com prévia linha a linha) |
| Alunos | `students-module.tsx` | admin | ficha completa editável: dados, responsável, endereço, observações e **troca de dia/horário** (mexe em `class_slots`). **Cancelar matrícula** libera a vaga mas mantém ficha e avaliações (`ativo=false`); filtro de situação e botão Reativar. Apagar de vez existe, mas escondido |
| Avaliação Natação | `swimming/SwimmingModule.tsx` | staff | avaliação por **turma do dia** |
| Avulsos & Wellhub | `swimming/` com `escopo="sem-turma"` | staff | os 43 alunos sem horário na grade. O professor também vê: avulso/wellhub aparece em qualquer aula e quem estiver dando a aula avalia |
| Avaliação Sábado | `swimming/` com `escopo="sabado"` | admin | sábado **agrupado por horário**, sem professor (a turma é da dupla, não de quem está de escala) |
| Hidro | `hidro-module.tsx` | staff | acervo de 448 páginas de exercícios de hidroginástica para consulta na aula. Imagens estáticas em `public/hidro/`, **fora do Supabase**. Marcações e última página vista em localStorage |
| Checklist Limpeza | `checklist-module.tsx` | staff | checklist diário + foto (base64) + realtime |
| Manutenção | `maintenance-module.tsx` | staff | igual limpeza, dispara push para a equipe |
| Professores | `professors-module.tsx` | admin | CRUD: nome, horário por dia (turno duplo), ativo/inativo, login opcional + view **Disponibilidade** (professores × dias, carga semanal) |
| Grade de Horários | `schedule-module.tsx` | staff | cria turmas; **cruza com o horário de trabalho do professor** (aviso, não bloqueio) |
| Acessos | `access-module.tsx` | **admin master** | convida por código, corta e reativa acesso. Só `souza.higor@gmail.com` vê |
| — | `client-portal.tsx` | responsável | portal dos pais |

### `components/swimming/` — o coração do app

Era um arquivo de 1047 linhas; hoje são 13. Um componente de entrada, três escopos via prop `escopo`, três telas internas (`view`):

- **`home`** — lista o que avaliar, conforme o escopo.
- **`avaliando`** — fila em sequência ("Aluno 2 de 6"), critérios com botões grandes Passou/Treinar, atalho "marcar todos como Passou", **gerador de observação**, rascunho automático em `localStorage` (`olimpo_draft_aval_<id>`), botão "Salvar e próximo". **A fila emenda sozinha nas turmas**: ao acabar, entram os que ainda faltam na mesma turma (turma do dia ou horário de sábado — `grupos` vindos do módulo); só quando não sobra ninguém aparece a conclusão, com botão para a próxima turma do dia que tem pendente. Em Avulsos & Wellhub **não emenda** (`grupos = []`): o aluno não é de um professor e outro colega pode estar avaliando o mesmo grupo. A seta de voltar sai direto quando não há nada marcado.
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
| `app_users` | 15 | `id, username (nullable), password (texto puro), role ('admin' ou 'teacher'), name, active, schedule (jsonb), created_at` + controle de acesso: `status ('convidado'/'aprovado'/'revogado'), is_master, convite_codigo, convite_expira_em, liberado_em, liberado_por` |
| `students` | 429 | `id, name, age (nullable), level (CapLevel), guardian_name, phone, password, modalidade, endereco, observacoes, created_at` + legado não usado `class_day, class_time` + matrícula: `ativo, inativo_em, inativo_motivo` |
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
- **273 turmas** e **1407 vagas, 628 ocupadas** (conferido no banco em 24/10/2026; antes eram 312 turmas e 1303 vagas — o sábado foi juntado por dupla em 11/09/2026 e a grade mexeu depois). Por dia: Seg 48 · Ter 51 · Qua 50 · Qui 42 · Sex 48 · **Sáb 34**. Backup pré-junção em `backups/sabado-antes-da-juncao-2026-09-11.json`.
- **10 professores ativos** (todos com login) + 2 inativos. **ANDERSON e CAIO saíram da equipe em 24/10/2026** (`active=false`, `status='revogado'`); a ficha e as turmas deles foram preservadas. 3 admins: `admin`, `rony` (revogado), `souza.higor@gmail.com`.
- ⚠️ **61 turmas de semana (121 alunos) estão sem professor definido** — eram do Anderson (23) e do Caio (38). No sábado nada se perdeu: as turmas são duplas e o parceiro que ficou continua enxergando. Pela grade de sábado, Isabella parece ter assumido o posto do Caio e Livia o do Anderson, mas **isso não foi confirmado pelo dono**.
- **0 avaliações** — o recurso nunca chegou a ser usado em produção.

---

## Convenções

- **Toucas**: fonte única em `types/index.ts` — `levels` (7 níveis, `yellow` → `black`) e `capLevelOrder`. **Não existe Prata/silver** (foi removida a pedido do dono). `class_slots.cap_color` guarda a **chave** (`'orange'`), nunca o rótulo em português.
- **Critérios de avaliação** por touca: `lib/evaluation-criteria.ts` — usado pela Avaliação e pelo Portal dos Pais.
- **Professor da turma**: `lib/professor.ts`. Dias de semana = um nome; sábado = dupla `"A / B"`. `lecionaEm(teacher_name, nome)` para filtrar, `professoresDe` para listar pessoas, `rotuloProfessor` para exibir ("LETÍCIA / DOUGLAS").
- **Trimestre**: rótulo `2026-T3`, calculado por `Math.floor(mês / 3) + 1`. "Avaliado" significa que existe avaliação no trimestre corrente.
- **PDF do boletim**: `lib/boletim-pdf.ts`, compartilhado entre professor e responsável.
- `cn()` (clsx + tailwind-merge) vem de **`lib/utils.ts`**, fonte única importada por 26 arquivos. (Já foi copiado em cada módulo; não volte a copiar.)
- **Consulta paginada**: `paginado(tabela, colunas, ordem?)` em **`lib/paginado.ts`** — fonte única do laço de 1000 linhas. Quatro módulos ainda têm cópias locais (`dashboard`, `minha-semana`, `students`, e o `page()` interno de alguns); migrar quando mexer neles.
- **Busca da ficha do responsável**: `lib/login-responsavel.ts`, usada pelo login **e** pelo portal. Casa o telefone pelo **final** (`%digitos`), nunca por pedaço no meio, e **recusa o login se o resultado cair em mais de um telefone** — irmãos compartilham o mesmo número, então dois números é família diferente. Não mexa só num dos dois lados.
- **`students` e `app_users` NÃO são acessadas por componente.** Todo acesso passa por `lib/alunos.ts` e `lib/equipe.ts`, que chamam as rotas em `app/api/`. Um `supabase.from('students')` novo num componente **reabre a exposição** e quebra quando o RLS estiver ligado. As outras tabelas (`classes`, `class_slots`, `evaluations`, `*_tasks`) seguem indo direto.
- **Colunas mínimas por finalidade**: `lib/alunos-colunas.ts` declara o que cada escopo traz e o que cada papel pode escrever. Isso não é estilo, é a regra do telefone: a tela do professor não pode **receber** o contato, não basta não desenhar.
- **Autorização é o cookie, não o `localStorage`.** `olimpo_session` serve só para a interface escolher abas. Quem autoriza é o cookie HttpOnly assinado (`lib/sessao-servidor.ts`), emitido pelas rotas de login. Nunca confie em `role` vindo do cliente numa rota.
- **Fallback temporário**: sem `SUPABASE_SERVICE_ROLE_KEY` + `SESSION_SECRET`, as rotas devolvem 503 e `lib/alunos.ts`/`lib/equipe.ts` caem na chave publishable, avisando no console. É ponte para o deploy — **enquanto puder acontecer, o RLS não pode ser ligado.**
- Troca de aba disparada por outro módulo: `window.dispatchEvent(new CustomEvent('jumpToTab', { detail: 'swimming' }))` + `localStorage['olympus_jump_eval']` com o id do aluno.
- Telefone é sempre gravado **só com dígitos** — o login do responsável busca por dígitos.

## Regras de negócio (vieram do dono, não estão dedutíveis do código)

- **O professor não pode falar com os pais pelo número pessoal.** Qualquer aviso ao responsável sai do número da academia ou do próprio app. Por isso o telefone do responsável **só aparece para admin**; nenhuma tela de professor mostra contato. O `/api/push` recebe só o `student_id` e resolve o telefone **no servidor**, justamente para não expor o número ao navegador do professor.
- **No sábado a escala é em duplas fixas que alternam** (um sábado um, no outro o colega): Letícia/Douglas, Eduardo/Paula, Caio/André, Anderson/Luiz — 4 professores por sábado. No banco isso é **uma turma por posto**, com `classes.teacher_name = "NOME A / NOME B"` (nomes completos, separador `" / "`). **Nunca compare `teacher_name` por igualdade** — use `lecionaEm` / `professoresDe` / `rotuloProfessor` de `lib/professor.ts`, senão o sábado some da visão dos dois. Consequências: (a) a aba Avaliação Sábado agrupa por **horário** sem professor, porque o cadastro sabe a dupla e não quem está de escala hoje; (b) `app_users.schedule.sab` fica desligado para todos e **não é editável** na aba Professores — um horário semanal fixo não representa escala quinzenal; (c) a Grade **não confere expediente no sábado** (`windowFits` devolve ok) — qualquer aviso ali seria falso.
- Turmas de **Amarela, Laranja e Vermelha** são de nível único; de **Verde em diante** podem misturar níveis na mesma turma.
- Senha do responsável = **4 últimos dígitos do telefone**. Decisão consciente (fácil de informar no balcão); o dado exposto é apenas a ficha de natação da criança.

## Origem dos dados

Importados de `Informações para criação do app.xlsx` (3 abas: alunos fixos, professor × horário, avulsos/wellhub) pelo script `_import.mjs`. Aulas de 45 min. "Verde+" na planilha virou vagas de green + lightBlue + darkBlue na mesma turma. Hidroginástica, Apoio, Bebê de colo e adulto foram ignorados.

⚠️ **A planilha não diz qual professor atende cada aluno** — só dia + horário + touca. Onde 2 ou mais professores davam aula no mesmo dia/hora/touca (42 combinações, 119 aulas ≈ 20%), a alocação foi feita por **balanceamento**, ou seja, é um palpite. Os outros 80% são certos, porque só havia um professor possível.

---

## Pendências

### Bloqueios operacionais

1. **Definir quem assumiu as 61 turmas do Anderson e do Caio** (121 alunos). Hoje aquelas turmas existem com os alunos nas vagas, mas com o nome de quem saiu em `classes.teacher_name` — nenhum professor ativo as enxerga.
2. **A grade nova da planilha (aba 1) não foi aplicada.** Em 24/10/2026 só o expediente (`app_users.schedule`) e o nome da Letícia foram atualizados. A grade de dia/horário/touca da planilha difere da do banco e aplicá-la remaneja matrícula — é projeto à parte, com backup antes.
3. **2 alunos "fixo" sem turma** — os dois Bernardo, touca Verde, pedidos para quinta 8h30, mas nesse horário só existem turmas Laranja e Vermelha. Aparecem num grupo próprio, com aviso, na aba Avulsos & Wellhub.

> **Deploy:** `origin` é `github.com/ragnarokbrasil123-del/Higor.git` e o Vercel reconstrói sozinho a cada push no `main`. A autenticação já está resolvida: `gh` CLI logado como `ragnarokbrasil123-del` e `gh auth setup-git` ligando essa credencial ao Git — `git push` funciona direto, sem pedir senha.

### Dívida técnica

- **Segurança / LGPD**: senhas em texto puro e **sem RLS** no Supabase — a chave publishable lê a base inteira, incluindo `students.observacoes`, que guarda **alergia e restrição alimentar (dado sensível de saúde, LGPD Art. 11) de menores**. Este é o risco nº 1 do projeto e **não é só dívida técnica, é exposição**. Ver `LGPD.md` e `sql/2026-10-24-lgpd.sql`.
- As chaves **VAPID** saíram do código para o ambiente (`.env.example`). A privada antiga ficou em repositório público: **considere-a vazada e gere um par novo**.
- `hooks/use-mobile.ts` está órfão. `components/install-prompt.tsx` é usado em 3 lugares (`page`, `login-module`, `client-portal`).
- Dependências que nenhum arquivo importa: `@google/genai`, `@hookform/resolvers`, `class-variance-authority`, `firebase-tools`, `tw-animate-css`, `@tailwindcss/typography`.
- Resíduos do AI Studio: `package.json` ainda se chama `ai-studio-applet`; `README.md` fala de `GEMINI_API_KEY`; `metadata.json` descreve outro produto. Nada disso é este projeto.
- `public/icon-maskable-*.png` existem mas o `manifest.json` não os declara — no Android o ícone sai com moldura branca.
- O eslint **não** está limpo (padrões antigos de `useEffect` e `<img>`), e o `next.config.ts` tem `ignoreDuringBuilds: true`. O gate real é `npx tsc --noEmit`, que passa.
- Fotos dos checklists são base64 dentro do Postgres (incha o banco e o payload do realtime) — deveriam ir para o Supabase Storage.
- `GlobalNotifier` está inline dentro de `app/page.tsx` e usa sons hotlinkados de `soundjay.com`.
- `public/cartao-pais.html` é o material impresso para os pais, servido como estático fora do React: folha 1 com dois cartões de balcão, folha 2 com um cartaz de parede. O endereço fica numa constante só no script, injetada no QR e no texto — se divergirem, o QR leva a um lugar e a URL escrita a outro.
