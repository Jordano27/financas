import { listUsers, findUserById, getOrCreateUnsubToken } from '../../users.js';
import { getBills, markBillAlert, getBillAlerts, currentMonth } from '../../transactions.js';
import { buildAvisoVencimentoEmail } from '../../email-templates/aviso-vencimento.js';
import { sendMail } from '../../mailer.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Retorna a data de vencimento da conta no mês YYYY-MM como string YYYY-MM-DD.
 *  Lida com dias que ultrapassam o fim do mês (ex: dia 31 em fevereiro → último dia).
 */
function dueDateOf(bill, yyyyMM) {
    const [year, month] = yyyyMM.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(bill.dueDay, lastDay);
    return `${yyyyMM}-${String(day).padStart(2, '0')}`;
}

/** Diferença em dias inteiros entre dueDate (YYYY-MM-DD) e today (Date).
 *  Positivo = ainda não venceu, negativo = já venceu.
 */
function daysUntil(dueDateStr, today) {
    const due = new Date(`${dueDateStr}T00:00:00`);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((due - t) / 86400000);
}

// ── Lógica principal ───────────────────────────────────────────────────────────

export async function runAvisoVencimento() {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const allUsers = listUsers();
    const eligible = allUsers.filter(u => u.active && u.plan === 'premium');

    for (const u of eligible) {
        const fullUser = findUserById(u.id);
        if (!fullUser || fullUser.emailOptOut) continue;

        const bills = getBills(fullUser.id, { activeOnly: true, month });
        const alerts = getBillAlerts(fullUser.id);

        for (const bill of bills) {
            const dueDate = dueDateOf(bill, month);
            const diff = daysUntil(dueDate, today);

            // Verifica se já foi paga neste mês
            const isPaid = Array.isArray(bill.paidMonths) && bill.paidMonths.includes(month);
            if (isPaid) continue;

            // Determina quais tipos de aviso enviar agora
            const tiposParaEnviar = [];

            if (diff === 7) tiposParaEnviar.push('7dias');
            if (diff === 0) tiposParaEnviar.push('hoje');
            if (diff < 0) tiposParaEnviar.push('vencida');

            for (const tipo of tiposParaEnviar) {
                // Anti-duplicata: não envia se já foi enviado este tipo neste mês
                if (alerts[bill.id]?.[month]?.[tipo]) continue;

                const unsubToken = getOrCreateUnsubToken(fullUser.id);
                const html = buildAvisoVencimentoEmail({
                    userName: fullUser.name,
                    bill,
                    tipo,
                    dueDate,
                    unsubToken,
                });

                const subjects = {
                    '7dias': `📅 Conta vence em 7 dias: ${bill.description}`,
                    'hoje': `⚠️ Conta vence hoje: ${bill.description}`,
                    'vencida': `🚨 Conta vencida: ${bill.description}`,
                };

                const result = await sendMail({
                    to: fullUser.email,
                    subject: subjects[tipo],
                    html,
                });

                if (result.success) {
                    markBillAlert(fullUser.id, bill.id, month, tipo);
                    console.log(`[AvisoVencimento] ✅ [${tipo}] Email enviado para ${fullUser.email} — "${bill.description}" (vence ${dueDate})${result.dev ? ' (modo dev)' : ''}`);
                } else {
                    console.error(`[AvisoVencimento] ❌ [${tipo}] Falha para ${fullUser.email} — "${bill.description}": ${result.error}`);
                }
            }
        }
    }
}

// ── Comando nomeado para o terminal ───────────────────────────────────────────

/**
 * Verifica e envia avisos de vencimento com base na data atual.
 * node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.verificarAvisosVencimento())"
 */
export async function verificarAvisosVencimento() {
    console.log('[AvisoVencimento] Verificação manual de avisos de vencimento...');
    await runAvisoVencimento();
    console.log('[AvisoVencimento] ✅ Verificação concluída.');
}
