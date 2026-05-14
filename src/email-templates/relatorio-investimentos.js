import { APP_URL } from '../config.js';
import { fmt, fmtPct, escHtml } from './email-helpers.js';

// fmtDateTime: formata ISO com hora e minuto (especifico deste template)
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MARKET_LABEL = {
  stock: '📈 Ação / FII',
  crypto: '₿ Cripto',
  cdi: '🏦 Renda Fixa CDI',
  tesouro: '🇧🇷 Tesouro Direto',
  manual: '✏️ Manual',
};

/**
 * @param {object} opts
 * @param {string} opts.userName
 * @param {string} opts.userEmail
 * @param {object[]} opts.investments   — array retornado por getInvestments()
 * @param {string} opts.unsubToken
 */
export function buildRelatorioInvestimentosEmail({ userName, investments, unsubToken }) {
  const appUrl = APP_URL || 'http://localhost:3000';
  const unsubUrl = `${appUrl}/api/auth/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const totalInvestido = investments.reduce((s, i) => s + (i.initialAmount || 0), 0);
  const totalAtual = investments.reduce((s, i) => s + (i.currentValue || i.initialAmount || 0), 0);
  const totalGain = totalAtual - totalInvestido;
  const totalPct = totalInvestido > 0 ? (totalGain / totalInvestido) * 100 : 0;
  const gainColor = totalGain >= 0 ? '#16a34a' : '#dc2626';
  const gainArrow = totalGain >= 0 ? '▲' : '▼';

  const rows = investments.map(inv => {
    const current = inv.currentValue ?? inv.initialAmount ?? 0;
    const gain = current - (inv.initialAmount || 0);
    const pct = inv.initialAmount > 0 ? (gain / inv.initialAmount) * 100 : 0;
    const color = gain >= 0 ? '#16a34a' : '#dc2626';
    const arrow = gain >= 0 ? '▲' : '▼';
    const marketLabel = MARKET_LABEL[inv.marketType] || inv.marketType || '—';
    const rateLabel = inv.rateInfo?.rate ? ` ${inv.rateInfo.rate}% CDI` : '';
    const noSync = !inv.lastSyncAt && inv.marketType !== 'manual';

    return `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;">${escHtml(inv.description)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;white-space:nowrap;">${escHtml(marketLabel)}${escHtml(rateLabel)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;text-align:right;white-space:nowrap;">${fmt(inv.initialAmount)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;text-align:right;white-space:nowrap;">${fmt(current)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;color:${color};font-size:14px;font-weight:600;text-align:right;white-space:nowrap;">
          ${arrow} ${fmt(Math.abs(gain))}<br>
          <span style="font-size:12px;font-weight:400;">${fmtPct(pct)}</span>
          ${noSync ? '<br><span style="font-size:11px;color:#9ca3af;">sem dados hoje</span>' : ''}
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório diário de investimentos</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">📊</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Relatório de Investimentos</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:15px;">${escHtml(today)}</p>
        </td>
      </tr>

      <!-- Saudação -->
      <tr>
        <td style="padding:32px 40px 8px;">
          <p style="margin:0;color:#374151;font-size:16px;">Olá, <strong>${escHtml(userName)}</strong>!</p>
          <p style="margin:10px 0 0;color:#6b7280;font-size:15px;line-height:1.6;">
            Aqui está o resumo dos seus investimentos hoje. Acompanhe o desempenho da sua carteira.
          </p>
        </td>
      </tr>

      <!-- Tabela de investimentos -->
      <tr>
        <td style="padding:16px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <!-- Cabeçalho -->
            <tr style="background:#f9fafb;">
              <th style="padding:11px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Investimento</th>
              <th style="padding:11px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Tipo</th>
              <th style="padding:11px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Investido</th>
              <th style="padding:11px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Valor atual</th>
              <th style="padding:11px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e5e7eb;">Rendimento</th>
            </tr>
            ${rows}
          </table>
        </td>
      </tr>

      <!-- Totais -->
      <tr>
        <td style="padding:20px 40px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;${totalGain < 0 ? 'background:#fef2f2;border-color:#fecaca;' : ''}">
            <tr>
              <td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:33%;text-align:center;padding:0 8px;">
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Total investido</div>
                      <div style="font-size:18px;font-weight:700;color:#374151;">${fmt(totalInvestido)}</div>
                    </td>
                    <td style="width:33%;text-align:center;padding:0 8px;border-left:1px solid #d1fae5;border-right:1px solid #d1fae5;${totalGain < 0 ? 'border-color:#fecaca;' : ''}">
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Valor atual</div>
                      <div style="font-size:18px;font-weight:700;color:#374151;">${fmt(totalAtual)}</div>
                    </td>
                    <td style="width:33%;text-align:center;padding:0 8px;">
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Rendimento total</div>
                      <div style="font-size:18px;font-weight:700;color:${gainColor};">${gainArrow} ${fmt(Math.abs(totalGain))}</div>
                      <div style="font-size:13px;color:${gainColor};margin-top:2px;">${fmtPct(totalPct)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:24px 40px 32px;text-align:center;">
          <a href="${escHtml(appUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">Acessar o app</a>
        </td>
      </tr>

      <!-- Rodapé -->
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
            Este relatório é enviado diariamente às 08:00 para usuários Premium.<br>
            <a href="${escHtml(unsubUrl)}" style="color:#9ca3af;">Cancelar recebimento de emails</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
