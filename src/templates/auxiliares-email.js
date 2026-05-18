/**
 * src/email-templates/email-helpers.js
 * Utilitários compartilhados por todos os templates de email.
 */

export function fmt(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function fmtPct(v) {
    const n = Number(v);
    if (isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
}

export function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Formata YYYY-MM-DD → DD/MM/YYYY */
export function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const s = String(dateStr).split('T')[0]; // suporta ISO completo
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return '—';
    return `${d}/${m}/${y}`;
}

/** Formata YYYY-MM → "Mês Ano" em português */
export function monthLabel(yyyyMM) {
    if (!yyyyMM) return '';
    const [year, month] = yyyyMM.split('-');
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${names[Number(month) - 1]} ${year}`;
}
