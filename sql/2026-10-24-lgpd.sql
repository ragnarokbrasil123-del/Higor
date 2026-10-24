-- ============================================================
--  Clube Olimpo — adequação LGPD, parte 1
--  Rodar no SQL Editor do Supabase. Pode rodar por partes.
--
--  NENHUM comando aqui mexe em senha, em usuário ou no login.
--  O responsável continua entrando com telefone + 4 últimos dígitos.
--
--  O que este arquivo resolve:
--    1. registro das operações de tratamento  (LGPD Art. 37)
--    2. registro do consentimento dos pais    (LGPD Art. 14, §1º)
--    3. prazo de retenção visível             (LGPD Art. 15/16)
--
--  O que ele NÃO resolve: a base continua legível pela chave
--  publishable. Isso só fecha com RLS, e RLS exige antes mover as
--  consultas para o servidor. Está planejado à parte.
-- ============================================================


-- ------------------------------------------------------------
--  1. REGISTRO DE OPERAÇÕES (Art. 37)
--
--  Hoje não existe nenhum registro de quem abriu ou alterou a ficha
--  de uma criança. A consequência prática aparece no pior momento:
--  num vazamento, o Art. 48 obriga informar à ANPD e às famílias a
--  extensão do incidente — e sem registro não há como dizer o que
--  saiu, quando, nem quanto. Também não há como se defender da
--  acusação de que saiu mais do que saiu.
--
--  A tabela é APPEND-ONLY para a chave pública (ver os GRANTs no
--  fim do bloco): o app consegue escrever uma linha, mas não
--  consegue ler, alterar nem apagar o histórico. Assim o registro
--  não vira mais uma tabela exposta, e ninguém apaga o próprio
--  rastro pelo navegador.
-- ------------------------------------------------------------

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  -- quem agiu: id e papel de app_users, ou 'responsavel'
  ator_id     uuid,
  ator_nome   text,
  ator_papel  text,
  -- o que fez: 'login', 'ver_ficha', 'editar_ficha', 'exportar',
  --            'cancelar_matricula', 'avaliar', 'apagar'
  acao        text not null,
  -- sobre quem/o quê
  entidade    text,
  entidade_id uuid,
  -- só os NOMES dos campos tocados, nunca o conteúdo: um log que
  -- guarda o valor antigo viraria uma segunda cópia do dado sensível
  campos      text[],
  criado_em   timestamptz not null default now()
);

create index if not exists audit_log_entidade_idx on public.audit_log (entidade, entidade_id, criado_em desc);
create index if not exists audit_log_ator_idx     on public.audit_log (ator_id, criado_em desc);
create index if not exists audit_log_criado_idx   on public.audit_log (criado_em desc);

alter table public.audit_log enable row level security;

-- append-only pela chave pública: insere e nada mais
drop policy if exists audit_log_insert_anon on public.audit_log;
create policy audit_log_insert_anon
  on public.audit_log for insert
  to anon, authenticated
  with check (true);

revoke select, update, delete on public.audit_log from anon, authenticated;
grant  insert                 on public.audit_log to   anon, authenticated;

comment on table public.audit_log is
  'Registro de operações de tratamento (LGPD Art. 37). Append-only pela chave publishable: leitura e exclusão só pelo painel do Supabase ou pela service_role.';


-- ------------------------------------------------------------
--  2. CONSENTIMENTO DO RESPONSÁVEL (Art. 14, §1º)
--
--  Tratar dado de criança exige consentimento específico e em
--  destaque de pelo menos um dos pais ou do responsável legal — e
--  o ônus de PROVAR que foi obtido é de quem trata. Hoje não há
--  prova nenhuma de 429 matrículas.
--
--  `consentimento_versao` existe porque o texto do aviso vai mudar
--  com o tempo: sem saber QUAL versão a pessoa aceitou, o registro
--  não prova grande coisa.
--
--  O campo de saúde ganha consentimento próprio: alergia e
--  restrição alimentar são dado sensível (Art. 5º, II) e caem no
--  Art. 11, que é um regime mais estrito que o do resto da ficha.
-- ------------------------------------------------------------

alter table public.students
  add column if not exists consentimento_em      timestamptz,
  add column if not exists consentimento_por     text,
  add column if not exists consentimento_versao  text,
  add column if not exists consentimento_saude   boolean not null default false;

comment on column public.students.consentimento_em     is 'Quando o responsável aceitou o aviso de privacidade (LGPD Art. 14, §1º).';
comment on column public.students.consentimento_por    is 'Nome de quem aceitou e vínculo com a criança (mãe, pai, responsável legal).';
comment on column public.students.consentimento_versao is 'Versão do texto aceito. Sem isto o registro não prova o que a pessoa leu.';
comment on column public.students.consentimento_saude  is 'Consentimento específico para o campo observacoes (alergia/restrição = dado sensível, Art. 11).';

comment on column public.students.observacoes is
  'DADO SENSÍVEL DE SAÚDE (LGPD Art. 11). Só preencher com consentimento_saude = true. Nunca expor em tela de professor nem trafegar para o navegador de quem não precisa.';


-- ------------------------------------------------------------
--  3. RETENÇÃO (Art. 15/16 e minimização, Art. 6º, III)
--
--  Matrícula cancelada hoje fica guardada para sempre: `ativo`
--  vira false e a ficha permanece com endereço, telefone e dado de
--  saúde. Guardar o histórico de avaliação faz sentido; guardar
--  endereço e alergia de quem saiu há três anos não.
--
--  A view abaixo não apaga nada — só mostra o que já passou do
--  prazo, para a decisão ser consciente. Escolha o prazo com o
--  advogado (obrigação legal de guarda x minimização) e troque o
--  intervalo aqui.
-- ------------------------------------------------------------

create or replace view public.students_retencao_vencida as
select
  id,
  name,
  inativo_em,
  age(now(), inativo_em) as tempo_inativo,
  (endereco  is not null) as tem_endereco,
  (observacoes is not null) as tem_dado_saude
from public.students
where ativo = false
  and inativo_em is not null
  and inativo_em < now() - interval '2 years';

comment on view public.students_retencao_vencida is
  'Alunos inativos além do prazo de retenção. Só lista — a anonimização é decisão humana. Ver LGPD Art. 15/16.';

-- Quando decidir anonimizar, o comando é este (NÃO roda automático;
-- revise a lista da view antes). Mantém a ficha e o histórico de
-- avaliação, apaga o que identifica e o que é sensível:
--
--   update public.students set
--     endereco    = null,
--     observacoes = null,
--     phone       = null,
--     guardian_name = null,
--     password    = null
--   where id in (select id from public.students_retencao_vencida);


-- ------------------------------------------------------------
--  Conferência
-- ------------------------------------------------------------
select 'audit_log'    as objeto, count(*)::text as resultado from public.audit_log
union all
select 'sem consentimento registrado', count(*)::text from public.students where consentimento_em is null
union all
select 'com dado de saude preenchido', count(*)::text from public.students where observacoes is not null
union all
select 'retencao vencida', count(*)::text from public.students_retencao_vencida;
