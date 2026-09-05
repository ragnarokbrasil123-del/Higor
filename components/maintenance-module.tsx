'use client';

import React from 'react';
import { Wrench } from 'lucide-react';
import { TaskBoard } from '@/components/task-board';

/** Checklist técnico da casa de máquinas. Toda a lógica vive em TaskBoard. */
export function MaintenanceModule() {
  return (
    <TaskBoard
      tabela="maintenance_tasks"
      canal="maintenance_sync"
      icone={Wrench}
      titulo="Manutenção"
      descricao="Checklist técnico da casa de máquinas, com foto de comprovação."
      // manutenção avisa a equipe assim que um chamado é aberto
      avisarAoCriar
      textoPushFoto={(tarefa) => `Evidência fotográfica: ${tarefa}`}
    />
  );
}
