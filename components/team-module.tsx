'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function TeamModule() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: true });
    if (data) setUsers(data);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);

    const { data, error } = await supabase.from('app_users').insert([{
      username: username.toLowerCase().trim(),
      password: password,
      role: 'teacher' // Sempre cria como professor por padrão
    }]).select();

    setLoading(false);
    if (error) {
      alert("Erro ao criar usuário: " + error.message);
    } else if (data && data[0]) {
      setUsers([...users, data[0]]);
      setUsername('');
      setPassword('');
      alert("Professor criado com sucesso!");
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    if (role === 'admin') return alert("Você não pode excluir um Admin!");
    if (!confirm("Excluir este acesso permanentemente?")) return;
    
    await supabase.from('app_users').delete().eq('id', id);
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 md:bg-transparent">
      <header className="h-14 md:h-16 flex items-center px-4 md:px-8 bg-white/50 border-b border-slate-200 backdrop-blur-sm shrink-0">
        <h1 className="text-base md:text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" /> Acessos da Equipe</h1>
      </header>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-slate-400" /> Criar Login para Professor</h2>
            <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4">
              <input type="text" placeholder="Nome de usuário (Ex: carlos)" required value={username} onChange={e => setUsername(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <input type="password" placeholder="Senha do professor" required value={password} onChange={e => setPassword(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <button type="submit" disabled={loading} className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl md:w-auto w-full shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Criar
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-700 text-sm">Usuários Cadastrados</h3></div>
            <div className="p-2 space-y-1">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">{user.username}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-1">{user.role === 'admin' ? 'Dono (Admin)' : 'Professor'}</p>
                  </div>
                  {user.role !== 'admin' && (
                    <button onClick={() => handleDeleteUser(user.id, user.role)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
