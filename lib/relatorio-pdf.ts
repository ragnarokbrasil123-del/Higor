import { carregarLogoBase64 } from '@/lib/pdf-logo';

/* `jspdf` carregado sob demanda — ver a nota em lib/boletim-pdf.ts. */

export interface LinhaRelatorio {
  nome: string;
  touca: string;
  aulas: string;
  responsavel: string;
  situacao: 'Aprovado' | 'Em treinamento' | 'Pendente';
  /** Quem lançou a avaliação. Vazio em quem está pendente. */
  avaliador?: string | null;
}

/** Cor e texto (mais curto, pra caber na coluna) de cada situação. */
const SITUACAO_PDF: Record<LinhaRelatorio['situacao'], { texto: string; cor: [number, number, number] }> = {
  Aprovado: { texto: 'Aprovado', cor: [22, 163, 74] },
  'Em treinamento': { texto: 'Treinando', cor: [217, 119, 6] },
  Pendente: { texto: 'Pendente', cor: [100, 116, 139] },
};

const truncar = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + '…' : s);

/**
 * Encurta o nome de quem avaliou para caber na coluna.
 *
 * Os nomes da equipe são completos ("LETÍCIA TOLEDO DO ESPIRITO SANTOS")
 * e cortados viram "LETÍCIA TOLEDO DO ESP…", que não ajuda ninguém.
 * Primeiro nome + inicial do segundo identifica sem ambiguidade — os
 * dez professores têm primeiros nomes distintos, e a inicial cobre o
 * dia em que isso deixar de ser verdade.
 */
function nomeCurto(nome?: string | null): string {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '—';
  const primeiro = partes[0];
  const titulo = (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  return partes.length === 1 ? titulo(primeiro) : `${titulo(primeiro)} ${partes[1].charAt(0).toUpperCase()}.`;
}

/**
 * Gera e baixa um relatório de alunos em PDF, com os filtros escolhidos
 * descritos no topo — usado pelo botão "Gerar relatório" do Painel.
 */
export async function gerarRelatorioAlunosPDF(linhas: LinhaRelatorio[], resumoFiltros: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  /*
   * Seis colunas em 186mm úteis (x de 12 a 198). As larguras foram
   * reapertadas para caber "Avaliado por" sem estourar a folha —
   * `max` é em caracteres, e a fonte 8 do corpo rende ~1,7mm por letra.
   */
  const COLS = [
    { titulo: 'Aluno', x: 12, max: 26 },
    { titulo: 'Touca', x: 57, max: 9 },
    { titulo: 'Turma(s)', x: 74, max: 20 },
    { titulo: 'Responsável', x: 109, max: 17 },
    { titulo: 'Avaliação', x: 141, max: 10 },
    { titulo: 'Avaliado por', x: 162, max: 20 },
  ];

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 32, 'F');

  const logo = await carregarLogoBase64();
  if (logo) doc.addImage(logo, 'PNG', 12, 6, 18, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CLUBE OLIMPO', 105, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Relatório de Alunos', 105, 25, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(resumoFiltros || 'Sem filtro aplicado — todos os alunos', 105, 40, { align: 'center', maxWidth: 180 });
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${linhas.length} aluno(s)`, 105, 46, { align: 'center' });

  let y = 58;

  const cabecalho = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(10, y - 5.5, 190, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    COLS.forEach(c => doc.text(c.titulo, c.x, y));
    y += 8;
  };

  cabecalho();

  if (linhas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum aluno encontrado com esses filtros.', 105, y + 5, { align: 'center' });
  }

  linhas.forEach((linha, i) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
      cabecalho();
    }
    if (i % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 5.5, 190, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(truncar(linha.nome, COLS[0].max), COLS[0].x, y);
    doc.text(linha.touca, COLS[1].x, y);
    doc.text(truncar(linha.aulas, COLS[2].max), COLS[2].x, y);
    doc.text(truncar(linha.responsavel, COLS[3].max), COLS[3].x, y);
    const { texto, cor } = SITUACAO_PDF[linha.situacao];
    doc.setTextColor(...cor);
    doc.setFont('helvetica', 'bold');
    doc.text(texto, COLS[4].x, y);

    // quem avaliou, em cinza: é informação de apoio, não compete com o resultado
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(truncar(nomeCurto(linha.avaliador), COLS[5].max), COLS[5].x, y);

    y += 8;
  });

  doc.save(`Relatorio_Alunos_${new Date().toISOString().slice(0, 10)}.pdf`);
}
