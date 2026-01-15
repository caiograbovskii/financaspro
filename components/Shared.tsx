import React, { useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { HistoryEntry } from '../types';

// --- Card Genérico ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  readOnly?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, readOnly }) => (
  <div 
    onClick={!readOnly ? onClick : undefined}
    className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${onClick && !readOnly ? 'cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]' : ''} ${className || ''}`}
  >
    {children}
  </div>
);

// --- Componente de Identificação (Bolinha) ---
export const UserDot = ({ userId, userMap }: { userId?: string, userMap?: Record<string, string> }) => {
    if (!userId || !userMap || !userMap[userId]) return null;
    const email = userMap[userId];
    const isCaio = email === 'caio@casa.com';
    const isCarla = email === 'carla@casa.com';
    
    // Fallback de cor
    let colorClass = 'bg-slate-300';
    if (isCaio) colorClass = 'bg-orange-500 shadow-orange-500/50';
    if (isCarla) colorClass = 'bg-purple-600 shadow-purple-600/50';

    return (
        <div className={`w-3 h-3 rounded-full border border-white shadow-lg ${colorClass}`} title={`Criado por: ${email}`} />
    );
};

// --- Gerenciador de Histórico ---
interface HistoryManagerProps {
    history: HistoryEntry[];
    onChange: (newHistory: HistoryEntry[]) => void;
    readOnly?: boolean;
    currentUserId?: string;
    userMap?: Record<string, string>;
}

export const HistoryManager: React.FC<HistoryManagerProps> = ({ history, onChange, readOnly, currentUserId, userMap }) => {
    const [newItem, setNewItem] = useState<Partial<HistoryEntry>>({ date: new Date().toISOString().split('T')[0] });
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = () => {
        if (!newItem.amount || !newItem.date) return;
        const entry: HistoryEntry = {
            id: Date.now().toString(),
            date: newItem.date,
            amount: Number(newItem.amount),
            description: newItem.description || 'Aporte Manual',
            userId: currentUserId
        };
        onChange([...history, entry]);
        setNewItem({ date: new Date().toISOString().split('T')[0], amount: undefined, description: '' });
        setIsAdding(false);
    };

    const handleDelete = (id: string) => onChange(history.filter(h => h.id !== id));
    const sortedHistory = [...(history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700 flex items-center gap-2"><History size={16}/> Histórico</h4>
                {!readOnly && (
                    <button onClick={() => { setIsAdding(!isAdding); }} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        {isAdding ? 'Cancelar' : '+ Adicionar'}
                    </button>
                )}
            </div>

            {(isAdding && !readOnly) && (
                <div className="bg-slate-50 p-3 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-end border border-slate-200">
                    <div className="md:col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Data</label>
                        <input type="date" className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded text-xs" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Valor</label>
                        <input type="number" className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded text-xs" placeholder="R$ 0,00" value={newItem.amount || ''} onChange={e => setNewItem({...newItem, amount: Number(e.target.value)})} />
                    </div>
                    <div className="md:col-span-1">
                         <label className="text-[10px] uppercase font-bold text-slate-500">Descrição</label>
                         <input className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded text-xs" placeholder="Ex: Aporte" value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                    </div>
                    <button onClick={handleAdd} className="bg-indigo-600 text-white p-2 rounded text-xs font-bold h-[34px]">Adicionar</button>
                </div>
            )}

            <div className="max-h-40 overflow-y-auto custom-scroll space-y-2">
                {sortedHistory.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">Nenhum histórico.</p> : sortedHistory.map(h => (
                    <div key={h.id} className="flex justify-between items-center p-2 rounded border border-slate-100 text-xs bg-white">
                        <div className="flex gap-3 items-center">
                            {h.userId && <UserDot userId={h.userId} userMap={userMap} />}
                            <span className="text-slate-500 font-mono">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                            <span className="font-medium text-slate-700">{h.description}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">R$ {h.amount.toFixed(2)}</span>
                            {!readOnly && (
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(h.id); }} className="relative z-50 p-1 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                                    <Trash2 size={12} className="pointer-events-none"/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};