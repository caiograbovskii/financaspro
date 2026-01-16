
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

        // --- GERAÇÃO DE INSIGHTS ---

        // 1. O Efeito Latte (Gastos Pequenos) - Random Chance based on seed
        const smallPurchases = currentMonthTxs.filter(t => t.type === 'expense' && t.amount < 30).reduce((a, b) => a + b.amount, 0);
        if (smallPurchases > 300 && (seed % 2 === 0)) {
            insights.push({
                id: 'latte-effect',
                type: 'warning',
                title: 'O "Efeito Cafézinho"',
                message: `Você gastou R$ ${smallPurchases.toFixed(2)} em pequenas compras (< R$ 30).`,
                icon: Coffee,
                color: 'orange'
            });
        }

        // 2. Análise de "Vício de Gastos" (Restaurantes/Delivery)
        const dining = currentMonthTxs.filter(t =>
            t.category.toLowerCase().includes('restaurante') ||
            t.category.toLowerCase().includes('ifood') ||
            t.category.toLowerCase().includes('lazer')
        ).reduce((a, b) => a + b.amount, 0);

        if (dining > income * 0.15 && income > 0) {
            insights.push({
                id: 'dining-alert',
                type: 'warning',
                title: 'Dopamina Cara',
                message: `Cuidado: ${((dining / income) * 100).toFixed(0)}% da sua renda foi para Lazer/Restaurantes.`,
                icon: AlertTriangle,
                color: 'rose'
            });
        }

        // 3. Elogio Inteligente ou Alerta de Crise
        if (health.score >= 80) {
            insights.push({
                id: 'great-score',
                type: 'success',
                title: 'Domínio Financeiro 👑',
                message: `Seu Score Financeiro é de ${health.score}/100. ${health.details}`,
                icon: Award,
                color: 'emerald'
            });
        } else if (health.score <= 40) {
            insights.push({
                id: 'crisis-mode',
                type: 'warning',
                title: 'Alerta de Saúde Financeira',
                message: `Score ${health.score}/100. ${health.details}`,
                icon: Zap,
                color: 'rose'
            });
        }

        // 4. Citação do Dia (Global - Mesma para todos no mesmo dia)
        // Usa data como seed para consistência global
        const daySeed = (today.getFullYear() * 1000) + (today.getMonth() * 31) + today.getDate();
        const quoteIndex = daySeed % DAILY_QUOTES.length;
        const dailyQuote = DAILY_QUOTES[quoteIndex];

        // 5. Oportunidade de Rebalanceamento
        const balance = income - expense;
        if (balance > 1000) {
            const lowAllocAsset = investments.sort((a, b) => (a.currentValue || 0) - (b.currentValue || 0))[0];
            if (lowAllocAsset) {
                insights.push({
                    id: 'invest-opp',
                    type: 'idea',
                    title: 'Dinheiro na Mesa',
                    message: `Sobrou R$ ${balance.toFixed(0)}. Inflação devora dinheiro parado. Aporte em "${lowAllocAsset.ticker}"?`,
                    icon: TrendingUp,
                    color: 'purple'
                });
            }
        }

        return { insights, score: health, dailyQuote };
    }
};
