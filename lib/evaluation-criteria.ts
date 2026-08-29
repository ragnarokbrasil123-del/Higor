import { CapLevel } from '@/types';

export interface EvalCriterion {
  id: string;
  label: string;
}

// === MODELOS DE AVALIAÇÃO OFICIAIS POR TOUCA ===
// Fonte única usada pela Avaliação de Natação e pelo Portal dos Pais.
export const EVALUATION_CRITERIA: Record<CapLevel, EvalCriterion[]> = {
  yellow: [
    { id: 'y1', label: '1. Adaptação poli sensorial: A colocar o rosto na água, executa a respiração pela boca ou nariz ou os dois.' },
    { id: 'y2', label: '2. A criança deve ser capaz de flutuar com apoio de um adulto ou de um objeto flutuante.' },
    { id: 'y3', label: '3. Chutar com os pés enquanto está segurando na borda da piscina.' },
    { id: 'y4', label: '4. A criança deve ser capaz de realizar movimentos básicos de braços e pernas, como movimentos de remo e pedalada.' },
    { id: 'y5', label: '5. Flutuar sem apoio por 5 segundos.' },
    { id: 'y6', label: '6. Nadar 2 metros sem apoio.' },
    { id: 'y7', label: '7. Executar uma virada básica: como a transição de costas para bruços.' },
    { id: 'y8', label: '8. Flutuar de costas sem apoio.' },
    { id: 'y9', label: '9. Chutar com os pés sem apoio.' },
    { id: 'y10', label: '10. Explorar o meio aquático, resgatando objetos submersos com ou sem auxílio.' },
  ],
  orange: [
    { id: 'o1', label: '1. Flutuação: Capacidade de flutuar sem apoio por 10 segundos.' },
    { id: 'o2', label: '2. Movimentação: Coordenação de braços e pernas durante natação.' },
    { id: 'o3', label: '3. Respiração: Técnica de respiração correta durante a natação.' },
    { id: 'o4', label: '4. Deslocamento: Capacidade de se deslocar por 5 metros sem apoio.' },
    { id: 'o5', label: '5. Salta da borda e se desloca até a plataforma sem ajuda do professor.' },
    { id: 'o6', label: '6. Entrada: Capacidade de entrar na água de forma segura.' },
    { id: 'o7', label: '7. Natação com apoio: capacidade de nadar com apoio por 2 metros.' },
    { id: 'o8', label: '8. Virada: Capacidade de virar o corpo na água.' },
    { id: 'o9', label: '9. Mergulho: capacidade de mergulhar até o fundo da piscina.' },
    { id: 'o10', label: '10. Saída da água: Capacidade de sair da água de forma segura.' },
  ],
  red: [
    { id: 'r1', label: '1. Nado Crawl: Posição hidro dinâmica (deslizar na posição ventral).' },
    { id: 'r2', label: '2. Nado Crawl: Eficiência na movimentação de pernas.' },
    { id: 'r3', label: '3. Nado Crawl: Eficiência na movimentação de braços.' },
    { id: 'r4', label: '4. Nado Crawl: Eficiência na respiração unilateral.' },
    { id: 'r5', label: '5. Nado Crawl: Atravessar a piscina com coordenação e eficiência com movimentos globais.' },
    { id: 'r6', label: '6. Nado Crawl: Saltar da borda.' },
    { id: 'r7', label: '7. Nado Costas: Posição hidrodinâmica (deslizar na posição dorsal).' },
    { id: 'r8', label: '8. Nado Costas: Eficiência na movimentação de pernas.' },
    { id: 'r9', label: '9. Nado Costas: Eficiência na movimentação de braços.' },
    { id: 'r10', label: '10. Nado Costas: Coordenção do nado costas.' },
    { id: 'r11', label: '11. Iniciação Nado Peito: Eficiência no braço do nado peito.' },
  ],
  green: [
    { id: 'g1', label: '1. Crawl e Costas: com técnica aperfeiçoada.' },
    { id: 'g2', label: '2. Respiração: crawl 2x1 e 3x1 / Costas Inspira pela boca e expira pelo nariz.' },
    { id: 'g3', label: '3. Saídas: Crawl e Costas com técnica e mantém o nado até a borda da piscina.' },
    { id: 'g4', label: '4. Salto: Executa a saída da borda ou do bloco e pressegue com o nado até a borda final da piscina.' },
    { id: 'g5', label: '5. Nado peito: pernas e braços (tecnica rudimentar).' },
    { id: 'g6', label: '6. Nado peito: submerso 12,5 a 15 metros.' },
    { id: 'g7', label: '7. Nado peito: pernas e braços com Coordenação e propulsão (rudimentar).' },
    { id: 'g8', label: '8. Borboleta: Executa a perna do nado (rudimentar).' },
    { id: 'g9', label: '9. Crawl e Costas: 25 metros mantendo a técnica aperfeiçoada.' },
    { id: 'g10', label: '10. Peito: 12,5 metros, nado completo mantendo a técnica rudimentar.' },
  ],
  lightBlue: [
    { id: 'lb1', label: '1. Executa nado peito com saída Filipina.' },
    { id: 'lb2', label: '2. Executa braçada do nado borboleta com variações de pernas.' },
    { id: 'lb3', label: '3. Executa o nado borboleta rudimentar.' },
    { id: 'lb4', label: '4. 15 metros de ondulação dorsal.' },
    { id: 'lb5', label: '5. 15 metros nado peito com saída Filipina.' },
    { id: 'lb6', label: '6. 12,5 metros de borboleta rudimentar.' },
    { id: 'lb7', label: '7. Executa o medley rudimentar.' },
    { id: 'lb8', label: '8. Executa a virada olímpica rudmentar nado crawl.' },
    { id: 'lb9', label: '9. Sustentação com Palmateios na posição ventral.' },
    { id: 'lb10', label: '10. 15 metros de ondulação submersa frontal.' },
  ],
  darkBlue: [
    { id: 'db1', label: '1. Nado crawl e costas 100 metros, 50 metros nado peito.' },
    { id: 'db2', label: '2. Nado borboleta 25 metros.' },
    { id: 'db3', label: '3. Salta da plataforma na posição correta (sem exigencia de perfeição).' },
    { id: 'db4', label: '4. Saída e viradas dos 4 nados.' },
    { id: 'db5', label: '5. Respiração técnica dos 4 nados.' },
    { id: 'db6', label: '6. Os 4 nados executados com tecnicas aperfeiçoadas.' },
    { id: 'db7', label: '7. Executa o Medley (rudimentar).' },
    { id: 'db8', label: '8. Nadar 12,5 metros em apneia.' },
    { id: 'db9', label: '9. Preparado para nadar em piscina semi olímpica e olímpica.' },
    { id: 'db10', label: '10. Nadar 250 metros crawl em 7 minutos.' },
  ],
  black: [
    { id: 'bk1', label: '1. Melhora de Tempo (Crawl, Costas, Peito e Borboleta).' },
    { id: 'bk2', label: '2. Nado Medley: Executar o Nado Medley completo de forma correta (Mínimo de 100m).' },
    { id: 'bk3', label: '3. Sobrevivência Avançada com roupas.' },
    { id: 'bk4', label: '4. Resgate Básico.' },
    { id: 'bk5', label: '5. Nado submerso contínuo (Mínimo de 25m).' },
  ],
};
