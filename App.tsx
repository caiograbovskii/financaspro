import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, CalendarRange, Target,
    Briefcase, Plus, ChevronLeft, ChevronRight,
    TrendingUp, TrendingDown, Wallet, Settings, LogOut, X,
    Edit2, Trash2, ArrowUpRight, AlertTriangle, Trophy, Calendar, Info, Menu
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, CartesianGrid, LabelList, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, Tooltip, YAxis
} from 'recharts';
import { supabase, isConfigured } from './supabaseClient';
import {
    Transaction, AppState, Goal, InvestmentAsset,
    DateFilter, CategoryConfig, UserRole
} from './types';
import { ToastProvider, Celebration, useToast } from './components/SharedUI';

// Importa apenas os módulos ativos
import { WeeklyCosts, GoalsView, InvestmentPortfolio, SettingsView } from './components/Modules';

// --- Constantes Visuais ---
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Helper para formatar data
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

// --- Categorias Iniciais Atualizadas para Grupos ---
const DEFAULT_CATEGORIES: CategoryConfig = {
    expense: {
        'ESSENCIAL': ['Casa', 'Mercado', 'Energia', 'Água', 'Internet', 'Transporte', 'Saúde'],
        'ESTILO DE VIDA': ['Lazer', 'Restaurantes', 'Compras', 'Assinaturas']
    },
    income: {
        'PRINCIPAL': ['Salário', 'Pró-labore'],
        'EXTRAS': ['Freelance', 'Vendas', 'Outros'],
        'PASSIVA': ['Dividendos', 'Aluguéis']
    },
    investment: {
        'RENDA FIXA': ['CDB', 'Tesouro Direto', 'LCI/LCA', 'Poupança'],
        'RENDA VARIÁVEL': ['Ações', 'FIIs', 'ETFs'],
        'CRIPTO & OUTROS': ['Bitcoin', 'Ethereum', 'Ouro']
    }
};

const INITIAL_STATE: AppState = {
    transactions: [],
    goals: [],
    investments: [],
    weeklyConfigs: Array(5).fill(null).map((_, i) => ({
        weekIndex: i,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    })),
    categoryConfig: DEFAULT_CATEGORIES
};

// --- Tela de Login ---
function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setError('');
        setLoading(true);

        if (!isConfigured) {
            setError('ERRO: Configuração do Supabase ausente.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError('Falha no login: Verifique email e senha.');
        }
        setLoading(false);
    };

    return (
        <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-indigo-200 shadow-lg">FP</div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Bem-vindo ao FinançasPRO</h2>

                <div className="space-y-4">
                    <input className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none text-slate-900" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" onKeyDown={e => e.key === 'Enter' && handleLogin()} className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none text-slate-900" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
                    {error && <p className="text-rose-500 text-sm text-center font-bold bg-rose-50 p-2 rounded">{error}</p>}
                    <button onClick={handleLogin} disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg">{loading ? 'Entrando...' : 'Entrar'}</button>
                </div>
            </div>
        </div>
    );
}

// --- App Principal ---
export default function App() {
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [categoryId, setCategoryId] = useState<string | null>(null);

    // Estados Principais
    const [data, setData] = useState<AppState>(INITIAL_STATE);
    const [activeModule, setActiveModule] = useState<'dashboard' | 'weekly' | 'goals' | 'investments' | 'settings'>('dashboard');
    const [dateFilter, setDateFilter] = useState<DateFilter>({ month: new Date().getMonth(), year: new Date().getFullYear() });

    // Estados de UI
    const [txModalOpen, setTxModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 5;
    const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);

    // Perfil de Leitura (Mentora)
    const isReadOnly = session?.user?.email === 'flavia@mentora.com';

    // --- Inicialização ---
    useEffect(() => {
        // Se não estiver configurado, paramos o loading para cair na tela de login
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) loadData(session.user.id);
            else setLoading(false);
        }).catch(err => {
            console.error("Erro ao verificar sessão:", err);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) loadData(session.user.id);
            else { setUserRole(null); setData(INITIAL_STATE); }
        });
        return () => subscription.unsubscribe();
    }, []);

    const calculateLinkedAmount = (ids: string[], investments: InvestmentAsset[]) => {
        if (!ids || ids.length === 0) return 0;
        return investments
            .filter(inv => ids.includes(inv.id))
            .reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    };

    const loadData = async (userId: string) => {
        if (!isConfigured) return;

        setLoading(true);
        try {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
            setUserRole(profile?.role || 'admin');

            const { data: profiles } = await supabase.from('profiles').select('id, email');
            if (profiles) {
                const map: Record<string, string> = {};
                profiles.forEach((p: any) => map[p.id] = p.email);
                setUserMap(map);
            }

            const [txs, goals, invs, cats] = await Promise.all([
                supabase.from('transactions').select('*'),
                supabase.from('goals').select('*'),
                supabase.from('investments').select('*'),
                supabase.from('categories').select('*').limit(1).maybeSingle()
            ]);
            if (cats.data) setCategoryId(cats.data.id);

            let loadedConfig = DEFAULT_CATEGORIES;

            // --- LOGICA DE MIGRAÇÃO DE DADOS ---
            if (cats.data?.config) {
                const serverConfig = cats.data.config;

                // Migrar Investimentos (de fixed/variable fixos para grupos dinâmicos)
                let newInvestments: any = {};
                if (serverConfig.investment && Array.isArray(serverConfig.investment.fixed)) {
                    // Estrutura antiga detectada
                    newInvestments['RENDA FIXA'] = serverConfig.investment.fixed;
                    newInvestments['RENDA VARIÁVEL'] = serverConfig.investment.variable || [];
                    // Se houver targets antigos, ignoramos por enquanto pois a estrutura mudou
                } else {
                    // Estrutura nova ou customizada
                    newInvestments = serverConfig.investment || DEFAULT_CATEGORIES.investment;
                }

                // Migrar Receitas (de array simples para grupos)
                let newIncome: any = {};
                if (Array.isArray(serverConfig.income)) {
                    // Estrutura antiga (array plano)
                    newIncome['GERAL'] = serverConfig.income;
                } else {
                    newIncome = serverConfig.income || DEFAULT_CATEGORIES.income;
                }

                loadedConfig = {
                    ...DEFAULT_CATEGORIES,
                    ...serverConfig,
                    investment: newInvestments,
                    income: newIncome
                };
            }

            const investments = (invs.data || []).map((i: any) => ({
                ...i,
                totalInvested: Number(i.total_invested || 0),
                currentValue: Number(i.current_value || 0),
                purchaseDate: i.purchase_date
            }));

            const goalsData = (goals.data || []).map((g: any) => {
                const linkedIds = g.linked_investment_ids || [];
                const calculatedAmount = linkedIds.length > 0
                    ? calculateLinkedAmount(linkedIds, investments)
                    : Number(g.current_amount || 0);

                return {
                    ...g,
                    targetAmount: Number(g.target_amount || 0),
                    currentAmount: calculatedAmount,
                    linkedInvestmentIds: linkedIds
                };
            });

            setData(prev => ({
                transactions: (txs.data || []).map((t: any) => ({ ...t, amount: Number(t.amount || 0), paymentMethod: t.payment_method, installmentCurrent: t.installment_current, installmentTotal: t.installment_total, parentTransactionId: t.parent_transaction_id })),
                goals: goalsData,
                investments: investments,
                weeklyConfigs: prev.weeklyConfigs,
                categoryConfig: loadedConfig
            }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const key = `${dateFilter.year}-${dateFilter.month}`;
        const currentConfig = data.categoryConfig || DEFAULT_CATEGORIES;
        const savedWeeks = (currentConfig as any).savedWeeks || {};

        if (savedWeeks[key]) {
            setData(prev => ({ ...prev, weeklyConfigs: savedWeeks[key] }));
            return;
        }

        const year = dateFilter.year;
        const month = dateFilter.month;
        const lastDay = new Date(year, month + 1, 0).getDate();

        const newConfigs = Array(5).fill(null).map((_, i) => {
            const startDay = i * 7 + 1;
            let endDay = startDay + 6;
            if (endDay > lastDay) endDay = lastDay;

            if (startDay > lastDay) return { weekIndex: i, startDate: '', endDate: '' };

            const fmt = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return {
                weekIndex: i,
                startDate: fmt(startDay),
                endDate: fmt(endDay)
            };
        });

        setData(prev => ({ ...prev, weeklyConfigs: newConfigs }));
    }, [dateFilter.year, dateFilter.month, data.categoryConfig]);

    const filteredTransactions = useMemo(() => {
        return data.transactions.filter(t => {
            const parts = t.date.split('-');
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            return month === dateFilter.month && year === dateFilter.year;
        });
    }, [data.transactions, dateFilter]);

    const kpiData = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const totalInvestments = data.investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
        const totalUnlinkedGoals = data.goals
            .filter(g => (!g.linkedInvestmentIds || g.linkedInvestmentIds.length === 0))
            .reduce((sum, g) => sum + (g.currentAmount || 0), 0);

        return {
            income, expense, balance: income - expense,
            invested: totalInvestments + totalUnlinkedGoals
        };
    }, [filteredTransactions, data.investments, data.goals]);

    // --- CHART EVOLUTION ---
    const evolutionData = useMemo(() => {
        const months = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d);
        }

        return months.map(date => {
            const eom = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
            const label = MONTHS[date.getMonth()].substring(0, 3);

            const accIncome = data.transactions.filter(t => t.type === 'income' && t.date <= eom).reduce((a, b) => a + b.amount, 0);
            const accExpense = data.transactions.filter(t => t.type === 'expense' && t.date <= eom).reduce((a, b) => a + b.amount, 0);
            const balance = accIncome - accExpense;

            const invested = data.investments
                .filter(i => !i.purchaseDate || i.purchaseDate <= eom)
                .reduce((a, b) => a + (b.totalInvested || 0), 0);

            return {
                name: label,
                date: eom,
                Caixa: balance,
                Investimentos: invested,
                Total: balance + invested
            };
        });
    }, [data.transactions, data.investments]);

    // --- AI INSIGHTS ---
    const insights = useMemo(() => {
        const list = [];
        const currentMonthTxs = filteredTransactions;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        // 1. Radar
        const incomingMoney = data.transactions.filter(t => {
            const [y, m, d] = t.date.split('-').map(Number);
            const tDate = new Date(y, m - 1, d);
            return t.type === 'income' && tDate >= today && tDate <= threeDaysFromNow;
        });

        if (incomingMoney.length > 0) {
            const total = incomingMoney.reduce((a, b) => a + b.amount, 0);
            list.push({
                id: 'receivable',
                type: 'info',
                title: 'Entradas à Vista',
                message: `Previsão de R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para os próximos 3 dias.`,
                icon: Calendar
            });
        }

        // 2. Análise de Gastos
        const expenseCategories = [...new Set(currentMonthTxs.filter(t => t.type === 'expense').map(t => t.category))];
        let inflationFound = false;

        expenseCategories.forEach(cat => {
            const currentTotal = currentMonthTxs.filter(t => t.category === cat).reduce((a, b) => a + b.amount, 0);
            if (currentTotal < 50) return;

            let pastTotal = 0;
            let monthsCount = 0;
            for (let i = 1; i <= 3; i++) {
                const d = new Date(dateFilter.year, dateFilter.month - i, 1);
                const mStart = d.toISOString().split('T')[0];
                const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                const mSum = data.transactions
                    .filter(t => t.category === cat && t.date >= mStart && t.date <= mEnd)
                    .reduce((a, b) => a + b.amount, 0);
                if (mSum > 0) { pastTotal += mSum; monthsCount++; }
            }

            if (monthsCount > 0) {
                const avg = pastTotal / monthsCount;
                if (currentTotal > avg * 1.3) {
                    inflationFound = true;
                    list.push({
                        id: `inflation-${cat}-${dateFilter.month}`,
                        type: 'warning',
                        title: 'Alerta de Inflação',
                        message: `Seus gastos com ${cat} estão ${(currentTotal / avg * 100 - 100).toFixed(0)}% acima da média recente.`,
                        icon: AlertTriangle
                    });
                }
            }
        });

        if (list.length === 0) {
            const income = currentMonthTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
            const expense = currentMonthTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
            const balance = income - expense;

            if (income > 0 || expense > 0) {
                list.push({
                    id: `balance-status-${dateFilter.month}`,
                    type: balance >= 0 ? 'success' : 'warning',
                    title: balance >= 0 ? 'Saldo Positivo' : 'Cuidado',
                    message: balance >= 0
                        ? `Você está no azul! Sobra de R$ ${balance.toLocaleString()}.`
                        : `Gastos excederam receitas em R$ ${Math.abs(balance).toLocaleString()}.`,
                    icon: balance >= 0 ? Trophy : AlertTriangle
                });
            }
        }

        return list.filter(i => !dismissedInsights.includes(i.id));
    }, [filteredTransactions, data.transactions, data.investments, dismissedInsights, dateFilter]);

    // --- Handlers ---
    const handleUpdateCategories = async (newConfig: CategoryConfig) => {
        setData(prev => ({ ...prev, categoryConfig: newConfig }));

        if (isConfigured && categoryId) {
            await supabase.from('categories').update({ config: newConfig }).eq('id', categoryId);
        } else if (isConfigured) {
            const { data: ins } = await supabase.from('categories').insert({
                user_id: session.user.id,
                config: newConfig
            }).select().single();
            if (ins) setCategoryId(ins.id);
        }
    };

    const handleSaveWeeklyConfig = async () => {
        try {
            const key = `${dateFilter.year}-${dateFilter.month}`;
            const currentConfig = data.categoryConfig || DEFAULT_CATEGORIES;
            const currentSaved = (currentConfig as any).savedWeeks || {};
            const newConfig = { ...currentConfig, savedWeeks: { ...currentSaved, [key]: data.weeklyConfigs } };
            await handleUpdateCategories(newConfig);
            alert(`Datas salvas!`);
        } catch (e) { console.error(e); }
    };

    // CRUD Transações, Metas e Investimentos
    const handleEditGoal = async (updatedGoal: Goal) => {
        let finalGoal = { ...updatedGoal };
        if (finalGoal.linkedInvestmentIds && finalGoal.linkedInvestmentIds.length > 0) {
            finalGoal.currentAmount = calculateLinkedAmount(finalGoal.linkedInvestmentIds, data.investments);
        }
        setData(prev => ({ ...prev, goals: prev.goals.map(g => g.id === finalGoal.id ? finalGoal : g) }));

        if (isConfigured) {
            const payload: any = { name: finalGoal.name, target_amount: finalGoal.targetAmount, current_amount: finalGoal.currentAmount, linked_investment_ids: finalGoal.linkedInvestmentIds || [], deadline: finalGoal.deadline, reason: finalGoal.reason };
            await supabase.from('goals').update(payload).eq('id', finalGoal.id);
        }
    };

    const handleAddGoal = async (newGoal: Goal) => {
        let initialAmount = newGoal.currentAmount || 0;
        if (newGoal.linkedInvestmentIds && newGoal.linkedInvestmentIds.length > 0) {
            initialAmount = calculateLinkedAmount(newGoal.linkedInvestmentIds, data.investments);
        }
        const safeGoal = { ...newGoal, currentAmount: initialAmount, user_id: session.user.id };

        if (isConfigured) {
            setData(prev => ({ ...prev, goals: [...prev.goals, safeGoal] }));
            const { data: inserted } = await supabase.from('goals').insert({ user_id: session.user.id, name: safeGoal.name, target_amount: safeGoal.targetAmount, current_amount: safeGoal.currentAmount, linked_investment_ids: safeGoal.linkedInvestmentIds || [], history: [], deadline: safeGoal.deadline, reason: safeGoal.reason }).select().single();
            if (inserted) {
                setData(prev => ({ ...prev, goals: prev.goals.map(g => g.name === safeGoal.name && !g.id ? { ...g, id: inserted.id } : g) }));
            } else { loadData(session.user.id); }
        } else {
            // Fallback local se não estiver configurado
            const id = Date.now().toString();
            setData(prev => ({ ...prev, goals: [...prev.goals, { ...safeGoal, id }] }));
        }
    };

    const handleEditInvestment = async (updatedInv: InvestmentAsset) => {
        const safeInv = { ...updatedInv, totalInvested: Number(updatedInv.totalInvested || 0), currentValue: Number(updatedInv.currentValue || 0) };
        setData(prev => {
            let finalInv = { ...safeInv };
            if (finalInv.history && finalInv.history.length > 0) { finalInv.totalInvested = finalInv.history.reduce((sum, h) => sum + h.amount, 0); }
            const newInvestments = prev.investments.map(i => i.id === finalInv.id ? finalInv : i);
            const newGoals = prev.goals.map(g => {
                if (g.linkedInvestmentIds && g.linkedInvestmentIds.includes(finalInv.id)) {
                    const newTotal = calculateLinkedAmount(g.linkedInvestmentIds, newInvestments);
                    if (isConfigured) supabase.from('goals').update({ current_amount: newTotal }).eq('id', g.id).then();
                    return { ...g, currentAmount: newTotal };
                }
                return g;
            });
            return { ...prev, investments: newInvestments, goals: newGoals };
        });

        if (isConfigured) {
            await supabase.from('investments').update({ ticker: safeInv.ticker, category: safeInv.category, current_value: safeInv.currentValue, total_invested: safeInv.totalInvested, history: safeInv.history }).eq('id', safeInv.id);
        }
    };

    const handleAddInvestment = async (newInv: InvestmentAsset) => {
        const safeInv = { ...newInv, totalInvested: Number(newInv.totalInvested || 0), currentValue: Number(newInv.currentValue || 0), history: newInv.history || [], user_id: session.user.id };

        if (isConfigured) {
            setData(prev => ({ ...prev, investments: [...prev.investments, safeInv] }));
            const { data: inserted } = await supabase.from('investments').insert({ user_id: session.user.id, ticker: safeInv.ticker, category: safeInv.category, purchase_date: new Date().toISOString(), total_invested: safeInv.totalInvested, current_value: safeInv.currentValue, history: safeInv.history }).select().single();
            if (inserted) setData(prev => ({ ...prev, investments: prev.investments.map(i => i.id === safeInv.id ? { ...i, id: inserted.id } : i) }));
        } else {
            const id = Date.now().toString();
            setData(prev => ({ ...prev, investments: [...prev.investments, { ...safeInv, id }] }));
        }
    };

    const handleInvestmentAporte = async (invId: string, amount: number) => {
        const inv = data.investments.find(i => i.id === invId);
        if (!inv) return;
        const newHistoryItem = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], amount, description: 'Aporte Rápido', userId: session.user.id };
        const updatedInv = { ...inv, history: [...(inv.history || []), newHistoryItem], totalInvested: (inv.totalInvested || 0) + amount, currentValue: (inv.currentValue || 0) + amount };
        handleEditInvestment(updatedInv);
    };

    const handleSaveTransaction = async (tx: Partial<Transaction>) => {
        const txData = { title: tx.title, amount: Number(tx.amount || 0), type: tx.type, category: tx.category, date: tx.date, payment_method: tx.paymentMethod, description: tx.description };

        if (isConfigured) {
            if (editingTransaction) {
                await supabase.from('transactions').update(txData).eq('id', editingTransaction.id);
            } else {
                await supabase.from('transactions').insert({ ...txData, user_id: session.user.id });
            }
            setTxModalOpen(false);
            setEditingTransaction(null);
            loadData(session.user.id);
        } else {
            const id = editingTransaction?.id || Date.now().toString();
            const newTx = { ...txData, id, user_id: session.user.id } as Transaction;

            setData(prev => {
                if (editingTransaction) {
                    return { ...prev, transactions: prev.transactions.map(t => t.id === id ? newTx : t) };
                } else {
                    return { ...prev, transactions: [newTx, ...prev.transactions] };
                }
            });
            setTxModalOpen(false);
            setEditingTransaction(null);
        }
    };

    const deleteTransaction = async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) alert('Erro ao excluir: ' + error.message);
            else loadData(session.user.id);
        } else {
            setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
        }
    };

    const handleDeleteInvestment = async (id: string) => {
        // Atualiza metas vinculadas
        const affectedGoals = data.goals.filter(g => g.linkedInvestmentIds && g.linkedInvestmentIds.includes(id));
        const newGoals = data.goals.map(g => {
            if (g.linkedInvestmentIds && g.linkedInvestmentIds.includes(id)) {
                const newIds = g.linkedInvestmentIds.filter(iId => iId !== id);
                const newAmount = calculateLinkedAmount(newIds, data.investments.filter(i => i.id !== id));
                return { ...g, linkedInvestmentIds: newIds, currentAmount: newAmount };
            }
            return g;
        });

        if (isConfigured) {
            for (const goal of affectedGoals) {
                const newIds = goal.linkedInvestmentIds!.filter(iId => iId !== id);
                const newAmount = calculateLinkedAmount(newIds, data.investments.filter(i => i.id !== id));
                await supabase.from('goals').update({ linked_investment_ids: newIds, current_amount: newAmount }).eq('id', goal.id);
            }
            const { error } = await supabase.from('investments').delete().eq('id', id);
            if (error) alert('Erro ao excluir investimento'); else loadData(session.user.id);
        } else {
            setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id), goals: newGoals }));
        }
    };

    const handleDeleteGoal = async (id: string) => {
        if (isConfigured) {
            const { error } = await supabase.from('goals').delete().eq('id', id);
            if (error) alert('Erro ao excluir meta'); else loadData(session.user.id);
        } else {
            setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
        }
    };

    const openNewTransaction = () => { setEditingTransaction(null); setTxModalOpen(true); };
    const openEditTransaction = (t: Transaction) => { setEditingTransaction(t); setTxModalOpen(true); };

    const handleLogout = () => { setSession(null); supabase.auth.signOut(); };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando FinançasPRO...</div>;

    if (!session) return <LoginScreen />;

    const paginatedTransactions = filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

    // Mapeamento dos itens de navegação para reuso (Sidebar e Bottom Nav)
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
        { id: 'weekly', icon: CalendarRange, label: 'Custos Semanais' },
        { id: 'goals', icon: Target, label: 'Metas', c: 'bg-amber-50 text-amber-700' },
        { id: 'investments', icon: Briefcase, label: 'Investimentos', c: 'bg-teal-50 text-teal-700' },
        { id: 'settings', icon: Settings, label: 'Ajustes' }
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* SIDEBAR DESKTOP - Oculta no mobile (hidden md:flex) */}
            <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col py-6 z-20 shadow-sm">
                <div className="px-6 mb-8 w-full">
                    <div className="flex items-center gap-3 mb-1"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">FP</div><span className="text-xl font-bold">FinançasPRO</span></div>
                    <p className="text-xs text-slate-400 pl-11">Família Grabovskii</p>
                </div>
                <nav className="flex-1 px-3 space-y-2">
                    {navItems.filter(i => i.id !== 'settings').map(item => (
                        <button key={item.id} onClick={() => setActiveModule(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeModule === item.id ? (item.c || 'bg-indigo-50 text-indigo-700 font-semibold') : 'text-slate-500 hover:bg-slate-50'}`}>
                            <item.icon size={20} /><span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="px-3 mt-auto space-y-2">
                    <button onClick={() => setActiveModule('settings')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${activeModule === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Settings size={20} /><span className="text-sm">Configurações</span></button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-500 hover:bg-rose-50"><LogOut size={20} /><span className="text-sm">Sair</span></button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-8 shrink-0">
                    <div className="flex flex-col">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 capitalize">{activeModule === 'dashboard' ? 'Visão Geral' : activeModule === 'weekly' ? 'Custos Semanais' : activeModule === 'goals' ? 'Metas' : activeModule === 'investments' ? 'Investimentos' : 'Configurações'}</h1>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                        {activeModule === 'dashboard' && !isReadOnly && (
                            <button onClick={openNewTransaction} className="bg-slate-900 text-white px-3 md:px-5 py-2 rounded-xl flex items-center gap-2 shadow-lg text-sm font-medium">
                                <Plus size={18} /> <span className="hidden sm:inline">Nova Transação</span>
                            </button>
                        )}
                        {activeModule !== 'settings' && (
                            <div className="flex items-center gap-2 md:gap-4 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <button onClick={() => setDateFilter(p => { const d = new Date(p.year, p.month - 1); return { month: d.getMonth(), year: d.getFullYear() }; })} className="p-1 hover:bg-white rounded"><ChevronLeft size={16} /></button>
                                <div className="w-24 md:w-32 text-center font-bold text-slate-700 text-xs md:text-sm">{MONTHS[dateFilter.month]} {dateFilter.year}</div>
                                <button onClick={() => setDateFilter(p => { const d = new Date(p.year, p.month + 1); return { month: d.getMonth(), year: d.getFullYear() }; })} className="p-1 hover:bg-white rounded"><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Padding inferior aumentado no mobile (pb-24) para o conteúdo não ficar atrás da navbar */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll relative pb-24 md:pb-8">
                    {activeModule === 'dashboard' && (
                        <div className="space-y-6 md:space-y-8 animate-fade-in">

                            {/* AI INSIGHTS */}
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-bold text-slate-700">Insights</h2>
                            </div>

                            {insights.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                    {insights.map(item => (
                                        <div key={item.id} className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm relative group animate-fade-in ${item.type === 'warning' ? 'bg-orange-50 border-orange-100' : item.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                                            <div className={`p-2 rounded-lg ${item.type === 'warning' ? 'bg-orange-100 text-orange-600' : item.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <item.icon size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-bold ${item.type === 'warning' ? 'text-orange-800' : item.type === 'success' ? 'text-emerald-800' : 'text-blue-800'}`}>{item.title}</h4>
                                                <p className="text-xs text-slate-600 mt-1">{item.message}</p>
                                            </div>
                                            <button onClick={() => setDismissedInsights([...dismissedInsights, item.id])} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* KPI GRID RESPONSIVO (1 coluna mobile -> 2 colunas sm -> 4 colunas lg) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <KPICard title="Receitas" value={kpiData.income} icon={TrendingUp} color="emerald" />
                                <KPICard title="Despesas" value={kpiData.expense} icon={TrendingDown} color="rose" />
                                <KPICard title="Saldo Final" value={kpiData.balance} icon={Wallet} color="blue" />
                                <KPICard title="Patrimônio Total" value={kpiData.invested} icon={Briefcase} color="teal" />
                            </div>

                            {/* EVOLUTION CHART */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base"><ArrowUpRight size={20} className="text-emerald-500" /> Evolução Patrimonial (6 Meses)</h3>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500"></div> <span className="hidden sm:inline">Total</span></span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-slate-300"></div> <span className="hidden sm:inline">Investido</span></span>
                                    </div>
                                </div>
                                <div className="h-[200px] md:h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: number, name: string) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, name]}
                                            />
                                            <Area type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                            <Area type="monotone" dataKey="Investimentos" stroke="#cbd5e1" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* GRÁFICOS INFERIORES RESPONSIVOS (Stack vertical no mobile) */}
                            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-[400px]">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[300px] lg:h-full">
                                    <h3 className="font-bold text-slate-700 mb-6">Receitas X Despesas</h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Receita', value: kpiData.income }, { name: 'Despesa', value: kpiData.expense }]} margin={{ top: 30 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{[{ name: 'Receita', value: kpiData.income }, { name: 'Despesa', value: kpiData.expense }].map((e, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#f43f5e'} />)}<LabelList dataKey="value" position="top" formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { notation: 'compact' })}`} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#475569' }} /></Bar></BarChart></ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[300px] lg:h-full">
                                    <h3 className="font-bold text-slate-700 mb-6">Composição Financeira</h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Essencial', value: kpiData.expense * 0.6 }, { name: 'Estilo de Vida', value: kpiData.expense * 0.4 }, { name: 'Investimentos', value: kpiData.invested > 0 ? kpiData.invested * 0.1 : 0 }]} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}</Pie><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">Últimas Transações</h3><span className="text-xs text-slate-400">Página {currentPage + 1} de {totalPages || 1}</span></div>

                                {/* Table Wrapper para scroll horizontal no mobile */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[500px] md:min-w-full">
                                        <thead className="text-slate-500 text-xs uppercase font-bold border-b border-slate-100"><tr><th className="py-3 px-2">Título</th><th className="py-3 px-2">Data</th><th className="py-3 px-2">Categoria</th><th className="py-3 px-2 text-right">Valor</th><th className="py-3 px-2"></th></tr></thead>
                                        <tbody className="text-sm">
                                            {paginatedTransactions.map(t => (
                                                <tr key={t.id} onClick={() => !isReadOnly && openEditTransaction(t)} className={`border-b border-slate-50 hover:bg-slate-50 transition ${!isReadOnly ? 'cursor-pointer' : ''} group`}>
                                                    <td className="py-3 px-2 font-medium text-slate-700 relative">
                                                        {t.title}
                                                        {t.user_id && userMap[t.user_id] && (
                                                            <div className={`absolute top-2 right-[-8px] w-2.5 h-2.5 rounded-full shadow-lg border border-white ${userMap[t.user_id] === 'caio@casa.com' ? 'bg-orange-500 shadow-orange-500/50' : userMap[t.user_id] === 'carla@casa.com' ? 'bg-purple-600 shadow-purple-600/50' : 'bg-slate-300'}`}></div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 text-slate-500">{formatDate(t.date)}</td>
                                                    <td className="py-3 px-2"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{t.category}</span></td>
                                                    <td className={`py-3 px-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === 'expense' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}</td>
                                                    <td className="py-3 px-2 text-right">
                                                        {!isReadOnly && (
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); openEditTransaction(t); }}
                                                                    className="text-slate-300 hover:text-indigo-500 p-2"
                                                                >
                                                                    <Edit2 size={16} className="pointer-events-none" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        deleteTransaction(t.id);
                                                                    }}
                                                                    className="relative z-50 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                                                >
                                                                    <Trash2 size={16} className="pointer-events-none" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-50">
                                    <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-4 py-2 text-sm rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50">Anterior</button>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="px-4 py-2 text-sm rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50">Próximo</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModule === 'weekly' && <WeeklyCosts
                        transactions={data.transactions}
                        configs={data.weeklyConfigs}
                        updateConfig={(idx: any, field: any, val: any) => { const n = [...data.weeklyConfigs]; n[idx] = { ...n[idx], [field]: val }; setData(p => ({ ...p, weeklyConfigs: n })); }}
                        categories={[...(data.categoryConfig.expense['ESSENCIAL'] || []), ...(data.categoryConfig.expense['ESTILO DE VIDA'] || [])]}
                        onEditTransaction={openEditTransaction}
                        onDeleteTransaction={deleteTransaction}
                        onSaveConfig={handleSaveWeeklyConfig}
                        readOnly={isReadOnly}
                    />}

                    {activeModule === 'goals' && <GoalsView
                        goals={data.goals}
                        investments={data.investments}
                        onAddGoal={handleAddGoal}
                        onEditGoal={handleEditGoal}
                        onDeleteGoal={handleDeleteGoal}
                        userMap={userMap}
                        currentUserId={session.user.id}
                        readOnly={isReadOnly}
                    />}

                    {activeModule === 'investments' && <InvestmentPortfolio
                        investments={data.investments}
                        categories={Object.values(data.categoryConfig.investment).flat()}
                        onAddInvestment={handleAddInvestment}
                        onEditInvestment={handleEditInvestment}
                        onDeleteInvestment={handleDeleteInvestment}
                        onAportar={handleInvestmentAporte}
                        userMap={userMap}
                        currentUserId={session.user.id}
                        config={data.categoryConfig}
                        readOnly={isReadOnly}
                    />}

                    {activeModule === 'settings' && <SettingsView config={data.categoryConfig} onUpdate={handleUpdateCategories} readOnly={isReadOnly} onLogout={handleLogout} />}
                </div>
            </main>

            {/* BOTTOM NAVIGATION - VISÍVEL APENAS NO MOBILE */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex justify-around p-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {navItems.map(item => {
                    const isActive = activeModule === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveModule(item.id as any)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-full ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                        >
                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium mt-1">{item.label}</span>
                        </button>
                    )
                })}
            </div>

            {txModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm" onClick={() => { setTxModalOpen(false); setEditingTransaction(null); }}>
                    <div className="bg-white md:rounded-2xl rounded-t-2xl w-full md:max-w-lg p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto relative w-[95%] md:w-full mb-4 md:mb-0 mx-auto" onClick={e => e.stopPropagation()}>
                        <TransactionFormModal editingTransaction={editingTransaction} data={data} handleSaveTransaction={handleSaveTransaction} setTxModalOpen={setTxModalOpen} setEditingTransaction={setEditingTransaction} onDelete={deleteTransaction} />
                    </div>
                </div>
            )}
        </div>
    );
}

// --- LIMPEZA: MODAL SEM RECORRÊNCIA E SEM PARCELAMENTO COMPLEXO ---
function TransactionFormModal({ editingTransaction, data, handleSaveTransaction, setTxModalOpen, setEditingTransaction, onDelete }: any) {
    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState<Partial<Transaction>>(editingTransaction || { type: 'expense', date: today, paymentMethod: 'pix', category: data.categoryConfig.expense['ESSENCIAL']?.[0] || 'Outros' });

    const [errors, setErrors] = useState<{ date?: string, title?: string }>({});

    const handleSave = () => {
        if (form.date && form.date > today) { setErrors({ date: "Data futura não permitida" }); return; }
        if (!form.title) { setErrors({ title: "Título obrigatório" }); return; }
        handleSaveTransaction(form); // Sem args extras
    };

    return (
        <div onKeyDown={e => e.key === 'Enter' && handleSave()}>
            <button onClick={() => { setTxModalOpen(false); setEditingTransaction(null); }} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition"><X size={20} /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">{editingTransaction ? 'Editar' : 'Nova'} Transação</h3>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button onClick={() => !editingTransaction && setForm({ ...form, type: 'expense' })} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${form.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Despesa</button>
                <button onClick={() => !editingTransaction && setForm({ ...form, type: 'income' })} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${form.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Receita</button>
            </div>

            <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">Título</label><input className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Mercado" />{errors.title && <p className="text-rose-500 text-xs">{errors.title}</p>}</div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Valor</label><input type="number" className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })} placeholder="R$ 0,00" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Data</label><input type="date" max={today} className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />{errors.date && <p className="text-rose-500 text-xs">{errors.date}</p>}</div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <select className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {form.type === 'expense'
                            ? (Object.entries(data.categoryConfig.expense).map(([group, items]: any) => (<optgroup key={group} label={group}>{items.map((c: string) => <option key={c} value={c}>{c}</option>)}</optgroup>)))
                            : (Object.entries(data.categoryConfig.income).map(([group, items]: any) => (<optgroup key={group} label={group}>{items.map((c: string) => <option key={c} value={c}>{c}</option>)}</optgroup>)))
                        }
                    </select>
                </div>

                {form.type === 'expense' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Forma de Pagamento</label>
                        <div className="flex flex-wrap gap-2 mb-4">{['pix', 'debit', 'boleto', 'cash'].map(m => (<button key={m} onClick={() => setForm({ ...form, paymentMethod: m as any })} className={`px-3 py-2 rounded-full text-xs font-bold border uppercase ${form.paymentMethod === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>{m === 'debit' ? 'DÉBITO' : m}</button>))}</div>
                    </div>
                )}

                <div><label className="text-xs font-bold text-slate-500 uppercase">Descrição</label><textarea className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg h-20 outline-none" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <button onClick={handleSave} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg">Salvar</button>
        </div>
    );
}

const KPICard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses: any = { emerald: 'bg-emerald-100 text-emerald-600', rose: 'bg-rose-100 text-rose-600', blue: 'bg-blue-100 text-blue-600', teal: 'bg-teal-100 text-teal-600' };
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{title}</p><h3 className="text-xl md:text-2xl font-bold text-slate-800">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3></div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}><Icon size={24} /></div>
        </div>
    );
};