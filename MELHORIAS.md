# Guia para pedir melhorias no Clube Olimpo

Este arquivo existe para **escrever prompts**. A parte 1 é o contexto que você cola antes de qualquer pedido. A parte 2 é o catálogo do que dá para melhorar, com o pedido já redigido.

Para a descrição técnica completa do projeto, veja o `CLAUDE.md`.

---

# PARTE 1 — Bloco de contexto (copie e cole no início do prompt)

```
CONTEXTO DO PROJETO

App "Clube Olimpo": PWA de gestão de uma escola de natação, em produção.
Objetivo central: avaliar alunos para troca de touca (avaliação trimestral por
critérios) e informar os pais do resultado.

Stack: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4.
Backend: Supabase (Postgres). NÃO existe servidor próprio — o front fala direto
com o Supabase pela chave publishable, que está fixa em lib/supabase.ts.

Estrutura: uma única página (app/page.tsx) com abas; cada aba é um componente em
components/. Papéis: admin, teacher e client (responsável), guardados em
localStorage na chave "olimpo_session" no formato { role, data }.

Dados reais hoje: 429 alunos, 312 turmas, 1303 vagas (587 ocupadas), 12
professores, 0 avaliações registradas.

Tabelas: app_users, students, classes, class_slots, evaluations,
cleaning_tasks, maintenance_tasks, push_subscriptions.

RESTRIÇÕES IMPORTANTES:
- Não tenho acesso a DDL nem à service-role key do Supabase. Toda mudança de
  schema deve ser entregue como SQL para eu rodar à mão no SQL Editor.
- O PostgREST devolve no máximo 1000 linhas por consulta; class_slots tem 1303.
  Sempre pagine com .range(from, from+999) em loop.
- Nunca rodar "npm run build" com o "npm run dev" ligado (quebra a pasta .next e
  a tela fica branca). Validar com "npx tsc --noEmit".
- Regra da empresa: o professor NÃO pode falar com os pais pelo número pessoal.
  Telefone de responsável só aparece para admin.
- No sábado a escala dos professores gira, então a associação aluno-professor
  no sábado não é confiável.
- Toucas: 7 níveis (yellow, orange, red, green, lightBlue, darkBlue, black).
  Não existe Prata. class_slots.cap_color guarda a chave, nunca o nome em PT.
```

---

# PARTE 2 — Catálogo de melhorias

Ordenado por impacto real. Cada item traz **por que importa** e um **prompt pronto**.

---

## 🔴 NÍVEL 1 — Resolver antes de qualquer coisa nova

### 1.1 Proteger os dados das crianças (RLS no Supabase)

**O problema:** a chave do Supabase está no código do front, o que é normal — mas ela só é segura se o banco tiver RLS (Row Level Security) ligado. Hoje não tem. Na prática: qualquer pessoa que abra o app, aperte F12 e copie a chave consegue baixar **a base inteira** — nome, telefone, endereço e senha de 429 crianças.

**Por que é o item nº 1:** são dados pessoais de menores. Não é dívida técnica, é exposição.

> **Prompt:**
> Meu app Supabase está sem RLS e a chave publishable está no código do front, então qualquer visitante consegue ler a base inteira (429 alunos, com telefone e endereço). Preciso fechar isso.
> Analise como cada tabela é lida e escrita hoje pelos componentes e me proponha uma estratégia de RLS que não quebre o app. Considere que o login é caseiro (comparação de senha em texto puro na tabela `app_users` e `students`), não uso o Supabase Auth — me diga se dá para fazer RLS funcionar assim ou se preciso migrar para o Supabase Auth primeiro, com o custo de cada caminho.
> Entregue o SQL das policies para eu rodar no SQL Editor e a lista de arquivos que precisam mudar.

### 1.2 Parar de guardar senha em texto puro

**O problema:** `app_users.password` e `students.password` guardam a senha legível. Quem acessar o banco vê a senha de todo mundo.

> **Prompt:**
> No meu app as senhas estão em texto puro nas tabelas `app_users` e `students`, e o login compara com `.eq('password', valor)` direto do front. Quero corrigir sem quebrar os 429 alunos já cadastrados (a senha deles hoje são os 4 últimos dígitos do telefone).
> Me proponha o caminho de migração: onde fazer o hash, como migrar os registros existentes e como fica o login. Lembre que não tenho backend próprio — avalie se vale criar uma Route Handler no Next.js para isso.

### 1.3 Fazer o ciclo completo rodar uma vez

**O problema:** existem **0 avaliações** no banco. Todo o fluxo — professor avalia, aluno troca de touca, pai recebe o aviso, PDF é gerado — nunca rodou de ponta a ponta com gente real. E 11 dos 12 professores não têm login, então nem conseguem entrar.

**Por que importa:** é o objetivo principal do app. Tudo o que foi construído está sem prova real.

> **Prompt:**
> Meu app de avaliação de natação nunca rodou de ponta a ponta: tenho 0 avaliações no banco e 11 dos 12 professores não têm login criado.
> Me ajude a fazer um teste-piloto: crie os logins que faltam, escolha uma turma pequena e me guie pelo ciclo completo (professor entra → avalia → aluno troca de touca → responsável recebe o aviso → abre o portal → baixa o PDF). Quero que você aponte onde o fluxo trava ou confunde.

---

## 🟡 NÍVEL 2 — Funcionalidades que o negócio pede

### 2.1 Controle de presença (chamada)

**O que falta:** não existe registro de frequência. Para uma escola de natação, chamada é básico — e é o que explica um aluno que não evolui.

> **Prompt:**
> Quero adicionar controle de presença ao app. O professor abre a turma do dia e marca presente/falta de cada aluno, no celular, à beira da piscina.
> Me proponha o schema (SQL para eu rodar), onde encaixar na interface existente (a aba Avaliação Natação já lista as turmas do dia) e como mostrar a frequência na ficha do aluno e no portal dos pais. Considere que precisa ser rápido: poucos toques por turma.

### 2.2 Relatório de aulas por professor

**O que falta:** não há como ver a carga de cada professor sem eu calcular na mão. Útil para fechamento de mês.

> **Prompt:**
> Quero uma tela de relatório mensal por professor: quantas aulas ele dá no mês, quantas têm aluno matriculado, carga horária total e quantos alunos distintos atende.
> Atenção: as aulas são recorrências semanais na tabela `classes`, então o total do mês depende de quantas vezes cada dia da semana cai naquele mês — calcule pelo calendário real, não multiplicando por 4. E as aulas de sábado devem aparecer separadas, porque lá a escala dos professores gira e a associação não é confiável.

### 2.3 Relatório de ocupação e vagas livres

**O que falta:** há 1303 vagas e só 587 ocupadas. Ninguém consegue responder rápido "tem vaga de Laranja na terça de manhã?" — que é a pergunta da recepção quando chega matrícula nova.

> **Prompt:**
> Quero uma tela que responda rápido "onde tem vaga?". Mostre a ocupação por dia, horário e touca, destacando os horários com vaga livre. Hoje tenho 1303 vagas e 587 ocupadas.
> Pense na recepção atendendo alguém no balcão: a pessoa diz a touca da criança e os dias que pode vir, e a tela tem que mostrar as opções na hora.

### 2.4 Histórico de troca de touca

**O que falta:** quando o aluno é aprovado o sistema muda `students.level`, mas **não guarda quando nem de qual touca veio**. A informação se perde.

> **Prompt:**
> Quando um aluno é aprovado numa avaliação, meu app muda o campo `students.level` para a próxima touca, mas não registra o histórico dessa mudança. Quero guardar a linha do tempo: em que data cada aluno subiu de touca e quanto tempo ficou em cada nível.
> Me dê o SQL da tabela nova, onde gravar no código, e uma visualização em linha do tempo para a ficha do aluno e para o portal dos pais.

### 2.5 Comunicados para os pais

**O que falta:** não há como avisar todo mundo de um feriado, manutenção da piscina ou festival. O portal só mostra avaliação.

> **Prompt:**
> Quero um espaço de comunicados no portal dos pais: o admin escreve um recado (com data e opcionalmente direcionado a uma touca ou a um dia da semana) e ele aparece para os responsáveis. Se der, disparar também a notificação push que já existe no projeto.
> Me dê o SQL da tabela, a tela de admin para escrever e como isso aparece no portal.

---

## 🟢 NÍVEL 3 — Qualidade e manutenção

### 3.1 Quebrar o `swimming-module.tsx`

**O problema:** 931 linhas num arquivo só, servindo 3 abas e 3 telas internas. É o arquivo mais editado do projeto e o mais arriscado de mexer.

> **Prompt:**
> O arquivo `components/swimming-module.tsx` tem 931 linhas e concentra três escopos (turmas do dia, avulsos/wellhub, sábado) e três telas (lista, avaliação em sequência, ficha do aluno).
> Me proponha uma divisão em arquivos menores sem mudar nenhum comportamento. Quero um plano de refatoração passo a passo, cada passo verificável com `npx tsc --noEmit`, para eu não quebrar nada no meio.

### 3.2 Trocar `alert()` e `confirm()` por avisos decentes

**O problema:** o app usa as caixas nativas do navegador em quase toda ação. No celular são feias, travam a tela e não combinam com o resto.

> **Prompt:**
> Meu app usa `alert()` e `confirm()` nativos em todos os módulos para confirmar e avisar. Quero substituir por um sistema de toast/modal próprio, consistente com o visual do app (Tailwind + motion, cantos arredondados, âmbar como cor de destaque).
> Me proponha um componente reutilizável e a lista de todos os lugares a trocar. Prioridade para as ações destrutivas, que precisam continuar pedindo confirmação de verdade.

### 3.3 Tirar as fotos do banco

**O problema:** as fotos dos checklists são gravadas como base64 dentro do Postgres. Incha o banco e o payload do realtime.

> **Prompt:**
> Nos módulos de limpeza e manutenção as fotos são salvas como base64 na coluna `photo_url` do Postgres. Quero migrar para o Supabase Storage.
> Me dê o passo a passo: criar o bucket, ajustar o upload nos dois componentes, e migrar as fotos que já estão no banco sem perder nenhuma.

### 3.4 Faxina de código morto

**O problema:** `lib/utils.ts` é uma cópia acidental de `lib/supabase.ts` e não é importado por ninguém. `hooks/use-mobile.ts` está órfão. A função `cn()` está duplicada em 8 arquivos.

> **Prompt:**
> No meu projeto: `lib/utils.ts` é uma cópia acidental de `lib/supabase.ts` e não é usado; `hooks/use-mobile.ts` está órfão; e a função `cn()` (clsx + tailwind-merge) está copiada em 8 componentes.
> Faça a limpeza: apague o que é morto e centralize o `cn()` num lugar só, ajustando os imports. Valide com `npx tsc --noEmit` no final.

---

## 🔵 NÍVEL 4 — Ideias maiores, para discutir antes de fazer

Estas mudam o produto, não só o código. Vale conversar antes de pedir implementação.

- **Matrícula pelos próprios pais** — o responsável se cadastra e escolhe um horário com vaga, sem passar pela recepção.
- **Automatizar o aviso pelo WhatsApp oficial** — hoje o aviso é push no app. A WhatsApp Business API mandaria do número da academia automaticamente (custo estimado: R$150–200/ano para ~1.700 mensagens).
- **Financeiro** — mensalidades, quem está em dia, integração com Wellhub.
- **App do professor separado** — hoje professor e admin usam a mesma interface, com o professor vendo abas que não usa.

---

# Como escrever um bom pedido

1. **Cole o bloco da Parte 1** antes de qualquer pedido.
2. **Diga o objetivo, não a solução.** "Quero saber quem faltou muito" rende mais que "crie uma tabela de presença".
3. **Peça o SQL separado.** Toda mudança de banco você precisa rodar à mão no Supabase.
4. **Peça uma coisa de cada vez.** Pedidos grandes voltam pela metade.
5. **Exija verificação.** Termine com: *"valide com `npx tsc --noEmit` e me diga o que testou"*.
6. **Diga que é no celular.** Grande parte do uso é o professor à beira da piscina, com a mão molhada.
