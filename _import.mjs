import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://jefmyjeuxkajycjexgly.supabase.co',
  'sb_publishable_2yVknLEKpom35ZgE6BYY1A_liY-cr5b'
);

const SCRATCH = 'C:/Users/Higor/AppData/Local/Temp/claude/c--Users-Higor-Desktop-GitHUB-ClubeOlimpo-Higor-main/eb48ca2f-fb18-4cb6-b347-12206dbf7795/scratchpad';
const dados = JSON.parse(readFileSync(`${SCRATCH}/dados.json`, 'utf8'));

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const digits = s => (s || '').replace(/\D/g, '');
const senhaDe = t => digits(t).slice(-4) || '1234';
const chaveTurma = t => `${t.prof}|${t.dia}|${t.hora}`;

const todos = [...dados.alunos, ...dados.avulsos];
const toucaDoAluno = new Map(todos.map(a => [a.nome, a.touca]));

// ------------------------------------------------ 1. limpeza
console.log('1) Limpando grade antiga e dados de teste...');
for (const tab of ['class_slots', 'classes', 'evaluations', 'students']) {
  const { data } = await supabase.from(tab).select('id');
  if (data?.length) {
    for (const c of chunk(data.map(r => r.id), 200)) {
      const { error } = await supabase.from(tab).delete().in('id', c);
      if (error) { console.error(`   ERRO limpando ${tab}:`, error.message); process.exit(1); }
    }
    console.log(`   ${tab}: ${data.length} apagados`);
  }
}

// ------------------------------------------------ 2. alunos
console.log(`\n2) Inserindo ${todos.length} alunos...`);
let n = 0;
for (const c of chunk(todos, 100)) {
  const linhas = c.map(a => ({
    name: a.nome,
    level: a.touca,
    guardian_name: a.responsavel || null,
    phone: digits(a.telefone),
    password: senhaDe(a.telefone),
    modalidade: a.modalidade,
  }));
  const { error } = await supabase.from('students').insert(linhas);
  if (error) { console.error('   ERRO:', error.message); process.exit(1); }
  n += linhas.length;
  process.stdout.write(`   ${n}/${todos.length}\r`);
}
console.log(`   ${n} alunos inseridos.            `);

// mapa nome -> id (re-consulta, nao confia em ordem)
const idPorNome = new Map();
for (let from = 0; ; from += 1000) {
  const { data } = await supabase.from('students').select('id, name').range(from, from + 999);
  if (!data?.length) break;
  data.forEach(r => idPorNome.set(r.name, r.id));
  if (data.length < 1000) break;
}
console.log(`   mapa de alunos: ${idPorNome.size}`);

// ------------------------------------------------ 3. turmas
console.log(`\n3) Inserindo ${dados.turmas.length} turmas...`);
n = 0;
for (const c of chunk(dados.turmas, 100)) {
  const linhas = c.map(t => ({
    teacher_name: t.prof, day_of_week: t.dia, start_time: t.hora, end_time: t.fim,
  }));
  const { error } = await supabase.from('classes').insert(linhas);
  if (error) { console.error('   ERRO:', error.message); process.exit(1); }
  n += linhas.length;
  process.stdout.write(`   ${n}/${dados.turmas.length}\r`);
}
console.log(`   ${n} turmas inseridas.            `);

const idPorTurma = new Map();
for (let from = 0; ; from += 1000) {
  const { data } = await supabase.from('classes').select('id, teacher_name, day_of_week, start_time').range(from, from + 999);
  if (!data?.length) break;
  data.forEach(r => idPorTurma.set(`${r.teacher_name}|${r.day_of_week}|${String(r.start_time).slice(0, 5)}`, r.id));
  if (data.length < 1000) break;
}
console.log(`   mapa de turmas: ${idPorTurma.size}`);

// ------------------------------------------------ 4. vagas
console.log('\n4) Criando vagas e alocando alunos...');
const slots = [];
let semId = 0;
for (const t of dados.turmas) {
  const class_id = idPorTurma.get(chaveTurma(t));
  if (!class_id) { console.error('   turma sem id:', chaveTurma(t)); process.exit(1); }
  for (const nome of t.alunos) {
    const sid = idPorNome.get(nome);
    if (!sid) { semId++; continue; }
    slots.push({ class_id, cap_color: toucaDoAluno.get(nome) || 'orange', student_id: sid });
  }
  if (t.toucas.length === 1) {
    slots.push({ class_id, cap_color: t.toucas[0], student_id: null });
    slots.push({ class_id, cap_color: t.toucas[0], student_id: null });
  } else {
    for (const cor of t.toucas) slots.push({ class_id, cap_color: cor, student_id: null });
  }
}
if (semId) console.log(`   AVISO: ${semId} alocacoes sem id de aluno`);

n = 0;
for (const c of chunk(slots, 300)) {
  const { error } = await supabase.from('class_slots').insert(c);
  if (error) { console.error('   ERRO:', error.message); process.exit(1); }
  n += c.length;
  process.stdout.write(`   ${n}/${slots.length}\r`);
}
console.log(`   ${n} vagas criadas (${slots.filter(s => s.student_id).length} ocupadas).       `);

// ------------------------------------------------ 5. conferencia
console.log('\n5) Conferindo no banco:');
for (const tab of ['students', 'classes', 'class_slots']) {
  const { count } = await supabase.from(tab).select('*', { count: 'exact', head: true });
  console.log(`   ${tab.padEnd(12)} -> ${count}`);
}
const { count: ocup } = await supabase.from('class_slots').select('*', { count: 'exact', head: true }).not('student_id', 'is', null);
console.log(`   vagas ocupadas -> ${ocup}`);
for (const m of ['fixo', 'wellhub', 'avulso']) {
  const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('modalidade', m);
  console.log(`   alunos ${m.padEnd(8)} -> ${count}`);
}
console.log('\nPRONTO.');
