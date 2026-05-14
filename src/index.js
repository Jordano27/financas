#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getCategories } from './db.js';
import { listUsers } from './users.js';
import {
    addTransaction, addBill, getBills, deleteBill, deleteTransaction,
    toggleBill, getTransactions, getAllMonths,
    currentMonth, previousMonth, formatCurrency, formatMonthLabel, todayISO
} from './transactions.js';
import { buildMonthStats, compareMonths, buildAverages, financialHealth } from './reports.js';
import { printMonthReport, printComparison, printAverages } from './cli-print.js';
import { exportSpreadsheet } from './spreadsheet.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function header() {
    console.log(chalk.bold.blue('╔════════════════════════════════════════════════╗'));
    console.log(chalk.bold.blue('║') + chalk.bold.white('        💰  GERENCIADOR FINANCEIRO  💰         ') + chalk.bold.blue('║'));
    console.log(chalk.bold.blue('╚════════════════════════════════════════════════╝'));
    console.log(chalk.grey(`  Hoje: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}\n`));
}

async function pressEnter() {
    await inquirer.prompt([{ type: 'input', name: '_', message: chalk.grey('Pressione Enter para continuar...') }]);
}

function parseAmount(input) {
    const cleaned = String(input).replace(',', '.').replace(/[^\d.]/g, '');
    const val = parseFloat(cleaned);
    if (isNaN(val) || val <= 0) return null;
    return val;
}

function validateAmount(input) {
    const v = parseAmount(input);
    if (!v) return 'Digite um valor válido maior que zero (ex: 1500 ou 1500,50)';
    return true;
}

function validateDay(input) {
    const d = parseInt(input);
    if (isNaN(d) || d < 1 || d > 31) return 'Digite um dia válido (1-31)';
    return true;
}

function validateDate(input) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return 'Formato inválido. Use YYYY-MM-DD (ex: 2025-05-15)';
    const d = new Date(input);
    if (isNaN(d.getTime())) return 'Data inválida.';
    return true;
}

// ── CLI User Selection ───────────────────────────────────────────────────────

let cliUserId;

async function selectCliUser() {
    const users = listUsers().filter(u => u.active);
    if (!users.length) {
        console.error(chalk.red('\nNenhum usuário encontrado. Crie um usuário primeiro pelo servidor web.\n'));
        process.exit(1);
    }
    if (users.length === 1) {
        cliUserId = users[0].id;
        console.log(chalk.grey(`  Usuário: ${users[0].name} <${users[0].email}>\n`));
        return;
    }
    clearScreen(); header();
    console.log(chalk.bold('👤  SELECIONAR USUÁRIO\n'));
    const { id } = await inquirer.prompt([{
        type: 'list', name: 'id', message: 'Qual usuário deseja usar?',
        choices: users.map(u => ({ name: `${u.name} <${u.email}>`, value: u.id }))
    }]);
    cliUserId = id;
}

// ── Sub-menus ─────────────────────────────────────────────────────────────────

async function menuAddIncome() {
    clearScreen(); header();
    console.log(chalk.bold.green('➕  ADICIONAR GANHO\n'));

    const categories = getCategories('income');
    const answers = await inquirer.prompt([
        { type: 'list', name: 'category', message: 'Categoria:', choices: categories },
        { type: 'input', name: 'description', message: 'Descrição:', validate: v => v.trim().length >= 2 || 'Mínimo 2 caracteres' },
        { type: 'input', name: 'amount', message: 'Valor (R$):', validate: validateAmount },
        {
            type: 'input', name: 'date', message: 'Data (YYYY-MM-DD):',
            default: todayISO(), validate: validateDate
        }
    ]);

    const t = addTransaction(cliUserId, {
        type: 'income',
        description: answers.description.trim(),
        amount: parseAmount(answers.amount),
        category: answers.category,
        date: answers.date
    });

    console.log(chalk.green(`\n✅ Ganho registrado: ${t.description} — ${formatCurrency(t.amount)}`));
    await pressEnter();
}

async function menuAddExpense() {
    clearScreen(); header();
    console.log(chalk.bold.red('➕  ADICIONAR GASTO\n'));

    const categories = getCategories('expense');
    const answers = await inquirer.prompt([
        { type: 'list', name: 'category', message: 'Categoria:', choices: categories },
        { type: 'input', name: 'description', message: 'Descrição:', validate: v => v.trim().length >= 2 || 'Mínimo 2 caracteres' },
        { type: 'input', name: 'amount', message: 'Valor (R$):', validate: validateAmount },
        {
            type: 'input', name: 'date', message: 'Data (YYYY-MM-DD):',
            default: todayISO(), validate: validateDate
        }
    ]);

    const t = addTransaction(cliUserId, {
        type: 'expense',
        description: answers.description.trim(),
        amount: parseAmount(answers.amount),
        category: answers.category,
        date: answers.date
    });

    console.log(chalk.red(`\n✅ Gasto registrado: ${t.description} — ${formatCurrency(t.amount)}`));
    await pressEnter();
}

async function menuAddBill() {
    clearScreen(); header();
    console.log(chalk.bold.yellow('➕  ADICIONAR CONTA FIXA\n'));

    const categories = getCategories('bill');
    const answers = await inquirer.prompt([
        { type: 'list', name: 'category', message: 'Categoria:', choices: categories },
        { type: 'input', name: 'description', message: 'Descrição:', validate: v => v.trim().length >= 2 || 'Mínimo 2 caracteres' },
        { type: 'input', name: 'amount', message: 'Valor (R$):', validate: validateAmount },
        { type: 'input', name: 'dueDay', message: 'Dia de vencimento (1-31):', validate: validateDay }
    ]);

    const b = addBill(cliUserId, {
        description: answers.description.trim(),
        amount: parseAmount(answers.amount),
        category: answers.category,
        dueDay: parseInt(answers.dueDay)
    });

    console.log(chalk.yellow(`\n✅ Conta registrada: ${b.description} — ${formatCurrency(b.amount)}/mês`));
    await pressEnter();
}

async function menuListBills() {
    clearScreen(); header();
    console.log(chalk.bold.yellow('📋  CONTAS FIXAS CADASTRADAS\n'));

    const bills = getBills(cliUserId);
    if (!bills.length) {
        console.log(chalk.grey('Nenhuma conta fixa cadastrada ainda.'));
        await pressEnter(); return;
    }

    const t = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Descrição'), chalk.cyan('Categoria'), chalk.cyan('Dia'), chalk.cyan('Valor'), chalk.cyan('Ativa?')]
    });
    bills.forEach((b, i) => {
        t.push([i + 1, b.description, b.category, `Dia ${b.dueDay}`, formatCurrency(b.amount), b.active ? chalk.green('Sim') : chalk.red('Não')]);
    });
    console.log(t.toString());

    const totalActive = bills.filter(b => b.active).reduce((s, b) => s + b.amount, 0);
    console.log(chalk.yellow(`\n  Total Ativo: ${formatCurrency(totalActive)}/mês`));

    const { action } = await inquirer.prompt([{
        type: 'list', name: 'action', message: 'O que deseja fazer?',
        choices: ['Ativar/Desativar conta', 'Excluir conta', chalk.grey('← Voltar')]
    }]);

    if (action === 'Ativar/Desativar conta') {
        const choices = bills.map((b, i) => ({ name: `${i + 1}. ${b.description} — ${b.active ? '✅ Ativa' : '❌ Inativa'}`, value: b.id }));
        const { id } = await inquirer.prompt([{ type: 'list', name: 'id', message: 'Selecione:', choices }]);
        toggleBill(cliUserId, id);
        console.log(chalk.green('\n✅ Status atualizado.'));
        await pressEnter();
    } else if (action === 'Excluir conta') {
        const choices = bills.map((b, i) => ({ name: `${i + 1}. ${b.description} — ${formatCurrency(b.amount)}`, value: b.id }));
        const { id } = await inquirer.prompt([{ type: 'list', name: 'id', message: 'Selecione a conta para excluir:', choices }]);
        const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: chalk.red('Confirma exclusão?'), default: false }]);
        if (confirm) { deleteBill(cliUserId, id); console.log(chalk.green('\n✅ Conta excluída.')); }
        await pressEnter();
    }
}

async function menuListTransactions() {
    clearScreen(); header();
    console.log(chalk.bold('📜  LANÇAMENTOS\n'));

    const months = getAllMonths(cliUserId);
    if (!months.length) {
        console.log(chalk.grey('Nenhum lançamento cadastrado ainda.'));
        await pressEnter(); return;
    }

    const { month } = await inquirer.prompt([{
        type: 'list', name: 'month', message: 'Selecione o mês:',
        choices: [...months].reverse().map(m => ({ name: formatMonthLabel(m), value: m })),
        default: currentMonth()
    }]);

    const { typeFilter } = await inquirer.prompt([{
        type: 'list', name: 'typeFilter', message: 'Tipo:',
        choices: [
            { name: 'Todos', value: null },
            { name: 'Ganhos', value: 'income' },
            { name: 'Gastos', value: 'expense' }
        ]
    }]);

    const items = getTransactions(cliUserId, { month, type: typeFilter });

    if (!items.length) {
        console.log(chalk.grey('\nNenhum lançamento encontrado.'));
        await pressEnter(); return;
    }

    const t = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Data'), chalk.cyan('Tipo'), chalk.cyan('Descrição'), chalk.cyan('Categoria'), chalk.cyan('Valor')]
    });
    items.forEach((item, i) => {
        const tipo = item.type === 'income' ? chalk.green('Ganho') : chalk.red('Gasto');
        const valor = item.type === 'income' ? chalk.green(formatCurrency(item.amount)) : chalk.red(formatCurrency(item.amount));
        t.push([i + 1, item.date, tipo, item.description, item.category, valor]);
    });
    console.log(t.toString());

    const { action } = await inquirer.prompt([{
        type: 'list', name: 'action', message: 'O que deseja fazer?',
        choices: ['Excluir lançamento', chalk.grey('← Voltar')]
    }]);

    if (action === 'Excluir lançamento') {
        const choices = items.map((item, i) => ({
            name: `${i + 1}. [${item.date}] ${item.description} — ${formatCurrency(item.amount)}`,
            value: item.id
        }));
        const { id } = await inquirer.prompt([{ type: 'list', name: 'id', message: 'Selecione:', choices }]);
        const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: chalk.red('Confirma exclusão?'), default: false }]);
        if (confirm) { deleteTransaction(cliUserId, id); console.log(chalk.green('\n✅ Lançamento excluído.')); }
        await pressEnter();
    }
}

async function menuReports() {
    clearScreen(); header();
    console.log(chalk.bold('📊  RELATÓRIOS\n'));

    const months = getAllMonths(cliUserId);
    if (!months.length) {
        console.log(chalk.grey('Nenhum dado cadastrado ainda. Adicione ganhos e gastos primeiro.'));
        await pressEnter(); return;
    }

    const { month } = await inquirer.prompt([{
        type: 'list', name: 'month', message: 'Selecione o mês:',
        choices: [...months].reverse().map(m => ({ name: formatMonthLabel(m), value: m })),
        default: currentMonth()
    }]);

    const { reportType } = await inquirer.prompt([{
        type: 'list', name: 'reportType', message: 'Tipo de relatório:',
        choices: [
            { name: '📋 Resumo do mês', value: 'summary' },
            { name: '📈 Comparação com mês anterior', value: 'compare' },
            { name: '📐 Médias gerais', value: 'averages' },
            { name: '📑 Todos acima', value: 'all' }
        ]
    }]);

    clearScreen(); header();
    const stats = buildMonthStats(cliUserId, month);

    if (reportType === 'summary' || reportType === 'all') {
        printMonthReport(stats, chalk, Table);
    }
    if (reportType === 'compare' || reportType === 'all') {
        const prevM = previousMonth(month);
        const cmp = compareMonths(cliUserId, month, prevM);
        printComparison(cmp, chalk, Table);
    }
    if (reportType === 'averages' || reportType === 'all') {
        const avgs = buildAverages(cliUserId, months);
        printAverages(avgs, chalk, Table);
    }

    await pressEnter();
}

async function menuExport() {
    clearScreen(); header();
    console.log(chalk.bold('📤  EXPORTAR PLANILHA EXCEL\n'));

    const months = getAllMonths(cliUserId);
    if (!months.length) {
        console.log(chalk.grey('Nenhum dado cadastrado ainda.'));
        await pressEnter(); return;
    }

    const { month } = await inquirer.prompt([{
        type: 'list', name: 'month', message: 'Selecione o mês para exportar:',
        choices: [...months].reverse().map(m => ({ name: formatMonthLabel(m), value: m })),
        default: currentMonth()
    }]);

    console.log(chalk.yellow('\n⏳ Gerando planilha...'));
    try {
        const filepath = await exportSpreadsheet(cliUserId, month);
        console.log(chalk.green(`\n✅ Planilha exportada com sucesso!`));
        console.log(chalk.white(`📁 Arquivo: ${filepath}`));
    } catch (err) {
        console.log(chalk.red(`\n❌ Erro ao exportar: ${err.message}`));
    }
    await pressEnter();
}

// ── Quick Overview ────────────────────────────────────────────────────────────

function quickOverview() {
    const month = currentMonth();
    const stats = buildMonthStats(cliUserId, month);
    const health = financialHealth(stats);

    console.log(chalk.bold(`  Mês atual: ${formatMonthLabel(month)}`));

    const t = new Table({ colWidths: [28, 20], colAligns: ['left', 'right'] });
    t.push(
        [chalk.green('Ganhos'), chalk.green(formatCurrency(stats.totalIncome))],
        [chalk.red('Gastos'), chalk.red(formatCurrency(stats.totalOutflow))],
        [stats.balance >= 0 ? chalk.green('Saldo') : chalk.red('Saldo'),
        stats.balance >= 0 ? chalk.green(formatCurrency(stats.balance)) : chalk.red(formatCurrency(stats.balance))],
        [chalk.cyan('Saúde'), chalk.cyan(health.label)]
    );
    console.log(t.toString());
}

// ── Main Menu ─────────────────────────────────────────────────────────────────

async function mainMenu() {
    while (true) {
        clearScreen();
        header();
        quickOverview();
        console.log('');

        const { choice } = await inquirer.prompt([{
            type: 'list',
            name: 'choice',
            message: chalk.bold('Menu Principal — O que deseja fazer?'),
            choices: [
                { name: chalk.green('➕  Adicionar Ganho'), value: 'income' },
                { name: chalk.red('➕  Adicionar Gasto'), value: 'expense' },
                { name: chalk.yellow('➕  Adicionar/Gerenciar Contas Fixas'), value: 'bills' },
                new inquirer.Separator(),
                { name: chalk.white('📜  Ver Lançamentos'), value: 'list' },
                { name: chalk.white('📊  Relatórios e Análises'), value: 'reports' },
                { name: chalk.white('📤  Exportar Planilha Excel'), value: 'export' },
                new inquirer.Separator(),
                { name: chalk.grey('🚪  Sair'), value: 'exit' }
            ]
        }]);

        switch (choice) {
            case 'income': await menuAddIncome(); break;
            case 'expense': await menuAddExpense(); break;
            case 'bills': await menuListBills(); break;
            case 'list': await menuListTransactions(); break;
            case 'reports': await menuReports(); break;
            case 'export': await menuExport(); break;
            case 'exit':
                clearScreen();
                console.log(chalk.bold.blue('\n  Até logo! 👋\n'));
                process.exit(0);
        }
    }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
    await selectCliUser();
    await mainMenu();
})().catch(err => {
    console.error(chalk.red('Erro fatal:'), err);
    process.exit(1);
});
