import { listUsers, findUserById } from '../models/usuario.model.js';
import { getOrCreateUnsubToken } from '../services/usuario.service.js';
import { getGoals, markGoalCompletedEmailSent } from '../models/transacao.model.js';
import { buildGoalCompletedEmail } from '../templates/meta-concluida.template.js';
import { sendMail } from '../services/email.service.js';

// ── Envio para uma meta específica (chamado por evento, ao adicionar contribuição) ──

export async function enviarEmailMetaConcluida(userId, goal) {
    const fullUser = findUserById(userId);
    if (!fullUser || fullUser.emailOptOut) return;
    if (fullUser.plan !== 'premium') return;

    const unsubToken = getOrCreateUnsubToken(userId);
    const html = buildGoalCompletedEmail({ userName: fullUser.name, goal, unsubToken });

    const result = await sendMail({
        to: fullUser.email,
        subject: `🎉 Meta concluída: ${goal.description}`,
        html,
    });

    if (result.success) {
        markGoalCompletedEmailSent(userId, goal.id);
        console.log(`[MetaConcluida] 🎯 Email enviado para ${fullUser.email} — "${goal.description}"${result.dev ? ' (modo dev)' : ''}`);
    } else {
        console.error(`[MetaConcluida] ❌ Falha ao enviar para ${fullUser.email}: ${result.error}`);
    }
}

// ── Verificação manual (todos os usuários premium) ────────────────────────────

export async function runGoalCompletionCheck() {
    const allUsers = listUsers();
    const eligible = allUsers.filter(u => u.active && u.plan === 'premium');

    for (const u of eligible) {
        const fullUser = findUserById(u.id);
        if (!fullUser || fullUser.emailOptOut) continue;

        let goals;
        try {
            goals = getGoals(fullUser.id);
        } catch {
            continue;
        }

        for (const goal of goals) {
            // Já concluída e email já enviado — pula
            if (goal.completedEmailSent) continue;
            // Ainda não atingiu a meta
            if ((goal.savedAmount || 0) < goal.targetAmount) continue;

            const unsubToken = getOrCreateUnsubToken(fullUser.id);
            const html = buildGoalCompletedEmail({
                userName: fullUser.name,
                goal,
                unsubToken,
            });

            const result = await sendMail({
                to: fullUser.email,
                subject: `🎉 Meta concluída: ${goal.description}`,
                html,
            });

            if (result.success) {
                markGoalCompletedEmailSent(fullUser.id, goal.id);
                console.log(`[MetaConcluida] 🎯 Email enviado para ${fullUser.email} — "${goal.description}"${result.dev ? ' (modo dev)' : ''}`);
            } else {
                console.error(`[MetaConcluida] ❌ Falha ao enviar para ${fullUser.email}: ${result.error}`);
            }
        }
    }
}

// ── Comando nomeado para o terminal ───────────────────────────────────────────

/**
 * Verifica e envia emails de metas concluídas agora.
 * node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.verificarMetasConcluidas())"
 */
export async function verificarMetasConcluidas() {
    console.log('[MetaConcluida] Verificação manual de metas concluídas...');
    await runGoalCompletionCheck();
}
