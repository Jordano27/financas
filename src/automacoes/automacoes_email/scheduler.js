import cron from 'node-cron';
import { isSmtpConfigured } from '../../mailer.js';
import { runMonthlyReport } from './relatorio-mensal.js';

// ── Re-exports para o terminal ────────────────────────────────────────────────
export { enviarRelatorioMensal, enviarRelatorioMes } from './relatorio-mensal.js';
export { verificarMetasConcluidas } from './meta-concluida.js';

// ── Gatilhos cron ─────────────────────────────────────────────────────────────

export function initScheduler() {
    // Relatório mensal de saúde financeira — todo dia 1 às 00:01
    cron.schedule('1 0 1 * *', () => {
        runMonthlyReport().catch(err => {
            console.error('[Scheduler] Erro crítico no job mensal:', err);
        });
    });

    console.log('[Scheduler] Job mensal registrado — disparará todo dia 1 às 00:01.');
    console.log('[Scheduler] Emails de metas concluídas são disparados por evento ao adicionar contribuição.');

    if (!isSmtpConfigured()) {
        console.warn('[Scheduler] ⚠  SMTP não configurado. Emails serão logados no console (modo dev).');
        console.warn('[Scheduler]    Copie .env.example para .env e preencha as variáveis SMTP_* para enviar de verdade.');
    }
}
