import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { SeletorMes } from '@/components/SeletorMes';
import { IconMenu } from '@/components/Icon';
import { currentMonth, fmt, fmtMonth } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface ReportData {
    stats: {
        totalIncome: number;
        totalExpense: number;
        totalBills: number;
        totalOutflow: number;
        totalInvested: number;
        balance: number;
        savingsRate: number;
        bills: Array<{ id: string; description: string; amount: number; dueDay: number; active: boolean; paidMonths: string[] }>;
        health?: { score: number; label: string };
    };
    comparison: {
        current: { month: string; totalIncome: number; totalExpense: number; totalBills: number; balance: number };
        previous: { month: string; totalIncome: number; totalExpense: number; totalBills: number; balance: number };
    };
    averages?: {
        monthsAnalyzed: number;
        avgIncome: number;
        avgExpense: number;
        avgBills: number;
        avgBalance: number;
        avgSavingsRate: number;
    };
    goals: Array<{ description: string; targetAmount: number; savedAmount: number }>;
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={s.tableRow}>
            <Text style={s.tableLabel}>{label}</Text>
            <Text style={[s.tableValue, color ? { color } : undefined]}>{value}</Text>
        </View>
    );
}

function CmpRow({ label, cur, prev }: { label: string; cur: number; prev: number }) {
    const delta = cur - prev;
    const deltaColor = delta > 0 ? colors.income : delta < 0 ? colors.expense : colors.textMuted;
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '─';
    return (
        <View style={s.cmpRow}>
            <Text style={s.cmpLabel}>{label}</Text>
            <Text style={s.cmpPrev}>{fmt(prev)}</Text>
            <Text style={[s.cmpDelta, { color: deltaColor }]}>{arrow} {fmt(Math.abs(delta))}</Text>
            <Text style={s.cmpCur}>{fmt(cur)}</Text>
        </View>
    );
}

export default function RelatoriosPage() {
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const [month, setMonth] = useState(currentMonth());
    const [months, setMonths] = useState<string[]>([]);
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        api<string[]>('GET', '/months').then(d => { setMonths(d); if (d.length) setMonth(d[0]); }).catch(() => { });
    }, []);

    const load = useCallback(async (m: string) => {
        try {
            const [stats, comparison, averages, goals] = await Promise.all([
                api<ReportData['stats']>('GET', `/stats/${m}`),
                api<ReportData['comparison']>('GET', `/comparison/${m}`),
                api<ReportData['averages']>('GET', '/averages').catch(() => undefined),
                api<ReportData['goals']>('GET', '/goals').catch(() => [] as ReportData['goals']),
            ]);
            setData({ stats, comparison, averages, goals });
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load(month).finally(() => setLoading(false)); }, [month]);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(month); setRefreshing(false); }, [month]);

    if (loading) return <View style={s.root}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></View>;
    if (!data) return <View style={s.root}><Text style={s.empty}>Sem dados</Text></View>;

    const { stats, comparison, averages, goals } = data;

    // bills analysis
    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const activeBills = (stats.bills || []).filter(b => b.active);
    const totalBillsCount = activeBills.length;
    const overdueBills = activeBills.filter(b => {
        if ((b.paidMonths || []).includes(month)) return false;
        if (month < currentYM) return true;
        if (month > currentYM) return false;
        return today.getDate() > b.dueDay;
    });
    const paidBills = activeBills.filter(b => (b.paidMonths || []).includes(month));
    const paidPct = totalBillsCount > 0 ? ((paidBills.length / totalBillsCount) * 100).toFixed(1) : '0.0';
    const overduePct = totalBillsCount > 0 ? ((overdueBills.length / totalBillsCount) * 100).toFixed(1) : '0.0';

    // Goals
    const doneGoals = goals.filter(g => (g.savedAmount || 0) >= g.targetAmount);

    return (
        <View style={s.root}>
            {/* Header fixo: Linha 1 */}
            <View style={s.stickyHeader}>
                <View style={s.hRow1}>
                    <TouchableOpacity onPress={openSidebar} style={s.hamburger} hitSlop={8}>
                        <IconMenu color={colors.textPrimary} size={22} />
                    </TouchableOpacity>
                    <Text style={s.title}>Relatórios</Text>
                    <SeletorMes value={month} months={months} onChange={m => setMonth(m)} />
                </View>
            </View>
            <ScrollView
                contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >

                {/* Saúde score */}
                {stats.health && (
                    <View style={[s.healthCard, { borderLeftColor: stats.health.score >= 65 ? colors.income : colors.expense }]}>
                        <View>
                            <Text style={s.healthLabel}>Saúde Financeira</Text>
                            <Text style={s.healthLabelSub}>{fmtMonth(month)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s.healthScore, { color: stats.health.score >= 85 ? colors.income : stats.health.score >= 65 ? '#f59e0b' : colors.expense }]}>{stats.health.score}</Text>
                            <Text style={s.healthLabelSub}>{stats.health.label}</Text>
                        </View>
                    </View>
                )}

                {/* Resumo */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Resumo do Mês — {fmtMonth(month)}</Text>
                    <Row label="Ganhos" value={fmt(stats.totalIncome)} color={colors.income} />
                    <Row label="Gastos Variáveis" value={fmt(stats.totalExpense)} color={colors.expense} />
                    <Row label="Contas Fixas" value={fmt(stats.totalBills)} />
                    <Row label="Total de Saídas" value={fmt(stats.totalOutflow)} color={colors.expense} />
                    <Row label="Investido no mês" value={fmt(stats.totalInvested ?? 0)} color={colors.invest} />
                    <Row label="Saldo" value={fmt(stats.balance)} color={stats.balance >= 0 ? colors.income : colors.expense} />
                    <Row label="Taxa de Poupança" value={`${(stats.savingsRate ?? 0).toFixed(1)}%`} />
                </View>

                {/* Adimplência */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Adimplência — {fmtMonth(month)}</Text>
                    <Row label="Contas ativas" value={`${totalBillsCount}`} />
                    <Row label={`✓ Pagas (${paidPct}%)`} value={`${paidBills.length} · ${fmt(paidBills.reduce((s, b) => s + b.amount, 0))}`} color={colors.income} />
                    <Row label={`⚠ Vencidas (${overduePct}%)`} value={`${overdueBills.length} · ${fmt(overdueBills.reduce((s, b) => s + b.amount, 0))}`} color={overdueBills.length > 0 ? colors.expense : colors.textMuted} />
                    {overdueBills.map(b => (
                        <View key={b.id} style={{ paddingLeft: spacing.lg, paddingVertical: 2 }}>
                            <Text style={s.overdueBill}>{b.description} — dia {b.dueDay} — {fmt(b.amount)}</Text>
                        </View>
                    ))}
                </View>

                {/* Metas */}
                {goals.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Metas — {goals.length} total · {doneGoals.length} concluída{doneGoals.length !== 1 ? 's' : ''}</Text>
                        {goals.map(g => {
                            const pct = Math.min(100, ((g.savedAmount || 0) / g.targetAmount) * 100);
                            const color = pct >= 80 ? colors.income : pct >= 40 ? '#f59e0b' : colors.primary;
                            return (
                                <View key={g.description} style={{ marginBottom: spacing.xs }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={s.goalName} numberOfLines={1}>{g.description}</Text>
                                        <Text style={[s.goalPct, { color }]}>{pct.toFixed(1)}%</Text>
                                    </View>
                                    <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} /></View>
                                    <Text style={s.goalValues}>{fmt(g.savedAmount || 0)} / {fmt(g.targetAmount)}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Comparação */}
                <View style={s.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={s.sectionTitle}>Comparação com mês anterior</Text>
                    </View>
                    <View style={s.cmpHeader}>
                        <Text style={s.cmpLabelHeader}>Item</Text>
                        <Text style={s.cmpColHeader}>{fmtMonth(comparison.previous.month)}</Text>
                        <Text style={s.cmpColHeader}>Δ</Text>
                        <Text style={s.cmpColHeader}>{fmtMonth(comparison.current.month)}</Text>
                    </View>
                    <CmpRow label="Ganhos" prev={comparison.previous.totalIncome} cur={comparison.current.totalIncome} />
                    <CmpRow label="Gastos Var." prev={comparison.previous.totalExpense} cur={comparison.current.totalExpense} />
                    <CmpRow label="Contas" prev={comparison.previous.totalBills} cur={comparison.current.totalBills} />
                    <CmpRow label="Saldo" prev={comparison.previous.balance} cur={comparison.current.balance} />
                </View>

                {/* Médias */}
                {averages && averages.avgIncome !== undefined && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Médias Mensais ({averages.monthsAnalyzed} mês{averages.monthsAnalyzed !== 1 ? 'es' : ''})</Text>
                        <Row label="Média de Ganhos" value={fmt(averages.avgIncome)} color={colors.income} />
                        <Row label="Média de Gastos" value={fmt(averages.avgExpense)} color={colors.expense} />
                        <Row label="Média de Contas" value={fmt(averages.avgBills)} />
                        <Row label="Média de Saldo" value={fmt(averages.avgBalance)} color={averages.avgBalance >= 0 ? colors.income : colors.expense} />
                        <Row label="Média Poupança" value={`${(averages.avgSavingsRate ?? 0).toFixed(1)}%`} />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    stickyHeader: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
    hRow1: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
    hamburger: { padding: 2 },
    title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    healthCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, borderLeftWidth: 4 },
    healthLabel: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
    healthLabelSub: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    healthScore: { fontSize: 36, fontWeight: fontWeight.bold },
    section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    sectionTitle: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base, marginBottom: spacing.sm },
    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.bg },
    tableLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
    tableValue: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
    overdueBill: { color: colors.expense, fontSize: fontSize.xs },
    cmpHeader: { flexDirection: 'row', paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.bg, marginBottom: spacing.xs },
    cmpLabelHeader: { flex: 2, color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    cmpColHeader: { flex: 1, color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'right', fontWeight: fontWeight.semibold },
    cmpRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.bg },
    cmpLabel: { flex: 2, color: colors.textSecondary, fontSize: fontSize.sm },
    cmpPrev: { flex: 1, color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'right' },
    cmpDelta: { flex: 1, fontSize: fontSize.xs, textAlign: 'right' },
    cmpCur: { flex: 1, color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, textAlign: 'right' },
    goalName: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    goalPct: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    goalValues: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    barBg: { height: 4, backgroundColor: colors.bg, borderRadius: 2, marginVertical: 3 },
    barFill: { height: 4, borderRadius: 2 },
});
