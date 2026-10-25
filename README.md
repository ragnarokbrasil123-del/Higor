# Clube Olimpo

PWA de gestão de uma escola de natação. O objetivo central é **avaliar o aluno
para troca de touca** (avaliação trimestral por critérios) e **informar os pais**
do resultado. Secundariamente cobre grade de horários, cadastro de alunos e
professores, e os checklists de limpeza e manutenção.

Produção: <https://clubeolimpo.vercel.app> — o Vercel reconstrói a cada push no `main`.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # checagem de tipos — é ESTA que valida
npm run build      # build de produção
```

> ⚠️ Nunca rode `npm run build` com o `npm run dev` ligado, nem dois `npm run dev`
> ao mesmo tempo. Os dois escrevem na mesma pasta `.next`; um apaga os chunks que
> o outro está servindo e a tela fica branca (HTML 200, JS 404).

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Em produção, os mesmos nomes
vão em Vercel → Settings → Environment Variables.

| Variável | Para quê |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | as rotas de servidor lerem `students` e `app_users`, que têm RLS |
| `SESSION_SECRET` | assinar o cookie de sessão |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` | notificações push |

## Antes de mexer

Leia o **`CLAUDE.md`** — ele tem a arquitetura, as regras de negócio que não são
dedutíveis do código (escala de sábado em duplas, o professor não ter o contato
dos pais) e as armadilhas já conhecidas.

Duas que valem repetir aqui:

- **Nunca** use `supabase.from('students')` ou `supabase.from('app_users')` num
  componente. As duas têm RLS; o acesso passa por `lib/alunos.ts` e
  `lib/equipe.ts`.
- O PostgREST devolve no máximo 1000 linhas por consulta e `class_slots` passa
  disso. Pagine com `lib/paginado.ts`, ou leia por `lib/dados.ts`, que já tem
  cache entre as abas.

O **`LGPD.md`** registra o que foi feito e o que falta na proteção dos dados.
