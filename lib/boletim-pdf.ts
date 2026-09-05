import { jsPDF } from 'jspdf';
import { CapLevel, levels } from '@/types';
import { EVALUATION_CRITERIA } from '@/lib/evaluation-criteria';

interface AvaliacaoPDF {
  date: string;
  level: string;
  scores?: Record<string, string> | null;
  notes?: string | null;
  approved?: boolean | null;
}

/** Gera e baixa o boletim trimestral em PDF. Usado pela Avaliação e pelo Portal dos Pais. */
export function gerarBoletimPDF(evaluation: AvaliacaoPDF, alunoNome: string) {
  const doc = new jsPDF();
  const isApproved = !!evaluation.approved;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('CLUBE OLIMPO', 105, 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Boletim de Avaliação Trimestral - Natação', 105, 30, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Aluno: ${alunoNome}`, 20, 55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nível Avaliado: Touca ${levels[evaluation.level as CapLevel]?.name || 'Avaliada'}`, 20, 65);
  doc.text(`Data: ${new Date(evaluation.date).toLocaleDateString('pt-BR')}`, 20, 72);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Critérios Avaliados:', 20, 90);

  let y = 100;
  (EVALUATION_CRITERIA[evaluation.level as CapLevel] || []).forEach(crit => {
    const status = evaluation.scores?.[crit.id] || 'pending';
    const splitText = doc.splitTextToSize(crit.label, 130);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.rect(20, y - 5, 170, splitText.length * 6 + 6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(splitText, 25, y);
    doc.setFont('helvetica', 'bold');
    if (status === 'passed') { doc.setTextColor(22, 163, 74); doc.text('APROVADO', 160, y); }
    else if (status === 'failed') { doc.setTextColor(220, 38, 38); doc.text('PRATICAR', 160, y); }
    else { doc.setTextColor(148, 163, 184); doc.text('PENDENTE', 160, y); }
    y += splitText.length * 6 + 10;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  if (evaluation.notes) {
    y += 5;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Observações do Professor:', 20, y);
    y += 8;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(evaluation.notes, 170);
    doc.text(splitNotes, 20, y);
    y += splitNotes.length * 6;
  }

  y = Math.max(y + 15, 250);
  if (y > 270) { doc.addPage(); y = 20; }
  doc.setDrawColor(isApproved ? 34 : 220, isApproved ? 197 : 38, isApproved ? 94 : 38);
  doc.setFillColor(isApproved ? 240 : 254, isApproved ? 253 : 226, isApproved ? 244 : 226);
  doc.rect(20, y, 170, 25, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  if (isApproved) { doc.setTextColor(21, 128, 61); doc.text('PARABÉNS! ALUNO APROVADO!', 105, y + 16, { align: 'center' }); }
  else { doc.setTextColor(185, 28, 28); doc.text('CONTINUAR PRATICANDO NO PRÓXIMO TRIMESTRE', 105, y + 16, { align: 'center' }); }

  doc.save(`Boletim_${alunoNome.replace(/\s+/g, '_')}_${new Date(evaluation.date).getFullYear()}.pdf`);
}
