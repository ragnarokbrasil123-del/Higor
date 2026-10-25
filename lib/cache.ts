/* ============================================================
   Cache de leitura, em memória, compartilhado entre as abas.

   O problema que resolve: as abas são renderizadas condicionalmente
   em app/page.tsx (`{activeTab === 'x' && <Modulo/>}`), então sair
   de uma aba DESMONTA o componente e joga fora o que ele carregou.
   Voltar monta tudo de novo e refaz as consultas.

   Na prática, Painel -> Alunos -> Painel baixava as 1.407 vagas
   três vezes (e cada busca são duas idas ao servidor, porque o
   PostgREST corta em 1.000 linhas). Com este cache, são 21
   consultas a menos que viram 9.

   É memória do processo, não localStorage: nada de dado de aluno
   gravado no aparelho. Ao recarregar a página, começa limpo.
   ============================================================ */

/** Rede de segurança: mesmo sem ninguém invalidar, o dado se renova. */
const VALIDADE_MS = 5 * 60 * 1000;

const guardado = new Map<string, { dados: unknown; em: number }>();

/**
 * Buscas em andamento.
 *
 * Sem isto, duas abas montando ao mesmo tempo (ou um React Strict
 * Mode rodando o efeito duas vezes) disparariam a MESMA consulta em
 * paralelo. Aqui a segunda chamada recebe a promessa da primeira.
 */
const emVoo = new Map<string, Promise<unknown>>();

/**
 * Lê do cache ou busca, guardando o resultado.
 *
 * `forcar` ignora o que está guardado — é o caminho do botão
 * "atualizar" e de quem acabou de gravar algo.
 */
export async function comCache<T>(
  chave: string,
  buscar: () => Promise<T>,
  forcar = false
): Promise<T> {
  if (!forcar) {
    const atual = guardado.get(chave);
    if (atual && Date.now() - atual.em < VALIDADE_MS) return atual.dados as T;

    const pendente = emVoo.get(chave);
    if (pendente) return pendente as Promise<T>;
  }

  const promessa = buscar()
    .then(dados => {
      guardado.set(chave, { dados, em: Date.now() });
      return dados;
    })
    .finally(() => {
      emVoo.delete(chave);
    });

  emVoo.set(chave, promessa);
  return promessa;
}

/**
 * Descarta o que foi guardado para as chaves que começam com estes
 * prefixos. Use depois de gravar: quem salvou uma ficha não pode
 * continuar vendo a versão antiga em outra aba.
 *
 *   invalidar('students')            // toda leitura de aluno
 *   invalidar('class_slots','classes')
 */
export function invalidar(...prefixos: string[]) {
  for (const chave of [...guardado.keys()]) {
    if (prefixos.some(p => chave.startsWith(p))) guardado.delete(chave);
  }
  for (const chave of [...emVoo.keys()]) {
    if (prefixos.some(p => chave.startsWith(p))) emVoo.delete(chave);
  }
}

/**
 * Esvazia tudo. OBRIGATÓRIO ao entrar e ao sair.
 *
 * Não é higiene, é separação de acesso: no aparelho da recepção o
 * admin sai e o professor entra em seguida. Sem limpar, o professor
 * herdaria em memória os dados que o admin tinha carregado — e o
 * escopo dele é menor justamente para ele não ver isso.
 */
export function limparCache() {
  guardado.clear();
  emVoo.clear();
}
