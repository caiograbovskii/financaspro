
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

export const AIConseiller = {
    analyze: (
        transactions: Transaction[],
        goals: Goal[],
        investments: InvestmentAsset[],
        config: CategoryConfig,
        month: number,
        year: number
    ): Insight[] => {
        const insights: Insight[] = [];
        const today = new Date();
        const currentMonthTxs = transactions.filter(t => {
            const [y, m] = t.date.split('-').map(Number);
            return m - 1 === month && y === year;
        });

        const income = currentMonthTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const expense = currentMonthTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        const savingsRate = income > 0 ? (income - expense) / income : 0;

        // 1. Análise de "Vício de Gastos" (Restaurantes/Delivery)
        const dining = currentMonthTxs.filter(t =>
            t.category.toLowerCase().includes('restaurante') ||
            t.category.toLowerCase().includes('ifood') ||
            t.category.toLowerCase().includes('lazer')
        ).reduce((a, b) => a + b.amount, 0);

        if (dining > income * 0.15 && income > 0) {
            insights.push({
                id: 'dining-alert',
                type: 'warning',
                title: 'Alerta de Dopamina Financeira',
                message: `Percebi que ${((dining / income) * 100).toFixed(0)}% da sua renda foi para Lazer/Restaurantes. Que tal cozinhar em casa no próximo fim de semana? Seu "Eu do Futuro" agradeceria.`,
                icon: Coffee,
                color: 'orange'
            });
        }

        // 2. Análise de Metas Estagnadas
        const stagnantGoals = goals.filter(g => {
            const progress = (g.currentAmount || 0) / (g.targetAmount || 1);
            // Assumindo estagnação se não houve aporte recente (simulação simplificada sem histórico aqui)
            // Vamos usar o progresso baixo como "alerta" se a data estiver próxima
            if (!g.deadline) return false;
            const end = new Date(g.deadline);
            const monthsLeft = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());
            return progress < 0.5 && monthsLeft < 3 && monthsLeft > 0;
        });

        if (stagnantGoals.length > 0) {
            const g = stagnantGoals[0];
            insights.push({
                id: 'goal-lag',
                type: 'idea',
                title: 'Foco na Meta: ' + g.name,
                message: `Faltam menos de 3 meses para "${g.name}" e você está na metade. Se você cortar R$ 50/semana de supérfluos, voltamos para o trilho!`,
                icon: Target,
                color: 'indigo'
            });
        }

        // 3. Elogio Inteligente (Savings Rate)
        if (savingsRate > 0.3) {
            insights.push({
                id: 'great-savings',
                type: 'success',
                title: 'Mente Milionária Ativada 🧠',
                message: `Impressionante! Você poupou ${(savingsRate * 100).toFixed(0)}% da sua renda este mês. A maioria das pessoas não passa de 10%. Continue assim!`,
                icon: Award,
                color: 'emerald'
            });
        } else if (savingsRate < 0.05 && income > 0) {
            insights.push({
                id: 'danger-zone',
                type: 'warning',
                title: 'Zona de Perigo',
                message: `Você está vivendo no limite (apenas ${(savingsRate * 100).toFixed(1)}% de margem). Um imprevisto agora seria catastrófico. Vamos rever os custos fixos?`,
                icon: AlertTriangle,
                color: 'rose'
            });
        }

        // 4. Conselho Filosófico Randômico
        const tipIndex = (month + year) % PSYCHOLOGY_TIPS.length;
        insights.push({
            id: 'daily-wisdom',
            type: 'info',
            title: 'Sabedoria Financeira',
            message: PSYCHOLOGY_TIPS[tipIndex],
            icon: Brain,
            color: 'blue'
        });

        // 5. Oportunidade de Investimento (Se houver caixa sobrando)
        const balance = income - expense;
        if (balance > 1000) {
            const lowAllocAsset = investments.sort((a, b) => (a.currentValue || 0) - (b.currentValue || 0))[0];
            if (lowAllocAsset) {
                insights.push({
                    id: 'invest-opp',
                    type: 'idea',
                    title: 'Oportunidade de Rebalanceamento',
                    message: `Sobrou R$ ${balance.toFixed(0)}. Seu ativo "${lowAllocAsset.ticker}" está com baixa alocação. Que tal aportar nele para manter o equilíbrio?`,
                    icon: Zap,
                    color: 'purple'
                });
            }
        }

        return insights;
    }
};
