/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, BankAccount, BudgetSummary, FinancialData } from '../types';
import { RAW_CSV_DATA } from '../data/raw_data';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Parses financial values like "R$ 168,14" or "R$ 1.203,32" into numbers.
 */
export function parseCurrency(valueStr: string): number {
  if (!valueStr) return 0;
  const clean = valueStr
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Matches common transaction names to appropriate categories.
 */
export function categorizeTransaction(local: string): string {
  const name = local.toLowerCase();

  if (
    name.includes('são jorge') ||
    name.includes('supermercado') ||
    name.includes('mercadinho') ||
    name.includes('atacadão') ||
    name.includes('atacadinho') ||
    name.includes('frango assado') ||
    name.includes('cacau show') ||
    name.includes('café del rio') ||
    name.includes('esparros') ||
    name.includes('refeições') ||
    name.includes('ifood') ||
    name.includes('delivery') ||
    name.includes('padaria')
  ) {
    return 'Alimentação';
  }

  if (
    name.includes('construção') ||
    name.includes('barra') || // Barão Construção
    name.includes('barão') ||
    name.includes('tavares') ||
    name.includes('karajás') ||
    name.includes('multitécnica') ||
    name.includes('multi técnica') ||
    name.includes('ferragens')
  ) {
    return 'Habitação & Reformas';
  }

  if (
    name.includes('farmácia') ||
    name.includes('drogaria') ||
    name.includes('farma') ||
    name.includes('drogasil') ||
    name.includes('pague menos') ||
    name.includes('clinicor') ||
    name.includes('médico') ||
    name.includes('hospital')
  ) {
    return 'Saúde & Cuidados';
  }

  if (
    name.includes('posto') ||
    name.includes('gasolina') ||
    name.includes('motos') ||
    name.includes('moto') ||
    name.includes('detran') ||
    name.includes('habilitação') ||
    name.includes('combustível') ||
    name.includes('oficina')
  ) {
    return 'Transporte & Auto';
  }

  if (
    name.includes('mercado livre') ||
    name.includes('shein') ||
    name.includes('shopee') ||
    name.includes('chin') || // No China
    name.includes('confecções') ||
    name.includes('moda') ||
    name.includes('vestuário') ||
    name.includes('woutlet') ||
    name.includes('outlet') ||
    name.includes('loja') ||
    name.includes('florice') ||
    name.includes('variedades') ||
    name.includes('revista') ||
    name.includes('nortista')
  ) {
    return 'Compras & Vestuário';
  }

  if (
    name.includes('cabelo') ||
    name.includes('beleza') ||
    name.includes('estética') ||
    name.includes('rozineide') ||
    name.includes('salao') ||
    name.includes('salão') ||
    name.includes('manicure')
  ) {
    return 'Beleza & Cuidados Pessoais';
  }

  if (
    name.includes('spotify') ||
    name.includes('prime video') ||
    name.includes('netflix') ||
    name.includes('whatsapp') ||
    name.includes('currículo') ||
    name.includes('seeker') ||
    name.includes('ibge') ||
    name.includes('metal pay') ||
    name.includes('meta pay') ||
    name.includes('assinatura')
  ) {
    return 'Assinaturas & Serviços';
  }

  return 'Outros & Transferências';
}

/**
 * Dynamically extract Year from transaction dates in a specific lines subset
 */
function findYearInBlock(lines: string[][]): number {
  for (const cols of lines) {
    // Left side date (index 2) or Right side date (index 7)
    const leftDate = cols[2];
    const rightDate = cols[7];

    const matchLeft = leftDate && leftDate.match(/\d{2}\/\d{2}\/(\d{4})/);
    if (matchLeft) return parseInt(matchLeft[1]);

    const matchRight = rightDate && rightDate.match(/\d{2}\/\d{2}\/(\d{4})/);
    if (matchRight) return parseInt(matchRight[1]);
  }
  return 2025; // Default safe year
}

/**
 * Parses the raw CSV string into structured, typed data objects.
 */
export function parseFinancialData(csvText: string): FinancialData {
  const lines = csvText.split('\n').map(line => {
    // Split by semicolon, clean spaces/newlines
    return line.split(';').map(cell => cell.trim());
  });

  const transactions: Transaction[] = [];
  const bankAccounts: BankAccount[] = [];
  const summary: BudgetSummary = {
    saldoBrutoTotal: 1526.40,
    despesasMensais: 338.50,
    saldoLiquidoTotal: 1187.90
  };

  let i = 0;
  while (i < lines.length) {
    const cols = lines[i];
    if (!cols || cols.length === 0) {
      i++;
      continue;
    }

    // Detect month-card headers like: ;Março;;;Neon;;Março;;;Nubank;
    // Check if cols[1] (or cols[6]) is a Month name, and we have card providers
    const isMonthLeft = cols[1] && MONTH_NAMES.includes(cols[1]);
    const isMonthRight = cols[6] && MONTH_NAMES.includes(cols[6]);

    if (isMonthLeft || isMonthRight) {
      const currentMonth = cols[1] || cols[6];
      const leftCard = cols[4] || '';
      const rightCard = cols[9] || '';

      // Find the range of the current month block to inspect the actual year
      const blockLines: string[][] = [];
      let j = i + 1;
      while (j < lines.length) {
        const checkCols = lines[j];
        if (checkCols[1] && MONTH_NAMES.includes(checkCols[1])) {
          break; // Next month block started
        }
        if (checkCols[0] && checkCols[0].includes('Renda')) {
          break; // Assets block started
        }
        blockLines.push(checkCols);
        j++;
      }

      let blockYear = findYearInBlock(blockLines);
      if ((currentMonth === 'Janeiro' || currentMonth === 'Fevereiro' || currentMonth === 'Março' || currentMonth === 'Abril' || currentMonth === 'Maio' || currentMonth === 'Junho') && blockYear === 2025) {
        blockYear = 2026;
      }

      // Now we iterate within this block to find left and right transactions
      for (const lineCols of blockLines) {
        // Skip header lines or total lines
        const leftLocal = lineCols[1] || '';
        const leftDate = lineCols[2] || '';
        const leftForm = lineCols[3] || '';
        const leftValueStr = lineCols[4] || '';

        // Left Side Parsing (e.g. Neon or Inter)
        if (
          leftLocal &&
          leftLocal !== 'LOCAL' &&
          leftLocal !== 'Total' &&
          leftLocal !== 'Cred.' &&
          leftValueStr
        ) {
          const val = parseCurrency(leftValueStr);
          if (val > 0) {
            transactions.push({
              id: `left-${blockYear}-${currentMonth}-${transactions.length}`,
              local: leftLocal,
              date: leftDate || `01/${MONTH_NAMES.indexOf(currentMonth) + 1}/${blockYear}`,
              year: blockYear,
              month: currentMonth,
              form: leftForm,
              value: val,
              card: leftCard,
              category: categorizeTransaction(leftLocal),
              isMom: leftLocal.toLowerCase().includes('(mãe)'),
              debited: true
            });
          }
        }

        // Right Side Parsing (Nubank)
        const rightLocal = lineCols[6] || '';
        const rightDate = lineCols[7] || '';
        const rightForm = lineCols[8] || '';
        const rightValueStr = lineCols[9] || '';

        if (
          rightLocal &&
          rightLocal !== 'LOCAL' &&
          rightLocal !== 'Total' &&
          rightLocal !== 'Cred.' &&
          rightValueStr
        ) {
          const val = parseCurrency(rightValueStr);
          if (val > 0) {
            transactions.push({
              id: `right-${blockYear}-${currentMonth}-${transactions.length}`,
              local: rightLocal,
              date: rightDate || `01/${MONTH_NAMES.indexOf(currentMonth) + 1}/${blockYear}`,
              year: blockYear,
              month: currentMonth,
              form: rightForm,
              value: val,
              card: rightCard,
              category: categorizeTransaction(rightLocal),
              isMom: rightLocal.toLowerCase().includes('(mãe)'),
              debited: true
            });
          }
        }
      }

      // Jump i to next block start
      i = j;
      continue;
    }

    // Detect Renda & Balances blocks:
    if (cols[0] === 'ITEM' && cols[1] === 'VALOR') {
      let j = i + 1;
      while (j < lines.length) {
        const accountCols = lines[j];
        if (!accountCols || accountCols.length < 2) {
          j++;
          continue;
        }
        if (accountCols[0] === 'Orçamento pessoal' || accountCols[1] === 'Orçamento pessoal') {
          break;
        }

        const rawName = accountCols[0] || '';
        const valStr = accountCols[1] || '';

        if (rawName && rawName !== 'ITEM' && valStr && valStr.includes('R$')) {
          const mainVal = parseCurrency(valStr);
          const extras: number[] = [];
          if (accountCols[2] && accountCols[2].includes('R$')) {
            extras.push(parseCurrency(accountCols[2]));
          }
          if (accountCols[3] && accountCols[3].includes('R$')) {
            extras.push(parseCurrency(accountCols[3]));
          }

          bankAccounts.push({
            name: rawName,
            value: mainVal,
            extras
          });
        } else if (!rawName && valStr && valStr.includes('R$') && bankAccounts.length > 0) {
          const lastAccount = bankAccounts[bankAccounts.length - 1];
          const extraVal = parseCurrency(valStr);
          if (extraVal > 0) {
            lastAccount.extras = lastAccount.extras || [];
            lastAccount.extras.push(extraVal);
          }
        }
        j++;
      }
      i = j;
      continue;
    }

    // Extracting personal budget totals from columns:
    // ;;SALDO BRUTO TOTAL;;;;;;
    // ;;R$ 1.526,4;;;;;;
    if (cols.includes('SALDO BRUTO TOTAL')) {
      // The next row typically contains the value
      const nextCols = lines[i + 1] || [];
      const val = nextCols.find(c => c.includes('R$')) || '';
      if (val) {
        summary.saldoBrutoTotal = parseCurrency(val);
      }
    }
    if (cols.includes('DESPESAS MENSAIS')) {
      const nextCols = lines[i + 1] || [];
      const val = nextCols.find(c => c.includes('R$')) || '';
      if (val) {
        summary.despesasMensais = parseCurrency(val);
      }
    }
    if (cols.includes('SALDO LÍQUIDO TOTAL')) {
      const nextCols = lines[i + 1] || [];
      const val = nextCols.find(c => c.includes('R$')) || '';
      if (val) {
        summary.saldoLiquidoTotal = parseCurrency(val);
      }
    }

    i++;
  }

  // Define unique categories extracted from parsing, combined with default ones
  const DEFAULT_CATEGORIES = [
    'Alimentação',
    'Habitação & Reformas',
    'Saúde & Cuidados',
    'Transporte & Auto',
    'Compras & Vestuário',
    'Beleza & Cuidados Pessoais',
    'Assinaturas & Serviços',
    'Outros & Transferências'
  ];
  const categories = Array.from(new Set([
    ...transactions.map(t => t.category),
    ...DEFAULT_CATEGORIES
  ]));

  // Fallback defaults for bankAccounts if parsing failed for some reason
  if (bankAccounts.length === 0) {
    bankAccounts.push(
      { name: 'Banco do Brasil', value: 257.06, extras: [] },
      { name: 'Mercado Pago', value: 950.54, extras: [] },
      { name: 'Inter', value: 262.37, extras: [700, 110] },
      { name: 'Nubank', value: 3.46, extras: [] },
      { name: 'Espécie', value: 50.00, extras: [] }
    );
  }

  // Dynamically calculate the summary based on active accounts and transactions
  const totalAccountBalance = bankAccounts.reduce((acc, b) => {
    const extrasSum = b.extras ? b.extras.reduce((s, e) => s + e, 0) : 0;
    return acc + b.value + extrasSum;
  }, 0);

  // Spent counts only debited transactions
  const totalSpent = transactions.filter(t => t.debited !== false).reduce((acc, t) => acc + t.value, 0);

  // Only debited custom transactions deduct from gross balance, because original CSV transactions
  // are already factored into the physical bank account statements.
  const customTxs = transactions.filter(t => t.id.startsWith('custom-'));
  const debitedCustomTxsSum = customTxs.filter(t => t.debited).reduce((acc, t) => acc + t.value, 0);

  summary.saldoBrutoTotal = totalAccountBalance - debitedCustomTxsSum;
  summary.despesasMensais = totalSpent;
  summary.saldoLiquidoTotal = (totalAccountBalance - debitedCustomTxsSum) - totalSpent;

  return {
    transactions,
    categories,
    bankAccounts,
    summary
  };
}
