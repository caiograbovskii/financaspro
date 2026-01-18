import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, PieChart,
    Trash2, Edit2, Save, X, Activity, ChevronDown, ChevronUp, ArrowUpRight, Check, FolderPlus,
    PiggyBank, TrendingUp, Wallet, Briefcase, Layers, LogOut, Shield
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, PieChart as RePieChart, Pie, Legend, Tooltip
} from 'recharts';
import {
    ExpenseGroup, IncomeGroup, InvestmentGroup, CategoryConfig, InvestmentAsset, Goal, HistoryEntry, Transaction, WeeklyConfig
} from '../types';

// Importando as ferramentas compartilhadas
import { Card, UserDot, HistoryManager } from './Shared';
import { useToast } from './SharedUI';
// NOTE: I accidentally put useToast in SharedUI.tsx in plan but Shared.tsx in thought. I should check where I wrote SharedUI and align.
// I wrote to `components/SharedUI.tsx`. I should import from there to be safe.
// Wait, Card/UserDot are in 'Shared.tsx'. I should probably put Toast there or import from SharedUI.
// I will import form './SharedUI'.

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];

// --- Má³dulo Semanal ---
interface WeeklyProps {
    transactions: Transaction[];
    configs: WeeklyConfig[];
    updateConfig: any;
    onEditTransaction: (t: Transaction) => void;
    categories: string[];
    readOnly?: boolean;
    onSaveConfig: (idx: number) => void;
    onDeleteTransaction?: (id: string) => void;
}

// --- HELPER TROCAR SENHA ---
import { supabase } from '../supabaseClient'; // Need to ensure supabase is imported in this scope or passed. Modules.tsx usually imports it? 
// Modules.tsx DOES NOT import supabase currently (it receives data via props mostly).
// I need to check imports.
// Checking file... Modules.tsx usually does NOT import logic. 
// However, `supabaseClient` is in parent.
// I should probably add `supabase` import to Modules.tsx top level.



// --- HELPER PARA EDITAR TáTULO ---
const EditableGroupTitle = ({ initialName, onRename, readOnly }: { initialName: string, onRename: (n: string) => void, readOnly?: boolean }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) inputRef.current.focus();
    }, [isEditing]);

    const handleFinish = () => {
        setIsEditing(false);
        if (name.trim()) onRename(name.trim());
        else setName(initialName);
    };

    if (isEditing && !readOnly) {
        return (
            <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleFinish}
                onKeyDown={e => e.key === 'Enter' && handleFinish()}
                className="w-full bg-white border border-indigo-300 rounded px-1 outline-none text-slate-800"
            />
        );
    }

    return (
        <div className="flex items-center gap-2 group-hover/title:text-indigo-600 transition-colors cursor-pointer" onClick={() => !readOnly && setIsEditing(true)} title="Clique para editar">
            {initialName}
            {!readOnly && <Edit2 size={14} className="opacity-0 group-hover/title:opacity-100 text-slate-300" />}
        </div>
    );
};

export const WeeklyCosts: React.FC<WeeklyProps> = ({
    transactions, configs, updateConfig, onEditTransaction, readOnly, onSaveConfig, onDeleteTransaction
}) => {
    const getWeekTransactions = (config: WeeklyConfig) => transactions.filter(t => t.type === 'expense' && t.category !== 'Investimentos' && t.date >= config.startDate && t.date <= config.endDate);

    const getCategoryData = (txs: Transaction[]) => {
        const data: Record<string, number> = {};
        txs.forEach(t => { data[t.category] = (data[t.category] || 0) + t.amount; });
        return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 5);
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-slate-800">Custos Semanais</h2>
            </div>
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-4 h-full min-w-max">
                    {configs.map((week, idx) => {
                        const weekTxs = getWeekTransactions(week);
                        const total = weekTxs.reduce((acc, t) => acc + t.amount, 0);
                        const chartData = getCategoryData(weekTxs);

                        return (
                            <div key={idx} className="w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 h-[650px]">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                                    <div className="flex justify-between items-center mb-2"><h3 className="font-semibold text-slate-700">Semana {idx + 1}</h3><div className="font-bold text-rose-600">R$ {total.toFixed(2)}</div></div>
                                    <div className="flex gap-2 mt-1 items-center">
                                        <input type="date" className="bg-transparent text-sm font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-28" value={week.startDate} onChange={(e) => !readOnly && updateConfig(idx, 'startDate', e.target.value)} disabled={readOnly} />
                                        <span className="text-slate-400 font-bold">-</span>
                                        <input type="date" className="bg-transparent text-sm font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-28" value={week.endDate} onChange={(e) => !readOnly && updateConfig(idx, 'endDate', e.target.value)} disabled={readOnly} />
                                        {!readOnly && (
                                            <button onClick={() => onSaveConfig(idx)} className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-full transition ml-1" title="Salvar datas">
                                                <Save size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
                                    {weekTxs.map(t => (
                                        <div key={t.id} onClick={() => !readOnly && onEditTransaction(t)} className={`p-3 bg-slate-50 rounded-lg text-sm border border-slate-100 transition group ${readOnly ? '' : 'cursor-pointer hover:bg-indigo-50 hover:shadow-sm active:scale-95'}`}>
                                            <div className="flex justify-between font-medium text-slate-700"><span className="truncate pr-2">{t.title}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="whitespace-nowrap">R$ {t.amount.toFixed(2)}</span>
                                                    {!readOnly && onDeleteTransaction && (
                                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteTransaction(t.id); }} className="relative z-50 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors ml-1">
                                                            <Trash2 size={14} className="pointer-events-none" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end mt-1">
                                                <div className="flex flex-col gap-1 text-xs text-slate-400"><span>{new Date(t.date).toLocaleDateString('pt-BR')}</span><span className="bg-slate-200 px-1.5 rounded w-fit">{t.category}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-36 p-3 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Principais Categorias</p>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, left: 0, right: 80, bottom: 0 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                                                {chartData.map((entry: any, index: any) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                                <LabelList dataKey="value" position="right" formatter={(v: number) => `R$ ${v.toFixed(0)}`} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#64748b' }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Má³dulo Metas ---
interface GoalsProps {
    goals: Goal[];
    investments: InvestmentAsset[];
    onAddGoal: (g: Goal) => void;
    onEditGoal: (g: Goal) => void;
    onDeleteGoal: (id: string) => void;
    readOnly?: boolean;
    userMap?: Record<string, string>;
    currentUserId?: string;
}

export const GoalsView: React.FC<GoalsProps> = ({ goals, investments, onAddGoal, onEditGoal, onDeleteGoal, readOnly, userMap, currentUserId }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Partial<Goal>>({});
    const [amountStrings, setAmountStrings] = useState({ target: '', current: '' });

    const openGoalModal = (g: Partial<Goal>) => {
        setEditingGoal(g);
        setAmountStrings({
            target: g.targetAmount?.toString() || '',
            current: g.currentAmount?.toString() || ''
        });
        setIsAdding(true);
    };
    const totalGoals = useMemo(() => goals.reduce((acc, g) => acc + (g.currentAmount || 0), 0), [goals]);

    const calculateMonthly = () => {
        if (!editingGoal.targetAmount || !editingGoal.deadline) return null;
        const target = editingGoal.targetAmount;
        const current = editingGoal.currentAmount || 0;
        const remaining = (target || 0) - current;
        if (remaining <= 0) return 0;

        const today = new Date();
        const end = new Date(editingGoal.deadline);
        const months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
        if (months <= 0) return remaining;
        return remaining / months;
    };

    const getMonthlySuggestion = (goal: Goal) => {
        if (!goal.targetAmount || !goal.deadline) return null;
        const remaining = goal.targetAmount - (goal.currentAmount || 0);
        if (remaining <= 0) return 0;
        const today = new Date();
        const end = new Date(goal.deadline);
        const months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
        if (months <= 0) return remaining;
        return remaining / months;
    };

    const monthlyContribution = calculateMonthly();

    const handleSave = () => {
        // Parse values
        const finalTarget = parseFloat(amountStrings.target.replace(',', '.')) || 0;
        const finalCurrent = parseFloat(amountStrings.current.replace(',', '.')) || 0;

        const goalToSave = {
            ...editingGoal,
            targetAmount: finalTarget,
            currentAmount: finalCurrent,
            linkedInvestmentIds: editingGoal.linkedInvestmentIds || []
        } as Goal;

        if (editingGoal.id) onEditGoal(goalToSave);
        else onAddGoal(goalToSave);
        setIsAdding(false);
    };

    const toggleInvestment = (invId: string) => {
        const currentIds = editingGoal.linkedInvestmentIds || [];
        let newIds = [];
        if (currentIds.includes(invId)) {
            newIds = currentIds.filter(id => id !== invId);
        } else {
            newIds = [...currentIds, invId];
        }
        const newTotal = investments.filter(inv => newIds.includes(inv.id)).reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
        // Atualiza tanto numerico quanto string para consistencia
        setEditingGoal({ ...editingGoal, linkedInvestmentIds: newIds, currentAmount: newIds.length > 0 ? newTotal : (editingGoal.currentAmount || 0) });
        if (newIds.length > 0) setAmountStrings(prev => ({ ...prev, current: newTotal.toString() }));
    };

    const hasLinkedInvestments = (editingGoal.linkedInvestmentIds?.length || 0) > 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div><h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Acumulado</h2><div className="text-3xl font-bold text-slate-800">R$ {totalGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>
                <div className="flex gap-2">
                    {!readOnly && <button onClick={() => openGoalModal({ linkedInvestmentIds: [] })} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg shadow-md transition font-bold"><Plus size={20} /> Nova Meta</button>}
                </div>
            </div>

            {isAdding && !readOnly && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={() => setIsAdding(false)}>
                    <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl relative w-full md:max-w-md p-8 animate-fade-in-up flex flex-col max-h-[90vh]" onClick={(e) => e!.stopPropagation()}>
                        <div className="overflow-y-auto custom-scroll pr-2">
                            <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition"><X size={20} /></button>
                            <h3 className="font-bold text-slate-800 mb-6 text-xl text-center">{editingGoal.id ? 'Editar Meta' : 'Nova Meta'}</h3>
                            <div className="space-y-4">
                                <div><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Nome</label><input className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:border-amber-500 transition" value={editingGoal.name || ''} onChange={e => setEditingGoal({ ...editingGoal, name: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Valor Alvo</label><input type="number" step="0.01" className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:border-amber-500 transition" value={amountStrings.target} onChange={e => setAmountStrings({ ...amountStrings, target: e.target.value })} /></div>
                                {/* "Valor Atual" removido conforme solicitação, agora é 100% calculado ou gerido internamente */}
                                <div><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Data Limite (Opcional)</label><input type="date" className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:border-amber-500 transition" value={editingGoal.deadline || ''} onChange={e => setEditingGoal({ ...editingGoal, deadline: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block">Vincular Investimentos (Múltiplos)</label>
                                    <div className="border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto custom-scroll bg-slate-50">
                                        {investments.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">Nenhum investimento cadastrado.</p> : investments.map(inv => {
                                            const isSelected = (editingGoal.linkedInvestmentIds || []).includes(inv.id);
                                            return (
                                                <div key={inv.id} onClick={() => toggleInvestment(inv.id)} className={`flex items-center justify-between p-2 mb-1 rounded cursor-pointer transition ${isSelected ? 'bg-amber-100 border border-amber-200' : 'bg-white border border-transparent hover:border-slate-200'}`}>
                                                    <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-full" />}</div><span className="text-sm font-medium text-slate-700">{inv.ticker}</span></div><span className="text-xs font-bold text-slate-500">R$ {inv.currentValue}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Descrição / Motivo (Opcional)</label><textarea className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:border-amber-500 transition h-20" value={editingGoal.reason || ''} onChange={e => setEditingGoal({ ...editingGoal, reason: e.target.value })} /></div>
                                {monthlyContribution !== null && (<div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800">Para atingir sua meta até {new Date(editingGoal.deadline!).toLocaleDateString('pt-BR')}, você precisa guardar aproximadamente <span className="font-bold">R$ {monthlyContribution.toFixed(2)}/mês</span>.</div>)}
                                <div className="flex gap-2 mt-4 pt-2"><button onClick={handleSave} className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition">Salvar Meta</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {goals.map(goal => {
                    const current = goal.currentAmount || 0;
                    const target = goal.targetAmount || 1;
                    const progress = Math.min(100, (current / target) * 100);
                    const suggestion = getMonthlySuggestion(goal);

                    return (
                        <Card key={goal.id} onClick={() => { if (!readOnly) openGoalModal(goal); }} readOnly={readOnly} className="relative overflow-hidden group border-amber-100 hover:border-amber-300 transition-colors">
                            <div className="absolute top-3 right-3 z-20 flex gap-2 items-center"><UserDot userId={goal.user_id} userMap={userMap} /></div>
                            <div className="flex justify-between items-start mb-2 relative z-10 pt-2"><h3 className="font-bold text-lg text-slate-800">{goal.name}</h3>{!readOnly && (<div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openGoalModal(goal); }} className="text-slate-300 hover:text-amber-500 transition p-2"><Edit2 size={16} className="pointer-events-none" /></button><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteGoal(goal.id); }} className="relative z-50 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><Trash2 size={18} className="pointer-events-none" /></button></div>)}</div>
                            <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100"><div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Atual</span><span className="font-bold text-slate-700">R$ {(goal.currentAmount || 0).toLocaleString()}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Alvo</span><span className="font-bold text-slate-700">R$ {(goal.targetAmount || 0).toLocaleString()}</span></div></div>
                            <div className="relative pt-1"><div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-amber-100"><div style={{ width: `${progress}%` }} className="bg-amber-500 transition-all duration-1000"></div></div>{suggestion !== null && (<div className="text-xs text-center font-bold text-amber-600">Sugestáo: R$ {suggestion.toFixed(2)} / máªs</div>)}</div>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
};

// --- Má³dulo Investimentos ---
interface InvestProps {
    investments: InvestmentAsset[];
    categories: string[];
    onAddInvestment: (asset: InvestmentAsset) => void;
    onEditInvestment: (asset: InvestmentAsset) => void;
    onDeleteInvestment: (id: string) => void;
    onAportar: (id: string, amount: number) => void;
    onResgatar?: (id: string, amount: number) => void;
    readOnly?: boolean;
    userMap?: Record<string, string>;
    currentUserId?: string;
    config: CategoryConfig;
}

export const InvestmentPortfolio: React.FC<InvestProps> = ({
    investments, categories, onAddInvestment, onEditInvestment, onDeleteInvestment, onAportar, onResgatar,
    readOnly, userMap, currentUserId, config
}) => {
    const [showForm, setShowForm] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // Safe default: pega o primeiro grupo e o primeiro item dele
    const firstGroup = Object.keys(config.investment)[0] || 'RENDA FIXA';
    const firstItem = config.investment[firstGroup]?.[0] || 'CDB';

    const [editingInv, setEditingInv] = useState<Partial<InvestmentAsset>>({ category: firstItem, history: [] });
    const [invStrings, setInvStrings] = useState({ total: '', current: '' });

    const openInvModal = (inv: Partial<InvestmentAsset>) => {
        setEditingInv(inv);
        setInvStrings({
            total: inv.totalInvested?.toString() || '',
            current: inv.currentValue?.toString() || ''
        });
        setShowForm(true);
    };
    const [aporteMode, setAporteMode] = useState<string | null>(null);
    const [aporteValue, setAporteValue] = useState('');
    const [redeemModal, setRedeemModal] = useState<{ isOpen: boolean, inv: InvestmentAsset | null }>({ isOpen: false, inv: null });
    const [redeemValue, setRedeemValue] = useState('');

    const handleConfirmRedeem = () => {
        if (!redeemModal.inv || !redeemValue) return;
        const val = parseFloat(redeemValue.replace(',', '.'));
        if (val > 0 && val <= redeemModal.inv.currentValue) {
            if (onResgatar) onResgatar(redeemModal.inv.id, val);
            setRedeemModal({ isOpen: false, inv: null });
            setRedeemValue('');
        }
    };

    const totalAssets = useMemo(() => investments.reduce((acc, inv) => acc + (inv.currentValue || 0), 0), [investments]);

    // CORREá‡áƒO: Verifica se á© ediçáo ou adiçáo para evitar duplicaçáo
    const handleSave = () => {
        const finalTotal = parseFloat(invStrings.total.replace(',', '.')) || 0;
        const finalCurrent = parseFloat(invStrings.current.replace(',', '.')) || 0;

        let invToSave: InvestmentAsset;

        if (editingInv.id) {
            // EDIT MODE: 
            // 1. Calcula a diferença (Rendimento ou Prejuá­zo)
            const oldValue = Number(editingInv.currentValue || 0);
            const diff = finalCurrent - oldValue;

            let newHistory = editingInv.history || [];

            // Se houve mudança no saldo, registra como Yield
            if (diff !== 0) { // Tolerá¢ncia de float pode ser necessá¡ria, mas JS lida ok com diferença exata aqui
                const yieldEntry: HistoryEntry = {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString().split('T')[0],
                    amount: diff,
                    description: diff > 0 ? 'Rendimento de Saldo' : 'Correçáo de Saldo (Negativa)',
                    type: 'yield',
                    userId: currentUserId
                };
                newHistory = [...newHistory, yieldEntry];
            }

            invToSave = {
                ...editingInv as InvestmentAsset,
                currentValue: finalCurrent,
                history: newHistory
                // totalInvested náo á© alterado pelo input de saldo
            };
            onEditInvestment(invToSave);
        } else {
            // CREATE MODE: Total = Current = Input
            invToSave = {
                ...editingInv as InvestmentAsset,
                totalInvested: finalTotal,
                currentValue: finalTotal,
                // O App.tsx já¡ cria o histá³rico inicial "Aporte Inicial"
            };
            onAddInvestment(invToSave);
        }
        setShowForm(false);
    };

    const handleAporte = (id: string) => {
        const val = Number(aporteValue);
        if (!val || val <= 0) return;
        onAportar(id, val);
        setAporteMode(null);
        setAporteValue('');
    };

    // --- Analysis Data (Pie Chart) ---
    const chartData = useMemo(() => {
        const grouped: Record<string, number> = {};
        investments.forEach(inv => {
            grouped[inv.category] = (grouped[inv.category] || 0) + inv.currentValue;
        });

        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [investments]);

    return (
        <div className="space-y-6">

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total na Carteira</h2>
                    <div className="text-3xl font-bold text-slate-800">R$ {totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {!readOnly && (
                        <>
                            {/* Analysis Toggle Button */}
                            <button
                                onClick={() => setShowAnalysis(!showAnalysis)}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition border ${showAnalysis ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Activity size={18} />
                                <span className="hidden sm:inline">Composiçáo</span>
                                {showAnalysis ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            <button onClick={() => openInvModal({ category: firstItem, history: [] })} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-slate-200 transition">
                                <Plus size={18} />
                                <span className="hidden sm:inline">Novo Ativo</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Collapsible Analysis Section (Pie Chart) */}
            {showAnalysis && (
                <div className="animate-fade-in-down bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart size={20} className="text-indigo-500" /> Alocaçáo por Categoria</h3>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString()}`} />
                                <Legend />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ASSETS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {investments.map(inv => {
                    // CORREá‡áƒO: Estilizaçáo especá­fica para Cofrinho/Caixinhas e Padráo Verde
                    const isPiggy = inv.category.toLowerCase().includes('cofrinho') || inv.category.toLowerCase().includes('caixinha') || inv.category.toLowerCase().includes('poupança');
                    const cardClass = isPiggy
                        ? "bg-teal-50 border-teal-200 hover:border-teal-400"
                        : "bg-emerald-50 border-emerald-200 hover:border-emerald-400";
                    const textClass = isPiggy ? "text-teal-800" : "text-emerald-800";
                    const subtextClass = isPiggy ? "bg-teal-100 text-teal-700" : "bg-emerald-100 text-emerald-700";

                    return (
                        <Card
                            key={inv.id}
                            className={`relative group transition-all border cursor-pointer ${cardClass}`}
                            onClick={() => { if (!readOnly) { setEditingInv(inv); setShowForm(true); } }}
                        >
                            <div className="absolute top-3 right-3 flex gap-2">
                                <UserDot userId={inv.user_id} userMap={userMap} />
                                {!readOnly && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); openInvModal(inv); }} className="text-slate-400 hover:text-indigo-500 p-1">
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteInvestment(inv.id); }}
                                            className="relative z-50 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors ml-1"
                                            title="Excluir Investimento"
                                        >
                                            <Trash2 size={14} className="pointer-events-none" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`p-1.5 rounded-full ${subtextClass}`}>
                                        {isPiggy ? <PiggyBank size={16} /> : <TrendingUp size={16} />}
                                    </div>
                                    <h3 className={`font-bold text-lg ${textClass}`}>{inv.ticker}</h3>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ml-9 ${subtextClass}`}>{inv.category}</span>

                                <div className={`text-2xl font-bold mt-2 ml-1 text-slate-800`}>R$ {inv.currentValue.toLocaleString()}</div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-black/5" onClick={e => e.stopPropagation()}>
                                {aporteMode === inv.id ? (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                autoFocus
                                                type="number"
                                                className="w-full p-2 text-sm border border-indigo-200 rounded-lg focus:border-indigo-500 outline-none text-slate-900 bg-white"
                                                placeholder="R$ Valor"
                                                value={aporteValue}
                                                onChange={e => setAporteValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAporte(inv.id)}
                                            />
                                            <button onClick={() => setAporteMode(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                                        </div>
                                        {/* Botáµes de Açáo para o Input Aberto */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAporte(inv.id)}
                                                className={`flex-1 py-2 rounded-lg font-bold text-white text-xs uppercase tracking-wide shadow-sm flex items-center justify-center gap-2 ${isPiggy ? 'bg-teal-500 hover:bg-teal-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                            >
                                                <Plus size={14} /> Depositar
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const val = Number(aporteValue);
                                                    if (!val || val <= 0) return;
                                                    // Verifica se tem saldo suficiente
                                                    if (val > inv.currentValue) {
                                                        alert('Saldo insuficiente para resgate.');
                                                        return;
                                                    }
                                                    // Chama onResgatar (que precisa ser passado via props)
                                                    // Como onResgatar náo está¡ no escopo local do componente Card, precisamos garantir que ele venha de props
                                                    // Assumindo que o componente pai passa onResgatar para InvestmentPortfolio e ele para aqui.
                                                    // Mas wait, handleAporte á© local aqui. Precisamos de handleResgate local tambá©m.
                                                    if (onResgatar) onResgatar(inv.id, val);
                                                    setAporteMode(null);
                                                    setAporteValue('');
                                                }}
                                                className="flex-1 py-2 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs uppercase tracking-wide shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <ArrowUpRight size={14} /> Resgatar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {!readOnly && (
                                            <button onClick={() => { setAporteMode(inv.id); setAporteValue(''); }} className={`w-full py-2 text-xs font-bold text-white rounded-lg transition shadow-sm flex items-center justify-center gap-2 ${isPiggy ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'}`}>
                                                Movimentar <ChevronUp size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Modal Novo/Editar Investimento */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl relative w-full md:max-w-md p-6 animate-fade-in-up flex flex-col max-h-[90vh]" onClick={(e) => e!.stopPropagation()}>
                        <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X size={20} /></button>
                        <h3 className="font-bold text-slate-800 mb-4 text-lg">{editingInv.id ? 'Editar Ativo' : 'Novo Ativo'}</h3>
                        <div className="overflow-y-auto custom-scroll pr-2 space-y-4">
                            <div><label className="text-[10px] uppercase font-bold text-slate-400">Nome / Ticker</label><input className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" value={editingInv.ticker || ''} onChange={e => setEditingInv({ ...editingInv, ticker: e.target.value })} /></div>
                            <div><label className="text-[10px] uppercase font-bold text-slate-400">Categoria</label>
                                <select className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900" value={editingInv.category || ''} onChange={e => setEditingInv({ ...editingInv, category: e.target.value })}>
                                    {Object.entries(config.investment).map(([group, items]) => (
                                        <optgroup key={group} label={group}>
                                            {(items as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                {!editingInv.id ? (
                                    /* CREATE MODE: Input áºnico */
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Investimento Inicial (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                                            placeholder="0,00"
                                            value={invStrings.total}
                                            onChange={e => setInvStrings({ ...invStrings, total: e.target.value, current: e.target.value })}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Este valor será¡ o custo inicial e o saldo inicial.</p>
                                    </div>
                                ) : (
                                    /* EDIT MODE: Input áºnico para saldo */
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Atualizar Saldo Atual (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                                            placeholder="0,00"
                                            value={invStrings.current}
                                            onChange={e => setInvStrings({ ...invStrings, current: e.target.value })}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Atualize apenas o valor de mercado (rendimentos). Para novos aportes, use o botáo "Aportar" no card.</p>
                                    </div>
                                )}

                                {editingInv.id && (
                                    <HistoryManager
                                        history={editingInv.history || []}
                                        onChange={(h) => {
                                            const newTotal = h.reduce((acc, item) => acc + item.amount, 0);
                                            setEditingInv({ ...editingInv, history: h, totalInvested: newTotal });
                                        }}
                                        currentUserId={currentUserId}
                                        userMap={userMap}
                                    />
                                )}

                                <div className="pt-2 flex gap-2">
                                    {editingInv.id && <button onClick={() => { onDeleteInvestment(editingInv.id!); setShowForm(false); }} className="px-4 py-2 text-rose-500 font-bold border border-rose-100 hover:bg-rose-50 rounded-lg">Excluir</button>}
                                    <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold shadow-lg">Salvar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}    </div>
    );
};

// --- SETTINGS VIEW ---
export const SettingsView: React.FC<{ config: CategoryConfig, onUpdate: (c: CategoryConfig) => void, readOnly?: boolean, onLogout?: () => void, onSync?: () => void }> = ({ config, onUpdate, readOnly, onLogout, onSync }) => {
    const { showToast } = useToast();
    const [localConfig, setLocalConfig] = useState<CategoryConfig>(config);
    const [activeTab, setActiveTab] = useState<'expenses' | 'investments' | 'income' | 'security'>('expenses');

    // Estados para novos inputs
    const [newItem, setNewItem] = useState<{ group: string, item: string }>({ group: '', item: '' });
    const [newGroup, setNewGroup] = useState('');

    useEffect(() => {
        let safeConfig;
        try { safeConfig = JSON.parse(JSON.stringify(config)); } catch (e) { safeConfig = { ...config }; }
        if (!safeConfig.expense) safeConfig.expense = {};
        // Garante que income e investment sejam objetos (para grupos)
        if (!safeConfig.income || Array.isArray(safeConfig.income)) safeConfig.income = {};
        if (!safeConfig.investment || Array.isArray(safeConfig.investment)) safeConfig.investment = {};

        setLocalConfig(safeConfig);
    }, [config]);

    const handleSave = () => { onUpdate(localConfig); showToast("Configuraçáµes salvas com sucesso!", "success"); };

    const renameGroup = (oldName: string, newName: string) => {
        if (!newName || !newName.trim() || newName === oldName) return;
        const safeConfig = JSON.parse(JSON.stringify(localConfig));
        const sectionKey = activeTab === 'expenses' ? 'expense' : activeTab === 'investments' ? 'investment' : 'income';

        if (safeConfig[sectionKey][newName]) {
            showToast('Já¡ existe um grupo com este nome.', 'error');
            return;
        }

        const items = safeConfig[sectionKey][oldName];
        safeConfig[sectionKey][newName] = items;
        delete safeConfig[sectionKey][oldName];

        setLocalConfig(safeConfig);
        onUpdate(safeConfig);
        showToast('Grupo renomeado!', 'success');
    };

    // --- Lá“GICA GENá‰RICA PARA GRUPOS E ITENS ---
    // Mapeia a aba ativa para a chave correspondente no config
    // Mapeia a aba ativa para a chave correspondente no config
    const activeKey = activeTab === 'expenses' ? 'expense' : activeTab === 'investments' ? 'investment' : activeTab === 'income' ? 'income' : null;

    const addGroup = () => {
        if (!newGroup.trim()) return;
        const currentGroups = localConfig[activeKey] as Record<string, string[]>;
        if (currentGroups[newGroup]) { showToast('Grupo já¡ existe!', 'error'); return; }

        setLocalConfig(prev => ({
            ...prev,
            [activeKey]: { ...prev[activeKey], [newGroup]: [] }
        }));
        setNewGroup('');
    };

    // CORREá‡áƒO FINAL: Exclusáo com cá³pia profunda e atualizaçáo imediata do servidor
    const deleteGroup = (groupToDelete: string, e: React.MouseEvent) => {
        try {
            e.preventDefault();
            e.stopPropagation();

            if (!confirm(`Tem certeza que deseja excluir o grupo "${groupToDelete}" e todos os itens dentro dele?`)) return;

            // Usa clone profundo via JSON para garantir que náo haja referáªncias mantidas
            const safeConfig = JSON.parse(JSON.stringify(localConfig));
            const sectionKey = activeTab === 'expenses' ? 'expense' : activeTab === 'investments' ? 'investment' : 'income';

            // Garante que a seçáo existe antes de tentar deletar
            if (!safeConfig[sectionKey]) safeConfig[sectionKey] = {};

            // Remove a propriedade do objeto
            const currentSection = safeConfig[sectionKey];
            if (currentSection && typeof currentSection === 'object') {
                delete (currentSection as any)[groupToDelete];
            }

            // Atualiza estado local
            setLocalConfig(safeConfig);

            // Atualiza servidor/pai IMEDIATAMENTE
            onUpdate(safeConfig);
            showToast('Grupo excluá­do com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao excluir grupo:", error);
            showToast("Erro ao excluir grupo.", 'error');
        }
    };

    const addItem = (group: string) => {
        if (!newItem.item.trim() || newItem.group !== group) return;

        setLocalConfig(prev => {
            // Lá³gica de update local para addItem (ainda requer "Salvar" para persistir, ou podemos fazer imediato se desejado - mantendo padráo atual)
            const currentGroups = prev[activeKey] as Record<string, string[]>;
            const currentItems = currentGroups[group] || [];

            if (currentItems.includes(newItem.item)) return prev;

            return {
                ...prev,
                [activeKey]: {
                    ...prev[activeKey],
                    [group]: [...currentItems, newItem.item]
                }
            };
        });
        setNewItem({ group: '', item: '' });
    };

    const deleteItem = (group: string, itemToDelete: string) => {
        try {
            const safeConfig = JSON.parse(JSON.stringify(localConfig));
            const sectionKey = activeTab === 'expenses' ? 'expense' : activeTab === 'investments' ? 'investment' : 'income';

            const currentGroups = safeConfig[sectionKey] as Record<string, string[]>;
            if (currentGroups && currentGroups[group]) {
                currentGroups[group] = currentGroups[group].filter((i: string) => i !== itemToDelete);

                // Salva IMEDIATAMENTE ao excluir item tambá©m
                setLocalConfig(safeConfig);
                onUpdate(safeConfig);
            }
        } catch (error) {
            console.error("Erro ao excluir item:", error);
        }
    };

    // Configuraçáo de cores por aba
    const theme = activeTab === 'expenses' ? 'rose' : activeTab === 'investments' ? 'indigo' : 'emerald';
    const ThemeIcon = activeTab === 'expenses' ? Layers : activeTab === 'investments' ? Briefcase : Wallet;
    const themeText = activeTab === 'expenses' ? 'text-rose-600' : activeTab === 'investments' ? 'text-indigo-600' : 'text-emerald-600';
    const themeBg = activeTab === 'expenses' ? 'bg-rose-50' : activeTab === 'investments' ? 'bg-indigo-50' : 'bg-emerald-50';
    const themeBorder = activeTab === 'expenses' ? 'border-rose-200' : activeTab === 'investments' ? 'border-indigo-200' : 'border-emerald-200';
    const themeBtn = activeTab === 'expenses' ? 'bg-rose-500 hover:bg-rose-600' : activeTab === 'investments' ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-emerald-500 hover:bg-emerald-600';

    return (
        <div className="h-full flex flex-col space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Configuraçáµes</h2>
                    <p className="text-sm text-slate-500">Gerencie suas categorias e grupos.</p>
                </div>
                {!readOnly && (
                    <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition flex items-center gap-2 w-full md:w-auto justify-center">
                        <Save size={18} /> Salvar Alteraçáµes
                    </button>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-fit overflow-x-auto">
                <button onClick={() => setActiveTab('expenses')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'expenses' ? 'bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-200' : 'text-slate-500 hover:bg-slate-50'}`}><Layers size={18} /> Despesas</button>
                <button onClick={() => setActiveTab('investments')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'investments' ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}><Briefcase size={18} /> Investimentos</button>
                <button onClick={() => setActiveTab('income')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'income' ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}><Wallet size={18} /> Receitas</button>
                <button onClick={() => setActiveTab('security')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === 'security' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-300' : 'text-slate-500 hover:bg-slate-50'}`}><Shield size={18} /> Segurança</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scroll">

                <div className="space-y-6 animate-fade-in">
                    {activeTab === 'security' ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Shield size={48} className="mb-4 text-slate-300" />
                            <h3 className="text-lg font-bold text-slate-600">área de Segurança</h3>
                            <p className="text-sm">Configuraçáµes de segurança em breve.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Criar Novo Grupo */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${themeBg} ${themeText}`}><ThemeIcon size={20} /></div>
                                    <div>
                                        {activeTab === 'investments' && (
                                            <>
                                                {!readOnly && onSync && (
                                                    <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-bold text-blue-700 text-sm">Sincronizaçáo de Saldo</h4>
                                                            <p className="text-xs text-blue-500">Gera transaçáµes retroativas para investimentos antigos.</p>
                                                        </div>
                                                        <button onClick={onSync} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-blue-700 transition">Sincronizar Agora</button>
                                                    </div>
                                                )}
                                                <h3 className="font-bold text-slate-700 mb-4">Categorias de Investimentos</h3>
                                            </>
                                        )}
                                        <h3 className="font-bold text-slate-700">
                                            {activeTab === 'expenses' ? 'Grupos de Despesa' : activeTab === 'investments' ? 'Grupos de Investimento' : 'Grupos de Receita'}
                                        </h3>
                                        <p className="text-xs text-slate-400">Agrupamento para organizaçáo</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <input
                                            value={newGroup}
                                            onChange={e => setNewGroup(e.target.value)}
                                            placeholder="Nome do Novo Grupo..."
                                            className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:border-slate-500 flex-1 bg-white text-slate-900"
                                        />
                                        <button onClick={addGroup} className={`text-sm font-bold text-white px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-sm ${themeBtn}`}><FolderPlus size={16} /> Criar</button>
                                    </div>
                                )}
                            </div>

                            {/* Lista de Grupos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(activeKey && localConfig[activeKey]) && Object.entries((localConfig[activeKey] as Record<string, string[]>) || {}).map(([group, items]) => (
                                    <Card key={group} className={`relative group/card hover:${themeBorder} transition-colors border-transparent`}>
                                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                                            <div className="font-bold text-slate-800 text-lg truncate pr-2 flex-1">
                                                <EditableGroupTitle initialName={group} onRename={(n) => renameGroup(group, n)} readOnly={readOnly} />
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => deleteGroup(group, e)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded transition relative z-50 cursor-pointer"
                                                    title="Excluir Grupo"
                                                >
                                                    <Trash2 size={18} className="pointer-events-none" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {(items || []).map((item: string) => (
                                                <span key={item} className={`bg-slate-50 text-slate-600 border border-slate-200 pl-3 pr-2 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 group/item hover:${themeBg} hover:${themeText} hover:${themeBorder} transition`}>
                                                    {item}
                                                    {!readOnly && <button onClick={() => deleteItem(group, item)} className="text-slate-300 hover:text-rose-500"><X size={14} /></button>}
                                                </span>
                                            ))}
                                            {items.length === 0 && <span className="text-xs text-slate-400 italic py-1">Nenhum item.</span>}
                                        </div>

                                        {!readOnly && (
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50">
                                                <input
                                                    value={newItem.group === group ? newItem.item : ''}
                                                    onChange={e => setNewItem({ group: group, item: e.target.value })}
                                                    onKeyDown={e => e.key === 'Enter' && addItem(group)}
                                                    placeholder="Novo item..."
                                                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-slate-400 bg-white text-slate-900"
                                                />
                                                <button onClick={() => addItem(group)} className="p-1.5 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded"><Plus size={16} /></button>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTáƒO DE SAIR - APENAS VISáVEL NO MOBILE DENTRO DE SETTINGS (POIS SIDEBAR ESTá OCULTA) */}
                <div className="md:hidden pt-8 border-t border-slate-100 mt-8">
                    <button onClick={onLogout} className="w-full bg-rose-50 text-rose-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition">
                        <LogOut size={20} />
                        Sair do Aplicativo
                    </button>
                </div>
            </div>
        </div>
    );
};
