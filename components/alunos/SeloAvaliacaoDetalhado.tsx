'use client';

import React from 'react';
import { Badge } from '@/components/ui';

/**
 * Selo de avaliação com o resultado do trimestre — não só "avaliado/pendente"
 * (como o SeloAvaliacao da Avaliação de Natação), mas separando quem passou
 * de quem ainda está em treinamento, pra dar pra ver isso direto na lista,
 * sem precisar abrir a ficha ou baixar um PDF.
 */
export function SeloAvaliacaoDetalhado({ ultima }: { ultima?: { date: string; approved: boolean } }) {
  if (!ultima) return <Badge tone="neutral">pendente</Badge>;
  const data = new Date(ultima.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return ultima.approved
    ? <Badge tone="success">✓ Aprovado {data}</Badge>
    : <Badge tone="warning">Treinando {data}</Badge>;
}
