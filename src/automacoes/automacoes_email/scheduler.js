import cron from 'node-cron';
import { isSmtpConfigured } from '../../mailer.js';
import { runMonthlyReport } from './relatorio-mensal.js';
import { runAvisoVencimento } from './aviso-vencimento.js';

// ── Re-exports para o terminal ────────────────────────────────────────────────
export { enviarRelatorioMensal, enviarRelatorioMes } from './relatorio-mensal.js';
export { verificarMetasConcluidas } from './meta-concluida.js';
export { verificarAvisosVencimento } from './aviso-vencimento.js';

// ── Gatilhos cron ─────────────────────────────────────────────────────────────

export function initScheduler() {
    // Relatório mensal de saúde financeira — todo dia 1 às 00:01
    cron.schedule('1 0 1 * *', () => {
        runMonthlyReport().catch(err => {
            console.error('[Scheduler] Erro crítico no job mensal:', err);
        });
    });

    // Avisos de contas: "7 dias" e "vence hoje" — todo dia às 08:00
    cron.schedule('0 8 * * *', () => {
        runAvisoVencimento().catch(err => {
            console.error('[Scheduler] Erro crítico no job de avisos (08h):', err);
        });
    });

    // Avisos de contas vencidas — todo dia às 09:00 (1h depois para não colidir)
    cron.schedule('0 9 * * *', () => {
        runAvisoVencimento().catch(err => {
            console.error('[Scheduler] Erro crítico no job de avisos (09h):', err);
        });
    });

    console.log('[Scheduler] Job mensal registrado — disparará todo dia 1 às 00:01.');
    console.log('[Scheduler] Job de avisos registrado — verifica todo dia às 08:00 e 09:00.');
    console.log('[Scheduler] Emails de metas concluídas são disparados por evento ao adicionar contribuição.');

    if (!isSmtpConfigured()) {
        console.warn('[Scheduler] ⚠  SMTP não configurado. Emails serão logados no console (modo dev).');
        console.warn('[Scheduler]    Copie .env.example para .env e preencha as variáveis SMTP_* para enviar de verdade.');
    }
}
