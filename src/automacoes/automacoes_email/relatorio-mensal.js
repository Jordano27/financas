import { listUsers, findUserById, getOrCreateUnsubToken } from '../../users.js';
import { getAllMonths, previousMonth } from '../../transactions.js';
import { buildMonthStats, financialHealth, compareMonths, buildAverages, buildSpendingAnalysis } from '../../reports.js';
import { buildHealthReportEmail } from '../../email-templates/health-report.js';
import { sendMail } from '../../mailer.js';
import { formatMonthLabel } from '../../helpers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function closedMonth() {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}

// ── Envio para um único usuário ───────────────────────────────────────────────

async function sendReportToUser(user, month) {
    const userId = user.id;
    const months = getAllMonths(userId);

    if (!months.length) {
        console.log(`[Relatorio] ${user.email}: sem dados, pulando.`);
        return;
    }

    const currentStats = buildMonthStats(userId, month);
    const health = financialHealth(currentStats);

    const prevMonth = previousMonth(month);
    let comparison = null;

    if (months.includes(prevMonth)) {
        comparison = compareMonths(userId, month, prevMonth);
        const prevStats = buildMonthStats(userId, prevMonth);
        comparison._prevScore = financialHealth(prevStats).score;
    }

    const historicMonths = months.filter(m => m < month);
    const averages = historicMonths.length ? buildAverages(userId, historicMonths) : null;
    const spending = buildSpendingAnalysis(userId, month);
    const unsubToken = getOrCreateUnsubToken(userId);

    const html = buildHealthReportEmail({
        userName: user.name,
        month,
        health,
        current: currentStats,
        averages,
        comparison,
        spending,
        unsubToken,
    });

    const result = await sendMail({
        to: user.email,
        subject: `📊 Relatório de Saúde Financeira — ${formatMonthLabel(month)}`,
        html,
    });

    if (result.success) {
        console.log(`[Relatorio] ✅ Email enviado para ${user.email}${result.dev ? ' (modo dev)' : ''}`);
    } else {
        console.error(`[Relatorio] ❌ Falha ao enviar para ${user.email}: ${result.error}`);
    }
}

// ── Lógica principal ──────────────────────────────────────────────────────────

export async function runMonthlyReport(month) {
    if (!month) month = closedMonth();
    console.log(`\n[Relatorio] ▶ Iniciando envio — mês: ${month}`);

    const allUsers = listUsers();
    const eligible = allUsers.filter(u => u.active && u.plan === 'premium');
    console.log(`[Relatorio] Usuários premium ativos: ${eligible.length}`);

    for (const u of eligible) {
        const fullUser = findUserById(u.id);
        if (fullUser?.emailOptOut) {
            console.log(`[Relatorio] ⏭  ${u.email}: opt-out ativo, pulando.`);
            continue;
        }
        try {
            await sendReportToUser(fullUser, month);
        } catch (err) {
            console.error(`[Relatorio] ❌ Erro inesperado para ${u.email}:`, err.message);
        }
    }

    console.log('[Relatorio] ✅ Relatórios mensais concluídos.\n');
}

// ── Comandos nomeados para o terminal ─────────────────────────────────────────

/**
 * Envia o relatório do mês que acabou de fechar.
 * node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.enviarRelatorioMensal())"
 */
export async function enviarRelatorioMensal() {
    console.log('[Relatorio] Envio manual do mês fechado...');
    await runMonthlyReport();
}

/**
 * Envia o relatório de um mês específico (YYYY-MM).
 * node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.enviarRelatorioMes('2026-05'))"
 */
export async function enviarRelatorioMes(month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
        console.error('[Relatorio] Formato inválido. Use YYYY-MM, ex: 2026-05');
        return;
    }
    console.log(`[Relatorio] Envio manual para o mês ${month}...`);
    await runMonthlyReport(month);
}
