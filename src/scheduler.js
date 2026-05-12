import cron from 'node-cron';
import { listUsers, findUserById, getOrCreateUnsubToken } from './users.js';
import { getAllMonths, previousMonth } from './transactions.js';
import { buildMonthStats, financialHealth, compareMonths, buildAverages, buildSpendingAnalysis } from './reports.js';
import { buildHealthReportEmail } from './email-templates/health-report.js';
import { sendMail, isSmtpConfigured } from './mailer.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna o mês que acabou de fechar: no dia 1 de Junho → "2026-05" */
function closedMonth() {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 0); // último dia do mês anterior
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}

// ── Envio para um único usuário ───────────────────────────────────────────────

async function sendReportToUser(user, month) {
    const userId = user.id;
    const months = getAllMonths(userId);

    if (!months.length) {
        console.log(`[Scheduler] ${user.email}: sem dados, pulando.`);
        return;
    }

    // Mês fechado pode não ter movimentação ainda
    const currentStats = buildMonthStats(userId, month);
    const health = financialHealth(currentStats);

    // Mês anterior ao fechado
    const prevMonth = previousMonth(month);
    let comparison = null;
    let prevScore = null;

    if (months.includes(prevMonth)) {
        comparison = compareMonths(userId, month, prevMonth);
        const prevStats = buildMonthStats(userId, prevMonth);
        prevScore = financialHealth(prevStats).score;
        comparison._prevScore = prevScore;
    }

    // Médias históricas (exclui o mês atual para não distorcer)
    const historicMonths = months.filter(m => m < month);
    const averages = historicMonths.length ? buildAverages(userId, historicMonths) : null;

    // Análise de gastos por categoria
    const spending = buildSpendingAnalysis(userId, month);

    // Token de opt-out
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
        subject: `📊 Relatório de Saúde Financeira — ${monthLabel(month)}`,
        html,
    });

    if (result.success) {
        console.log(`[Scheduler] ✅ Email enviado para ${user.email}${result.dev ? ' (modo dev)' : ''}`);
    } else {
        console.error(`[Scheduler] ❌ Falha ao enviar para ${user.email}: ${result.error}`);
    }
}

// ── Job principal ─────────────────────────────────────────────────────────────

async function runMonthlyReport(month) {
    if (!month) month = closedMonth();
    console.log(`\n[Scheduler] ▶ Iniciando envio de relatórios — mês: ${month}`);

    const allUsers = listUsers(); // { id, name, email, plan, active }
    const eligible = allUsers.filter(u => u.active && u.plan === 'premium');

    console.log(`[Scheduler] Usuários premium ativos: ${eligible.length}`);

    for (const u of eligible) {
        // Recarrega o usuário completo para verificar emailOptOut
        const fullUser = findUserById(u.id);
        if (fullUser?.emailOptOut) {
            console.log(`[Scheduler] ⏭  ${u.email}: opt-out ativo, pulando.`);
            continue;
        }
        try {
            await sendReportToUser(fullUser, month);
        } catch (err) {
            console.error(`[Scheduler] ❌ Erro inesperado para ${u.email}:`, err.message);
        }
    }

    console.log('[Scheduler] ✅ Relatórios mensais concluídos.\n');
}

// ── Inicialização ─────────────────────────────────────────────────────────────

export function initScheduler() {
    // Executa todo dia 1 às 00:01 (horário do servidor)
    // Expressão cron:  minuto hora dia mês dia-semana
    //                  1      0    1   *   *
    cron.schedule('1 0 1 * *', () => {
        runMonthlyReport().catch(err => {
            console.error('[Scheduler] Erro crítico no job mensal:', err);
        });
    });

    console.log('[Scheduler] Job mensal registrado — disparará todo dia 1 às 00:01.');

    if (!isSmtpConfigured()) {
        console.warn('[Scheduler] ⚠  SMTP não configurado. Emails serão logados no console (modo dev).');
        console.warn('[Scheduler]    Copie .env.example para .env e preencha as variáveis SMTP_* para enviar de verdade.');
    }
}

// ── Utilitários de envio manual ───────────────────────────────────────────────
// Enviar o mês que fechou automaticamente:
//   node -e "import('./src/scheduler.js').then(m => m.sendNow())"
//
// Enviar um mês específico (formato YYYY-MM):
//   node -e "import('./src/scheduler.js').then(m => m.sendMonth('2026-04'))"

export async function sendNow() {
    console.log('[Scheduler] Execução manual solicitada...');
    await runMonthlyReport();
}

export async function sendMonth(month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
        console.error('[Scheduler] Formato inválido. Use YYYY-MM, ex: 2026-04');
        return;
    }
    console.log(`[Scheduler] Execução manual para o mês ${month}...`);
    await runMonthlyReport(month);
}

// ── Helper ────────────────────────────────────────────────────────────────────

function monthLabel(yyyyMM) {
    if (!yyyyMM) return '';
    const [year, month] = yyyyMM.split('-');
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${names[Number(month) - 1]} ${year}`;
}
