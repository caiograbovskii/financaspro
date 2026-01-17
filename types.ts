
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit' | 'boleto';

export interface HistoryEntry {
  id: string;
  date: string;
  amount: number;
  description?: string;
  type?: 'contribution' | 'withdrawal' | 'yield' | 'correction';
  userId?: string;
}

export interface Transaction {
  id: string; // UUID from Supabase
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  parentTransactionId?: string;
  user_id?: string;
}

export interface WeeklyConfig {
  weekIndex: number;
  startDate: string;
  endDate: string;
}

export interface Goal {
  id: string; // UUID
  name: string;
  reason?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  linkedInvestmentIds?: string[]; // Array de IDs para múltiplos vínculos
  history?: HistoryEntry[];
  initialAmount?: number;
  user_id?: string;
}

export interface InvestmentAsset {
  id: string; // UUID
  ticker: string;
  category: string;
  purchaseDate: string;
  totalInvested: number;
  currentValue: number;
  profitability?: {
    type: 'fixed' | 'variable';
    indexer?: string;
    rate?: number;
    expectedDy?: number;
  };
  history: HistoryEntry[];
  user_id?: string;
}

export interface CategoryConfig {
  expense: { [group: string]: string[] };
  income: { [group: string]: string[] };
  investment: { [group: string]: string[] };
  weeklyConfigs?: WeeklyConfig[];
  mentorNotes?: { id: string; message: string; date: string; author: string; type?: 'info' | 'warning' | 'star' }[];
  savedWeeks?: Record<string, WeeklyConfig[]>;
}

export interface AppState {
  transactions: Transaction[];
  goals: Goal[];
  investments: InvestmentAsset[];
  weeklyConfigs: WeeklyConfig[];
  categoryConfig: CategoryConfig;
}

export interface DateFilter {
  month: number;
  year: number;
}

export type UserRole = 'admin' | 'mentor';