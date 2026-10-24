-- ============================================================
--  Clube Olimpo — autoria da avaliação
--
--  Rodar no SQL Editor do Supabase. São três colunas e um índice.
--  Não mexe em senha, login, nem em nada existente.
--
--  O problema: `evaluations` registra O QUE foi avaliado, mas não
--  QUEM avaliou. Se uma touca subir errado, ou um critério for
--  marcado por engano, não há como saber com quem conversar — e com
--  12 professores dando aula no mesmo horário, o palpite não serve.
--
--  Não dá para deduzir pela turma: avulso e wellhub aparecem em
--  qualquer aula e quem estiver dando a aula avalia, e no sábado a
--  escala gira entre a dupla. Ou se grava quem fez, ou se perde.
-- ============================================================

alter table public.evaluations
  add column if not exists avaliador_id         uuid,
  add column if not exists avaliador_nome       text,
  add column if not exists avaliador_papel      text,
  add column if not exists avaliador_verificado boolean not null default false;

comment on column public.evaluations.avaliador_id is
  'app_users.id de quem lançou. Nulo nas avaliações antigas, feitas antes desta coluna existir.';

comment on column public.evaluations.avaliador_nome is
  'Nome de quem lançou, copiado no momento do lançamento. É cópia de propósito: se a pessoa for renomeada ou excluída depois, o histórico tem de continuar dizendo quem fez na época.';

comment on column public.evaluations.avaliador_papel is
  '"admin" ou "teacher" — o papel usado no lançamento.';

comment on column public.evaluations.avaliador_verificado is
  'true quando a autoria veio da sessão assinada no servidor (/api/avaliacoes). false quando veio do navegador, no período em que SUPABASE_SERVICE_ROLE_KEY/SESSION_SECRET ainda não estavam configuradas: nesse caso o nome é AUTODECLARADO e serve para organizar, não para provar.';

-- "quem fez o que" é a pergunta que este índice responde
create index if not exists evaluations_avaliador_idx
  on public.evaluations (avaliador_id, date desc);


-- ------------------------------------------------------------
--  Conferência
-- ------------------------------------------------------------
select
  count(*)                                             as total_avaliacoes,
  count(avaliador_id)                                  as com_autor,
  count(*) filter (where avaliador_verificado)         as autoria_verificada
from public.evaluations;
