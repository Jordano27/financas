import { APP_URL } from '../config.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fmtDate(yyyyMMdd) {
    if (!yyyyMMdd) return '—';
    const [y, m, d] = yyyyMMdd.split('-');
    return `${d}/${m}/${y}`;
}

// ── Configuração visual por tipo ───────────────────────────────────────────────

const TIPO_CONFIG = {
    '7dias': {
        emoji: '📅',
        cor: '#f59e0b',
        corBg: '#fffbeb',
        corBorda: '#fde68a',
        titulo: 'Conta vence em 7 dias',
        subtitulo: 'Você tem uma semana para efetuar o pagamento.',
        badge: '7 DIAS',
        badgeCor: '#f59e0b',
        badgeBg: '#fef3c7',
    },
    'hoje': {
        emoji: '⚠️',
        cor: '#ea580c',
        corBg: '#fff7ed',
        corBorda: '#fed7aa',
        titulo: 'Conta vence hoje',
        subtitulo: 'O prazo de pagamento é hoje. Não deixe para depois!',
        badge: 'VENCE HOJE',
        badgeCor: '#ea580c',
        badgeBg: '#ffedd5',
    },
    'vencida': {
        emoji: '🚨',
        cor: '#dc2626',
        corBg: '#fef2f2',
        corBorda: '#fecaca',
        titulo: 'Conta vencida',
        subtitulo: 'Esta conta passou do prazo de vencimento e ainda não foi paga.',
        badge: 'VENCIDA',
        badgeCor: '#dc2626',
        badgeBg: '#fee2e2',
    },
};

// ── Builder ────────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.userName
 * @param {object} opts.bill        - { description, amount, category, dueDay }
 * @param {'7dias'|'hoje'|'vencida'} opts.tipo
 * @param {string} opts.dueDate     - YYYY-MM-DD
 * @param {string} opts.unsubToken
 */
export function buildAvisoVencimentoEmail({ userName, bill, tipo, dueDate, unsubToken }) {
    const cfg = TIPO_CONFIG[tipo];
    const appUrl = APP_URL || 'http://localhost:3000';
    const unsubUrl = `${appUrl}/api/auth/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

      <!-- Header -->
      <tr>
        <td style="background:${cfg.cor};padding:32px 40px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">${cfg.emoji}</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${escHtml(cfg.titulo)}</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:15px;">${escHtml(cfg.subtitulo)}</p>
        </td>
      </tr>

      <!-- Saudação -->
      <tr>
        <td style="padding:32px 40px 0;">
          <p style="margin:0;color:#374151;font-size:16px;">Olá, <strong>${escHtml(userName)}</strong>!</p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:15px;line-height:1.6;">
            ${tipo === '7dias' ? `A conta abaixo vence em <strong>7 dias</strong>. Organize-se para não perder o prazo.` : ''}
            ${tipo === 'hoje' ? `A conta abaixo <strong>vence hoje</strong>. Efetue o pagamento o quanto antes.` : ''}
            ${tipo === 'vencida' ? `A conta abaixo <strong>está vencida</strong>. Regularize o pagamento para evitar multas e juros.` : ''}
          </p>
        </td>
      </tr>

      <!-- Card da conta -->
      <tr>
        <td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${cfg.corBg};border:2px solid ${cfg.corBorda};border-radius:10px;">
            <tr>
              <td style="padding:24px 28px;">
                <!-- Badge -->
                <div style="margin-bottom:16px;">
                  <span style="display:inline-block;background:${cfg.badgeBg};color:${cfg.badgeCor};font-size:11px;font-weight:700;letter-spacing:.8px;padding:4px 12px;border-radius:20px;border:1px solid ${cfg.corBorda};">${cfg.badge}</span>
                </div>
                <!-- Nome da conta -->
                <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">${escHtml(bill.description)}</h2>
                <!-- Detalhes -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid ${cfg.corBorda};color:#6b7280;font-size:13px;width:40%;">Valor</td>
                    <td style="padding:8px 0;border-bottom:1px solid ${cfg.corBorda};color:#111827;font-size:16px;font-weight:700;text-align:right;">${fmt(bill.amount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid ${cfg.corBorda};color:#6b7280;font-size:13px;">Vencimento</td>
                    <td style="padding:8px 0;border-bottom:1px solid ${cfg.corBorda};color:#111827;font-size:14px;font-weight:600;text-align:right;">${fmtDate(dueDate)}</td>
                  </tr>
                  ${bill.category ? `
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;">Categoria</td>
                    <td style="padding:8px 0;color:#111827;font-size:14px;text-align:right;">${escHtml(bill.category)}</td>
                  </tr>` : ''}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:0 40px 32px;text-align:center;">
          <a href="${appUrl}" style="display:inline-block;background:${cfg.cor};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">
            Acessar o app
          </a>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:13px;">Marque a conta como <strong>Pago</strong> no app após efetuar o pagamento.</p>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.8;">
            Este email foi enviado automaticamente pelo <strong>Finanças Pessoais</strong>.<br>
            Você está recebendo porque tem o plano Premium com alertas de contas ativados.<br>
            <a href="${unsubUrl}" style="color:#9ca3af;">Cancelar inscrição</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
