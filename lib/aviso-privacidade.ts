/* ============================================================
   Aviso de privacidade — texto e versão juntos.

   A VERSÃO fica no mesmo arquivo do TEXTO de propósito. O que se
   grava em `students.consentimento_versao` é esta string; se o texto
   mudar e a versão não, o registro deixa de provar o que a pessoa
   leu — e provar isso é obrigação de quem trata (LGPD Art. 14, §1º).

   REGRA: mexeu no texto, subiu a versão. Quem já aceitou a versão
   anterior volta a ver a tela de aceite.

   ⚠️ TEXTO AINDA NÃO REVISADO POR ADVOGADO. Os campos entre
   [[colchetes]] têm de ser preenchidos pelo clube antes de ir ao ar.
   ============================================================ */

/** Sobe a cada alteração do texto abaixo. */
export const VERSAO_AVISO = '2026-10-v1';

/** Quem é o controlador. Preencher antes de publicar. */
export const CONTROLADOR = {
  nome: '[[RAZÃO SOCIAL DO CLUBE]]',
  cnpj: '[[CNPJ]]',
  contato: '[[E-MAIL PARA ASSUNTOS DE DADOS]]',
};

/**
 * O aviso está pronto para ser mostrado a um pai?
 *
 * Enquanto `CONTROLADOR` tiver os marcadores `[[...]]`, a tela de
 * consentimento NÃO aparece. Dois motivos:
 *
 *  - um aviso que diz "Responsável pelos dados: [[RAZÃO SOCIAL DO
 *    CLUBE]]" é pior que nenhum: o consentimento não identifica o
 *    controlador, que é justamente o que ele deveria provar;
 *  - e, principalmente, isso desacopla as duas pendências. A correção
 *    de SEGURANÇA (rotas de servidor + RLS) pode ir para produção hoje
 *    sem esperar o dono passar CNPJ e razão social. Preencheu os
 *    dados, a tela liga sozinha no deploy seguinte.
 */
export function avisoPronto() {
  return !Object.values(CONTROLADOR).some(v => v.includes('[['));
}

export interface BlocoAviso {
  titulo: string;
  itens: string[];
}

/**
 * O aviso em blocos, e não num texto corrido só, porque é lido no
 * celular: um parágrafo longo numa tela de 5 polegadas não é
 * "linguagem acessível" (Art. 14, §6º), é um muro.
 */
export const AVISO: BlocoAviso[] = [
  {
    titulo: 'O que guardamos sobre seu filho',
    itens: [
      'Nome e idade.',
      'A touca atual e o histórico de avaliações na natação.',
      'O dia e o horário da aula.',
      'Seu nome e seu telefone, para falarmos com você.',
      'O endereço, quando você informa na matrícula.',
    ],
  },
  {
    titulo: 'Para que usamos',
    itens: [
      'Organizar as turmas e os horários.',
      'Registrar a evolução e avaliar a troca de touca.',
      'Mostrar o resultado para você neste portal.',
      'Avisar você quando sai uma avaliação nova.',
    ],
  },
  {
    titulo: 'Quem vê o quê',
    itens: [
      'O professor vê o nome, a touca e a avaliação. Ele NÃO tem acesso ao seu telefone nem ao seu endereço.',
      'A administração do clube vê a ficha completa.',
      'Você vê a ficha dos seus filhos neste portal.',
      'Não vendemos nem compartilhamos esses dados com ninguém para publicidade.',
    ],
  },
  {
    titulo: 'Seus direitos',
    itens: [
      'Pedir uma cópia de tudo o que guardamos.',
      'Corrigir qualquer informação errada.',
      'Pedir a exclusão, quando não tivermos obrigação legal de guardar.',
      'Retirar este consentimento depois, a qualquer momento.',
    ],
  },
];

/**
 * Bloco separado porque é CONSENTIMENTO ESPECÍFICO.
 *
 * Alergia e restrição alimentar são dado de saúde, que a LGPD trata no
 * Art. 11 — regime mais estrito que o resto da ficha. Por isso tem
 * caixa própria, e por isso ela é OPCIONAL: o Art. 14, §3º proíbe
 * condicionar o uso do serviço a entregar dado além do necessário, e
 * o portal funciona sem este.
 */
export const AVISO_SAUDE = {
  titulo: 'Alergias e restrições (opcional)',
  texto:
    'Se você nos contar alergias, restrições alimentares ou cuidados de saúde, ' +
    'guardamos essa anotação na ficha para a equipe saber como agir numa ' +
    'emergência. Isso é opcional: sem marcar, o portal funciona igual e a ' +
    'anotação não é usada.',
};

/** Vínculo de quem assina — o Art. 14, §1º pede pai, mãe ou responsável legal. */
export const VINCULOS = ['Mãe', 'Pai', 'Responsável legal'] as const;
export type Vinculo = (typeof VINCULOS)[number];
