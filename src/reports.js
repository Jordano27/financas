import { getTransactions } from './transactions.js';
import { getBills } from './bills.js';
import { getInvestments } from './investments.js';
import { formatCurrency, formatMonthLabel, previousMonth } from './helpers.js';

// ── Core aggregation ──────────────────────────────────────────────────────────

export function buildMonthStats(userId, month) {
    const incomes = getTransactions(userId, { month, type: 'income' });
    const expenses = getTransactions(userId, { month, type: 'expense' });
    const investments = getInvestments(userId, { month });

    // Contas fixas só entram no cálculo se o mês tiver alguma atividade real,
    // evitando que meses sem dados mostrem valores de contas fixas no histórico.
    const hasActivity = incomes.length > 0 || expenses.length > 0;
    const bills = hasActivity ? getBills(userId, { activeOnly: true, month }) : [];

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalBills = bills.reduce((s, b) => s + b.amount, 0);
    const totalInvested = investments.reduce((s, i) => s + (i.initialAmount || i.amount || 0), 0);
    const totalOutflow = totalExpense + totalBills;
    // Investimentos saem do saldo disponível (dinheiro alocado fora do consumo)
    const balance = totalIncome - totalOutflow - totalInvested;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

    // By category
    const expenseByCategory = groupByCategory(expenses);
    const incomeByCategory = groupByCategory(incomes);
    const billByCategory = groupByCategory(bills);
    const investByCategory = groupByCategory(investments);

    return {
        month,
        totalIncome,
        totalExpense,
        totalBills,
        totalOutflow,
        totalInvested,
        balance,
        savingsRate,
        incomes,
        expenses,
        bills,
        investments,
        expenseByCategory,
        incomeByCategory,
        billByCategory,
        investByCategory
    };
}

function groupByCategory(items) {
    return items.reduce((acc, item) => {
        const cat = item.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + item.amount;
        return acc;
    }, {});
}

// ── Comparisons ───────────────────────────────────────────────────────────────

export function compareMonths(userId, currentM, previousM) {
    const curr = buildMonthStats(userId, currentM);
    const prev = buildMonthStats(userId, previousM);

    return {
        current: curr,
        previous: prev,
        diff: {
            income: curr.totalIncome - prev.totalIncome,
            expense: curr.totalExpense - prev.totalExpense,
            bills: curr.totalBills - prev.totalBills,
            outflow: curr.totalOutflow - prev.totalOutflow,
            balance: curr.balance - prev.balance
        },
        pct: {
            income: pctChange(prev.totalIncome, curr.totalIncome),
            expense: pctChange(prev.totalExpense, curr.totalExpense),
            outflow: pctChange(prev.totalOutflow, curr.totalOutflow),
            balance: pctChange(prev.balance, curr.balance)
        }
    };
}

function pctChange(prev, curr) {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
}

// ── Averages across all months ────────────────────────────────────────────────

export function buildAverages(userId, months) {
    if (!months.length) return null;
    const stats = months.map(m => buildMonthStats(userId, m));
    const count = stats.length;

    return {
        avgIncome: avg(stats, 'totalIncome'),
        avgExpense: avg(stats, 'totalExpense'),
        avgBills: avg(stats, 'totalBills'),
        avgOutflow: avg(stats, 'totalOutflow'),
        avgBalance: avg(stats, 'balance'),
        avgSavings: avg(stats, 'savingsRate'),
        monthsAnalyzed: count
    };

    function avg(arr, key) {
        return arr.reduce((s, i) => s + i[key], 0) / count;
    }
}



// ── Financial health score (regra 50-30-20) ───────────────────────────────────
// Necessidades (contas fixas) → máx 50% da renda
// Desejos (gastos variáveis)  → máx 30% da renda
// Investimentos                → mín 20% da renda

export function financialHealth(stats) {
    const { totalIncome, totalExpense, totalBills, totalInvested, balance } = stats;

    if (totalIncome <= 0) {
        return { score: 0, label: 'SEM DADOS ⚪', tips: ['Sem renda registrada no mês.'], breakdown: null };
    }

    const needsPct = (totalBills / totalIncome) * 100;  // target ≤ 50
    const wantsPct = (totalExpense / totalIncome) * 100;  // target ≤ 30
    const investPct = (totalInvested / totalIncome) * 100;  // target ≥ 20

    // Pillar scores (0–100 each, weighted)
    // Needs (40% weight): 100 if ≤50%, decreasing linearly to 0 at 100%
    const needsScore = Math.max(0, Math.min(100, 100 - Math.max(0, needsPct - 50) * 2));
    // Wants (30% weight): 100 if ≤30%, decreasing linearly to 0 at 80%
    const wantsScore = Math.max(0, Math.min(100, 100 - Math.max(0, wantsPct - 30) * 2));
    // Invest (30% weight): 100 if ≥20%, drops to 0 at 0%
    const investScore = Math.max(0, Math.min(100, (investPct / 20) * 100));

    const score = Math.round(needsScore * 0.4 + wantsScore * 0.3 + investScore * 0.3);

    const tips = [];

    if (balance < 0) tips.push('🔴 Saldo negativo: seus gastos superam sua renda. Prioridade urgente.');
    if (needsPct > 50) tips.push(`🏠 Necessidades em ${needsPct.toFixed(1)}% da renda (meta: ≤ 50%). Tente renegociar contas fixas.`);
    else tips.push(`✅ Necessidades em ${needsPct.toFixed(1)}% — dentro da meta de 50%.`);
    if (wantsPct > 30) tips.push(`🛍️ Desejos em ${wantsPct.toFixed(1)}% da renda (meta: ≤ 30%). Revise gastos variáveis.`);
    else tips.push(`✅ Desejos em ${wantsPct.toFixed(1)}% — dentro da meta de 30%.`);
    if (investPct < 20) tips.push(`📈 Investimentos em ${investPct.toFixed(1)}% da renda (meta: ≥ 20%). Aumente seus aportes.`);
    else tips.push(`✅ Investimentos em ${investPct.toFixed(1)}% — acima da meta de 20%!`);

    let label;
    if (score >= 85) label = 'EXCELENTE 🟢';
    else if (score >= 65) label = 'BOA 🟡';
    else if (score >= 40) label = 'REGULAR 🟠';
    else label = 'CRÍTICA 🔴';

    return {
        score,
        label,
        tips,
        breakdown: { needsPct, wantsPct, investPct, needsScore, wantsScore, investScore }
    };
}

// ── Full health analysis (for the dedicated module) ───────────────────────────

export function buildHealthAnalysis(userId, month, months) {
    const current = buildMonthStats(userId, month);
    const health = financialHealth(current);
    const { totalIncome, totalExpense, totalBills, totalInvested, balance } = current;

    // Historical trend (last 3 months)
    const recentMonths = months.slice(-3).filter(m => m !== month);
    const history = recentMonths.map(m => {
        const s = buildMonthStats(userId, m);
        return { month: m, score: financialHealth(s).score, ...s };
    });

    // ── 50-30-20 ideal targets ────────────────────────────────────────────────
    const ideal = {
        needs: totalIncome * 0.50,
        wants: totalIncome * 0.30,
        invest: totalIncome * 0.20
    };
    const gap = {
        needs: Math.max(0, totalBills - ideal.needs),
        wants: Math.max(0, totalExpense - ideal.wants),
        invest: Math.max(0, ideal.invest - totalInvested)
    };

    // ── Projections ───────────────────────────────────────────────────────────
    // "Se mantiver como está" — project 6 months forward using current ratios
    const monthlyBalance = balance;
    const projections = Array.from({ length: 6 }, (_, i) => ({
        month: i + 1,
        cumulativeBalance: monthlyBalance * (i + 1),
        score: health.score // same score if nothing changes
    }));

    // ── Improvement plan ─────────────────────────────────────────────────────
    const plan = [];
    if (gap.needs > 0) plan.push({ pillar: 'Necessidades', action: `Reduzir contas fixas em ${fmtVal(gap.needs)}/mês (ex: renegociar planos, cancelar serviços não essenciais).`, impact: 'alto' });
    if (gap.wants > 0) plan.push({ pillar: 'Desejos', action: `Cortar gastos variáveis em ${fmtVal(gap.wants)}/mês (ex: alimentação fora, lazer, assinaturas).`, impact: 'médio' });
    if (gap.invest > 0) plan.push({ pillar: 'Investimentos', action: `Aumentar aportes em ${fmtVal(gap.invest)}/mês para atingir 20% da renda.`, impact: 'médio' });

    // Enhancement plan (if already healthy)
    const enhancements = [];
    if (health.score >= 65) {
        if (totalInvested / totalIncome < 0.30) enhancements.push('🚀 Eleve investimentos para 30% da renda para acelerar a independência financeira.');
        if (totalBills / totalIncome < 0.40) enhancements.push('🏆 Contas fixas bem controladas. Considere diversificar investimentos.');
        enhancements.push('📊 Crie uma reserva de emergência equivalente a 6 meses de despesas.');
        enhancements.push('🎯 Revise suas metas de longo prazo e aumente os aportes nas metas prioritárias.');
    }

    return {
        month,
        health,
        current: { totalIncome, totalExpense, totalBills, totalInvested, balance },
        ideal,
        gap,
        projections,
        plan,
        enhancements,
        history
    };
}

function fmtVal(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── Spending analysis (Análise de Gastos — mesma lógica do /api/insights) ────

export function buildSpendingAnalysis(userId, month) {
    const bills = getBills(userId, { activeOnly: true, month });
    const expenses = getTransactions(userId, { month, type: 'expense' });

    const groups = {};
    for (const bill of bills) {
        const cat = bill.category || 'Outros';
        if (!groups[cat]) groups[cat] = { items: [] };
        groups[cat].items.push({ name: bill.description, amount: bill.amount, source: 'conta_fixa' });
    }
    for (const exp of expenses) {
        const cat = exp.category || 'Outros';
        if (!groups[cat]) groups[cat] = { items: [] };
        groups[cat].items.push({ name: exp.description, amount: exp.amount, source: 'gasto' });
    }

    const sorted = Object.fromEntries(
        Object.entries(groups)
            .map(([cat, g]) => [cat, { ...g, total: g.items.reduce((s, i) => s + i.amount, 0) }])
            .sort((a, b) => b[1].total - a[1].total)
    );
    const total = Object.values(sorted).reduce((s, g) => s + g.total, 0);
    return { groups: sorted, total };
}

// ── Insights por mês (forecast + agrupamento de gastos) ──────────────────────

export function buildInsights(userId, month) {
    const allBills = getBills(userId, { activeOnly: true, month });
    const expenses = getTransactions(userId, { month, type: 'expense' });
    const incomes = getTransactions(userId, { month, type: 'income' });

    const spendingGroups = {};
    for (const bill of allBills) {
        const cat = bill.category || 'Outros';
        if (!spendingGroups[cat]) spendingGroups[cat] = { items: [], source: 'conta_fixa' };
        spendingGroups[cat].items.push({ name: bill.description, amount: bill.amount, source: 'conta_fixa' });
    }
    for (const exp of expenses) {
        const cat = exp.category || 'Outros';
        if (!spendingGroups[cat]) spendingGroups[cat] = { items: [], source: 'gasto' };
        spendingGroups[cat].items.push({ name: exp.description, amount: exp.amount, source: 'gasto' });
    }
    const spendingGroupsSorted = Object.fromEntries(
        Object.entries(spendingGroups)
            .map(([cat, g]) => [cat, { ...g, total: g.items.reduce((s, i) => s + i.amount, 0) }])
            .sort((a, b) => b[1].total - a[1].total)
    );
    const spendingTotal = Object.values(spendingGroupsSorted).reduce((s, g) => s + g.total, 0);

    const today = new Date();
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
    const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalBills = allBills.reduce((s, b) => s + b.amount, 0);
    const currentBalance = totalIncome - totalExpense - totalBills;
    const dailyExpenseRate = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
    const daysRemaining = daysInMonth - dayOfMonth;
    const projectedBalance = currentBalance - (dailyExpenseRate * daysRemaining);

    let negativeDayForecast = null;
    if (currentBalance > 0 && dailyExpenseRate > 0 && projectedBalance < 0) {
        negativeDayForecast = Math.floor(dayOfMonth + (currentBalance / dailyExpenseRate));
        if (negativeDayForecast > daysInMonth) negativeDayForecast = null;
    }

    const unpaidBillsTotal = allBills
        .filter(b => !(b.paidMonths || []).includes(month))
        .reduce((s, b) => s + b.amount, 0);

    return {
        forecast: {
            currentBalance, projectedBalance, dailyExpenseRate, daysRemaining,
            negativeDayForecast, totalIncome, totalExpense, totalBills,
            unpaidBillsTotal, daysInMonth, dayOfMonth, isCurrentMonth
        },
        subscriptions: { groups: spendingGroupsSorted, total: spendingTotal }
    };
}
