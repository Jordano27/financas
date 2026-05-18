import { listUsers, findUserById } from '../models/usuario.model.js';
import { getOrCreateUnsubToken } from '../services/usuario.service.js';
import { getInvestments } from '../models/transacao.model.js';
import { buildRelatorioInvestimentosEmail } from '../templates/relatorio-investimentos.template.js';
import { sendMail } from '../services/email.service.js';

// ── Envio para um único usuário ───────────────────────────────────────────────

async function sendInvestmentReportToUser(user) {
    const userId = user.id;
    const investments = getInvestments(userId);

    if (!investments.length) {
        console.log(`[RelInvest] ${user.email}: sem investimentos, pulando.`);
        return;
    }

    if (user.emailOptOut || user.investReportOptOut) {
        console.log(`[RelInvest] ${user.email}: opt-out ativo, pulando.`);
        return;
    }

    const unsubToken = getOrCreateUnsubToken(userId);
    const html = buildRelatorioInvestimentosEmail({
        userName: user.name,
        investments,
        unsubToken,
    });

    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const result = await sendMail({
        to: user.email,
        subject: `📊 Relatório diário de investimentos — ${today}`,
        html,
    });

    if (result.success) {
        console.log(`[RelInvest] ✅ Enviado para ${user.email} (${investments.length} investimento(s))`);
    } else {
        console.error(`[RelInvest] ❌ Falha ao enviar para ${user.email}: ${result.error}`);
    }
}

// ── Runner principal (chamado pelo cron) ──────────────────────────────────────

export async function runInvestmentReport() {
    console.log('\n[RelInvest] ▶ Iniciando envio de relatórios de investimentos...');
    const allUsers = listUsers();
    let sent = 0;
    let skipped = 0;

    for (const u of allUsers) {
        if (!u.active) { skipped++; continue; }
        if (u.plan !== 'premium') { skipped++; continue; }

        const fullUser = findUserById(u.id);
        if (!fullUser) { skipped++; continue; }

        try {
            await sendInvestmentReportToUser(fullUser);
            sent++;
        } catch (err) {
            console.error(`[RelInvest] ❌ Erro inesperado para ${u.email}:`, err.message);
        }
    }

    console.log(`[RelInvest] ✅ Concluído. Enviados: ${sent}, pulados: ${skipped}.\n`);
}

/** Alias para comando de terminal */
export async function enviarRelatorioInvestimentos() {
    return runInvestmentReport();
}
