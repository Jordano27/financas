import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function todayISO() {
    return format(new Date(), 'yyyy-MM-dd');
}

export function monthKey(dateStr) {
    return dateStr.slice(0, 7);
}

export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatMonthLabel(yyyyMM) {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, 'MMMM yyyy', { locale: ptBR });
}

export function currentMonth() {
    return format(new Date(), 'yyyy-MM');
}

export function previousMonth(yyyyMM) {
    const [year, month] = yyyyMM.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    return format(d, 'yyyy-MM');
}
