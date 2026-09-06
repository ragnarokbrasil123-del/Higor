/* ============================================================
   Sugestão automática de observação, a partir do resultado da ficha.

   Tudo local, sem API: monta a frase a partir do nome, da touca, de
   quantos critérios passou e de quais faltaram, com 3 variações por
   faixa de desempenho.
   ============================================================ */

/** "1. Nado Crawl: Eficiência na respiração." -> "nado Crawl" */
function resumoCriterio(label: string) {
  let s = label.replace(/^\s*\d+\.\s*/, '').trim();
  const i = s.indexOf(':');
  if (i > 0 && i < 40) s = s.slice(0, i);
  s = s.replace(/\.$/, '').trim();
  if (s.length > 55) s = s.slice(0, 52).trimEnd() + '...';
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function listar(itens: string[]) {
  if (itens.length === 0) return '';
  if (itens.length === 1) return itens[0];
  return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
}

export function gerarObservacao(
  nomeCompleto: string,
  touca: string,
  passou: number,
  total: number,
  aTreinar: string[],
  variacao: number
) {
  const nome = nomeCompleto.split(' ')[0];
  const curtos = [...new Set(aTreinar.map(resumoCriterio))].slice(0, 3);
  const foco = listar(curtos) || 'os fundamentos ainda em desenvolvimento';
  const pct = total ? passou / total : 0;

  let opcoes: string[];
  if (total > 0 && passou === total) {
    opcoes = [
      `Parabéns, ${nome}! Concluiu todos os ${total} fundamentos da touca ${touca} com segurança e já pode avançar para a próxima touca. Excelente trimestre!`,
      `${nome} completou os ${total} fundamentos da touca ${touca} neste trimestre. Evolução muito consistente nas aulas — parabéns pela dedicação!`,
      `Que trimestre, ${nome}! Todos os fundamentos da touca ${touca} foram alcançados. Seguimos juntos para o próximo desafio!`,
    ];
  } else if (pct >= 0.7) {
    opcoes = [
      `${nome} evoluiu bastante neste trimestre: ${passou} de ${total} fundamentos concluídos. Falta pouco! Vamos reforçar ${foco} nas próximas aulas.`,
      `Ótimo progresso, ${nome}! Já domina ${passou} dos ${total} fundamentos da touca ${touca}. Com mais um pouco de prática em ${foco}, a troca de touca vem.`,
      `${nome} está muito perto: ${passou} de ${total} fundamentos da touca ${touca} já firmes. O foco das próximas aulas é ${foco}.`,
    ];
  } else if (pct >= 0.4) {
    opcoes = [
      `${nome} avançou bem neste trimestre, com ${passou} de ${total} fundamentos concluídos. Vamos seguir trabalhando ${foco} com calma e constância.`,
      `Bom desenvolvimento de ${nome}: ${passou} dos ${total} fundamentos da touca ${touca} já estão firmes. A prioridade agora é ${foco}.`,
      `${nome} está no caminho certo — ${passou} de ${total} fundamentos concluídos. Seguimos praticando ${foco} nas próximas aulas.`,
    ];
  } else {
    opcoes = [
      `${nome} está construindo a base da touca ${touca}, com ${passou} de ${total} fundamentos concluídos. Vamos focar em ${foco} — a presença constante nas aulas faz toda a diferença!`,
      `Neste trimestre ${nome} deu os primeiros passos na touca ${touca} (${passou} de ${total} fundamentos). Seguimos trabalhando ${foco} no ritmo certo, com segurança.`,
      `${nome} está em adaptação na touca ${touca}: ${passou} de ${total} fundamentos concluídos. O trabalho das próximas aulas será ${foco}.`,
    ];
  }
  return opcoes[variacao % opcoes.length];
}
