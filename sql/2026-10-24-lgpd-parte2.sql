-- ============================================================
--  Clube Olimpo — adequação LGPD, parte 2
--
--  Complemento da parte 1 (que você já rodou). É UM comando.
--  Rodar no SQL Editor do Supabase.
--
--  Por que ficou de fora: ao ligar a auditoria no código, faltou
--  onde guardar QUANTAS linhas cada operação alcançou. E é esse
--  número que responde a pergunta do Art. 48 num incidente — "a
--  extensão do acesso". Sem ele, o log diz "o admin leu fichas" e
--  não distingue ler UMA de baixar as 429.
--
--  Não há pressa nem risco de ordem: enquanto a coluna não existir,
--  `lib/auditoria.ts` falha em silêncio e a operação do usuário
--  segue normal (auditar nunca derruba o trabalho). Só não há
--  registro até isto rodar.
-- ============================================================

alter table public.audit_log
  add column if not exists quantidade integer;

comment on column public.audit_log.quantidade is
  'Quantas linhas a operação alcançou. É a "extensão" que o Art. 48 obriga informar num incidente: distingue ler uma ficha de baixar a base inteira.';


-- ------------------------------------------------------------
--  Conferência
-- ------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'audit_log'
order by ordinal_position;
