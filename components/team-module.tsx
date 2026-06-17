'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Plus, Trash2, Key, User, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { default as classNames } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(classNames(inputs));
}

interface AppUser {
  id: string;
  username: string;
  role: string;
  password?: string;
}

export function TeamModule() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    // Buscamos a senha também para o Admin poder editar/ver
    const { data } = await supabase.from('app_users').select('id, username, role, password').order('role', { ascending: true });
    if (data) setUsers(data);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanUsername = newUsername.toLowerCase().trim();
    if (!cleanUsername || !newPassword) return;

    setLoading(true);
    const { data, error: dbError } = await supabase.from('app_users').insert([
      { username: cleanUsername, password: newPassword, role: 'teacher' }
    ]).select();

    setLoading(false);

    if (dbError) {
      if (dbError.message.includes('duplicate')) {
        setError('Esse nome de usuário já existe. Escolha outro.');
      } else {
        setError('Erro ao criar usuário: ' + dbError.message);
      }
      return;
    }

    if (data && data[0]) {
      setUsers([...users, data[0]]);
      setNewUsername('');
      setNewPassword('');
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (user.role === 'admin') {
      alert("Não é possível excluir o usuário administrador principal!");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir o acesso de ${user.username}?`)) return;

    await supabase.from('app_users').delete().eq('id', user.id);
    setUsers(users.filter(u => u.id !== user.id));
  };

  const startEditing = (user: AppUser) => {
    if (user.role === 'admin') {
      alert("Para alterar a senha do Admin, acesse o painel do Supabase por segurança.");
      return;
    }
    setEditingId(user.id);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditUsername('');
    setEditPassword('');
  };

  const saveEditing = async (id: string) => {
    const cleanUsername = editUsername.toLowerCase().trim();
    if (!cleanUsername || !editPassword) return;

    const { error: dbError } = await supabase.from('app_users')
      .update({ username: cleanUsername, password: editPassword })
      .eq('id', id);

    if (dbError) {
      if (dbError.message.includes('duplicate')) {
        alert('Esse nome de usuário já está sendo usado por outra pessoa.');
      } else {
        alert('Erro ao atualizar: ' + dbError.message);
      }
      return;
    }

    setUsers(users.map(u => u.id === id ? { ...u, username: cleanUsername, password: editPassword } : u));
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8 w-full space-y-6">
        
        <header className="mb-8">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-amber-500" /> Acessos da Equipe
          </h1>
          <p className="text-sm text-slate-500 mt-1">Crie e gerencie os logins dos professores do seu clube.</p>
        </header>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-slate-400" /> Criar Login para Professor
          </h2>
          
          <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="w-full md:flex-1">
              <input type="text" placeholder="Nome de usuário (Ex: prof.carlos)" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" />
            </div>
            <div className="w-full md:flex-1">
              <input type="text" placeholder="Senha de acesso" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-3 bg-amber-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform shrink-0 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Criar Acesso
            </button>
          </form>
          {error && <p className="text-red-500 text-xs font-bold mt-3 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Usuários Cadastrados
            </h2>
          </div>
          
          <div className="divide-y divide-slate-100">
            {users.map(user => (
              <div key={user.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                
                {/* MODO DE EDIÇÃO */}
                {editingId === user.id ? (
                  <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                    <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full md:flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500/20" placeholder="Usuário" />
                    <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full md:flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500/20" placeholder="Nova Senha" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg", user.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{user.username}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role === 'admin' ? 'Dono (Admin)' : 'Professor'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end">
                  {editingId === user.id ? (
                    <>
                      <button onClick={() => saveEditing(user.id)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={cancelEditing} className="p-2 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    user.role !== 'admin' && (
                      <>
                        <button onClick={() => startEditing(user)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteUser(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">Carregando equipe...</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
