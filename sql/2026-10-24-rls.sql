-- ============================================================
--  Clube Olimpo — RLS em students e app_users (passos 4 e 5)
--
--  Este é o comando que FECHA a exposição: depois dele, a chave
--  publishable deixa de ler as duas tabelas. É também o comando que
--  derruba o app inteiro se rodar na ordem errada, porque todo o
--  caminho de reserva (fallback) do código depende de a chave
--  pública ainda ler.
--
--  ✅ Pode rodar sem medo: há uma TRAVA logo abaixo que aborta tudo
--  se as condições não estiverem prontas. Rodar na hora errada dá
--  mensagem de erro, não app fora do ar.
--
--  CONFIRA AS 5 LINHAS ABAIXO ANTES. Todas têm de ser "sim":
--
--   1. [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel
--          (Production E Preview) e no .env.local
--   2. [ ] `SESSION_SECRET` configurada nos mesmos lugares
--          (gere com: openssl rand -base64 48)
--   3. [ ] O código desta entrega está em produção
--   4. [ ] Você ABRIU o app em produção, entrou como admin, e o
--          console do navegador (F12) NÃO mostrou nenhuma linha
--          "[alunos] ... chave publishable" nem "[equipe] ...".
--          Se aparecer, as variáveis não chegaram: pare aqui.
--   5. [ ] Testou, logado, nesta ordem: login de admin · aba Alunos
--          abre a ficha · salvar a ficha · aba Avaliação lista turmas ·
--          aba Grade lista turmas e professores · aba Professores ·
--          aba Acessos · portal do responsável com telefone real
--
--  O item 4 é o que importa de verdade: ele prova que o app está
--  rodando pelas rotas de servidor e não pelo caminho de reserva.
--
--  SE ALGO QUEBRAR DEPOIS DE RODAR: o desfazer está no fim do
--  arquivo e é imediato.
-- ============================================================


-- ============================================================
--  TRAVA AUTOMÁTICA — não depende de ninguém ler o aviso acima
--
--  Em 24/10/2026 este arquivo foi rodado antes do deploy e tirou o
--  app do ar: o código em produção ainda lia pela chave pública, e
--  o RLS fecha justamente essa porta. O comentário "não rode ainda"
--  não impediu nada, então agora há uma verificação de verdade.
--
--  Como ela sabe que pode liberar: `audit_log` só recebe linha
--  através das rotas de servidor, e essas rotas só respondem quando
--  SUPABASE_SERVICE_ROLE_KEY e SESSION_SECRET estão configuradas E
--  o código novo está no ar. Um login registrado na última hora é,
--  portanto, prova das três coisas ao mesmo tempo.
--
--  Se isto barrar você: entre no app em produção (como admin) e
--  rode este arquivo de novo em seguida.
-- ============================================================

do $$
declare
  logins_recentes int;
begin
  select count(*) into logins_recentes
    from public.audit_log
   where acao = 'login'
     and ator_papel is not null
     and criado_em > now() - interval '1 hour';

  if logins_recentes = 0 then
    raise exception
      'ABORTADO: nenhum login pelas rotas de servidor na ultima hora. '
      'Ligar o RLS agora deixa o app fora do ar. '
      'Faca: (1) variaveis no Vercel, (2) deploy do codigo novo, '
      '(3) entre no app como admin, (4) rode este arquivo de novo.';
  end if;
end $$;


-- ------------------------------------------------------------
--  1. students — 429 fichas de crianças, com dado de saúde
--
--  Sem policy nenhuma para `anon`: RLS ligado e nenhuma permissão
--  concedida = ninguém lê nem escreve com a chave pública. A
--  service_role IGNORA RLS por definição, então as rotas de
--  /api/ continuam funcionando sem precisar de policy.
--
--  É exatamente isso que se quer: existe um caminho único, no
--  servidor, que confere a sessão assinada antes de responder.
-- ------------------------------------------------------------

alter table public.students enable row level security;

-- cinto e suspensório: além do RLS, tira o privilégio de tabela.
-- O RLS sozinho já barra, mas sem o privilégio nem a tentativa sai
-- do lugar, e a mensagem de erro fica mais clara no log.
revoke all on public.students from anon;

comment on table public.students is
  'RLS ligado em 24/10/2026, sem policy para anon. Todo acesso passa por /api/alunos, que confere a sessão assinada (cookie HttpOnly). NÃO adicione policy para anon: isso reabriria a base inteira de 429 crianças, com endereço e dado de saúde.';


-- ------------------------------------------------------------
--  2. app_users — senha em texto puro e código de convite
--
--  Por que entra junto: com a senha de um admin em mãos, a pessoa
--  entra pelo login normal e as rotas a atendem COMO ADMIN. Fechar
--  students e deixar isto aberto não fecharia nada.
-- ------------------------------------------------------------

alter table public.app_users enable row level security;
revoke all on public.app_users from anon;

comment on table public.app_users is
  'RLS ligado em 24/10/2026, sem policy para anon. Login e convite passam por /api/login-equipe; o CRUD por /api/equipe. A coluna password segue em texto puro — trocar por hash é o próximo passo (ver LGPD.md).';


-- ------------------------------------------------------------
--  3. Conferência
--
--  `rowsecurity` deve ser `true` nas duas linhas.
-- ------------------------------------------------------------

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('students', 'app_users')
order by tablename;

-- Não deve devolver NENHUMA linha para anon nestas duas tabelas:
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('students', 'app_users')
  and grantee = 'anon';


-- ============================================================
--  DESFAZER — se algo quebrar, rode isto e o app volta na hora
--
--  Reabre a exposição. Use para não ficar com o app fora do ar,
--  conserte o que faltou migrar e ligue de novo no mesmo dia.
-- ============================================================
--
-- grant all on public.students  to anon;
-- grant all on public.app_users to anon;
-- alter table public.students  disable row level security;
-- alter table public.app_users disable row level security;
