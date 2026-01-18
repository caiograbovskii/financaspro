import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, CalendarRange, Target,
    Briefcase, Plus, ChevronLeft, ChevronRight,
    TrendingUp, TrendingDown, Wallet, Settings, LogOut, X,
    Edit2, Trash2, ArrowUpRight, AlertTriangle, Trophy, Calendar, Info, Menu,
    RefreshCcw, MessageSquare, Send, Star, User, Brain, Quote, Check
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, CartesianGrid, LabelList, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, Tooltip, YAxis
} from 'recharts';
import { supabase, isConfigured } from './supabaseClient';
import {
    Transaction, AppState, Goal, InvestmentAsset,
    DateFilter, CategoryConfig, UserRole, HistoryEntry
} from './types';
import { ToastProvider, Celebration, useToast } from './components/SharedUI';

// Importa apenas os mÓ³dulos ativos
import { WeeklyCosts, GoalsView, InvestmentPortfolio, SettingsView } from './components/Modules';
import { AIConseiller } from './services/AIConseiller';
import { ConfirmDialog } from './components/SharedUI';

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
        'ESSENCIAL': ['Casa', 'Mercado', 'Energia', 'Ógua', 'Internet', 'Transporte', 'SaÓºde'],
        'ESTILO DE VIDA': ['Lazer', 'Restaurantes', 'Compras', 'Assinaturas']
    },
    income: {
        'PRINCIPAL': ['SalÓ¡rio', 'PrÓ³-labore'],
        'EXTRAS': ['Freelance', 'Vendas', 'Outros'],
        'PASSIVA': ['Dividendos', 'AluguÓ©is']
    },
    investment: {
        'RENDA FIXA': ['CDB', 'Tesouro Direto', 'LCI/LCA', 'Poupança'],
        'RENDA VARIÓVEL': ['AçÓµes', 'FIIs', 'ETFs'],
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
            setError('ERRO: ConfiguraçÓo do Supabase ausente.');
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
// --- App Wrapper for Providers ---
export default function App() {
    return (
        <ToastProvider>
            <MainApp />
        </ToastProvider>
    );
}

function MainApp() {
    const { showToast } = useToast();
    const [session, setSession] = useState<any>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [categoryId, setCategoryId] = useState<string | null>(null);

    // Estados Principais
    const [data, setData] = useState<AppState>(INITIAL_STATE);
    const [activeModule, setActiveModule] = useState<'dashboard' | 'weekly' | 'goals' | 'investments' | 'settings'>('dashboard');
    const [dateFilter, setDateFilter] = useState<DateFilter>({ month: new Date().getMonth(), year: new Date().getFullYear() });

    const [showCelebration, setShowCelebration] = useState(false);

    // Estados de UI
    const [txModalOpen, setTxModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 5;
    const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
    const [refreshSeed, setRefreshSeed] = useState(0);
    const [mentorNotes, setMentorNotes] = useState<any[]>([]);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [smartDeleteModal, setSmartDeleteModal] = useState<{ isOpen: boolean, inv: InvestmentAsset | null }>({ isOpen: false, inv: null });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'danger' as any });


    // Perfil de Leitura (Mentora)
    const isReadOnly = session?.user?.email === 'flavia@mentora.com';

    // --- EFEITOS DE SESSÓƒO ---

    // 1. Sempre voltar para Dashboard ao recarregar
    useEffect(() => {
        setActiveModule('dashboard');
    }, []);

    // 2. Timeout de SessÓo (30 min inatividade)
    useEffect(() => {
        const checkSession = () => {
            const lastActive = localStorage.getItem('fp_last_active');
            const now = Date.now();
            if (lastActive && (now - Number(lastActive) > 30 * 60 * 1000)) {
                // SessÓo expirada
                setSession(null);
                supabase.auth.signOut();
                localStorage.removeItem('fp_last_active');
                if (session) alert('SessÓo expirada por inatividade. Por favor, faça login novamente.');
            } else {
                localStorage.setItem('fp_last_active', now.toString());
            }
        };

        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const updateActivity = () => localStorage.setItem('fp_last_active', Date.now().toString());

        activityEvents.forEach(e => window.addEventListener(e, updateActivity));
        const interval = setInterval(checkSession, 60000); // Checar a cada minuto
        updateActivity(); // Init

        return () => {
            activityEvents.forEach(e => window.removeEventListener(e, updateActivity));
            clearInterval(interval);
        };
    }, [session]);

    // --- InicializaçÓo ---
    useEffect(() => {
        // Se nÓo estiver configurado, paramos o loading para cair na tela de login
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) loadData(session.user.id);
            else setLoading(false);
        }).catch(err => {
            console.error("Erro ao verificar sessÓo:", err);
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

            // --- LOGICA DE MIGRAÓ‡ÓƒO DE DADOS ---
            if (cats.data?.config) {
                const serverConfig = cats.data.config;

                // Migrar Investimentos (de fixed/variable fixos para grupos dinÓ¢micos)
                let newInvestments: any = {};
                if (serverConfig.investment && Array.isArray(serverConfig.investment.fixed)) {
                    // Estrutura antiga detectada
                    newInvestments['RENDA FIXA'] = serverConfig.investment.fixed;
                    newInvestments['RENDA VARIÓVEL'] = serverConfig.investment.variable || [];
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

            // BUSCAR MURAL DA MENTORA (Tabela Dedicada)
            const { data: mNotes, error: mError } = await supabase
                .from('mentor_notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (mError) console.error("Erro ao buscar mural:", mError);
            setMentorNotes(mNotes || []);

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
        const income = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        const expense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // NOVA LÓGICA (BANCÓRIA):
        // Balance = Receita - Despesa.
        // Investimentos geram Despesas no momento do aporte.
        // Resgates geram Receitas no momento do resgate.
        // Portanto, o Saldo Final é simplesmente a soma das transações.

        const totalInvestedCurrent = data.investments.reduce((sum, inv) => sum + Number(inv.currentValue || 0), 0);
        const totalUnlinkedGoals = data.goals
            .filter(g => (!g.linkedInvestmentIds || g.linkedInvestmentIds.length === 0))
            .reduce((sum, g) => sum + Number(g.currentAmount || 0), 0);

        return {
            income,
            expense,
            balance: income - expense,
            invested: totalInvestedCurrent + totalUnlinkedGoals
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

            const accIncome = data.transactions
                .filter(t => t.type === 'income' && t.date <= eom)
                .reduce((a, b) => a + Number(b.amount || 0), 0);

            const accExpense = data.transactions
                .filter(t => t.type === 'expense' && t.date <= eom)
                .reduce((a, b) => a + Number(b.amount || 0), 0);

            const balance = accIncome - accExpense; // Simples e direto

            const invested = data.investments
                .filter(i => !i.purchaseDate || i.purchaseDate <= eom)
                .reduce((a, b) => a + Number(b.currentValue || 0), 0); // Use currentValue for net worth

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
    // --- AI INSIGHTS ---
    const insights = useMemo(() => {
        const analysis = AIConseiller.analyze(data.transactions, data.goals, data.investments, data.categoryConfig, dateFilter.month, dateFilter.year, refreshSeed);
        return {
            score: analysis.score,
            dailyQuote: analysis.dailyQuote,
            insights: analysis.insights.filter(i => !dismissedInsights.includes(i.id))
        };
    }, [data.transactions, data.goals, data.investments, dismissedInsights, dateFilter, refreshSeed]);

    // --- Handlers ---
    const handleUpdateCategories = async (newConfig: CategoryConfig) => {
        // Remover atualizaçÓo otimista para depuraçÓo correta de persistÓªncia
        // setData(prev => ({ ...prev, categoryConfig: newConfig })); - REMOVIDO PARA DEBUG

        console.log('[DEBUG_FLAVIA] Iniciando salvamento de categorias...', { categoryId, isConfigured });

        if (!isConfigured) {
            console.warn('[DEBUG_FLAVIA] Supabase nÓo configurado. Salvando apenas localmente.');
            setData(prev => ({ ...prev, categoryConfig: newConfig }));
            return;
        }

        if (categoryId) {
            console.log('[DEBUG_FLAVIA] Atualizando registro existente ID:', categoryId);
            const { error } = await supabase.from('categories').update({ config: newConfig }).eq('id', categoryId);
            if (error) {
                console.error('[DEBUG_FLAVIA] Erro ao atualizar:', error);
                throw error; // Propagar erro para o chamador
            }
            console.log('[DEBUG_FLAVIA] AtualizaçÓo de sucesso!');
        } else {
            console.log('[DEBUG_FLAVIA] Tentando criar novo registro de categorias...');
            const { data: ins, error } = await supabase.from('categories').insert({
                user_id: session.user.id,
                config: newConfig
            }).select().single();

            if (error) {
                console.error('[DEBUG_FLAVIA] Erro ao inserir:', error);
                throw error;
            }

            if (ins) {
                console.log('[DEBUG_FLAVIA] Registro criado com sucesso ID:', ins.id);
                setCategoryId(ins.id);
            }
        }
        // Atualiza estado local apenas se sucesso no backend
        setData(prev => ({ ...prev, categoryConfig: newConfig }));
    };

    const handleSaveWeeklyConfig = async () => {
        try {
            const key = `${dateFilter.year}-${dateFilter.month}`;
            const currentConfig = data.categoryConfig || DEFAULT_CATEGORIES;
            const currentSaved = (currentConfig as any).savedWeeks || {};
            const newConfig = { ...currentConfig, savedWeeks: { ...currentSaved, [key]: data.weeklyConfigs } };
            await handleUpdateCategories(newConfig);
            showToast(`Datas salvas!`, 'success');
        } catch (e) { console.error(e); }
    };

    // CRUD TransaçÓµes, Metas e Investimentos
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
                setShowCelebration(true);
                showToast('Meta criada com sucesso! ðŸš€', 'success');
            } else { loadData(session.user.id); }
        } else {
            // Fallback local se nÓo estiver configurado
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

        const now = new Date().toISOString();
        let safeHistory = newInv.history || [];
        const initialAmount = Number(newInv.totalInvested || 0);

        if (initialAmount > 0 && safeHistory.length === 0) {
            safeHistory = [{
                id: crypto.randomUUID(),
                date: now.split('T')[0],
                amount: initialAmount,
                description: 'Aporte Inicial',
                type: 'contribution',
                userId: session.user.id
            }];
        }

        const safeInv = {
            ...newInv,
            purchaseDate: now,
            totalInvested: initialAmount,
            currentValue: Number(newInv.currentValue || 0),
            history: safeHistory,
            user_id: session.user.id
        };

        // CRIAR TRANSAÓ‡ÓƒO DE DESPESA (FLUXO DE CAIXA)
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            title: `Investimento: ${safeInv.ticker}`,
            amount: initialAmount,
            type: 'expense',
            category: 'Investimentos',
            date: now.split('T')[0],
            paymentMethod: 'pix',
            description: `Aporte inicial em ${safeInv.ticker}`
        };

        if (isConfigured) {
            const { data: inserted, error } = await supabase.from('investments').insert({
                user_id: session.user.id,
                ticker: safeInv.ticker,
                category: safeInv.category,
                purchase_date: now,
                total_invested: safeInv.totalInvested,
                current_value: safeInv.currentValue,
                history: safeInv.history
            }).select().single();

            if (error) {
                console.error('Erro ao adicionar investimento:', error);
                showToast('Erro ao criar: ' + error.message, 'error');
                return;
            }

            // Salva TransaçÓo de SaÓ­da no Banco
            if (initialAmount > 0) {
                await supabase.from('transactions').insert(newTx);
            }

            if (inserted) {
                setData(prev => ({
                    ...prev,
                    investments: [...prev.investments, { ...safeInv, id: inserted.id }],
                    transactions: initialAmount > 0 ? [...prev.transactions, newTx] : prev.transactions
                }));
                showToast('Investimento criado com sucesso!', 'success');
            }
        } else {
            const id = Date.now().toString();
            setData(prev => ({
                ...prev,
                investments: [...prev.investments, { ...safeInv, id }],
                transactions: initialAmount > 0 ? [...prev.transactions, newTx] : prev.transactions
            }));
            showToast('Investimento criado (Local).', 'success');
        }
    };

    const handleInvestmentAporte = async (id: string, amount: number) => {
        const inv = data.investments.find(i => i.id === id);
        if (!inv) return;

        const finalAmount = Number(amount);
        const nowStr = new Date().toISOString().split('T')[0];

        // 1. Criar novo item de histÓ³rico
        const newHistoryItem: HistoryEntry = {
            id: crypto.randomUUID(),
            date: nowStr,
            amount: finalAmount,
            description: 'Aporte Adicional',
            type: 'contribution',
            userId: session.user.id
        };

        const updatedHistory = [...(inv.history || []), newHistoryItem];
        const newTotal = updatedHistory.reduce((acc, h) => acc + h.amount, 0);

        // 2. Atualizar Investimento (Soma ao total e ao atual)
        const updatedInv = {
            ...inv,
            totalInvested: newTotal,
            currentValue: Number(inv.currentValue) + finalAmount,
            history: updatedHistory
        };

        // O handleEditInvestment jÓ¡ sabe lidar com isso
        await handleEditInvestment(updatedInv);

        // 3. Gerar TransaçÓo de Despesa
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            title: `Aporte: ${inv.ticker}`,
            amount: finalAmount,
            type: 'expense',
            category: 'Investimentos',
            date: nowStr,
            paymentMethod: 'pix',
            description: `Aporte adicional de ${finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        };
        await handleSaveTransaction(newTx);
        showToast('Aporte registrado com sucesso!', 'success');
    };

    // NOVO: FunçÓo para Sincronizar (Migrar) Investimentos antigos para o modelo de TransaçÓµes
    const handleSyncInvestments = async () => {
        console.log('Iniciando sincronizaçÓo...');
        let newTxs: Transaction[] = [];

        data.investments.forEach(inv => {
            const hasHistory = inv.history && inv.history.length > 0;
            let historyToProcess = hasHistory ? inv.history : [];

            // Caso especial: Investimento antigo SEM histÓ³rico, mas COM total investido > 0
            if (!hasHistory && (inv.totalInvested || 0) > 0) {
                historyToProcess.push({
                    id: `fallback-${inv.id}`,
                    date: inv.purchaseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                    amount: Number(inv.totalInvested),
                    description: 'Saldo Inicial (Sincronizado)',
                    userId: session.user.id
                });
                console.log(`Fallback de histÓ³rico criado para: ${inv.ticker} - R$ ${inv.totalInvested}`);
            }

            (historyToProcess || []).forEach(h => {
                if (h.amount > 0) {
                    // Verifica duplicidade (Simplificado)
                    const exists = data.transactions.some(t =>
                        t.amount === Number(h.amount) &&
                        t.date === h.date &&
                        t.title.includes(inv.ticker)
                    );

                    if (!exists) {
                        console.log(`Criando transaçÓo para: ${inv.ticker} | Data: ${h.date} | Valor: ${h.amount}`);
                        newTxs.push({
                            id: crypto.randomUUID(),
                            user_id: session.user.id,
                            title: `Auto-Sync: ${inv.ticker}`,
                            amount: Number(h.amount),
                            type: 'expense',
                            category: 'Investimentos',
                            date: h.date,
                            paymentMethod: 'pix',
                            description: `SincronizaçÓo de saldo para ${inv.ticker}`
                        });
                    } else {
                        console.log(`Ignorado (jÓ¡ existe): ${inv.ticker} | R$ ${h.amount}`);
                    }
                }
            });
        });

        console.log(`Encontradas ${newTxs.length} novas transaçÓµes para sincronizar.`);

        if (newTxs.length > 0) {
            if (isConfigured) {
                const { error } = await supabase.from('transactions').insert(newTxs.map(t => ({
                    user_id: t.user_id,
                    title: t.title,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    date: t.date,
                    payment_method: t.paymentMethod,
                    description: t.description
                })));
                if (error) {
                    console.error('Erro no sync:', error);
                    showToast('Erro ao sincronizar: ' + error.message, 'error');
                    return;
                }
            }
            const allNew = [...data.transactions, ...newTxs];
            setData(prev => ({ ...prev, transactions: allNew }));
            showToast(`${newTxs.length} transaçÓµes geradas e sincronizadas!`, 'success');
        } else {
            showToast('O saldo jÓ¡ estÓ¡ sincronizado!', 'success');
        }
    };

    // NOVO: Manipulador de Resgate (Gera transaçÓo de receita)


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
        setConfirmModal({
            isOpen: true,
            title: 'Excluir TransaçÓo',
            message: 'Tem certeza que deseja remover esta transaçÓo? Essa açÓo Ó© irreversÓ­vel.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                if (isConfigured) {
                    const { error } = await supabase.from('transactions').delete().eq('id', id);
                    if (error) showToast('Erro ao excluir: ' + error.message, 'error');
                    else {
                        showToast('TransaçÓo excluÓ­da', 'success');
                        loadData(session.user.id);
                    }
                } else {
                    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
                }
            }
        });
    };
    const handleInvestmentResgate = async (id: string, amount: number) => {
        const inv = data.investments.find(i => i.id === id);
        if (!inv) return;


        const finalAmount = Number(amount);
        const now = new Date();
        const localDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (Safe date)

        // 1. Criar entrada no histÓ³rico
        const historyEntry: HistoryEntry = {
            id: crypto.randomUUID(),
            date: localDate,
            amount: -finalAmount, // Valor negativo para representar saÓ­da
            description: 'Resgate Parcial',
            type: 'withdrawal',
            userId: session.user.id
        };

        // 2. Atualizar Investimento (Reduzir CurrentValue e adicionar histÓ³rico)
        const updatedInv = {
            ...inv,
            currentValue: Math.max(0, Number(inv.currentValue) - finalAmount),
            history: [...(inv.history || []), historyEntry]
        };

        // Atualiza Investimento (Banco + Estado)
        await handleEditInvestment(updatedInv);

        // 3. Gerar TransaçÓo de Receita (LÓ³gica da Main: Update Otimista + Insert Direto)
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            title: `Resgate: ${inv.ticker}`,
            amount: finalAmount,
            type: 'income',
            category: 'Resgate de Investimento',
            date: localDate,
            paymentMethod: 'pix',
            description: `Resgate de ${finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        };

        // Update Otimista Local
        setData(prev => ({
            ...prev,
            transactions: [newTx, ...prev.transactions]
        }));

        showToast(`Resgate de R$ ${finalAmount.toFixed(2)} realizado!`, "success");

        // PersistÓªncia Direta com Mapeamento Correto
        if (isConfigured) {
            const { error } = await supabase.from('transactions').insert({
                user_id: session.user.id,
                title: newTx.title,
                amount: newTx.amount,
                type: newTx.type,
                category: newTx.category,
                date: newTx.date,
                payment_method: newTx.paymentMethod, // Mapeamento correto
                description: newTx.description
            });

            if (error) {
                console.error('Erro ao salvar transaçÓo de resgate:', error);
                showToast('Erro ao salvar transaçÓo: ' + error.message, 'error');
            } else {
                // Opcional: Recarregar para confirmar
                // loadData(session.user.id);
            }
        }
    };

    // Helper: Converte histórico de investimentos em transações de despesa para manter o saldo correto após exclusÓo
    const solidifyInvestmentHistory = async (inv: InvestmentAsset) => {
        const newTransactions: Transaction[] = [];

        // 1. Converter Histórico de Aportes
        if (inv.history && inv.history.length > 0) {
            inv.history.forEach(h => {
                if (h.amount > 0) {
                    newTransactions.push({
                        id: crypto.randomUUID(),
                        user_id: session.user.id,
                        title: `Auto-Aporte: ${inv.ticker}`,
                        amount: Number(h.amount),
                        type: 'expense',
                        category: 'Investimentos',
                        date: h.date,
                        paymentMethod: 'pix',
                        description: `Histórico preservado de ${inv.ticker}`
                    });
                }
            });
        }

        // 2. Converter Saldo Inicial (sem histórico)
        const totalHistory = (inv.history || []).filter(h => h.amount > 0).reduce((acc, h) => acc + Number(h.amount), 0);
        const initialDifference = Number(inv.totalInvested || 0) - totalHistory;

        if (initialDifference > 0) {
            const dateStr = inv.purchaseDate ? inv.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0];
            newTransactions.push({
                id: crypto.randomUUID(),
                user_id: session.user.id,
                title: `Aporte Inicial: ${inv.ticker}`,
                amount: initialDifference,
                type: 'expense',
                category: 'Investimentos',
                date: dateStr,
                paymentMethod: 'pix',
                description: `Saldo inicial preservado de ${inv.ticker}`
            });
        }

        // Persistir Transações
        if (newTransactions.length > 0) {
            // Check for duplicates before adding
            const finalTransactions = newTransactions.filter(newT => {
                return !data.transactions.some(existingT =>
                    existingT.amount === newT.amount &&
                    existingT.date === newT.date &&
                    existingT.title === newT.title
                );
            });

            if (finalTransactions.length > 0) {
                if (isConfigured) {
                    const { error } = await supabase.from('transactions').insert(finalTransactions.map(t => ({
                        user_id: t.user_id,
                        title: t.title,
                        amount: t.amount,
                        type: t.type,
                        category: t.category,
                        date: t.date,
                        payment_method: t.paymentMethod,
                        description: t.description
                    })));
                    if (error) console.error('Erro ao solidificar histórico:', error);
                }
                // Atualiza estado local
                setData(prev => ({ ...prev, transactions: [...prev.transactions, ...finalTransactions] }));
            }
        }
    };

    const handleDeleteInvestment = (id: string) => {
        const inv = data.investments.find(i => i.id === id);
        if (!inv) return;

        if (inv.currentValue > 0) {
            setSmartDeleteModal({ isOpen: true, inv });
        } else {
            setConfirmModal({
                isOpen: true,
                title: 'Excluir Investimento',
                message: 'O investimento serÓ excluído, mas seu histórico de aportes serÓ convertido em "Despesas" para nÓo alterar seu saldo contÓbil.',
                type: 'danger',
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));

                    try {
                        // 1. Converter histórico em despesas (Solidificar)
                        await solidifyInvestmentHistory(inv);

                        // 2. Excluir investimento APENAS (Manter Resgates)
                        if (isConfigured) {
                            const { error } = await supabase.from('investments').delete().eq('id', id);
                            if (error) throw error;
                        }

                        setData(prev => ({
                            ...prev,
                            investments: prev.investments.filter(i => i.id !== id)
                            // NÃO filtramos transactions de resgate mais!
                        }));

                        showToast('Investimento excluído. Histórico preservado.', 'success');
                    } catch (e: any) {
                        showToast('Erro ao excluir: ' + e.message, 'error');
                    }
                }
            });
        }
    };

    const processSmartDelete = async (action: 'liquidate' | 'delete') => {
        if (!smartDeleteModal.inv) return;
        const { id, currentValue, ticker } = smartDeleteModal.inv;
        const inv = smartDeleteModal.inv;

        try {
            if (action === 'liquidate') {
                await handleInvestmentResgate(id, currentValue);
            }

            // Ao excluir, solidifica o histÓ³rico de custo
            await solidifyInvestmentHistory(inv);

            if (isConfigured) {
                await supabase.from('investments').delete().eq('id', id);
                setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) }));
            } else {
                setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) }));
            }
            showToast('Investimento removido.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Erro ao processar.', 'error');
        }

        setSmartDeleteModal({ isOpen: false, inv: null });
    };


    const handleDeleteGoal = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Meta',
            message: 'Tem certeza que deseja excluir esta meta?',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                if (isConfigured) {
                    const { error } = await supabase.from('goals').delete().eq('id', id);
                    if (error) showToast('Erro ao excluir meta', 'error'); else loadData(session.user.id);
                } else {
                    setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
                }
            }
        });
    };

    const handleAddNote = async (message: string) => {
        try {
            console.log('[DEBUG_FLAVIA] Inserindo nota na tabela...');
            const { error } = await supabase.from('mentor_notes').insert({
                message,
                author_name: 'FlÓ¡via (Mentora)',
                author_email: session.user.email
            });

            if (error) throw error;

            await loadData(session.user.id);
            showToast('Recado enviado para a famÓ­lia!', 'success');
        } catch (error: any) {
            console.error('[DEBUG_FLAVIA] Erro ao inserir:', error);
            showToast('Erro ao salvar: ' + (error.message || 'Desconhecido'), 'error');
        }
    };

    const handleEditNote = async (id: string, newMessage: string) => {
        try {
            console.log('[DEBUG_FLAVIA] Editando ID:', id);
            const { error } = await supabase.from('mentor_notes').update({
                message: newMessage
            }).eq('id', id);

            if (error) throw error;

            await loadData(session.user.id);
            setEditingNoteId(null);
            showToast('Recado atualizado!', 'success');
        } catch (error: any) {
            console.error('[DEBUG_FLAVIA] Erro ao editar:', error);
            showToast('Erro ao atualizar: ' + (error.message || 'Desconhecido'), 'error');
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            console.log('[DEBUG_FLAVIA] Deletando ID:', id);
            const { error } = await supabase.from('mentor_notes').delete().eq('id', id);

            if (error) throw error;

            await loadData(session.user.id);
            showToast('Recado removido.', 'success');
        } catch (e: any) {
            console.error('[DEBUG_FLAVIA] Erro ao deletar:', e);
            showToast('Erro ao remover: ' + (e.message || 'Desconhecido'), 'error');
        }
    };

    const openNewTransaction = () => { setEditingTransaction(null); setTxModalOpen(true); };
    const openEditTransaction = (t: Transaction) => { setEditingTransaction(t); setTxModalOpen(true); };

    const handleLogout = () => { setSession(null); supabase.auth.signOut(); };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando FinançasPRO...</div>;

    if (!session) return <LoginScreen />;

    const paginatedTransactions = filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

    // Mapeamento dos itens de navegaçÓo para reuso (Sidebar e Bottom Nav)
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'VisÓo Geral' },
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
                    <p className="text-xs text-slate-400 pl-11">FamÓ­lia Grabovskii</p>
                </div>
                <nav className="flex-1 px-3 space-y-2">
                    {navItems.filter(i => i.id !== 'settings').map(item => (
                        <button key={item.id} onClick={() => setActiveModule(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeModule === item.id ? (item.c || 'bg-indigo-50 text-indigo-700 font-semibold') : 'text-slate-500 hover:bg-slate-50'}`}>
                            <item.icon size={20} /><span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="px-3 mt-auto space-y-2">
                    <button onClick={() => setActiveModule('settings')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${activeModule === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Settings size={20} /><span className="text-sm">ConfiguraçÓµes</span></button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-500 hover:bg-rose-50"><LogOut size={20} /><span className="text-sm">Sair</span></button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-8 shrink-0">
                    <div className="flex flex-col">
                        <div className='flex flex-col md:flex-row md:items-baseline md:gap-2'>
                            <h1 className="text-lg md:text-2xl font-bold text-slate-800 capitalize truncate max-w-[150px] md:max-w-none">
                                {activeModule === 'dashboard' ? 'VisÓo Geral' : activeModule === 'weekly' ? 'Custos Semanais' : activeModule === 'goals' ? 'Metas' : activeModule === 'investments' ? 'Investimentos' : 'ConfiguraçÓµes'}
                            </h1>
                            {activeModule === 'dashboard' && session?.user?.email && (
                                <span className="text-xs md:text-lg font-medium text-slate-500">
                                    {session.user.email === 'caio@casa.com' ? 'OlÓ¡ Caio' :
                                        session.user.email === 'carla@casa.com' ? 'OlÓ¡ Carla' :
                                            session.user.email === 'flavia@mentora.com' ? 'OlÓ¡ FlÓ¡via' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                        {activeModule === 'dashboard' && !isReadOnly && (
                            <button onClick={openNewTransaction} className="bg-slate-900 text-white px-3 md:px-5 py-2 rounded-xl flex items-center gap-2 shadow-lg text-sm font-medium">
                                <Plus size={18} /> <span className="hidden sm:inline">Nova TransaçÓo</span>
                            </button>
                        )}
                        {activeModule !== 'settings' && (
                            <div className="flex items-center gap-1 md:gap-4 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <button onClick={() => setDateFilter(p => { const d = new Date(p.year, p.month - 1); return { month: d.getMonth(), year: d.getFullYear() }; })} className="p-1 hover:bg-white rounded"><ChevronLeft size={16} /></button>
                                <div className="w-20 md:w-32 text-center font-bold text-slate-700 text-xs md:text-sm whitespace-nowrap">{MONTHS[dateFilter.month].substring(0, 3)} {dateFilter.year}</div>
                                <button onClick={() => setDateFilter(p => { const d = new Date(p.year, p.month + 1); return { month: d.getMonth(), year: d.getFullYear() }; })} className="p-1 hover:bg-white rounded"><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Padding inferior aumentado no mobile (pb-24) para o conteÓºdo nÓo ficar atrÓ¡s da navbar */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll relative pb-24 md:pb-8">
                    {activeModule === 'dashboard' && (
                        <div className="space-y-6 md:space-y-8 animate-fade-in">

                            {/* INSIGHTS SECTION (AI) */}
                            <div className="mb-8 animate-fade-in-up">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                                        <Brain size={24} className="text-indigo-600" />
                                        Consultor IA
                                    </h2>
                                    <button onClick={() => { setDismissedInsights([]); setRefreshSeed(s => s + 1); }} className="text-sm flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition">
                                        <RefreshCcw size={14} /> Atualizar AnÓ¡lise
                                    </button>
                                </div>

                                {/* Score Card */}
                                <div className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 text-2xl font-bold ${insights.score.score >= 80 ? 'border-emerald-400 text-emerald-400' : insights.score.score >= 60 ? 'border-amber-400 text-amber-400' : 'border-rose-400 text-rose-400'}`}>
                                            {insights.score.score}
                                        </div>
                                        <div>
                                            <h3 className="text-slate-300 text-sm uppercase font-bold tracking-wider">Score Financeiro</h3>
                                            <p className="text-2xl font-bold">{insights.score.status}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 border-l border-white/10 pl-0 md:pl-6 relative z-10">
                                        <p className="text-slate-300 italic text-sm md:text-base">"{insights.insights.find(i => i.id === 'daily-wisdom')?.message || 'O sucesso financeiro Ó© uma maratona, nÓo um sprint.'}"</p>
                                    </div>
                                </div>

                                {/* Cards de Insights */}
                                {insights.insights.filter(i => i.id !== 'daily-wisdom').length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                        {insights.insights.filter(i => i.id !== 'daily-wisdom').map(item => (
                                            <div key={item.id} className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm relative group animate-fade-in ${item.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : item.color === 'orange' ? 'bg-orange-50 border-orange-100' : item.color === 'rose' ? 'bg-rose-50 border-rose-100' : item.color === 'indigo' ? 'bg-indigo-50 border-indigo-100' : item.color === 'purple' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                                                <div className={`p-2 rounded-lg ${item.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : item.color === 'orange' ? 'bg-orange-100 text-orange-600' : item.color === 'rose' ? 'bg-rose-100 text-rose-600' : item.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : item.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <item.icon size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className={`text-sm font-bold ${item.color === 'emerald' ? 'text-emerald-800' : item.color === 'orange' ? 'text-orange-800' : item.color === 'rose' ? 'text-rose-800' : item.color === 'indigo' ? 'text-indigo-800' : item.color === 'purple' ? 'text-purple-800' : 'text-blue-800'}`}>{item.title}</h4>
                                                    <p className="text-xs text-slate-600 mt-1">{item.message}</p>
                                                </div>
                                                <button onClick={() => setDismissedInsights([...dismissedInsights, item.id])} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-4">
                                        <p className="text-slate-500 text-sm">Nenhum novo insight no momento. VocÓª estÓ¡ no controle!</p>
                                    </div>
                                )}

                                {/* CITAÓ‡ÓƒO DO DIA */}
                                <div className="mt-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 relative">
                                    <Quote size={40} className="absolute top-4 left-4 text-indigo-200 opacity-50" />
                                    <div className="relative z-10 pl-6 md:pl-10">
                                        <p className="text-lg font-serif italic text-slate-700 mb-3">"{insights.dailyQuote.text}"</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-px bg-indigo-200 w-8"></div>
                                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{insights.dailyQuote.author}</p>
                                            <span className="text-xs text-slate-400">â€¢ {insights.dailyQuote.source}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MURAL DA MENTORA */}
                            {(session?.user?.email === 'flavia@mentora.com' || (mentorNotes && mentorNotes.length > 0)) && (
                                <div className="mb-8 bg-[#FDF8F6] border border-orange-100 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
                                    <div className="absolute top-0 right-0 p-4 opacity-5"><User size={120} /></div>
                                    <div className="flex items-center gap-3 mb-4 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200">
                                            <Star size={20} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">Mural da Mentora</h3>
                                            <p className="text-xs text-slate-500">Recados oficiais de FlÓ¡via</p>
                                        </div>
                                    </div>

                                    {/* Se for a FlÓ¡via, mostra input */}
                                    {session?.user?.email === 'flavia@mentora.com' && (
                                        <div className="mb-6 flex gap-2 relative z-10">
                                            <input
                                                id="mentor-input"
                                                className="flex-1 bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                                placeholder="Escreva um recado para a famÓ­lia..."
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value;
                                                        if (val) { handleAddNote(val); e.currentTarget.value = ''; }
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const inp = document.getElementById('mentor-input') as HTMLInputElement;
                                                    if (inp && inp.value) { handleAddNote(inp.value); inp.value = ''; }
                                                }}
                                                className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl transition shadow-lg shadow-orange-200"
                                            >
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Lista de Recados (Filtrada por MÓªs) */}
                                    <div className="space-y-3 relative z-10">
                                        {mentorNotes && mentorNotes.filter(n => {
                                            const nDate = new Date(n.created_at);
                                            return nDate.getMonth() === dateFilter.month && nDate.getFullYear() === dateFilter.year;
                                        }).length > 0 ? (
                                            mentorNotes.filter(n => {
                                                const nDate = new Date(n.created_at);
                                                return nDate.getMonth() === dateFilter.month && nDate.getFullYear() === dateFilter.year;
                                            }).map((note: any) => (
                                                <div key={note.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-start gap-3">
                                                    <div className="mt-1 text-orange-400">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        {editingNoteId === note.id ? (
                                                            <div className="flex gap-2 w-full animate-fade-in">
                                                                <input
                                                                    type="text"
                                                                    value={editingNoteText}
                                                                    onChange={e => setEditingNoteText(e.target.value)}
                                                                    className="flex-1 p-2 border border-indigo-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-indigo-500"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleEditNote(note.id, editingNoteText)} className="text-white bg-indigo-600 p-2 rounded-lg hover:bg-indigo-700 transition" title="Salvar">
                                                                    <Send size={14} />
                                                                </button>
                                                                <button onClick={() => setEditingNoteId(null)} className="text-slate-500 p-2 hover:bg-slate-100 rounded-lg transition" title="Cancelar">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-slate-700 font-medium text-sm md:text-base mb-1">"{note.message}"</p>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">{note.author_name}</span>
                                                                        <span className="text-xs text-slate-400">{new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
                                                                    </div>
                                                                    {isReadOnly && (
                                                                        <div className="flex gap-1">
                                                                            <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.message); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar">
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Excluir">
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-slate-400 text-sm py-4 italic">Nenhum recado fixado neste mÓªs.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* KPI GRID RESPONSIVO (1 coluna mobile -> 2 colunas sm -> 4 colunas lg) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <KPICard title="Receitas" value={kpiData.income} icon={TrendingUp} color="emerald" />
                                <KPICard title="Despesas" value={kpiData.expense} icon={TrendingDown} color="rose" />
                                <KPICard title="Saldo Final" value={kpiData.balance} icon={Wallet} color="blue" />
                                <KPICard title="PatrimÓ´nio Total" value={kpiData.invested} icon={Briefcase} color="teal" />
                            </div>

                            {/* EVOLUTION CHART */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base"><ArrowUpRight size={20} className="text-emerald-500" /> EvoluçÓo Patrimonial (6 Meses)</h3>
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

                            {/* GRÓFICOS INFERIORES RESPONSIVOS (Stack vertical no mobile) */}
                            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-[400px]">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[300px] lg:h-full">
                                    <h3 className="font-bold text-slate-700 mb-6">Receitas X Despesas</h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Receita', value: kpiData.income }, { name: 'Despesa', value: kpiData.expense }]} margin={{ top: 30 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{[{ name: 'Receita', value: kpiData.income }, { name: 'Despesa', value: kpiData.expense }].map((e, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#f43f5e'} />)}<LabelList dataKey="value" position="top" formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { notation: 'compact' })}`} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#475569' }} /></Bar></BarChart></ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[300px] lg:h-full">
                                    <h3 className="font-bold text-slate-700 mb-6">ComposiçÓo Financeira</h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Essencial', value: kpiData.expense * 0.6 }, { name: 'Estilo de Vida', value: kpiData.expense * 0.4 }, { name: 'Investimentos', value: kpiData.invested > 0 ? kpiData.invested * 0.1 : 0 }]} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}</Pie><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">Óšltimas TransaçÓµes</h3><span className="text-xs text-slate-400">PÓ¡gina {currentPage + 1} de {totalPages || 1}</span></div>

                                {/* Table Wrapper para scroll horizontal no mobile */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[500px] md:min-w-full">
                                        <thead className="text-slate-500 text-xs uppercase font-bold border-b border-slate-100"><tr><th className="py-3 px-2">TÓ­tulo</th><th className="py-3 px-2">Data</th><th className="py-3 px-2">Categoria</th><th className="py-3 px-2 text-right">Valor</th><th className="py-3 px-2"></th></tr></thead>
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
                        onResgatar={handleInvestmentResgate}
                        userMap={userMap}
                        currentUserId={session.user.id}
                        config={data.categoryConfig}
                        readOnly={isReadOnly}
                    />}

                    {activeModule === 'settings' && <SettingsView config={data.categoryConfig} onUpdate={handleUpdateCategories} readOnly={isReadOnly} onLogout={handleLogout} onSync={handleSyncInvestments} />}
                </div>
            </main>

            {/* BOTTOM NAVIGATION - VISÓVEL APENAS NO MOBILE */}
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
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm p-0 md:p-4" onClick={() => { setTxModalOpen(false); setEditingTransaction(null); }}>
                    <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto relative mb-0 md:mb-0 mx-auto" onClick={e => e.stopPropagation()}>
                        <TransactionFormModal editingTransaction={editingTransaction} data={data} handleSaveTransaction={handleSaveTransaction} setTxModalOpen={setTxModalOpen} setEditingTransaction={setEditingTransaction} onDelete={deleteTransaction} />
                    </div>
                </div>
            )}
            <SmartDeleteModal
                isOpen={smartDeleteModal.isOpen}
                inv={smartDeleteModal.inv}
                onClose={() => setSmartDeleteModal({ isOpen: false, inv: null })}
                onProcess={processSmartDelete}
            />

            <ConfirmDialog {...confirmModal} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
        </div >
    );
}


// --- LIMPEZA: MODAL SEM RECORRÓŠNCIA E SEM PARCELAMENTO COMPLEXO ---
function TransactionFormModal({ editingTransaction, data, handleSaveTransaction, setTxModalOpen, setEditingTransaction, onDelete }: any) {
    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState<Partial<Transaction>>(editingTransaction || { type: 'expense', date: today, paymentMethod: 'pix', category: data.categoryConfig.expense['ESSENCIAL']?.[0] || 'Outros' });
    const [amountStr, setAmountStr] = useState(editingTransaction?.amount?.toString() || '');

    const [errors, setErrors] = useState<{ date?: string, title?: string }>({});

    const handleSave = () => {
        if (form.date && form.date > today) { setErrors({ date: "Data futura nÓo permitida" }); return; }
        if (!form.title) { setErrors({ title: "TÓ­tulo obrigatÓ³rio" }); return; }

        // Parse final amount
        const finalAmount = parseFloat(amountStr.replace(',', '.')) || 0;
        handleSaveTransaction({ ...form, amount: finalAmount });
    };

    return (
        <div onKeyDown={e => e.key === 'Enter' && handleSave()}>
            <button onClick={() => { setTxModalOpen(false); setEditingTransaction(null); }} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition"><X size={20} /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">{editingTransaction ? 'Editar' : 'Nova'} TransaçÓo</h3>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button onClick={() => !editingTransaction && setForm({ ...form, type: 'expense' })} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${form.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Despesa</button>
                <button onClick={() => !editingTransaction && setForm({ ...form, type: 'income' })} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${form.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Receita</button>
            </div>

            <div className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase">TÓ­tulo</label><input className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Mercado" />{errors.title && <p className="text-rose-500 text-xs">{errors.title}</p>}</div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Valor</label><input type="number" step="0.01" className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={amountStr} onChange={e => setAmountStr(e.target.value)} placeholder="R$ 0,00" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Data</label><input type="date" max={today} className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />{errors.date && <p className="text-rose-500 text-xs">{errors.date}</p>}</div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <select className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {form.type === 'expense'
                            ? (Object.entries(data.categoryConfig.expense || {}).map(([group, items]: any) => (<optgroup key={group} label={group}>{(items || []).map((c: string) => <option key={c} value={c}>{c}</option>)}</optgroup>)))
                            : (Object.entries(data.categoryConfig.income || {}).map(([group, items]: any) => (<optgroup key={group} label={group}>{(items || []).map((c: string) => <option key={c} value={c}>{c}</option>)}</optgroup>)))
                        }
                    </select>
                </div>

                {form.type === 'expense' && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Forma de Pagamento</label>
                        <div className="flex flex-wrap gap-2 mb-4">{['pix', 'debit', 'boleto', 'cash'].map(m => (<button key={m} onClick={() => setForm({ ...form, paymentMethod: m as any })} className={`px-3 py-2 rounded-full text-xs font-bold border uppercase ${form.paymentMethod === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>{m === 'debit' ? 'DÓ‰BITO' : m}</button>))}</div>
                    </div>
                )}

                <div><label className="text-xs font-bold text-slate-500 uppercase">DescriçÓo</label><textarea className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg h-20 outline-none" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
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


// --- SMART DELETE MODAL ---
function SmartDeleteModal({ isOpen, inv, onClose, onProcess }: { isOpen: boolean, inv: InvestmentAsset | null, onClose: () => void, onProcess: (action: 'liquidate' | 'delete') => void }) {
    if (!isOpen || !inv) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
                <h3 className="font-bold text-lg text-slate-800 mb-2">Excluir "{inv.ticker}"?</h3>
                <p className="text-sm text-slate-500 mb-6">Este investimento ainda tem <strong className="text-slate-800">R$ {inv.currentValue.toLocaleString()}</strong>. O que deseja fazer?</p>

                <div className="space-y-3">
                    <button onClick={() => onProcess('liquidate')} className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition group">
                        <div className="text-left">
                            <span className="block font-bold text-emerald-700 text-sm">Resgatar e Excluir</span>
                            <span className="block text-[10px] text-emerald-600/80">Gera receita de resgate e remove o card.</span>
                        </div>
                        <Check size={18} className="text-emerald-500" />
                    </button>

                    <button onClick={() => onProcess('delete')} className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 transition group">
                        <div className="text-left">
                            <span className="block font-bold text-rose-700 text-sm">Excluir Card (Manter Saldo)</span>
                            <span className="block text-[10px] text-rose-600/80">Apenas remove da visÓo. HistÓ³rico fica.</span>
                        </div>
                        <Trash2 size={18} className="text-rose-500" />
                    </button>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                </div>
            </div>
        </div>
    );
}
