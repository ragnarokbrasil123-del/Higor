import { jsPDF } from 'jspdf';
import { carregarLogoBase64 } from '@/lib/pdf-logo';

export interface LinhaRelatorio {
  nome: string;
  touca: string;
  aulas: string;
  responsavel: string;
  situacao: 'Aprovado' | 'Em treinamento' | 'Pendente';
}

/** Cor e texto (mais curto, pra caber na coluna) de cada situação. */
const SITUACAO_PDF: Record<LinhaRelatorio['situacao'], { texto: string; cor: [number, number, number] }> = {
  Aprovado: { texto: 'Aprovado', cor: [22, 163, 74] },
  'Em treinamento': { texto: 'Treinando', cor: [217, 119, 6] },
  Pendente: { texto: 'Pendente', cor: [100, 116, 139] },
};

const truncar = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + '…' : s);

/**
 * Gera e baixa um relatório de alunos em PDF, com os filtros escolhidos
 * descritos no topo — usado pelo botão "Gerar relatório" do Painel.
 */
export async function gerarRelatorioAlunosPDF(linhas: LinhaRelatorio[], resumoFiltros: string) {
  const doc = new jsPDF();
  const COLS = [
    { titulo: 'Aluno', x: 12, max: 32 },
    { titulo: 'Touca', x: 68, max: 10 },
    { titulo: 'Turma(s)', x: 90, max: 26 },
    { titulo: 'Responsável', x: 140, max: 24 },
    { titulo: 'Avaliação', x: 180, max: 10 },
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
    y += 8;
  });

  doc.save(`Relatorio_Alunos_${new Date().toISOString().slice(0, 10)}.pdf`);
}
