-- ============================================================
--  Clube Olimpo — expediente dos professores + nome da Letícia
--
--  Fonte: "Horarios prof natação atualizado .xlsx"
--    aba 2 (Planilha3) = faixa de horas de cada professor
--    aba 1 (Planilha2) = grade, usada para saber QUAIS DIAS cada um
--                        trabalha (a aba 2 não diz)
--
--  ESCOPO: só `app_users.schedule`, o nome da Letícia e a saída de
--  Anderson e Caio.
--
--  ⚠️ NÃO MEXE EM NENHUMA MATRÍCULA. Nenhum `class_slots` é tocado,
--  nenhum aluno muda de turma. As 273 turmas seguem como estão.
--  A grade nova da aba 1 ficou de fora de propósito: remanejar a
--  grade move os 628 alunos alocados e é projeto à parte.
--
--  SEM transação explícita: a primeira versão abria `begin;` e deixava
--  o `commit;` comentado para revisão, mas o SQL Editor do Supabase
--  descartou a transação ao fim da execução e NADA foi aplicado — as
--  consultas de conferência mostravam o estado de dentro da transação,
--  parecendo que tinha dado certo. Agora cada comando aplica na hora.
--
--  Todos os `update` usam igualdade exata no `where`, então rodar o
--  arquivo duas vezes não causa dano: na segunda passada o nome antigo
--  já não casa com nada.
-- ============================================================

-- ------------------------------------------------------------
--  1. NOME DA LETÍCIA — os dois lados, na mesma transação
--
--  O banco tem "...ESPIRITO SANTO"; a planilha e o seed do código
--  têm "...SANTOS". Parece bobagem, mas `classes.teacher_name` é
--  texto livre e `lecionaEm()` compara por igualdade exata: corrigir
--  só o `app_users` faria a Letícia entrar no app e ver ZERO alunos,
--  perdendo 18 turmas de semana (47 alunos) e 9 de sábado (25).
--
--  O sábado é "NOME A / NOME B", então tem a sua própria linha.
--
--  Uso igualdade exata (e não `replace`) para ser idempotente: rodar
--  duas vezes não faz efeito, enquanto um replace de SANTO→SANTOS
--  transformaria "SANTOS" em "SANTOSS" na segunda passada.
--  (A planilha traz espaço duplo em "TOLEDO␣␣DO"; normalizei para um,
--   que é o padrão de todos os outros nomes.)
-- ------------------------------------------------------------

update public.app_users
   set name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS'
 where name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO';

update public.classes
   set teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS'
 where teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO';

update public.classes
   set teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS / DOUGLAS GOMES DE ARAÚJO'
 where teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO / DOUGLAS GOMES DE ARAÚJO';


-- ------------------------------------------------------------
--  2. EXPEDIENTE (app_users.schedule)
--
--  Formato conforme components/professors-module.tsx:
--    { "<dia>": { "enabled": bool, "shifts": [{start,end}] } }
--    dias: seg ter qua qui sex sab
--
--  `sab` fica DESLIGADO para todos menos o André. Não é esquecimento:
--  no sábado a escala é em duplas que alternam a cada semana, e um
--  horário semanal fixo não representa isso (ver CLAUDE.md). O André
--  é a exceção porque ele SÓ trabalha sábado.
-- ------------------------------------------------------------

-- ANDRÉ — só sábado. Início 07:30 -> 07:15.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', false, 'shifts', jsonb_build_array(jsonb_build_object('start','','end',''))),
  'ter', jsonb_build_object('enabled', false, 'shifts', jsonb_build_array(jsonb_build_object('start','','end',''))),
  'qua', jsonb_build_object('enabled', false, 'shifts', jsonb_build_array(jsonb_build_object('start','','end',''))),
  'qui', jsonb_build_object('enabled', false, 'shifts', jsonb_build_array(jsonb_build_object('start','','end',''))),
  'sex', jsonb_build_object('enabled', false, 'shifts', jsonb_build_array(jsonb_build_object('start','','end',''))),
  'sab', jsonb_build_object('enabled', true,  'shifts', jsonb_build_array(jsonb_build_object('start','07:15','end','14:15')))
) where name = 'ANDRÉ LUIZ PAIVA DA SILVA';

-- DOUGLAS — era 16:00-22:00, agora 13:00-17:30 (mudança grande).
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'DOUGLAS GOMES DE ARAÚJO';

-- EDUARDO — 17:30-21:15. Igual ao que já estava; vai junto para o
-- formato ficar uniforme em todas as linhas.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'EDUARDO DOS SANTOS DA SILVA';

-- FLÁVIA — 17:30-21:15, SEM TERÇA.
-- A aba 2 não menciona dias, mas na aba 1 a coluna de terça dela está
-- vazia, e o banco já tinha a terça desligada. Mantido desligado: ligar
-- por descuido a colocaria disponível num dia em que ela não trabalha.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'ter', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end',''))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','17:30','end','21:15'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'FLÁVIA REIS LIMA';

-- ISABELLA — fim 18:15 -> 17:30.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','13:00','end','17:30'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'ISABELLA KATHELYN GONÇALVES ROCHA';

-- LETÍCIA — 07:00-11:30 em todos os dias (a terça estava 07:45).
-- Já com o nome corrigido no passo 1.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:00','end','11:30'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:00','end','11:30'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:00','end','11:30'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:00','end','11:30'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:00','end','11:30'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS';

-- LIVIA — único caso com horário DIFERENTE POR DIA:
--   seg 15:15-20:30 · ter e sex 14:30-19:45 · qua e qui 14:30-20:30
-- Conferido contra a aba 1: bate aula por aula.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','15:15','end','20:30'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','14:30','end','19:45'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','14:30','end','20:30'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','14:30','end','20:30'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','14:30','end','19:45'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'LIVIA RODRIGUES SOUZA';

-- LUIZ — início 07:00/07:45 -> 08:30 em todos os dias.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','08:30','end','12:15'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','08:30','end','12:15'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','08:30','end','12:15'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','08:30','end','12:15'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','08:30','end','12:15'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'LUIZ GABRIEL RAMOS DOS SANTOS';

-- PAULA — 07:45-11:30 uniforme (estava alternando 07:00/07:45 e ia até 12:15).
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:45','end','11:30'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:45','end','11:30'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:45','end','11:30'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:45','end','11:30'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','07:45','end','11:30'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'PAULA GABRIELLE GONÇALVES DA SILVA GAMA';

-- RENÊ — fim 20:30 -> 21:15.
-- Observação: a aba 1 mostra a última aula dele às 19h45 (termina 20:30),
-- mas a aba 2 diz que o expediente vai até 21:15. Não é contradição —
-- expediente pode passar da última aula — e segui a aba 2, que é a fonte
-- do expediente. Se 20:30 estiver certo, me avise.
update public.app_users set schedule = jsonb_build_object(
  'seg', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','16:45','end','21:15'))),
  'ter', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','16:45','end','21:15'))),
  'qua', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','16:45','end','21:15'))),
  'qui', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','16:45','end','21:15'))),
  'sex', jsonb_build_object('enabled', true, 'shifts', jsonb_build_array(jsonb_build_object('start','16:45','end','21:15'))),
  'sab', jsonb_build_object('enabled', false,'shifts', jsonb_build_array(jsonb_build_object('start','','end','')))
) where name = 'RENÊ GAMA TEIXEIRA';


-- ------------------------------------------------------------
--  3. ANDERSON E CAIO — saíram da equipe
--
--  `active = false` já impede o login (ver `contaLiberada` em
--  lib/acesso.ts) e some com eles do seletor de professor da Grade.
--  `status = 'revogado'` deixa isso explícito na aba Acessos.
--
--  A ficha NÃO é apagada e as turmas NÃO são tocadas: as 61 turmas de
--  semana deles continuam de pé com os 121 alunos nas vagas, só sem
--  professor definido, até você saber quem assumiu.
--
--  No sábado nada se perde: as turmas são duplas
--  ("ANDERSON / LUIZ" e "CAIO / ANDRÉ") e o parceiro que ficou
--  continua enxergando as 16 turmas e os 54 alunos, porque
--  `lecionaEm()` reconhece qualquer um dos dois nomes da dupla.
-- ------------------------------------------------------------

update public.app_users
   set active = false,
       status = 'revogado'
 where name in (
   'ANDERSON GUIMARÃES DOS SANTOS',
   'CAIO CEZAR ANASTÁCIO DE AVILA'
 );


-- ============================================================
--  CONFERÊNCIA — olhe antes de dar commit
-- ============================================================

-- 3a. A Letícia continua com as turmas dela? (esperado: 18 e 9)
select teacher_name, count(*) as turmas
  from public.classes
 where teacher_name like 'LETÍCIA%'
 group by teacher_name;

-- Não deve sobrar NENHUMA linha com o nome antigo:
select count(*) as sobrou_nome_antigo
  from public.classes
 where teacher_name like '%ESPIRITO SANTO /%'
    or teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO';

-- 3b. Expediente de todos (10 ativos + 2 inativos)
select name, active, status,
       schedule -> 'seg' -> 'shifts' -> 0 ->> 'start' as seg_ini,
       schedule -> 'seg' -> 'shifts' -> 0 ->> 'end'   as seg_fim,
       schedule -> 'sab' ->> 'enabled'                as sabado
  from public.app_users
 where role = 'teacher'
 order by active desc, name;

-- 3c. Nenhuma matrícula foi tocada (esperado: 628 de 1407)
select count(*) filter (where student_id is not null) as ocupadas,
       count(*)                                       as vagas
  from public.class_slots;


-- ============================================================
--  As conferências acima já valem: não há transação aberta.
--
--  Precisa desfazer o nome da Letícia? É só inverter:
--    update public.app_users set name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO'
--     where name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS';
--    update public.classes set teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO'
--     where teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS';
--    update public.classes set teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTO / DOUGLAS GOMES DE ARAÚJO'
--     where teacher_name = 'LETÍCIA TOLEDO DO ESPIRITO SANTOS / DOUGLAS GOMES DE ARAÚJO';
--
--  Reativar Anderson e Caio:
--    update public.app_users set active = true, status = 'aprovado'
--     where name in ('ANDERSON GUIMARÃES DOS SANTOS','CAIO CEZAR ANASTÁCIO DE AVILA');
-- ============================================================
