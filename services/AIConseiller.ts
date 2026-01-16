
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

const PSYCHOLOGY_TIPS = [
    "A recompensa imediata é a inimiga da liberdade financeira futura.",
    "Pequenos vazamentos afundam grandes navios. Atenção aos gastos formiguinha!",
    "Lembre-se: Dinheiro é ferramenta, não objetivo.",
    "Ao investir, o tempo é seu maior aliado, não tente vencer o mercado, flua com ele.",
    "Antes de comprar, espere 24h. Se a vontade passar, você economizou.",
];

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
        year: number
    ): { insights: Insight[], score: HealthScore } => {
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

        // --- GERAÇÃO DE INSIGHTS ---

        // 1. O Efeito Latte (Gastos Pequenos)
        const smallPurchases = currentMonthTxs.filter(t => t.type === 'expense' && t.amount < 30).reduce((a, b) => a + b.amount, 0);
        if (smallPurchases > 300) {
            insights.push({
                id: 'latte-effect',
                type: 'warning',
                title: 'O "Efeito Cafézinho"',
                message: `Você gastou R$ ${smallPurchases.toFixed(2)} em pequenas compras (< R$ 30). Esses "gastos invisíveis" somados pagariam um jantar de luxo!`,
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
                message: `Cuidado: ${((dining / income) * 100).toFixed(0)}% da sua renda foi para Lazer/Restaurantes. Seu cérebro adora, seu bolso chora.`,
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
                message: `Seu Score Financeiro é de ${health.score}/100. Você está construindo riqueza real. Considere aumentar seus aportes em investimentos de longo prazo.`,
                icon: Award,
                color: 'emerald'
            });
        } else if (health.score <= 40) {
            insights.push({
                id: 'crisis-mode',
                type: 'warning',
                title: 'Alerta de Saúde Financeira',
                message: `Seu score está em ${health.score}/100. A luz vermelha acendeu. Foque em cortar custos não essenciais IMEDIATAMENTE.`,
                icon: Zap,
                color: 'rose'
            });
        }

        // 4. Conselho de Investimento / Filosófico
        const tipIndex = (month + year + today.getDate()) % PSYCHOLOGY_TIPS.length;
        insights.push({
            id: 'daily-wisdom',
            type: 'info',
            title: 'Insight do Dia',
            message: PSYCHOLOGY_TIPS[tipIndex],
            icon: Brain,
            color: 'indigo'
        });

        // 5. Oportunidade de Rebalanceamento
        const balance = income - expense;
        if (balance > 1000) {
            const lowAllocAsset = investments.sort((a, b) => (a.currentValue || 0) - (b.currentValue || 0))[0];
            if (lowAllocAsset) {
                insights.push({
                    id: 'invest-opp',
                    type: 'idea',
                    title: 'Dinheiro na Mesa',
                    message: `Sobrou R$ ${balance.toFixed(0)}. Não deixe parado. A inflação devora o dinheiro parado. Que tal aportar?`,
                    icon: TrendingUp,
                    color: 'purple'
                });
            }
        }

        return { insights, score: health };
    }
};
