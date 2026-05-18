import { APP_URL } from '../config/app.js';
import { fmt, monthLabel } from './auxiliares-email.js';

// fmtPct simples (sem sinal) — específico para barras de saúde financeira
function fmtPct(v) {
  return (v || 0).toFixed(1) + '%';
}

function scoreDelta(curr, prev) {
  if (prev == null) return '';
  const d = curr - prev;
  if (d > 0) return `<span style="color:#16a34a">▲ ${d} pts</span>`;
  if (d < 0) return `<span style="color:#dc2626">▼ ${Math.abs(d)} pts</span>`;
  return `<span style="color:#6b7280">= sem alteração</span>`;
}

function pillarBar(pct, target, color) {
  const fill = Math.min(100, pct);
  const ok = (color === '#3b82f6') ? pct >= target : pct <= target;
  const barColor = ok ? '#16a34a' : '#ef4444';
  return `
        <div style="background:#e5e7eb;border-radius:4px;height:10px;margin-top:4px;">
          <div style="width:${fill}%;background:${barColor};height:10px;border-radius:4px;transition:width .3s;"></div>
        </div>`;
}

// ── Template principal ─────────────────────────────────────────────────────────

/**
 * Gera o HTML do email de relatório mensal de saúde financeira.
 *
 * @param {object} params
 * @param {string}  params.userName
 * @param {string}  params.month          - "YYYY-MM" do mês que fechou
 * @param {object}  params.health         - retorno de financialHealth()
 * @param {object}  params.current        - { totalIncome, totalExpense, totalBills, totalInvested, balance }
 * @param {object}  params.averages       - retorno de buildAverages()
 * @param {object}  params.comparison     - retorno de compareMonths() (pode ser null se for o 1º mês)
 * @param {string}  params.unsubToken     - token de opt-out do usuário
 */
export function buildHealthReportEmail({ userName, month, health, current, averages, comparison, spending, unsubToken }) {
  const prevScore = comparison?.previous ? (() => {
    // score do mês anterior já está calculado no caller
    return comparison._prevScore ?? null;
  })() : null;

  const scoreArrow = scoreDelta(health.score, prevScore);
  const balanceDiff = comparison ? comparison.diff.balance : null;
  const balanceArrow = balanceDiff != null
    ? (balanceDiff >= 0
      ? `<span style="color:#16a34a">▲ ${fmt(balanceDiff)}</span>`
      : `<span style="color:#dc2626">▼ ${fmt(Math.abs(balanceDiff))}</span>`)
    : '';

  const needsPct = health.breakdown?.needsPct ?? 0;
  const wantsPct = health.breakdown?.wantsPct ?? 0;
  const investPct = health.breakdown?.investPct ?? 0;

  const tipsHtml = health.tips.map(t =>
    `<li style="margin:6px 0;color:#374151;">${t}</li>`
  ).join('');

  const unsubUrl = `${APP_URL}/api/auth/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

  // ── Score color ──────────────────────────────────────────────────────────
  const scoreColor = health.score >= 85 ? '#16a34a'
    : health.score >= 65 ? '#ca8a04'
      : health.score >= 40 ? '#ea580c'
        : '#dc2626';

  // ── Comparison rows ──────────────────────────────────────────────────────
  function cmpRow(label, currVal, diff, higherIsBetter = true) {
    let arrow = '';
    if (diff != null) {
      if (diff > 0) arrow = higherIsBetter
        ? `<span style="color:#16a34a">▲ ${fmt(diff)}</span>`
        : `<span style="color:#dc2626">▲ ${fmt(diff)}</span>`;
      else if (diff < 0) arrow = higherIsBetter
        ? `<span style="color:#dc2626">▼ ${fmt(Math.abs(diff))}</span>`
        : `<span style="color:#16a34a">▼ ${fmt(Math.abs(diff))}</span>`;
      else arrow = '<span style="color:#6b7280">—</span>';
    }
    return `
        <tr>
          <td style="padding:8px 12px;color:#374151;">${label}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;">${fmt(currVal)}</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px;">${arrow}</td>
          <td style="padding:8px 12px;text-align:right;color:#6b7280;font-size:13px;">${averages ? fmt(averages[Object.keys(averages).find(k => k.toLowerCase().includes(label.toLowerCase().split(' ')[0].toLowerCase())) ?? ''] || 0) : '—'}</td>
        </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório de Saúde Financeira — ${monthLabel(month)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:12px 12px 0 0;padding:32px 32px 24px;text-align:center;">
        <div style="font-size:13px;color:#bfdbfe;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Relatório Mensal</div>
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">${monthLabel(month)}</h1>
        <p style="margin:8px 0 0;color:#bfdbfe;font-size:15px;">Saúde Financeira de <strong>${escHtml(userName)}</strong></p>
      </td>
    </tr>

    <!-- Score card -->
    <tr>
      <td style="background:#fff;padding:28px 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;">
              <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Pontuação de Saúde</div>
              <div style="font-size:56px;font-weight:800;color:${scoreColor};line-height:1.1;">${health.score}<span style="font-size:20px;color:#9ca3af;">/100</span></div>
              <div style="font-size:16px;font-weight:600;color:${scoreColor};margin-top:2px;">${health.label}</div>
              <div style="margin-top:6px;font-size:14px;">${scoreArrow}</div>
            </td>
            <td style="vertical-align:middle;text-align:right;padding-left:16px;">
              <div style="font-size:13px;color:#6b7280;">Saldo do mês</div>
              <div style="font-size:28px;font-weight:700;color:${current.balance >= 0 ? '#16a34a' : '#dc2626'};">${fmt(current.balance)}</div>
              <div style="font-size:13px;margin-top:4px;">${balanceArrow}</div>
            </td>
          </tr>
        </table>

        <!-- Score bar -->
        <div style="margin-top:16px;background:#e5e7eb;border-radius:6px;height:12px;">
          <div style="width:${health.score}%;background:${scoreColor};height:12px;border-radius:6px;"></div>
        </div>
      </td>
    </tr>

    <!-- Divisor -->
    <tr><td style="background:#fff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

    <!-- Pilares 50-30-20 -->
    <tr>
      <td style="background:#fff;padding:20px 32px 24px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;">Distribuição 50-30-20</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <!-- Necessidades -->
            <td style="width:33%;padding-right:8px;vertical-align:top;">
              <div style="background:#eff6ff;border-radius:8px;padding:14px;">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Necessidades</div>
                <div style="font-size:22px;font-weight:700;color:${needsPct <= 50 ? '#16a34a' : '#dc2626'};margin:4px 0;">${fmtPct(needsPct)}</div>
                <div style="font-size:11px;color:#9ca3af;">meta ≤ 50%</div>
                ${pillarBar(needsPct, 50, '#ef4444')}
                <div style="font-size:12px;margin-top:6px;color:#374151;">${fmt(current.totalBills)}</div>
              </div>
            </td>
            <!-- Desejos -->
            <td style="width:33%;padding:0 4px;vertical-align:top;">
              <div style="background:#fff7ed;border-radius:8px;padding:14px;">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Desejos</div>
                <div style="font-size:22px;font-weight:700;color:${wantsPct <= 30 ? '#16a34a' : '#dc2626'};margin:4px 0;">${fmtPct(wantsPct)}</div>
                <div style="font-size:11px;color:#9ca3af;">meta ≤ 30%</div>
                ${pillarBar(wantsPct, 30, '#ef4444')}
                <div style="font-size:12px;margin-top:6px;color:#374151;">${fmt(current.totalExpense)}</div>
              </div>
            </td>
            <!-- Investimentos -->
            <td style="width:33%;padding-left:8px;vertical-align:top;">
              <div style="background:#f0fdf4;border-radius:8px;padding:14px;">
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Investimentos</div>
                <div style="font-size:22px;font-weight:700;color:${investPct >= 20 ? '#16a34a' : '#dc2626'};margin:4px 0;">${fmtPct(investPct)}</div>
                <div style="font-size:11px;color:#9ca3af;">meta ≥ 20%</div>
                ${pillarBar(investPct, 20, '#3b82f6')}
                <div style="font-size:12px;margin-top:6px;color:#374151;">${fmt(current.totalInvested)}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Divisor -->
    <tr><td style="background:#fff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

    <!-- Resumo financeiro -->
    <tr>
      <td style="background:#fff;padding:20px 32px 24px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;">Resumo do Mês</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Item</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Este mês</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">vs. mês ant.</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Média hist.</th>
            </tr>
          </thead>
          <tbody>
            ${buildTableRows(current, comparison, averages)}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Divisor -->
    <tr><td style="background:#fff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

    <!-- Análise de Gastos -->
    ${buildSpendingRows(spending)}

    <!-- Divisor -->
    <tr><td style="background:#fff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

    <!-- Dicas -->
    <tr>
      <td style="background:#fff;padding:20px 32px 28px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">💡 Dicas Personalizadas</h2>
        <ul style="margin:0;padding-left:18px;">
          ${tipsHtml}
        </ul>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="background:#1e40af;padding:28px 32px;text-align:center;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 16px;color:#bfdbfe;font-size:14px;">Veja seu relatório completo com gráficos e histórico detalhado</p>
        <a href="${APP_URL}" style="display:inline-block;background:#fff;color:#1e40af;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none;">Abrir Relatório Completo</a>
        <p style="margin:20px 0 0;font-size:11px;color:#93c5fd;">
          Você recebe este email porque tem plano Premium.<br>
          <a href="${unsubUrl}" style="color:#93c5fd;">Cancelar recebimento de emails</a>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>`;
}

// ── Análise de Gastos por categoria ──────────────────────────────────────────
function buildSpendingRows(spending) {
  if (!spending || !spending.groups || Object.keys(spending.groups).length === 0) return '';

  const groups = spending.groups;
  const total = spending.total || 0;

  const rows = Object.entries(groups).map(([name, g]) => {
    const items = Array.isArray(g) ? g : (g.items || []);
    const groupTotal = typeof g.total === 'number' ? g.total : items.reduce((s, i) => s + i.amount, 0);
    const pct = total > 0 ? ((groupTotal / total) * 100).toFixed(1) : '0.0';

    const subRows = items.map(item => {
      const isFixed = item.source === 'conta_fixa';
      const tagBg = isFixed ? '#fef3c7' : '#fee2e2';
      const tagColor = isFixed ? '#92400e' : '#991b1b';
      const tagLabel = isFixed ? 'Fixa' : 'Variável';
      return `
            <tr>
              <td style="padding:5px 12px 5px 28px;font-size:12px;color:#6b7280;">
                ${escHtml(item.name)}
                <span style="display:inline-block;font-size:10px;padding:1px 5px;border-radius:99px;margin-left:4px;background:${tagBg};color:${tagColor};">${tagLabel}</span>
              </td>
              <td style="padding:5px 12px;text-align:right;font-size:12px;color:#6b7280;">—</td>
              <td style="padding:5px 12px;text-align:right;font-size:12px;color:#374151;">${fmt(item.amount)}</td>
            </tr>`;
    }).join('');

    return `
            <tr style="background:#f9fafb;">
              <td style="padding:8px 12px;font-weight:600;color:#111827;">${escHtml(name)}</td>
              <td style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;">${items.length} item${items.length !== 1 ? 's' : ''} · ${pct}%</td>
              <td style="padding:8px 12px;text-align:right;font-weight:600;color:#111827;">${fmt(groupTotal)}</td>
            </tr>
            ${subRows}`;
  }).join('');

  return `
    <tr>
      <td style="background:#fff;padding:20px 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td><h2 style="margin:0;font-size:16px;color:#111827;">📊 Análise de Gastos</h2></td>
            <td style="text-align:right;font-size:13px;font-weight:700;color:#dc2626;">${fmt(total)} total</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb;">
              <th style="padding:6px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Categoria / Descrição</th>
              <th style="padding:6px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qtd / %</th>
              <th style="padding:6px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </td>
    </tr>`;
}

// ── Linhas da tabela de resumo ────────────────────────────────────────────────
function buildTableRows(current, comparison, averages) {
  const rows = [
    { label: 'Receita', currKey: 'totalIncome', diffKey: 'income', avgKey: 'avgIncome', up: true },
    { label: 'Gastos variáveis', currKey: 'totalExpense', diffKey: 'expense', avgKey: 'avgExpense', up: false },
    { label: 'Contas fixas', currKey: 'totalBills', diffKey: 'bills', avgKey: 'avgBills', up: false },
    { label: 'Investimentos', currKey: 'totalInvested', diffKey: null, avgKey: 'avgIncome', up: true },
    { label: 'Saldo final', currKey: 'balance', diffKey: 'balance', avgKey: 'avgBalance', up: true },
  ];

  return rows.map(({ label, currKey, diffKey, avgKey, up }) => {
    const currVal = current[currKey] ?? 0;
    const diff = (comparison && diffKey) ? comparison.diff[diffKey] : null;
    const avgVal = averages ? (averages[avgKey] ?? null) : null;

    let arrow = '';
    if (diff != null) {
      if (diff > 0) arrow = up
        ? `<span style="color:#16a34a">▲ ${fmt(diff)}</span>`
        : `<span style="color:#dc2626">▲ ${fmt(diff)}</span>`;
      else if (diff < 0) arrow = up
        ? `<span style="color:#dc2626">▼ ${fmt(Math.abs(diff))}</span>`
        : `<span style="color:#16a34a">▼ ${fmt(Math.abs(diff))}</span>`;
      else arrow = '<span style="color:#6b7280">—</span>';
    }

    const avgStr = avgVal != null ? fmt(avgVal) : '—';

    return `
        <tr style="border-top:1px solid #f3f4f6;">
          <td style="padding:8px 12px;color:#374151;">${label}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;">${fmt(currVal)}</td>
          <td style="padding:8px 12px;text-align:right;font-size:13px;">${arrow}</td>
          <td style="padding:8px 12px;text-align:right;color:#6b7280;font-size:13px;">${avgStr}</td>
        </tr>`;
  }).join('');
}

// ── Escape simples para conteúdo de texto ─────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
