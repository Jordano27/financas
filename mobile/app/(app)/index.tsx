import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
    TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SimpleBarChart, SimplePieChart } from '@/components/Charts';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { SeletorMes } from '@/components/SeletorMes';
import { IconMenu } from '@/components/Icon';
import { currentMonth, deltaLabel, fmt, fmtDate, fmtMonth, prevMonth } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '@/constants/theme';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Stats {
    totalIncome: number;
    totalExpense: number;
    totalBills: number;
    totalOutflow: number;
    totalInvested: number;
    balance: number;
    savingsRate: number;
    health: { score: number; label: string };
    bills: Array<{ id: string; amount: number; dueDay: number; paidMonths: string[]; category: string; description: string; createdAt?: string }>;
    incomes: Array<{ id: string; description: string; amount: number; date: string; category: string; createdAt: string }>;
    expenses: Array<{ id: string; description: string; amount: number; date: string; category: string; createdAt: string }>;
    expenseByCategory: Record<string, number>;
    billByCategory: Record<string, number>;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
    return (
        <View style={[styles.card, styles.statCard]}>
            <Text style={[styles.statLabel]}>{label}</Text>
            <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
            <Text style={styles.statSub} numberOfLines={2}>{sub}</Text>
        </View>
    );
}

// ── Cores do gráfico de pizza ─────────────────────────────────────────────────
const PIE_COLORS = ['#818cf8', '#34d399', '#f87171', '#fbbf24', '#38bdf8', '#a78bfa', '#fb923c', '#4ade80', '#f472b6'];

export default function DashboardScreen() {
    const { user } = useAuth();
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const { width } = useWindowDimensions();

    const [month, setMonth] = useState(currentMonth());
    const [months, setMonths] = useState<string[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [prevStats, setPrevStats] = useState<Stats | null>(null);
    const [histStats, setHistStats] = useState<Stats[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isPremium = user?.plan === 'premium' || user?.role === 'admin';

    // ── Carregar meses disponíveis ──────────────────────────────────────────
    useEffect(() => {
        api<string[]>('GET', '/months').then(data => {
            setMonths(data);
            if (data.length) setMonth(data[0]);
        }).catch(() => { });
    }, []);

    // ── Carregar dados do mês ───────────────────────────────────────────────
    const load = useCallback(async (m: string) => {
        try {
            const prev = prevMonth(m);
            const today = m;
            const histMonths: string[] = [];
            let [y, mo] = today.split('-').map(Number);
            for (let i = 5; i >= 0; i--) {
                const d = new Date(y, mo - 1 - i, 1);
                histMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }

            const [s, ps, ...hs] = await Promise.all([
                api<Stats>('GET', `/stats/${m}`),
                api<Stats>('GET', `/stats/${prev}`),
                ...histMonths.map(hm => api<Stats>('GET', `/stats/${hm}`)),
            ]);
            setStats(s);
            setPrevStats(ps);
            setHistStats(hs);
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Erro ao carregar dados', 'error');
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        load(month).finally(() => setLoading(false));
    }, [month]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load(month);
        setRefreshing(false);
    }, [month]);

    // ── Calcular cards ─────────────────────────────────────────────────────
    function buildCards() {
        if (!stats) return [];
        const { totalIncome, totalExpense, totalBills, totalOutflow, totalInvested, balance, savingsRate, health, bills } = stats;
        const prevInvested = prevStats?.totalInvested ?? 0;
        const investDelta = (totalInvested ?? 0) - prevInvested;
        const investDeltaSign = investDelta > 0 ? '+' : '';
        const investPctLabel = prevInvested > 0
            ? ` (${investDeltaSign}${((investDelta / prevInvested) * 100).toFixed(1)}%)`
            : '';

        const now = new Date();
        const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const overdue = (bills ?? []).filter(b => {
            const isPaid = (b.paidMonths ?? []).includes(month);
            if (isPaid) return false;
            if (month < currentYM) return true;
            if (month > currentYM) return false;
            return now.getDate() > b.dueDay;
        });
        const paid = (bills ?? []).filter(b => (b.paidMonths ?? []).includes(month));
        const totalBillCount = (bills ?? []).length;
        const unpaidPct = totalBillCount > 0 ? ((overdue.length / totalBillCount) * 100).toFixed(1) : '0.0';
        const paidPct = totalBillCount > 0 ? ((paid.length / totalBillCount) * 100).toFixed(1) : '0.0';

        const healthColor = health.score >= 80 ? colors.success : health.score >= 60 ? colors.warning : colors.danger;

        return [
            { label: 'Ganhos', value: fmt(totalIncome), sub: fmtMonth(month), accent: colors.income },
            { label: 'Total de Saídas', value: fmt(totalOutflow + (totalInvested ?? 0)), sub: `${fmt(totalExpense)} gastos · ${fmt(totalBills)} contas · ${fmt(totalInvested ?? 0)} invest.`, accent: colors.expense },
            { label: 'Saldo', value: fmt(balance), sub: `${(savingsRate ?? 0).toFixed(1)}% poupado · ${fmt(totalInvested ?? 0)} investido`, accent: balance >= 0 ? colors.income : colors.expense },
            { label: 'Investido no mês', value: fmt(totalInvested ?? 0), sub: deltaLabel(investDelta) + (prevInvested ? ` vs mês ant.` : ''), accent: colors.invest },
            { label: 'Variação de Investimentos', value: `${investDeltaSign}${fmt(investDelta)}${investPctLabel}`, sub: prevInvested === 0 ? 'Sem invest. no mês anterior' : `Mês ant.: ${fmt(prevInvested)}`, accent: investDelta >= 0 ? colors.income : colors.expense },
            { label: 'Inadimplência', value: `${unpaidPct}%`, sub: overdue.length === 0 ? 'Nenhuma conta vencida ✓' : `${overdue.length} de ${totalBillCount} contas`, accent: overdue.length === 0 ? colors.success : Number(unpaidPct) >= 50 ? colors.danger : colors.bills },
            { label: 'Adimplência', value: `${paidPct}%`, sub: paid.length === 0 ? 'Nenhuma conta paga ainda' : `${paid.length} de ${totalBillCount} contas pagas`, accent: Number(paidPct) === 100 ? colors.success : Number(paidPct) >= 50 ? colors.bills : colors.danger },
            ...(isPremium ? [{ label: 'Saúde Financeira', value: `${health.score}/100`, sub: health.label, accent: healthColor }] : []),
        ];
    }

    // ── Dados do gráfico de barras ─────────────────────────────────────────
    function buildBarData() {
        const today = month;
        const histMonths: string[] = [];
        let [y, mo] = today.split('-').map(Number);
        for (let i = 5; i >= 0; i--) {
            const d = new Date(y, mo - 1 - i, 1);
            histMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        const labels = histMonths.map(m => {
            const [yy, mm] = m.split('-');
            return new Date(+yy, +mm - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3);
        });
        return {
            labels,
            datasets: [
                { label: 'Ganhos', values: histStats.map(s => s?.totalIncome ?? 0), color: 'rgba(52,211,153,0.85)' },
                { label: 'Saídas', values: histStats.map(s => s?.totalOutflow ?? 0), color: 'rgba(248,113,113,0.85)' },
                { label: 'Investido', values: histStats.map(s => s?.totalInvested ?? 0), color: 'rgba(56,189,248,0.85)' },
            ],
        };
    }

    // ── Dados do gráfico de pizza ──────────────────────────────────────────
    function buildPieData() {
        if (!stats) return [];
        const merged: Record<string, number> = { ...(stats.expenseByCategory ?? {}) };
        for (const [k, v] of Object.entries(stats.billByCategory ?? {})) {
            merged[k] = (merged[k] ?? 0) + v;
        }
        return Object.entries(merged).map(([name, amount], i) => ({
            name: name.length > 12 ? name.slice(0, 12) + '\u2026' : name,
            amount,
            color: PIE_COLORS[i % PIE_COLORS.length],
        }));
    }

    // ── Lançamentos recentes ───────────────────────────────────────────────
    function buildRecent() {
        if (!stats) return [];
        const bills = (stats.bills ?? []).map(b => ({ ...b, type: 'bill' as const }));
        const invests: never[] = [];
        const all = [
            ...(stats.incomes ?? []).map(i => ({ ...i, type: 'income' as const })),
            ...(stats.expenses ?? []).map(e => ({ ...e, type: 'expense' as const })),
            ...bills,
        ].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 8);
        return all;
    }

    const chartWidth = width - spacing.lg * 2 - 2;

    const cards = buildCards();
    const recent = buildRecent();
    const pieData = buildPieData();
    const barData = buildBarData();

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={openSidebar} style={styles.hamburger} hitSlop={8}>
                        <IconMenu color={colors.textPrimary} size={22} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}</Text>
                    </View>
                </View>
                <SeletorMes value={month} months={months} onChange={m => setMonth(m)} />
            </View>

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <>
                    {/* Stat cards */}
                    <View style={styles.cardsGrid}>
                        {cards.map((c, i) => <StatCard key={i} {...c} />)}
                    </View>

                    {/* Gráfico de barras — histórico */}
                    <View style={[styles.card, { marginTop: spacing.md }]}>
                        <Text style={styles.cardTitle}>Histórico — últimos 6 meses</Text>
                        <SimpleBarChart
                            labels={barData.labels}
                            datasets={barData.datasets}
                            width={chartWidth}
                            height={180}
                        />
                    </View>

                    {/* Gráfico de pizza — categorias */}
                    {pieData.length > 0 && (
                        <View style={[styles.card, { marginTop: spacing.md }]}>
                            <Text style={styles.cardTitle}>Gastos por categoria</Text>
                            <SimplePieChart data={pieData} size={140} />
                        </View>
                    )}

                    {/* Lançamentos recentes */}
                    <View style={[styles.card, { marginTop: spacing.md }]}>
                        <Text style={styles.cardTitle}>Lançamentos recentes</Text>
                        {recent.length === 0 ? (
                            <Text style={styles.empty}>Nenhum lançamento neste mês</Text>
                        ) : (
                            recent.map(tx => {
                                const isBill = tx.type === 'bill';
                                const accentColor = tx.type === 'income' ? colors.income : isBill ? colors.bills : colors.expense;
                                const sign = tx.type === 'income' ? '+' : '-';
                                return (
                                    <View key={tx.id} style={styles.txItem}>
                                        <View style={[styles.txDot, { backgroundColor: accentColor }]} />
                                        <View style={styles.txInfo}>
                                            <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                            <Text style={styles.txMeta}>
                                                {isBill ? 'Conta fixa' : fmtDate((tx as { date: string }).date)} · {tx.category}
                                            </Text>
                                        </View>
                                        <Text style={[styles.txAmount, { color: accentColor }]}>
                                            {sign}{fmt(tx.amount)}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    hamburger: { padding: 2 },
    greeting: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
    cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow },
    statCard: { width: '47.5%' },
    statLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginBottom: spacing.xs },
    statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 2 },
    statSub: { color: colors.textSecondary, fontSize: fontSize.xs },
    cardTitle: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
    empty: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
    txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    txDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
    txInfo: { flex: 1, marginRight: spacing.sm },
    txDesc: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    txMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    txAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
