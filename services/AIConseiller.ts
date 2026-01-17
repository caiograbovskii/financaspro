
import { Transaction, Goal, InvestmentAsset, CategoryConfig } from '../types';
import { TrendingUp, AlertTriangle, Coffee, Target, Zap, Award, Brain } from 'lucide-react';

export interface Insight {
    id: string;
    type: 'success' | 'warning' | 'info' | 'idea';
    title: string;
    message: string;
    icon: any;
    color: string;
}

const DAILY_QUOTES = [
    { text: "Os planos bem elaborados levam à fartura; mas o apressado acaba na miséria.", author: "Provérbios 21:5 (NVT)", source: "Bíblia Sagrada" },
    { text: "Quem ama o dinheiro jamais terá o suficiente; quem ama a riqueza jamais ficará satisfeito.", author: "Eclesiastes 5:10 (NVT)", source: "Bíblia Sagrada" },
    { text: "A sabedoria preserva a vida de quem a possui.", author: "Eclesiastes 7:12 (NVT)", source: "Bíblia Sagrada" },
    { text: "O rico domina sobre o pobre; quem toma emprestado é escravo de quem empresta.", author: "Provérbios 22:7 (NVT)", source: "Bíblia Sagrada" },
    { text: "A riqueza obtida com desonestidade diminuirá, mas quem a ajunta aos poucos a fará aumentar.", author: "Provérbios 13:11 (NVT)", source: "Bíblia Sagrada" },
    { text: "Não trabalhe pelo dinheiro. Faça o dinheiro trabalhar para você.", author: "Robert Kiyosaki", source: "Pai Rico, Pai Pobre" },
    { text: "Ativos põem dinheiro no seu bolso. Passivos tiram dinheiro do seu bolso.", author: "Robert Kiyosaki", source: "Pai Rico, Pai Pobre" },
    { text: "Ou você controla o seu dinheiro ou ele controlará você.", author: "T. Harv Eker", source: "Segredos da Mente Milionária" },
    { text: "Uma parte de tudo que você ganha pertence a você.", author: "George S. Clason", source: "O Homem Mais Rico da Babilônia" },
    { text: "Riqueza é o que você não vê.", author: "Morgan Housel", source: "A Psicologia Financeira" },
    { text: "Enriquecer é uma questão de escolha, não de sorte.", author: "Gustavo Cerbasi", source: "Casais Inteligentes Enriquecem Juntos" },
    { text: "Pobreza não é falta de dinheiro, é falta de sabedoria.", author: "Tiago Brunet", source: "Dinheiro é Emocional" }
];

const SCORE_PHRASES = {
    high: [
        "Extraordinário! Você está no comando total.",
        "Uma fortaleza financeira inabalável.",
        "Modo Mente Milionária: ATIVADO. 🚀"
    ],
    mid: [
        "Você está no caminho certo, continue firme.",
        "Bom trabalho, mas ainda há margem para otimizar.",
        "Constância é a chave."
    ],
    low: [
        "Alerta: Precisamos estancar esse sangramento agora.",
        "Atenção total: Sua saúde financeira pede socorro.",
        "O primeiro passo para sair do buraco é parar de cavar."
    ]
};

export interface HealthScore {
    score: number;
    status: 'Critico' | 'Atencao' | 'Bom' | 'Excelente';
    details: string;
}

export const AIConseiller = {
    calculateScore: (income: number, expense: number, investments: number, goalsParams: any[]): HealthScore => {
        let score = 50; // Base start

        // 1. Savings Rate (+/- 30 pts)
        const balance = income - expense;
        const savingsRate = income > 0 ? balance / income : 0;

        if (savingsRate >= 0.20) score += 20;
        else if (savingsRate >= 0.10) score += 10;
        else if (savingsRate < 0) score -= 20;

        // 2. Investments Volume (+/- 10 pts)
        if (investments > expense * 6) score += 10; // Fundo de emergência de 6 meses aprox

        // 3. Goal Progress (+/- 10 pts)
        if (goalsParams.length > 0) {
            const avgProgress = goalsParams.reduce((a: number, b: number) => a + b, 0) / goalsParams.length;
            if (avgProgress > 0.5) score += 10;
        }

        // Cap score 0-100
        score = Math.min(100, Math.max(0, score));

        let status: HealthScore['status'] = 'Atencao';
        if (score >= 80) status = 'Excelente';
        else if (score >= 60) status = 'Bom';
        else if (score <= 30) status = 'Critico';

        return { score, status, details: '' };
    },

    analyze: (
        transactions: Transaction[],
        goals: Goal[],
        investments: InvestmentAsset[],
        config: CategoryConfig,
        month: number,
        year: number,
        seed: number = 0
    ): { insights: Insight[], score: HealthScore, dailyQuote: typeof DAILY_QUOTES[0] } => {
        const insights: Insight[] = [];
        const today = new Date();
        const currentMonthTxs = transactions.filter(t => {
            const [y, m] = t.date.split('-').map(Number);
            return m - 1 === month && y === year;
        });

        const income = currentMonthTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const expense = currentMonthTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        const totalInvested = investments.reduce((a, b) => a + (b.currentValue || 0), 0);

        // Calculate Score
        const goalProgresses = goals.map(g => (g.currentAmount || 0) / (g.targetAmount || 1));
        const health = AIConseiller.calculateScore(income, expense, totalInvested, goalProgresses);

        // Pick dynamic score status message based on seed
        const scorePhrases = health.score >= 80 ? SCORE_PHRASES.high : health.score >= 60 ? SCORE_PHRASES.mid : SCORE_PHRASES.low;
        health.details = scorePhrases[seed % scorePhrases.length];

        // --- GERAÇÃO DE INSIGHTS (Lógica Determinística e Objetiva) ---

        // 1. O Efeito Latte (Gastos Pequenos Acumulados)
        // Regra: Gastos < R$ 50 que somados representam mais de 5% da renda ou > R$ 400 absolutos
        const smallPurchases = currentMonthTxs
            .filter(t => t.type === 'expense' && t.amount < 50)
            .reduce((a, b) => a + b.amount, 0);

        if (smallPurchases > 400 || (income > 0 && smallPurchases > income * 0.05)) {
            insights.push({
                id: 'latte-effect',
                type: 'warning',
                title: 'Atenção aos Pequenos Gastos',
                message: `Pequenas compras acumularam R$ ${smallPurchases.toFixed(2)} este mês.`,
                icon: Coffee,
                color: 'orange'
            });
        }

        // 2. Análise de Estilo de Vida (Restaurantes/Lazer/Apps)
        // Regra: Categorias de lazer > 20% da renda
        const lifestyleKeywords = ['restaurante', 'ifood', 'uber', 'lazer', 'bar', 'cinema', 'streaming', 'assinatura', 'delivery'];
        const lifestyleExpense = currentMonthTxs.filter(t => {
            const cat = t.category.toLowerCase();
            return lifestyleKeywords.some(k => cat.includes(k));
        }).reduce((a, b) => a + b.amount, 0);

        if (income > 0 && lifestyleExpense > income * 0.20) {
            insights.push({
                id: 'lifestyle-alert',
                type: 'warning',
                title: 'Gastos com Estilo de Vida',
                message: `Lazer e conveniência consumiram ${((lifestyleExpense / income) * 100).toFixed(0)}% da sua renda (R$ ${lifestyleExpense.toFixed(2)}).`,
                icon: AlertTriangle,
                color: 'rose'
            });
        }

        // 3. Elogio Inteligente ou Alerta de Crise
        if (health.score >= 80) {
            insights.push({
                id: 'great-score',
                type: 'success',
                title: 'Excelente Gestão! 👑',
                message: `Seu Score Financeiro é ${health.score}/100. Você está construindo riqueza sólida.`,
                icon: Award,
                color: 'emerald'
            });
        } else if (health.score <= 40) {
            insights.push({
                id: 'crisis-mode',
                type: 'warning',
                title: 'Atenção Necessária',
                message: `Seu Score é ${health.score}/100. Revise seus gastos essenciais para equilibrar o orçamento.`,
                icon: Zap,
                color: 'rose'
            });
        }

        // 4. Metas em Risco (Novo Insight Objetivo)
        const riskGoal = goals.find(g => {
            if (!g.deadline) return false;
            const deadline = new Date(g.deadline);
            const remainingMonths = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
            const remainingAmount = g.targetAmount - g.currentAmount;
            if (remainingMonths <= 0) return remainingAmount > 0; // Já venceu e não atingiu
            // Se precisar economizar mais de 30% da renda mensal para atingir a meta, está em risco
            return (remainingMonths > 0 && (remainingAmount / remainingMonths) > (income * 0.3));
        });

        if (riskGoal) {
            insights.push({
                id: 'goal-risk',
                type: 'info',
                title: 'Meta Desafiadora',
                message: `A meta "${riskGoal.name}" exige atenção para ser atingida no prazo.`,
                icon: Target,
                color: 'blue'
            });
        }

        // 5. Citação do Dia (Global)
        const daySeed = (today.getFullYear() * 1000) + (today.getMonth() * 31) + today.getDate();
        const quoteIndex = daySeed % DAILY_QUOTES.length;
        const dailyQuote = DAILY_QUOTES[quoteIndex];

        // 6. Oportunidade de Investimento Inteligente
        // Regra: Sobrou dinheiro (> 10% da receita ou > R$ 500) E o mês está acabando (> dia 20)
        const balance = income - expense;
        if (today.getDate() > 20 && balance > 500) {
            insights.push({
                id: 'invest-opp',
                type: 'idea',
                title: 'Excedente de Caixa',
                message: `Você tem R$ ${balance.toFixed(2)} disponíveis no fim do mês. Que tal aportar em seus investimentos?`,
                icon: TrendingUp,
                color: 'purple'
            });
        }

        return { insights, score: health, dailyQuote };
    }
};
