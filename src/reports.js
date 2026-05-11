import {
    getTransactions,
    getBills,
    getInvestments,
    formatCurrency,
    formatMonthLabel,
    previousMonth
} from './transactions.js';

// ── Core aggregation ──────────────────────────────────────────────────────────

export function buildMonthStats(userId, month) {
    const incomes = getTransactions(userId, { month, type: 'income' });
    const expenses = getTransactions(userId, { month, type: 'expense' });
    const investments = getInvestments(userId, { month });

    // Contas fixas só entram no cálculo se o mês tiver alguma atividade real,
    // evitando que meses sem dados mostrem valores de contas fixas no histórico.
    const hasActivity = incomes.length > 0 || expenses.length > 0;
    const bills = hasActivity ? getBills(userId, { activeOnly: true }) : [];

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalBills = bills.reduce((s, b) => s + b.amount, 0);
    const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
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

// ── Terminal print helpers ────────────────────────────────────────────────────

export function printMonthReport(stats, chalk, Table) {
    const { month, totalIncome, totalExpense, totalBills, totalOutflow, balance, savingsRate } = stats;

    console.log('\n' + chalk.bold.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.bold.white(` 📊  RESUMO — ${formatMonthLabel(month).toUpperCase()}`));
    console.log(chalk.bold.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

    const summaryTable = new Table({
        head: [chalk.cyan('Item'), chalk.cyan('Valor')],
        colAligns: ['left', 'right']
    });
    summaryTable.push(
        [chalk.green('Total de Ganhos'), chalk.green(formatCurrency(totalIncome))],
        [chalk.red('Gastos Variáveis'), chalk.red(formatCurrency(totalExpense))],
        [chalk.yellow('Contas Fixas'), chalk.yellow(formatCurrency(totalBills))],
        [chalk.red('Total de Saídas'), chalk.red(formatCurrency(totalOutflow))],
        [balance >= 0 ? chalk.green('Saldo') : chalk.red('Saldo'),
        balance >= 0 ? chalk.green(formatCurrency(balance)) : chalk.red(formatCurrency(balance))],
        [chalk.cyan('Taxa de Poupança'), chalk.cyan(savingsRate.toFixed(1) + '%')]
    );
    console.log(summaryTable.toString());

    // Expenses by category
    if (Object.keys(stats.expenseByCategory).length) {
        console.log('\n' + chalk.bold('Gastos por Categoria:'));
        const catTable = new Table({ head: [chalk.cyan('Categoria'), chalk.cyan('Valor'), chalk.cyan('%')] });
        for (const [cat, val] of Object.entries(stats.expenseByCategory).sort((a, b) => b[1] - a[1])) {
            const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : '0.0';
            catTable.push([cat, formatCurrency(val), pct + '%']);
        }
        console.log(catTable.toString());
    }

    // Health
    const health = financialHealth(stats);
    console.log('\n' + chalk.bold(`Saúde Financeira: ${health.label}  (${health.score}/100)`));
    health.tips.forEach(t => console.log('  ' + t));
    console.log('');
}

export function printComparison(cmp, chalk, Table) {
    const { current, previous, diff, pct } = cmp;

    console.log('\n' + chalk.bold.magenta(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.bold.white(` 📈  COMPARAÇÃO: ${formatMonthLabel(previous.month).toUpperCase()} → ${formatMonthLabel(current.month).toUpperCase()}`));
    console.log(chalk.bold.magenta(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

    const t = new Table({
        head: [chalk.cyan('Item'), chalk.cyan(formatMonthLabel(previous.month)), chalk.cyan(formatMonthLabel(current.month)), chalk.cyan('Variação'), chalk.cyan('%')]
    });

    function arrow(v) { return v > 0 ? '▲' : v < 0 ? '▼' : '–'; }
    function colorDiff(v, inverse = false) {
        const good = inverse ? v < 0 : v > 0;
        const str = `${arrow(v)} ${formatCurrency(Math.abs(v))}`;
        return good ? chalk.green(str) : v === 0 ? chalk.grey(str) : chalk.red(str);
    }

    t.push(
        ['Ganhos', formatCurrency(previous.totalIncome), formatCurrency(current.totalIncome), colorDiff(diff.income), (pct.income >= 0 ? chalk.green : chalk.red)(pct.income.toFixed(1) + '%')],
        ['Gastos Variáveis', formatCurrency(previous.totalExpense), formatCurrency(current.totalExpense), colorDiff(-diff.expense, true), (pct.expense <= 0 ? chalk.green : chalk.red)(pct.expense.toFixed(1) + '%')],
        ['Contas Fixas', formatCurrency(previous.totalBills), formatCurrency(current.totalBills), colorDiff(-diff.bills, true), '–'],
        ['Total Saídas', formatCurrency(previous.totalOutflow), formatCurrency(current.totalOutflow), colorDiff(-diff.outflow, true), (pct.outflow <= 0 ? chalk.green : chalk.red)(pct.outflow.toFixed(1) + '%')],
        ['Saldo', formatCurrency(previous.balance), formatCurrency(current.balance), colorDiff(diff.balance), (pct.balance >= 0 ? chalk.green : chalk.red)(pct.balance.toFixed(1) + '%')]
    );
    console.log(t.toString());
    console.log('');
}

export function printAverages(avgs, chalk, Table) {
    if (!avgs) { console.log(chalk.yellow('Sem dados suficientes para médias.')); return; }

    console.log('\n' + chalk.bold.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.bold.white(` 📐  MÉDIAS GERAIS (${avgs.monthsAnalyzed} mês/meses analisado(s))`));
    console.log(chalk.bold.cyan(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

    const t = new Table({ head: [chalk.cyan('Métrica'), chalk.cyan('Média Mensal')], colAligns: ['left', 'right'] });
    t.push(
        [chalk.green('Ganhos'), chalk.green(formatCurrency(avgs.avgIncome))],
        [chalk.red('Gastos Variáveis'), chalk.red(formatCurrency(avgs.avgExpense))],
        [chalk.yellow('Contas Fixas'), chalk.yellow(formatCurrency(avgs.avgBills))],
        [chalk.red('Total Saídas'), chalk.red(formatCurrency(avgs.avgOutflow))],
        ['Saldo', formatCurrency(avgs.avgBalance)],
        [chalk.cyan('Taxa de Poupança'), chalk.cyan(avgs.avgSavings.toFixed(1) + '%')]
    );
    console.log(t.toString());
    console.log('');
}
