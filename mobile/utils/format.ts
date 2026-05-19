// Formata valor em BRL: fmt(1500) → "R$ 1.500,00"
export function fmt(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// YYYY-MM → "maio de 2026"
export function fmtMonth(yyyyMM: string): string {
    if (!yyyyMM) return '';
    const [y, m] = yyyyMM.split('-');
    return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// YYYY-MM-DD → "18/05/2026"
export function fmtDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

// Data de hoje em YYYY-MM-DD
export function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

// Mês atual em YYYY-MM
export function currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Mês anterior: "2026-05" → "2026-04"
export function prevMonth(yyyyMM: string): string {
    const [y, m] = yyyyMM.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Variação positiva/negativa para colorir
export function deltaColor(v: number, goodIfPositive = true): string {
    if (v === 0) return '#94a3b8';
    return (goodIfPositive ? v > 0 : v < 0) ? '#22c55e' : '#ef4444';
}

export function deltaLabel(v: number): string {
    if (v === 0) return '—';
    return (v > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(v));
}

export function pctLabel(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}
