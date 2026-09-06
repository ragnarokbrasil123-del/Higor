'use client';

import React from 'react';
import { Badge } from '@/components/ui';

/**
 * Selo de situação do aluno no trimestre corrente.
 *
 * Antes era um componente declarado dentro do render do SwimmingModule,
 * o que fazia o React remontá-lo a cada renderização. Como é puro e sem
 * efeitos, a saída é exatamente a mesma — só parou de remontar à toa.
 */
export function SeloAvaliacao({ avaliado, ultima }: { avaliado: boolean; ultima?: { date: string } }) {
  return avaliado ? (
    <Badge tone="success">
      ✓ {new Date(ultima!.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
    </Badge>
  ) : (
    <Badge tone="warning">pendente</Badge>
  );
}
