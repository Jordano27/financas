import cron from 'node-cron';
import { isSmtpConfigured } from '../services/email.service.js';
import { runMonthlyReport } from './relatorio-mensal.job.js';
import { runAvisoVencimento } from './aviso-vencimento.job.js';
import { runInvestmentReport } from './relatorio-investimentos.job.js';
import { syncInvestmentValues } from './sincronizacao-mercado.job.js';

// ── Re-exports para o terminal ────────────────────────────────────────────────
export { enviarRelatorioMensal, enviarRelatorioMes } from './relatorio-mensal.job.js';
export { verificarMetasConcluidas } from './meta-concluida.job.js';
export { verificarAvisosVencimento } from './aviso-vencimento.job.js';
export { enviarRelatorioInvestimentos } from './relatorio-investimentos.job.js';
export { sincronizarCotacoes } from './sincronizacao-mercado.job.js';

// ── Gatilhos cron ─────────────────────────────────────────────────────────────

export function initScheduler() {
    // Relatório mensal de saúde financeira — todo dia 1 às 00:01
    cron.schedule('1 0 1 * *', () => {
        runMonthlyReport().catch(err => {
            console.error('[Scheduler] Erro crítico no job mensal:', err);
        });
    });

    // Avisos de contas: "7 dias", "vence hoje" e "vencidas" — todo dia às 00:01
    cron.schedule('1 0 * * *', () => {
        runAvisoVencimento().catch(err => {
            console.error('[Scheduler] Erro crítico no job de avisos (00:01):', err);
        });
    });

    // Sincronização de cotações de investimentos — todo dia às 07:00
    cron.schedule('0 7 * * *', () => {
        syncInvestmentValues().catch(err => {
            console.error('[Scheduler] Erro crítico no job de cotações:', err);
        });
    });

    // Relatório diário de investimentos (premium) — todo dia às 08:00
    cron.schedule('0 8 * * *', () => {
        runInvestmentReport().catch(err => {
            console.error('[Scheduler] Erro crítico no job de relatório de investimentos:', err);
        });
    });

    console.log('[Scheduler] Job mensal registrado — disparará todo dia 1 às 00:01.');
    console.log('[Scheduler] Job de avisos registrado — verifica todo dia às 00:01.');
    console.log('[Scheduler] Job de cotações registrado — sincroniza todo dia às 07:00.');
    console.log('[Scheduler] Job de relatório de investimentos registrado — envia todo dia às 08:00 (premium).');
    console.log('[Scheduler] Emails de metas concluídas são disparados por evento ao adicionar contribuição.');

    if (!isSmtpConfigured()) {
        console.warn('[Scheduler] ⚠  SMTP não configurado. Emails serão logados no console (modo dev).');
        console.warn('[Scheduler]    Copie .env.example para .env e preencha as variáveis SMTP_* para enviar de verdade.');
    }
}
