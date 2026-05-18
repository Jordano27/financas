import ExcelJS from 'exceljs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildMonthStats, compareMonths, buildAverages, financialHealth } from './relatorio.service.js';
import { getAllMonths, currentMonth, previousMonth, formatCurrency, formatMonthLabel } from '../models/transacao.model.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Palette ───────────────────────────────────────────────────────────────────
const COLORS = {
    headerBg: '1F3864',
    headerFg: 'FFFFFF',
    incomeBg: 'E2EFDA',
    expenseBg: 'FCE4D6',
    billBg: 'FFF2CC',
    balanceGood: 'C6EFCE',
    balanceBad: 'FFC7CE',
    sectionBg: 'D9E1F2',
    altRow: 'F2F2F2',
    border: 'BFBFBF'
};

function applyBorder(cell) {
    const thin = { style: 'thin', color: { argb: COLORS.border } };
    cell.border = { top: thin, left: thin, bottom: thin, right: thin };
}

function headerCell(cell, text, bgColor = COLORS.headerBg, fgColor = COLORS.headerFg) {
    cell.value = text;
    cell.font = { bold: true, color: { argb: fgColor }, name: 'Calibri', size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(cell);
}

function dataCell(cell, value, format, bgColor) {
    cell.value = value;
    if (format) cell.numFmt = format;
    if (bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { horizontal: typeof value === 'number' ? 'right' : 'left', vertical: 'middle' };
    applyBorder(cell);
}

const BRL_FMT = '"R$"#,##0.00';
const PCT_FMT = '0.00"%"';

// ── Main export function ──────────────────────────────────────────────────────

export async function exportSpreadsheet(userId, targetMonth) {
    const month = targetMonth || currentMonth();
    const prevM = previousMonth(month);
    const allM = getAllMonths(userId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Gerenciador Financeiro';
    wb.created = new Date();

    const stats = buildMonthStats(userId, month);
    const prevStats = buildMonthStats(userId, prevM);
    const cmp = compareMonths(userId, month, prevM);
    const avgs = buildAverages(userId, allM);
    const health = financialHealth(stats);

    buildSummarySheet(wb, stats, cmp, health);
    buildTransactionsSheet(wb, stats, 'income', '💰 Ganhos', COLORS.incomeBg);
    buildTransactionsSheet(wb, stats, 'expense', '💸 Gastos', COLORS.expenseBg);
    buildBillsSheet(wb, stats);
    buildComplianceSheet(wb, stats, month);
    buildCategorySheet(wb, stats);
    buildComparisonSheet(wb, cmp);
    if (avgs) buildAveragesSheet(wb, avgs);

    const outputDir = join(__dirname, '..', 'relatorios');
    const { mkdirSync, existsSync } = await import('fs');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const filename = `financas_${month}.xlsx`;
    const filepath = join(outputDir, filename);
    await wb.xlsx.writeFile(filepath);
    return filepath;
}

// ── Sheet: Resumo ─────────────────────────────────────────────────────────────
function buildSummarySheet(wb, stats, cmp, health) {
    const ws = wb.addWorksheet('📊 Resumo', { tabColor: { argb: '1F3864' } });
    ws.columns = [
        { width: 30 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }
    ];

    // Title
    ws.mergeCells('A1:E1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `RESUMO FINANCEIRO — ${formatMonthLabel(stats.month).toUpperCase()}`;
    titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerFg }, name: 'Calibri' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    ws.addRow([]);

    // Summary table
    const sh = ['Item', 'Valor', '', '', ''];
    const hRow = ws.addRow(sh);
    ['A', 'B'].forEach(c => headerCell(ws.getCell(`${c}${hRow.number}`), hRow.getCell(c === 'A' ? 1 : 2).value));

    const rows = [
        ['Total de Ganhos', stats.totalIncome, COLORS.incomeBg],
        ['Gastos Variáveis', stats.totalExpense, COLORS.expenseBg],
        ['Contas Fixas', stats.totalBills, COLORS.billBg],
        ['Total de Saídas', stats.totalOutflow, COLORS.expenseBg],
        ['Saldo do Mês', stats.balance, stats.balance >= 0 ? COLORS.balanceGood : COLORS.balanceBad],
        ['Taxa de Poupança (%)', stats.savingsRate, stats.savingsRate >= 20 ? COLORS.balanceGood : stats.savingsRate >= 10 ? COLORS.billBg : COLORS.balanceBad]
    ];

    rows.forEach(([label, value, bg]) => {
        const r = ws.addRow([label, value]);
        r.height = 22;
        dataCell(r.getCell(1), label, null, bg);
        const fmt = label.includes('%') ? PCT_FMT : BRL_FMT;
        dataCell(r.getCell(2), value, fmt, bg);
        r.getCell(1).font = { bold: true, name: 'Calibri' };
    });

    ws.addRow([]);

    // Financial health block
    const hh = ws.addRow(['SAÚDE FINANCEIRA']);
    ws.mergeCells(`A${hh.number}:E${hh.number}`);
    headerCell(ws.getCell(`A${hh.number}`), 'SAÚDE FINANCEIRA');
    hh.height = 24;

    const scoreRow = ws.addRow([`Pontuação: ${health.score}/100   ${health.label}`]);
    ws.mergeCells(`A${scoreRow.number}:E${scoreRow.number}`);
    scoreRow.getCell(1).font = { bold: true, size: 13, name: 'Calibri' };
    scoreRow.getCell(1).alignment = { horizontal: 'center' };
    scoreRow.height = 26;

    health.tips.forEach(tip => {
        const tr = ws.addRow([tip]);
        ws.mergeCells(`A${tr.number}:E${tr.number}`);
        tr.getCell(1).alignment = { wrapText: true };
        tr.height = 20;
    });
}

// ── Sheet: Transactions (income / expense) ────────────────────────────────────
function buildTransactionsSheet(wb, stats, type, title, rowColor) {
    const ws = wb.addWorksheet(title, { tabColor: { argb: type === 'income' ? '70AD47' : 'FF0000' } });
    ws.columns = [
        { key: 'date', header: 'Data', width: 14 },
        { key: 'description', header: 'Descrição', width: 35 },
        { key: 'category', header: 'Categoria', width: 22 },
        { key: 'amount', header: 'Valor (R$)', width: 18 }
    ];

    const items = type === 'income' ? stats.incomes : stats.expenses;

    // Header row
    const hr = ws.getRow(1);
    ['Data', 'Descrição', 'Categoria', 'Valor (R$)'].forEach((h, i) => {
        headerCell(hr.getCell(i + 1), h);
    });
    hr.height = 24;

    items.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? rowColor : COLORS.altRow;
        const r = ws.addRow({
            date: item.date,
            description: item.description,
            category: item.category,
            amount: item.amount
        });
        r.height = 20;
        dataCell(r.getCell(1), item.date, null, bg);
        dataCell(r.getCell(2), item.description, null, bg);
        dataCell(r.getCell(3), item.category, null, bg);
        dataCell(r.getCell(4), item.amount, BRL_FMT, bg);
    });

    // Total row
    if (items.length) {
        const total = items.reduce((s, t) => s + t.amount, 0);
        const tr = ws.addRow(['', 'TOTAL', '', total]);
        tr.height = 22;
        tr.eachCell(c => applyBorder(c));
        tr.getCell(2).font = { bold: true };
        tr.getCell(4).numFmt = BRL_FMT;
        tr.getCell(4).font = { bold: true };
    }

    // Auto filter
    ws.autoFilter = { from: 'A1', to: 'D1' };
}

// ── Sheet: Bills ──────────────────────────────────────────────────────────────
function buildBillsSheet(wb, stats) {
    const ws = wb.addWorksheet('📋 Contas Fixas', { tabColor: { argb: 'FFC000' } });
    ws.columns = [
        { width: 35 }, { width: 22 }, { width: 14 }, { width: 18 }, { width: 12 }
    ];

    const hr = ws.getRow(1);
    ['Descrição', 'Categoria', 'Vencimento (Dia)', 'Valor (R$)', 'Ativa?'].forEach((h, i) => {
        headerCell(hr.getCell(i + 1), h);
    });
    hr.height = 24;

    stats.bills.forEach((bill, idx) => {
        const bg = idx % 2 === 0 ? COLORS.billBg : COLORS.altRow;
        const r = ws.addRow([bill.description, bill.category, `Dia ${bill.dueDay}`, bill.amount, bill.active ? 'Sim' : 'Não']);
        r.height = 20;
        r.eachCell(c => { applyBorder(c); c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }; });
        r.getCell(4).numFmt = BRL_FMT;
    });

    // Total
    if (stats.bills.length) {
        const tr = ws.addRow(['', 'TOTAL MENSAL', '', stats.totalBills, '']);
        tr.height = 22;
        tr.getCell(2).font = { bold: true };
        tr.getCell(4).numFmt = BRL_FMT;
        tr.getCell(4).font = { bold: true };
        tr.eachCell(c => applyBorder(c));
    }
}

// ── Sheet: Categories ─────────────────────────────────────────────────────────
function buildCategorySheet(wb, stats) {
    const ws = wb.addWorksheet('🏷️ Categorias', { tabColor: { argb: '7030A0' } });
    ws.columns = [{ width: 8 }, { width: 30 }, { width: 20 }, { width: 14 }];

    let row = 1;

    const sections = [
        { title: 'GANHOS POR CATEGORIA', data: stats.incomeByCategory, total: stats.totalIncome, bg: COLORS.incomeBg },
        { title: 'GASTOS POR CATEGORIA', data: stats.expenseByCategory, total: stats.totalExpense, bg: COLORS.expenseBg },
        { title: 'CONTAS FIXAS POR CATEGORIA', data: stats.billByCategory, total: stats.totalBills, bg: COLORS.billBg }
    ];

    sections.forEach(sec => {
        const hRow = ws.getRow(row++);
        ws.mergeCells(`A${hRow.number}:D${hRow.number}`);
        headerCell(ws.getCell(`A${hRow.number}`), sec.title);
        hRow.height = 24;

        // Column headers
        const chRow = ws.getRow(row++);
        ['#', 'Categoria', 'Valor (R$)', '% do Total'].forEach((h, i) => {
            headerCell(chRow.getCell(i + 1), h, COLORS.sectionBg, '000000');
        });

        const sorted = Object.entries(sec.data).sort((a, b) => b[1] - a[1]);
        sorted.forEach(([cat, val], idx) => {
            const pct = sec.total > 0 ? (val / sec.total) * 100 : 0;
            const bg = idx % 2 === 0 ? sec.bg : COLORS.altRow;
            const r = ws.getRow(row++);
            dataCell(r.getCell(1), idx + 1, null, bg);
            dataCell(r.getCell(2), cat, null, bg);
            dataCell(r.getCell(3), val, BRL_FMT, bg);
            dataCell(r.getCell(4), pct, PCT_FMT, bg);
            r.height = 20;
        });

        row++; // blank separator
    });
}

// ── Sheet: Compliance (Adimplência / Inadimplência) ──────────────────────────
function buildComplianceSheet(wb, stats, month) {
    const ws = wb.addWorksheet('✅❌ Adim. & Inadim.', { tabColor: { argb: '70AD47' } });
    ws.columns = [{ width: 35 }, { width: 22 }, { width: 20 }, { width: 18 }, { width: 14 }];

    // Title
    ws.mergeCells('A1:E1');
    headerCell(ws.getCell('A1'), `ADIMPLÊNCIA & INADIMPLÊNCIA — ${formatMonthLabel(month).toUpperCase()}`);
    ws.getRow(1).height = 30;

    ws.addRow([]);

    // Compute metrics
    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const activeBills = (stats.bills || []).filter(b => b.active);
    const paidBills = activeBills.filter(b => (b.paidMonths || []).includes(month));
    const overdueBills = activeBills.filter(b => {
        const isPaid = (b.paidMonths || []).includes(month);
        if (isPaid) return false;
        if (month < currentYM) return true;
        if (month > currentYM) return false;
        return today.getDate() > b.dueDay;
    });
    const totalCount = activeBills.length;
    const paidCount = paidBills.length;
    const paidValue = paidBills.reduce((s, b) => s + b.amount, 0);
    const paidPct = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
    const unpaidCount = overdueBills.length;
    const unpaidValue = overdueBills.reduce((s, b) => s + b.amount, 0);
    const unpaidPct = totalCount > 0 ? (unpaidCount / totalCount) * 100 : 0;

    // Summary block
    const summaryRows = [
        ['Total de contas fixas ativas', totalCount, null, COLORS.sectionBg],
        ['✓ Contas pagas', paidCount, null, COLORS.incomeBg],
        ['✓ Valor pago', paidValue, BRL_FMT, COLORS.incomeBg],
        ['✓ Adimplência (%)', paidPct, PCT_FMT, COLORS.incomeBg],
        ['⚠ Contas vencidas', unpaidCount, null, unpaidCount === 0 ? COLORS.incomeBg : COLORS.expenseBg],
        ['⚠ Valor vencido', unpaidValue, BRL_FMT, unpaidCount === 0 ? COLORS.incomeBg : COLORS.expenseBg],
        ['⚠ Inadimplência (%)', unpaidPct, PCT_FMT, unpaidCount === 0 ? COLORS.incomeBg : COLORS.expenseBg]
    ];

    const shRow = ws.addRow(['Métrica', 'Valor']);
    headerCell(shRow.getCell(1), 'Métrica', COLORS.sectionBg, '000000');
    headerCell(shRow.getCell(2), 'Valor', COLORS.sectionBg, '000000');
    shRow.height = 22;

    summaryRows.forEach(([label, value, fmt, bg]) => {
        const r = ws.addRow([label, value]);
        r.height = 22;
        dataCell(r.getCell(1), label, null, bg);
        dataCell(r.getCell(2), value, fmt, bg);
        r.getCell(1).font = { bold: true };
    });

    ws.addRow([]);

    // Paid bills detail
    if (paidBills.length > 0) {
        const ph = ws.addRow(['CONTAS PAGAS NO MÊS', '', '', '', '']);
        ws.mergeCells(`A${ph.number}:E${ph.number}`);
        headerCell(ws.getCell(`A${ph.number}`), 'CONTAS PAGAS NO MÊS', '70AD47', 'FFFFFF');
        ph.height = 22;

        const pdh = ws.addRow(['Descrição', 'Categoria', 'Vencimento (Dia)', 'Valor (R$)', '']);
        ['A', 'B', 'C', 'D'].forEach((c, i) => headerCell(ws.getCell(`${c}${pdh.number}`), pdh.getCell(i + 1).value, COLORS.sectionBg, '000000'));
        pdh.height = 20;

        paidBills.forEach((b, idx) => {
            const bg = idx % 2 === 0 ? COLORS.incomeBg : COLORS.altRow;
            const r = ws.addRow([b.description, b.category, `Dia ${b.dueDay}`, b.amount, '']);
            r.height = 20;
            dataCell(r.getCell(1), b.description, null, bg);
            dataCell(r.getCell(2), b.category, null, bg);
            dataCell(r.getCell(3), `Dia ${b.dueDay}`, null, bg);
            dataCell(r.getCell(4), b.amount, BRL_FMT, bg);
        });

        ws.addRow([]);
    }

    // Unpaid bills detail (all active bills not paid this month)
    const unpaidBills = activeBills.filter(b => !(b.paidMonths || []).includes(month));
    if (unpaidBills.length > 0) {
        const uph = ws.addRow(['CONTAS NÃO PAGAS NO MÊS', '', '', '', '']);
        ws.mergeCells(`A${uph.number}:E${uph.number}`);
        headerCell(ws.getCell(`A${uph.number}`), 'CONTAS NÃO PAGAS NO MÊS', 'FFC000', '000000');
        uph.height = 22;

        const updh = ws.addRow(['Descrição', 'Categoria', 'Vencimento (Dia)', 'Valor (R$)', 'Vencida?']);
        ['A', 'B', 'C', 'D', 'E'].forEach((c, i) => headerCell(ws.getCell(`${c}${updh.number}`), updh.getCell(i + 1).value, COLORS.sectionBg, '000000'));
        updh.height = 20;

        unpaidBills.forEach((b, idx) => {
            const isOverdue = overdueBills.some(o => o.id === b.id);
            const bg = isOverdue ? (idx % 2 === 0 ? COLORS.expenseBg : COLORS.altRow) : (idx % 2 === 0 ? COLORS.billBg : COLORS.altRow);
            const r = ws.addRow([b.description, b.category, `Dia ${b.dueDay}`, b.amount, isOverdue ? 'Sim' : 'Não']);
            r.height = 20;
            dataCell(r.getCell(1), b.description, null, bg);
            dataCell(r.getCell(2), b.category, null, bg);
            dataCell(r.getCell(3), `Dia ${b.dueDay}`, null, bg);
            dataCell(r.getCell(4), b.amount, BRL_FMT, bg);
            dataCell(r.getCell(5), isOverdue ? 'Sim' : 'Não', null, bg);
            if (isOverdue) r.getCell(5).font = { bold: true, color: { argb: 'C00000' } };
        });

        ws.addRow([]);
    }

    // Overdue bills detail
    if (overdueBills.length > 0) {
        const oh = ws.addRow(['CONTAS VENCIDAS (INADIMPLENTES)', '', '', '', '']);
        ws.mergeCells(`A${oh.number}:E${oh.number}`);
        headerCell(ws.getCell(`A${oh.number}`), 'CONTAS VENCIDAS (INADIMPLENTES)', 'C00000', 'FFFFFF');
        oh.height = 22;

        const odh = ws.addRow(['Descrição', 'Categoria', 'Vencimento (Dia)', 'Valor (R$)', '']);
        ['A', 'B', 'C', 'D'].forEach((c, i) => headerCell(ws.getCell(`${c}${odh.number}`), odh.getCell(i + 1).value, COLORS.sectionBg, '000000'));
        odh.height = 20;

        overdueBills.forEach((b, idx) => {
            const bg = idx % 2 === 0 ? COLORS.expenseBg : COLORS.altRow;
            const r = ws.addRow([b.description, b.category, `Dia ${b.dueDay}`, b.amount, '']);
            r.height = 20;
            dataCell(r.getCell(1), b.description, null, bg);
            dataCell(r.getCell(2), b.category, null, bg);
            dataCell(r.getCell(3), `Dia ${b.dueDay}`, null, bg);
            dataCell(r.getCell(4), b.amount, BRL_FMT, bg);
        });
    }
}

// ── Sheet: Comparison ─────────────────────────────────────────────────────────
function buildComparisonSheet(wb, cmp) {
    const { current, previous, diff, pct } = cmp;
    const ws = wb.addWorksheet('📈 Comparação', { tabColor: { argb: '4472C4' } });
    ws.columns = [{ width: 28 }, { width: 22 }, { width: 22 }, { width: 20 }, { width: 14 }];

    const title = ws.getRow(1);
    ws.mergeCells('A1:E1');
    headerCell(ws.getCell('A1'), `COMPARAÇÃO: ${formatMonthLabel(previous.month).toUpperCase()} → ${formatMonthLabel(current.month).toUpperCase()}`);
    title.height = 30;

    const hr = ws.getRow(2);
    ['Métrica', formatMonthLabel(previous.month), formatMonthLabel(current.month), 'Variação (R$)', 'Variação (%)'].forEach((h, i) => {
        headerCell(hr.getCell(i + 1), h, COLORS.sectionBg, '000000');
    });
    hr.height = 24;

    const metrics = [
        { label: 'Ganhos', prev: previous.totalIncome, curr: current.totalIncome, d: diff.income, p: pct.income, goodIfPositive: true },
        { label: 'Gastos Variáveis', prev: previous.totalExpense, curr: current.totalExpense, d: diff.expense, p: pct.expense, goodIfPositive: false },
        { label: 'Contas Fixas', prev: previous.totalBills, curr: current.totalBills, d: diff.bills, p: null, goodIfPositive: false },
        { label: 'Total Saídas', prev: previous.totalOutflow, curr: current.totalOutflow, d: diff.outflow, p: pct.outflow, goodIfPositive: false },
        { label: 'Saldo', prev: previous.balance, curr: current.balance, d: diff.balance, p: pct.balance, goodIfPositive: true }
    ];

    metrics.forEach((m, idx) => {
        const bg = idx % 2 === 0 ? COLORS.altRow : 'FFFFFF';
        const isGood = m.goodIfPositive ? m.d >= 0 : m.d <= 0;
        const diffBg = m.d === 0 ? bg : isGood ? COLORS.balanceGood : COLORS.balanceBad;

        const r = ws.addRow([m.label, m.prev, m.curr, m.d, m.p]);
        r.height = 22;
        dataCell(r.getCell(1), m.label, null, bg);
        dataCell(r.getCell(2), m.prev, BRL_FMT, bg);
        dataCell(r.getCell(3), m.curr, BRL_FMT, bg);
        dataCell(r.getCell(4), m.d, BRL_FMT, diffBg);
        dataCell(r.getCell(5), m.p !== null ? m.p : '–', m.p !== null ? PCT_FMT : null, diffBg);
        r.getCell(1).font = { bold: true };
    });
}

// ── Sheet: Averages ───────────────────────────────────────────────────────────
function buildAveragesSheet(wb, avgs) {
    const ws = wb.addWorksheet('📐 Médias', { tabColor: { argb: '00B0F0' } });
    ws.columns = [{ width: 30 }, { width: 22 }];

    const title = ws.getRow(1);
    ws.mergeCells('A1:B1');
    headerCell(ws.getCell('A1'), `MÉDIAS MENSAIS (${avgs.monthsAnalyzed} mês/meses analisado(s))`);
    title.height = 30;

    const hr = ws.getRow(2);
    ['Métrica', 'Média Mensal'].forEach((h, i) => headerCell(hr.getCell(i + 1), h, COLORS.sectionBg, '000000'));
    hr.height = 24;

    const rows = [
        ['Ganhos', avgs.avgIncome, COLORS.incomeBg],
        ['Gastos Variáveis', avgs.avgExpense, COLORS.expenseBg],
        ['Contas Fixas', avgs.avgBills, COLORS.billBg],
        ['Total de Saídas', avgs.avgOutflow, COLORS.expenseBg],
        ['Saldo', avgs.avgBalance, avgs.avgBalance >= 0 ? COLORS.balanceGood : COLORS.balanceBad],
        ['Taxa de Poupança', avgs.avgSavings, COLORS.altRow]
    ];

    rows.forEach(([label, value, bg]) => {
        const r = ws.addRow([label, value]);
        r.height = 22;
        dataCell(r.getCell(1), label, null, bg);
        const fmt = label.includes('Taxa') ? PCT_FMT : BRL_FMT;
        dataCell(r.getCell(2), value, fmt, bg);
        r.getCell(1).font = { bold: true };
    });
}
