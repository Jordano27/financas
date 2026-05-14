/**
 * src/cli-print.js
 * Helpers de impressão no terminal (chalk + cli-table3).
 * Separado de reports.js para manter reports.js como módulo de cálculo puro.
 */

import { formatCurrency, formatMonthLabel } from './helpers.js';
import { financialHealth } from './reports.js';

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

    if (Object.keys(stats.expenseByCategory).length) {
        console.log('\n' + chalk.bold('Gastos por Categoria:'));
        const catTable = new Table({ head: [chalk.cyan('Categoria'), chalk.cyan('Valor'), chalk.cyan('%')] });
        for (const [cat, val] of Object.entries(stats.expenseByCategory).sort((a, b) => b[1] - a[1])) {
            const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : '0.0';
            catTable.push([cat, formatCurrency(val), pct + '%']);
        }
        console.log(catTable.toString());
    }

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
