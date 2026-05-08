import {
    getTransactions,
    getBills,
    formatCurrency,
    formatMonthLabel,
    previousMonth
} from './transactions.js';

// ── Core aggregation ──────────────────────────────────────────────────────────

export function buildMonthStats(userId, month) {
    const incomes = getTransactions(userId, { month, type: 'income' });
    const expenses = getTransactions(userId, { month, type: 'expense' });
    const bills = getBills(userId, { activeOnly: true });

    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalBills = bills.reduce((s, b) => s + b.amount, 0);
    const totalOutflow = totalExpense + totalBills;
    const balance = totalIncome - totalOutflow;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

    // By category
    const expenseByCategory = groupByCategory(expenses);
    const incomeByCategory = groupByCategory(incomes);
    const billByCategory = groupByCategory(bills);

    return {
        month,
        totalIncome,
        totalExpense,
        totalBills,
        totalOutflow,
        balance,
        savingsRate,
        incomes,
        expenses,
        bills,
        expenseByCategory,
        incomeByCategory,
        billByCategory
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



// ── Financial health score ────────────────────────────────────────────────────

export function financialHealth(stats) {
    const { totalIncome, totalOutflow, balance, savingsRate, bills } = stats;

    let score = 100;
    const tips = [];

    // Negative balance
    if (balance < 0) {
        score -= 40;
        tips.push('⚠️  Saldo negativo: seus gastos superam sua renda.');
    }

    // Savings rate
    if (savingsRate < 0) {
        score -= 20;
    } else if (savingsRate < 10) {
        score -= 15;
        tips.push('📉 Taxa de poupança abaixo de 10%. Tente reduzir gastos variáveis.');
    } else if (savingsRate < 20) {
        score -= 5;
        tips.push('💡 Boa taxa de poupança, mas pode melhorar. Meta recomendada: 20%.');
    } else {
        tips.push('✅ Excelente taxa de poupança (acima de 20%)!');
    }

    // Bills vs income ratio
    const billRatio = totalIncome > 0 ? (bills.reduce((s, b) => s + b.amount, 0) / totalIncome) * 100 : 0;
    if (billRatio > 50) {
        score -= 20;
        tips.push('🏠 Contas fixas comprometem mais de 50% da sua renda.');
    } else if (billRatio > 30) {
        score -= 5;
        tips.push('🏠 Contas fixas comprometem mais de 30% da sua renda.');
    }

    // Expense ratio
    const expRatio = totalIncome > 0 ? (totalOutflow / totalIncome) * 100 : 0;
    if (expRatio > 90 && balance >= 0) {
        score -= 10;
        tips.push('⚡ Gastos totais acima de 90% da renda. Margem de segurança baixa.');
    }

    score = Math.max(0, Math.min(100, score));

    let label;
    if (score >= 80) { label = 'EXCELENTE 🟢'; }
    else if (score >= 60) { label = 'BOA 🟡'; }
    else if (score >= 40) { label = 'REGULAR 🟠'; }
    else { label = 'CRÍTICA 🔴'; }

    return { score, label, tips };
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
