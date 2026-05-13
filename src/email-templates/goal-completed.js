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

function fmtDate(isoDate) {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
}

/**
 * Calcula tempo decorrido entre duas datas ISO e retorna string legível.
 * Ex: "3 meses e 15 dias" ou "47 dias"
 */
function timeBetween(startISO, endISO) {
    const start = new Date(startISO);
    const end = new Date(endISO || new Date().toISOString());
    const diffMs = Math.max(0, end - start);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'menos de 1 dia';

    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;

    if (months === 0) return `${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
    if (days === 0) return `${months} mês${months !== 1 ? 'es' : ''}`;
    return `${months} mês${months !== 1 ? 'es' : ''} e ${days} dia${days !== 1 ? 's' : ''}`;
}

// ── Template ───────────────────────────────────────────────────────────────────

/**
 * Gera o HTML do email de parabéns por conclusão de meta.
 *
 * @param {object} params
 * @param {string} params.userName
 * @param {object} params.goal   - objeto completo da meta (description, targetAmount,
 *                                 savedAmount, createdAt, completedAt, contributions[])
 * @param {string} params.unsubToken
 */
export function buildGoalCompletedEmail({ userName, goal, unsubToken }) {
    const contributions = goal.contributions || [];
    const totalContribs = contributions.length;
    const completedAt = goal.completedAt || new Date().toISOString();
    const elapsed = timeBetween(goal.createdAt, completedAt);
    const unsubUrl = `${APP_URL}/api/auth/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    // Soma acumulada por aporte (para exibir progresso)
    let running = 0;
    const contribRows = contributions.map((c, i) => {
        running += c.amount;
        const pct = goal.targetAmount > 0
            ? Math.min(100, (running / goal.targetAmount) * 100).toFixed(1)
            : '100.0';
        const isLast = running >= goal.targetAmount && i === contributions.findLastIndex(
            (_, j) => contributions.slice(0, j + 1).reduce((s, x) => s + x.amount, 0) >= goal.targetAmount
        );
        return `
        <tr style="${isLast ? 'background:#f0fdf4;' : ''}border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px 12px;font-size:13px;color:#6b7280;">${i + 1}</td>
          <td style="padding:8px 12px;font-size:13px;">${fmtDate(c.date)}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;">${fmt(c.amount)}</td>
          <td style="padding:8px 12px;font-size:13px;color:#16a34a;font-weight:600;">${fmt(running)}</td>
          <td style="padding:8px 12px;font-size:12px;">
            <div style="background:#e5e7eb;border-radius:99px;height:6px;min-width:60px;">
              <div style="width:${pct}%;background:${isLast ? '#16a34a' : '#3b82f6'};height:6px;border-radius:99px;"></div>
            </div>
            <span style="font-size:10px;color:#6b7280;">${pct}%</span>
          </td>
          <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${escHtml(c.note || '—')}</td>
          ${isLast ? '<td style="padding:8px 12px;font-size:14px;">🎯</td>' : '<td></td>'}
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🎉 Meta Concluída — ${escHtml(goal.description)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header comemorativo -->
    <tr>
      <td style="background:linear-gradient(135deg,#15803d,#22c55e);border-radius:12px 12px 0 0;padding:36px 32px 28px;text-align:center;">
        <div style="font-size:48px;line-height:1;margin-bottom:12px;">🎉</div>
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;">Parabéns, ${escHtml(userName)}!</h1>
        <p style="margin:10px 0 0;color:#bbf7d0;font-size:16px;">Você concluiu sua meta financeira!</p>
      </td>
    </tr>

    <!-- Nome da meta -->
    <tr>
      <td style="background:#fff;padding:28px 32px 20px;">
        <div style="text-align:center;">
          <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Meta Concluída</div>
          <div style="font-size:24px;font-weight:800;color:#111827;">${escHtml(goal.description)}</div>
          <div style="font-size:14px;color:#6b7280;margin-top:4px;">${escHtml(goal.category || 'Geral')}</div>
        </div>

        <!-- Stats em grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
          <tr>
            <td style="width:25%;padding:0 6px 0 0;vertical-align:top;">
              <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#15803d;">${fmt(goal.savedAmount)}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Total guardado</div>
              </div>
            </td>
            <td style="width:25%;padding:0 3px;vertical-align:top;">
              <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#1d4ed8;">${fmt(goal.targetAmount)}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Meta alvo</div>
              </div>
            </td>
            <td style="width:25%;padding:0 3px;vertical-align:top;">
              <div style="background:#faf5ff;border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#7c3aed;">${totalContribs}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Aporte${totalContribs !== 1 ? 's' : ''}</div>
              </div>
            </td>
            <td style="width:25%;padding:0 0 0 6px;vertical-align:top;">
              <div style="background:#fff7ed;border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#c2410c;line-height:1.2;">${elapsed}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Tempo total</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Divisor -->
    <tr><td style="background:#fff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

    <!-- Tabela de aportes -->
    <tr>
      <td style="background:#fff;padding:20px 32px 28px;">
        <h2 style="margin:0 0 14px;font-size:16px;color:#111827;">📋 Histórico de Aportes</h2>
        <div style="overflow-x:auto;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:500px;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">#</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Data</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Valor</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Acumulado</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Progresso</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Nota</th>
                <th style="padding:8px 12px;"></th>
              </tr>
            </thead>
            <tbody>
              ${contribRows || `<tr><td colspan="7" style="padding:16px 12px;color:#9ca3af;font-size:13px;">Nenhum aporte registrado</td></tr>`}
            </tbody>
          </table>
        </div>
      </td>
    </tr>

    <!-- Mensagem motivacional -->
    <tr>
      <td style="background:#f0fdf4;padding:20px 32px;border-left:4px solid #22c55e;">
        <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">
          🌟 Disciplina, consistência e foco — você provou que é capaz!
        </p>
        <p style="margin:8px 0 0;font-size:13px;color:#166534;">
          Continue investindo no seu futuro. Que tal criar uma nova meta?
        </p>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="background:#15803d;padding:28px 32px;text-align:center;border-radius:0 0 12px 12px;">
        <a href="${APP_URL}" style="display:inline-block;background:#fff;color:#15803d;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none;">Ver minhas Metas</a>
        <p style="margin:20px 0 0;font-size:11px;color:#86efac;">
          Você recebe este email porque tem plano Premium.<br>
          <a href="${unsubUrl}" style="color:#86efac;">Cancelar recebimento de emails</a>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>`;
}
