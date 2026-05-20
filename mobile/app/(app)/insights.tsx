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

interface InsightData {
    forecast: {
        currentBalance: number;
        projectedBalance: number;
        totalIncome: number;
        totalExpense: number;
        totalBills: number;
        unpaidBillsTotal: number;
        dailyExpenseRate: number;
        daysRemaining: number;
        dayOfMonth: number;
        negativeDayForecast?: number;
        isCurrentMonth: boolean;
    };
    subscriptions: {
        total: number;
        groups: Record<string, { total: number; items: Array<{ name: string; amount: number; source: string }> }>;
    };
}

export default function InsightsPage() {
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const [month, setMonth] = useState(currentMonth());
    const [months, setMonths] = useState<string[]>([]);
    const [data, setData] = useState<InsightData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        api<string[]>('GET', '/months').then(d => { setMonths(d); if (d.length) setMonth(d[0]); }).catch(() => { });
    }, []);

    const load = useCallback(async (m: string) => {
        try {
            const res = await api<InsightData>('GET', `/insights/${m}`);
            setData(res);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load(month).finally(() => setLoading(false)); }, [month]);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(month); setRefreshing(false); }, [month]);

    function toggleGroup(name: string) {
        setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
    }

    if (loading) return <View style={s.root}><ActivityIndicator color={colors.primary} style={{ flex: 1 }} /></View>;

    const f = data?.forecast;
    const subs = data?.subscriptions;
    const progressPct = f && f.totalIncome > 0 ? Math.min(100, ((f.totalExpense + f.totalBills) / f.totalIncome) * 100) : 0;
    const progressColor = progressPct >= 90 ? colors.expense : progressPct >= 70 ? '#f59e0b' : colors.income;

    return (
        <ScrollView
            style={s.root}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={s.headerRow}>
                <TouchableOpacity onPress={openSidebar} style={s.hamburger} hitSlop={8}>
                    <IconMenu color={colors.textPrimary} size={22} />
                </TouchableOpacity>
                <Text style={s.title}>Inteligência</Text>
                <SeletorMes value={month} months={months} onChange={m => setMonth(m)} />
            </View>

            {/* Forecast section */}
            {f && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>💡 Projeção de Saldo — {fmtMonth(month)}</Text>

                    {/* Alert */}
                    {(() => {
                        if (!f.isCurrentMonth) return <View style={[s.alert, s.alertInfo]}><Text style={s.alertText}>ℹ️ Visualizando projeção para um mês não corrente.</Text></View>;
                        if (f.currentBalance < 0 || f.projectedBalance < 0)
                            return <View style={[s.alert, s.alertDanger]}><Text style={s.alertText}>🔴 Atenção: seu saldo {f.currentBalance < 0 ? 'já está negativo' : `ficará negativo${f.negativeDayForecast ? ` por volta do dia ${f.negativeDayForecast}` : ''}`}. Revise seus gastos.</Text></View>;
                        if (f.negativeDayForecast)
                            return <View style={[s.alert, s.alertDanger]}><Text style={s.alertText}>⚠️ Cuidado: se continuar assim, você ficará negativo por volta do dia {f.negativeDayForecast}.</Text></View>;
                        if (progressPct >= 90)
                            return <View style={[s.alert, s.alertDanger]}><Text style={s.alertText}>⚠️ Comprometimento crítico ({progressPct.toFixed(1)}%)! Suas despesas estão consumindo quase toda a receita.</Text></View>;
                        if (progressPct >= 70)
                            return <View style={[s.alert, s.alertWarning]}><Text style={s.alertText}>🟡 Atenção: {progressPct.toFixed(1)}% da receita já comprometida.</Text></View>;
                        return <View style={[s.alert, s.alertSuccess]}><Text style={s.alertText}>✅ Projeção positiva! Você deve fechar o mês no azul.</Text></View>;
                    })()}

                    {/* 3 info cards */}
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        {[
                            { label: 'Saldo atual', value: fmt(f.currentBalance), sub: `Dia ${f.dayOfMonth}`, color: f.currentBalance >= 0 ? colors.income : colors.expense },
                            { label: 'Saldo projetado', value: fmt(f.projectedBalance), sub: `${fmt(f.dailyExpenseRate)}/dia × ${f.daysRemaining} dias`, color: f.projectedBalance >= 0 ? colors.income : colors.expense },
                            { label: 'Contas em aberto', value: fmt(f.unpaidBillsTotal), sub: `De ${fmt(f.totalBills)} total`, color: f.unpaidBillsTotal > 0 ? colors.expense : colors.income },
                        ].map(c => (
                            <View key={c.label} style={s.infoCard}>
                                <Text style={s.infoLabel}>{c.label}</Text>
                                <Text style={[s.infoValue, { color: c.color }]}>{c.value}</Text>
                                <Text style={s.infoSub}>{c.sub}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Progress bar */}
                    <View style={{ marginTop: spacing.md }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={s.barLabel}>Comprometimento da receita</Text>
                            <Text style={[s.barLabel, { color: progressColor }]}>{progressPct.toFixed(1)}%</Text>
                        </View>
                        <View style={s.barBg}><View style={[s.barFill, { width: `${progressPct}%` as any, backgroundColor: progressColor }]} /></View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={s.barLegend}>🟢 &lt;70% saudável</Text>
                            <Text style={s.barLegend}>🟡 70–90% atenção</Text>
                            <Text style={s.barLegend}>🔴 &gt;90% crítico</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Subscriptions */}
            {subs && (
                <View style={s.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                        <Text style={s.sectionTitle}>📦 Análise de Gastos</Text>
                        <Text style={[s.sectionTitle, { color: colors.expense, fontSize: fontSize.sm }]}>{fmt(subs.total)}</Text>
                    </View>
                    {Object.entries(subs.groups).map(([name, group]) => {
                        const items = Array.isArray(group) ? group as any[] : group.items;
                        const total = typeof (group as any).total === 'number' ? (group as any).total : items.reduce((s, i) => s + i.amount, 0);
                        const isOpen = openGroups[name];
                        return (
                            <View key={name} style={s.groupCard}>
                                <TouchableOpacity style={s.groupHeader} onPress={() => toggleGroup(name)}>
                                    <Text style={s.groupName}>{name}</Text>
                                    <Text style={s.groupCount}>{items.length}</Text>
                                    <Text style={s.groupTotal}>{fmt(total)}</Text>
                                    <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>
                                {isOpen && items.sort((a, b) => b.amount - a.amount).map((item, idx) => (
                                    <View key={idx} style={s.subItem}>
                                        <Text style={s.subName} numberOfLines={1}>{item.name}</Text>
                                        <View style={[s.subTag, item.source === 'conta_fixa' ? s.subTagBill : s.subTagExp]}>
                                            <Text style={s.subTagText}>{item.source === 'conta_fixa' ? 'Fixa' : 'Variável'}</Text>
                                        </View>
                                        <Text style={s.subAmt}>{fmt(item.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        );
                    })}
                    {Object.keys(subs.groups).length === 0 && <Text style={s.empty}>Nenhum gasto registrado neste mês.</Text>}
                </View>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
    hamburger: { padding: 2 },
    title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    sectionTitle: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base, marginBottom: spacing.sm },
    alert: { borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
    alertInfo: { backgroundColor: 'rgba(96,165,250,0.15)' },
    alertDanger: { backgroundColor: 'rgba(239,68,68,0.15)' },
    alertWarning: { backgroundColor: 'rgba(245,158,11,0.15)' },
    alertSuccess: { backgroundColor: 'rgba(34,197,94,0.15)' },
    alertText: { color: colors.textPrimary, fontSize: fontSize.sm },
    infoCard: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.sm },
    infoLabel: { color: colors.textMuted, fontSize: fontSize.xs },
    infoValue: { fontWeight: fontWeight.bold, fontSize: fontSize.sm, marginTop: 2 },
    infoSub: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
    barLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    barBg: { height: 6, backgroundColor: colors.bg, borderRadius: 3 },
    barFill: { height: 6, borderRadius: 3 },
    barLegend: { color: colors.textMuted, fontSize: 9 },
    groupCard: { backgroundColor: colors.bg, borderRadius: radius.md, marginBottom: spacing.xs, overflow: 'hidden' },
    groupHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.xs },
    groupName: { flex: 1, color: colors.textPrimary, fontWeight: fontWeight.medium, fontSize: fontSize.sm },
    groupCount: { color: colors.textMuted, fontSize: fontSize.xs, marginRight: spacing.xs },
    groupTotal: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginRight: spacing.xs },
    chevron: { color: colors.textMuted, fontSize: 10 },
    subItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.card, gap: spacing.xs },
    subName: { flex: 1, color: colors.textSecondary, fontSize: fontSize.xs },
    subTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
    subTagBill: { backgroundColor: 'rgba(234,179,8,0.2)' },
    subTagExp: { backgroundColor: 'rgba(239,68,68,0.15)' },
    subTagText: { fontSize: 9, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    subAmt: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
    empty: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.md },
});
