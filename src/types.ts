/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  local: string;
  date: string; // ISO format or parsed date string
  year: number;
  month: string; // e.g. "Março", "Abril"
  form: string;  // e.g. "À Vista", "Parcl 1"
  value: number; // Raw float number
  card: string;  // "Neon" | "Nubank" | "Inter"
  category: string; // "Alimentação" | "Habitação" | "Transporte" | "Lazer/Moda" | "Saúde" | "Outros"
  isMom?: boolean;  // True if it is for his mom (indicated by "(Mãe)")
  debited?: boolean; // True if transaction has been manually debited/cleared from balance
}

export interface CardStatement {
  month: string;
  year: number;
  card: string;
  transactions: Transaction[];
  totalFatura: number;
  creditoPaga: number;
}

export interface BankAccount {
  name: string;
  value: number;
  extras: number[];
}

export interface BudgetSummary {
  saldoBrutoTotal: number;
  despesasMensais: number;
  saldoLiquidoTotal: number;
}

export interface FinancialData {
  transactions: Transaction[];
  categories: string[];
  bankAccounts: BankAccount[];
  summary: BudgetSummary;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isStructured?: boolean;
}
