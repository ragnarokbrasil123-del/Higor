# LGPD — levantamento, correções e pendências

**Escrito para:** o responsável pelo app e o advogado que fizer a análise jurídica.

Este arquivo é o registro técnico do que foi encontrado, do que foi corrigido e
do que falta. Serve a dois propósitos: orientar o trabalho e **comprovar data e
conteúdo das medidas corretivas** — o Art. 52, §1º manda a ANPD considerar na
dosimetria a boa-fé e a pronta adoção de medidas. Corrigir e não registrar
desperdiça metade do benefício.

> **Não é parecer jurídico.** O enquadramento abaixo é a leitura técnica de quem
> mexeu no código. A combinação em jogo — **dado de saúde** (Art. 11) de
> **crianças** (Art. 14) — é a mais sensível da lei e pede advogado.

---

## 1. O quadro

O app trata, de ~429 alunos em sua maioria crianças:

| Dado | Coluna | Natureza |
|---|---|---|
| Nome, idade | `students.name`, `.age` | pessoal |
| Endereço | `students.endereco` | pessoal |
| Nome e telefone do responsável | `.guardian_name`, `.phone` | pessoal (de terceiro) |
| Senha | `.password` | **texto puro**, derivada do telefone |
| **Alergias e restrições** | `.observacoes` | **SENSÍVEL — saúde (Art. 5º, II)** |
| Evolução pedagógica | `evaluations` | pessoal |
| Fotos de checklist | `*_tasks.photo_url` | base64 no Postgres |

O campo `observacoes` não contém dado de saúde por acidente: a interface
**pedia** esse dado. O placeholder era literalmente
`"Alergias, restrições, combinados com a família..."`. Isso puxa o tratamento
para o Art. 11, o regime mais restritivo da lei.

---

## 2. Corrigido em 24/10/2026

Validado com `npx tsc --noEmit` (limpo). **Nenhuma destas mudanças altera a
credencial do responsável** — segue telefone + 4 últimos dígitos.

| # | Problema | Correção |
|---|---|---|
| 1 | Login do responsável casava o telefone por **pedaço solto** (`%digitos%`): os dígitos de um pai podiam cair no meio do número de outra família e abrir a ficha da criança errada. A senha não barrava, porque é derivada do próprio telefone | `lib/login-responsavel.ts`: casa só pelo **final** do número e **recusa** quando o resultado cai em mais de um telefone. Fonte única para login e portal |
| 2 | Tela do professor baixava `select('*')` de `students` — telefone, endereço e observações de saúde iam para o navegador dele, visíveis no DevTools, contrariando a regra da casa | `COLUNAS_ALUNO` em `useDadosNatacao.ts`: só `id, name, level, ativo, modalidade` |
| 3 | Portal dos pais gravava a ficha inteira (com endereço e dado de saúde) no `localStorage` do aparelho da família | `COLUNAS_PORTAL`: só o que a tela mostra, mais o necessário para reautenticar |
| 4 | Importação em massa baixava `select('*')` dos 429 alunos para comparar **nomes** | só `id, name` |
| 5 | Chave **VAPID privada** escrita em `app/api/push/route.ts`, em repositório público: terceiro envia push assinado como o clube | movida para variável de ambiente (`.env.example`). **Pendente: gerar par novo** |
| 6 | `class_slots` (1303 linhas) consultada sem paginação na Matrícula e na Grade: o corte de 1000 do PostgREST escondia vagas em silêncio | `lib/paginado.ts`, aplicado nos dois |
| 7 | `recarregarAvaliacoes` sem paginação — estouraria em ~1 ano de uso (429 × 4/ano) e o histórico sumiria sem erro | paginado |

Itens 1 a 4 reduzem exposição de dado pessoal e sensível. 5 fecha um vetor de
golpe contra os pais. 6 e 7 são correção de integridade.

### Também entregue em 24/10/2026

**Consentimento no portal (Art. 14, §1º)** — `components/consentimento-portal.tsx`
e `lib/aviso-privacidade.ts`. No primeiro acesso o responsável lê o aviso,
informa nome e vínculo (mãe/pai/responsável legal) e aceita. Grava data, quem
aceitou e **a versão do texto** nos irmãos de uma vez. O consentimento do dado
de saúde é caixa **separada e opcional** — Art. 11 pede específico, e o
Art. 14, §3º proíbe condicionar o serviço a dado além do necessário.

> ⚠️ O texto do aviso **ainda não passou por advogado** e tem campos
> `[[entre colchetes]]` (razão social, CNPJ, e-mail de contato) para preencher
> antes de ir ao ar. Mexeu no texto, **suba `VERSAO_AVISO`** — senão quem já
> aceitou não vê a versão nova e o registro deixa de provar o que a pessoa leu.

**Base do RLS** — `lib/supabase-admin.ts` e `app/api/login-responsavel/route.ts`.
A conferência da senha pode agora acontecer no servidor, com a `service_role`,
devolvendo só as colunas do portal. **A credencial não muda.**

Enquanto `SUPABASE_SERVICE_ROLE_KEY` estiver vazia a rota responde 503 e o login
cai no caminho antigo, com aviso no console — sobe pronto sem derrubar ninguém.
Configurada a key, a rota passa a atender; ligado o RLS, o caminho antigo morre
por construção, porque a chave pública deixa de ler `students`.

Isolamento conferido no build de produção: `SUPABASE_SERVICE_ROLE_KEY` não é
lida em nenhum chunk de cliente e `supabaseAdmin` não entra no bundle.

---

## 3. Pendente, por ordem de risco

### 🔴 3.1 A base continua legível pela chave pública — e **dá para fechar sem mexer nas senhas**

Este é o item nº 1 e o que mais importa juridicamente (Art. 46). Hoje qualquer
visitante copia a chave do bundle e baixa tudo.

**O mal-entendido que vale desfazer:** fechar isso **não exige** trocar a senha
dos pais nem o jeito de entrar. O que impede o RLS de funcionar hoje não é a
senha ser fraca — é a **comparação da senha acontecer no navegador**. Com RLS
ligado, o Postgres precisa saber *quem* está perguntando, e a chave publishable
é anônima para ele.

**Caminho que preserva a credencial exatamente como está:**

1. ✅ Rota de login do responsável no servidor.
2. ⬜ **Configurar `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET`** no
   `.env.local` e no Vercel (Production **e** Preview). Até então todas as
   rotas respondem 503 e o app segue pelo caminho de reserva, avisando no
   console. **Este é o único passo que falta do lado humano.**
3. ✅ **Todas** as telas migradas. Nenhum componente toca `students` nem
   `app_users` — conferido com busca no projeto inteiro.
4. ⬜ `sql/2026-10-24-rls.sql` — liga o RLS. **Só depois da lista de
   verificação que está no topo daquele arquivo.**
5. ✅ `app_users` migrada junto (login, convite e CRUD).

A troca de senha para hash pode vir **depois**, e fica mais fácil: com o login
já no servidor, virar hash é mudar uma linha de comparação.

### A trava que precisou ser resolvida antes: sessão verificável

A sessão vivia (e, para a interface, ainda vive) em
`localStorage['olimpo_session']` — um JSON que o próprio navegador escreve.
Serve para a tela decidir que abas mostrar, mas **não vale nada como
autorização**: qualquer pessoa edita aquele JSON e se declara admin.

Uma rota que devolvesse a ficha dos alunos "para o admin" confiando nisso
ficaria tão aberta quanto a chave publishable. Era trocar seis por meia dúzia.

Então entrou `lib/sessao-servidor.ts`: cookie **HttpOnly assinado** com
HMAC-SHA256 (`SESSION_SECRET`), emitido **depois** de a senha conferir no
servidor. O navegador não lê por JavaScript nem forja; qualquer alteração
invalida a assinatura. A comparação da assinatura é em tempo constante, senão o
tempo de resposta a revelaria byte a byte.

**A credencial não mudou:** equipe digita o mesmo usuário e senha, responsável
o mesmo telefone e os mesmos 4 dígitos.

### Matriz de permissão (fonte única: as próprias rotas)

| Operação | admin | professor | responsável |
|---|---|---|---|
| Ficha completa (endereço, saúde) | ✅ | ❌ | ❌ |
| Lista para avaliação (id, nome, touca) | ✅ | ✅ | ❌ |
| Criar / apagar aluno | ✅ | ❌ | ❌ |
| Editar ficha | ✅ | **só `level`** | ❌ |
| Consentimento | ❌ | ❌ | **só nos próprios filhos** |
| Equipe: cadastro de professor | ✅ | ❌ | ❌ |
| Equipe: convidar, cortar, reativar | **só master** | ❌ | ❌ |

O escopo do responsável sai do **telefone do cookie**, não do corpo da
requisição — senão bastaria mandar o id de outra família.

Dois endurecimentos que apareceram no caminho:

- O **código de convite** passou a ser gerado no servidor. Antes o navegador o
  sorteava e o mandava no insert: quem chamasse a API escolheria o próprio
  código (`AAAA-AAAA`) e o resgataria em seguida.
- O passo 2 do convite reenvia o **código**, não um id. Com id vindo do
  cliente, daria para pedir "crie acesso para o id do admin" sem ter convite.
- `liberado_por` passou a vir da sessão, não da tela: dava para registrar a
  liberação no nome de outra pessoa.
- O botão **Sair** agora chama `/api/logout`. O cookie é HttpOnly e o
  JavaScript não o apaga — sem isso, "sair" no aparelho da recepção deixava a
  sessão viva por 30 dias.

### 🟠 3.2 Gerar par VAPID novo

A chave privada esteve em repositório público. Mover para o ambiente **não
revoga** a antiga.

```bash
npx web-push generate-vapid-keys
```

Preencher `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no `.env.local` e
no Vercel. Efeito colateral esperado: os 10 aparelhos já inscritos param de
receber e precisam tocar em "Ativar avisos" de novo.

### 🟠 3.3 Aviso de privacidade — falta a revisão jurídica

A tela e o registro estão **prontos** (ver seção 2). O que falta:

1. ⬜ Rodar `sql/2026-10-24-lgpd.sql`, senão a tela de aceite quebra: as
   colunas `consentimento_*` não existem ainda.
2. ⬜ Preencher `CONTROLADOR` em `lib/aviso-privacidade.ts` — razão social,
   CNPJ e e-mail de contato.
3. ⬜ **Revisão do texto por advogado**, e subir `VERSAO_AVISO` se ele mudar.
4. ⬜ Decidir se os 429 já matriculados precisam recoletar consentimento ou se
   cabe outra base legal para o histórico (ver pergunta 5 da seção 5).

### ✅ 3.4 Registro de operações (Art. 37) — ligado

`sql/2026-10-24-lgpd.sql` (**rodado**) criou `audit_log`, **append-only** para a
chave pública: insere, não lê, não altera, não apaga. `lib/auditoria.ts` grava
**no servidor, a partir da sessão assinada** — num log de auditoria o campo que
importa é o "quem", e se ele vier do navegador é autodeclarado, logo não serve
como prova.

Eventos registrados: `login` (equipe e responsável), `ver_ficha_completa`,
`criar_aluno`, `editar_ficha`, `cancelar_matricula`, `promover_touca`,
`apagar_aluno`, `consentimento`, `convidar`, `definir_login`,
`revogar_acesso`, `reativar_acesso`, `apagar_conta`.

Duas escolhas deliberadas:

- **Nunca grava o conteúdo dos campos**, só os nomes. Guardar o valor antigo
  transformaria o log numa segunda cópia do endereço e da anotação de saúde —
  mais superfície de vazamento, não menos.
- **Auditar nunca derruba a operação.** Falha de gravação só vai para o console.
  Um log que impede o trabalho é desligado na primeira semana, e aí não há log.

`ver_ficha_completa` registra só o escopo com endereço e saúde. Auditar a lista
do professor geraria uma linha por abertura de tela, com colunas não sensíveis:
ruído que esconderia o que importa.

⬜ **Falta rodar `sql/2026-10-24-lgpd-parte2.sql`** (um `ALTER`): a coluna
`quantidade`, que é a "extensão" do Art. 48 — distingue ler uma ficha de baixar
as 429. Sem ela a auditoria falha em silêncio, sem atrapalhar ninguém.

⚠️ Não há auditoria durante o período de fallback: sem as variáveis de
ambiente, as rotas respondem 503 e nada passa por `lib/auditoria.ts`.

### 🟡 3.5 Retenção (Art. 15/16)

Matrícula cancelada guarda endereço e dado de saúde indefinidamente. A view
`students_retencao_vencida` lista o que passou de 2 anos; o prazo é decisão a
tomar com o advogado (obrigação legal de guarda x minimização). O comando de
anonimização está no SQL, comentado de propósito.

### 🟡 3.6 Transferência internacional (Art. 33)

Supabase e Vercel são empresas dos EUA. **Não dá para saber pelo código em que
região está o projeto Supabase — verificar no painel.** Transferência
internacional precisa de base legal própria; a Resolução CD/ANPD nº 19/2024
aprovou cláusulas-padrão que atendem o caso.

### 🟡 3.7 Canal do titular (Art. 18) e encarregado (Art. 41)

Não há canal para pedir acesso, correção ou exclusão. Pela Resolução CD/ANPD
nº 2/2022, agente de pequeno porte não precisa **indicar** encarregado, mas
precisa **manter canal de comunicação** com o titular. Hoje não existe.

### 🟡 3.8 Fotos em base64 no Postgres

`cleaning_tasks.photo_url` e `maintenance_tasks.photo_url` guardam a imagem
inteira na linha, legível com a chave pública. Migrar para Supabase Storage com
bucket privado.

---

## 4. O que já está certo (e vale preservar)

- **A regra do telefone é real, não só intenção.** Nenhuma tela de professor lê
  `phone`, `endereco` ou `observacoes`, e o `/api/push` recebe só o `student_id`,
  resolvendo o telefone no servidor. Depois da correção nº 2 o dado também não
  **desce** mais para o navegador do professor. Isso é minimização bem feita.
- Senha nunca trafega em query string nem aparece em log de servidor.
- O Service Worker não cacheia `/api/` — ficha de aluno não fica guardada no
  aparelho pelo cache.

---

## 5. Perguntas para o advogado

1. Dá para **sair do Art. 11** reformulando a coleta? Muitas escolas trocam o
   campo livre de saúde por um atestado em papel no arquivo físico, ou por um
   sinalizador sem diagnóstico ("tem restrição — consultar secretaria"). Se o
   app parar de guardar o detalhe clínico, o regime inteiro afrouxa.
2. O clube se enquadra como **agente de tratamento de pequeno porte**
   (Resolução CD/ANPD nº 2/2022)?
3. Qual o **prazo de retenção** defensável para aluno que saiu, considerando
   obrigação fiscal e contratual x minimização?
4. Como fica a **divisão de responsabilidade** entre o clube (controlador) e
   quem desenvolve e opera o sistema? Os Arts. 42, §1º e 44 alcançam o operador.
   Existe contrato? O que ele diz?
5. O consentimento precisa ser **recoletado** dos 429 já matriculados, ou cabe
   outra base legal para o histórico (execução de contrato, Art. 7º, V) com
   consentimento específico só para o dado de saúde?
