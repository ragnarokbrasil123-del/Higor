'use client';

import React from 'react';
import { ClipboardList } from 'lucide-react';
import { TaskBoard } from '@/components/task-board';

/** Checklist diário de limpeza. Toda a lógica vive em TaskBoard. */
export function ChecklistModule() {
  return (
    <TaskBoard
      tabela="cleaning_tasks"
      canal="cleaning_sync"
      icone={ClipboardList}
      titulo="Checklist de limpeza"
      descricao="Controle diário da infraestrutura, com foto de comprovação."
      rotuloPadrao="Gerar checklist padrão"
      tarefasPadrao={[
        'Limpar bordas da piscina',
        'Aspirar fundo da piscina',
        'Verificar nível de cloro',
        'Limpar vestiários',
        'Esvaziar lixeiras',
      ]}
      textoPushFoto={(tarefa) => `Foto adicionada na limpeza: ${tarefa}`}
    />
  );
}
