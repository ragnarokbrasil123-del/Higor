import classNames, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type { ClassValue };

/**
 * Junta classes do Tailwind resolvendo conflitos (a última vence).
 * Fonte única — antes esta função estava copiada em 9 componentes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(classNames(inputs));
}
