import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { SeletorMes } from '@/components/SeletorMes';
import { currentMonth, fmt, fmtMonth } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface HealthData {
    health: { score: number; label: string; tips: string[]; breakdown: { needsPct: number; wantsPct: number; investPct: number; needsScore: number; wantsScore: number; investScore: number } };
    current: { totalIncome: number; totalExpense: number; totalBills: number; totalInvested: number; balance: number };
    ideal: { needs: number; wants: number; invest: number };
    gap: { needs: number; wants: number; invest: number };
    projections: Array<{ month: number; cumulativeBalance: number }>;
    plan: Array<{ pillar: string; action: string; impact: 'high' | 'medium' | 'low' }>;
    enhancements: string[];
    history: Array<{ month: string; score: number }>;
}

function scoreColor(score: number) {
    if (score >= 85) return colors.income;
    if (score >= 65) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return colors.expense;
}

export default function SaudePage() {
    const toast = useToast();
    const [month, setMonth] = useState(currentMonth());
    const [months, setMonths] = useState<string[]>([]);
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        api<string[]>('GET', '/months').then(d => { setMonths(d); if (d.length) setMonth(d[0]); }).catch(() => { });
    }, []);

    const load = useCallback(async (m: string) => {
        try {
            const res = await api<HealthData>('GET', `/health/${m}`);
            setData(res);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load(month).finally(() => setLoading(false)); }, [month]);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(month); setRefreshing(false); }, [month]);

    if (loading) return <View style={s.root}><ActivityIndicator color={colors.income} style={{ flex: 1 }} /></View>;

    const health = data?.health;
    const current = data?.current;
    const ideal = data?.ideal;
    const gap = data?.gap;

    if (!health || !current) return (
        <View style={s.root}>
            <Text style={s.empty}>Sem dados para este mês.</Text>
        </View>
    );

    const sc = scoreColor(health.score);
    const r = 58;
    const circ = 2 * Math.PI * r;
    const circumference = circ;
    const strokeDashoffset = circ * (1 - health.score / 100);

    const pillars = [
        { name: 'Necessidades', icon: '🏠', pct: health.breakdown.needsPct, target: 50, score: health.breakdown.needsScore, actual: current.totalBills, idealAmt: ideal?.needs ?? 0, dir: 'lte' as const, label: '≤ 50%' },
        { name: 'Desejos', icon: '🛍️', pct: health.breakdown.wantsPct, target: 30, score: health.breakdown.wantsScore, actual: current.totalExpense, idealAmt: ideal?.wants ?? 0, dir: 'lte' as const, label: '≤ 30%' },
        { name: 'Investimentos', icon: '📈', pct: health.breakdown.investPct, target: 20, score: health.breakdown.investScore, actual: current.totalInvested, idealAmt: ideal?.invest ?? 0, dir: 'gte' as const, label: '≥ 20%' },
    ];

    return (
        <ScrollView
            style={s.root}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.income} />}
        >
            {/* Header */}
            <View style={s.headerRow}>
                <Text style={s.title}>Saúde Financeira</Text>
                <SeletorMes value={month} months={months} onChange={m => setMonth(m)} />
            </View>

            {/* Score card */}
            <View style={[s.scoreCard, { borderTopColor: sc }]}>
                <View style={s.scoreLeft}>
                    <Text style={[s.scoreNumber, { color: sc }]}>{health.score}</Text>
                    <Text style={s.scoreOf}>/100</Text>
                    <Text style={[s.scoreLabel, { color: sc }]}>{health.label}</Text>
                    <Text style={s.scoreSub}>Regra 50-30-20</Text>
                </View>
                <View style={s.scoreRight}>
                    <Text style={s.scoreDetail}>Renda: {fmt(current.totalIncome)}</Text>
                    <Text style={[s.scoreDetail, { color: current.balance >= 0 ? colors.income : colors.expense }]}>Saldo: {fmt(current.balance)}</Text>
                    {health.tips.map((t, i) => (
                        <Text key={i} style={s.tip}>• {t}</Text>
                    ))}
                </View>
            </View>

            {/* Pillars 50-30-20 */}
            <View style={s.section}>
                <Text style={s.sectionTitle}>📊 Distribuição 50-30-20</Text>
                {pillars.map(p => {
                    const ok = p.dir === 'lte' ? p.pct <= p.target : p.pct >= p.target;
                    const color = ok ? colors.income : colors.expense;
                    const barPct = Math.min(100, p.dir === 'lte' ? (p.pct / (p.target * 1.5)) * 100 : (p.pct / p.target) * 100);
                    const gapVal = p.dir === 'lte'
                        ? (gap?.needs ?? 0) * (p.name === 'Necessidades' ? 1 : 0) + (gap?.wants ?? 0) * (p.name === 'Desejos' ? 1 : 0)
                        : (gap?.invest ?? 0);
                    return (
                        <View key={p.name} style={s.pillarCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                                    <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                                    <View>
                                        <Text style={s.pillarName}>{p.name}</Text>
                                        <Text style={s.pillarMeta}>Meta: {p.label}</Text>
                                    </View>
                                </View>
                                <Text style={[s.pillarScore, { color }]}>{Math.round(p.score)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
                                <Text style={s.pillarStat}>Atual: {fmt(p.actual)} ({p.pct.toFixed(1)}%)</Text>
                                <Text style={s.pillarStat}>Ideal: {fmt(p.idealAmt)}</Text>
                            </View>
                            <View style={s.barBg}><View style={[s.barFill, { width: `${barPct}%` as any, backgroundColor: color }]} /></View>
                            <Text style={[s.pillarGap, { color }]}>
                                {ok ? '✓ Dentro da meta' : p.dir === 'lte' ? `Reduzir ${fmt(gapVal)}/mês` : `Aumentar ${fmt(gapVal)}/mês`}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* History */}
            {data?.history && data.history.length > 0 && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>📅 Tendência dos últimos meses</Text>
                    {data.history.map(h => (
                        <View key={h.month} style={s.histRow}>
                            <Text style={s.histMonth}>{fmtMonth(h.month)}</Text>
                            <View style={[s.barBg, { flex: 1, marginHorizontal: spacing.sm }]}>
                                <View style={[s.barFill, { width: `${h.score}%` as any, backgroundColor: scoreColor(h.score) }]} />
                            </View>
                            <Text style={[s.histScore, { color: scoreColor(h.score) }]}>{h.score}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Projections */}
            {data?.projections && data.projections.length > 0 && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>🔮 Projeção futura</Text>
                    <Text style={s.sectionSub}>Saldo acumulado mantendo o ritmo atual</Text>
                    {data.projections.map(p => (
                        <View key={p.month} style={s.projRow}>
                            <Text style={s.projLabel}>+{p.month} mês{p.month > 1 ? 'es' : ''}</Text>
                            <Text style={[s.projVal, { color: p.cumulativeBalance >= 0 ? colors.income : colors.expense }]}>{fmt(p.cumulativeBalance)}</Text>
                            <Text style={s.projStatus}>{p.cumulativeBalance >= 0 ? 'positivo' : 'negativo'}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Plan */}
            {data?.plan && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>{health.score < 65 ? '🛠️ Plano de Melhora' : '🚀 Plano de Aprimoramento'}</Text>
                    {data.plan.length === 0 ? (
                        <Text style={{ color: colors.income, fontSize: fontSize.sm }}>✅ Parabéns! Você está seguindo a regra 50-30-20.</Text>
                    ) : data.plan.map((p, i) => (
                        <View key={i} style={[s.planItem, p.impact === 'high' ? s.planHigh : p.impact === 'medium' ? s.planMedium : s.planLow]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 }}>
                                <Text style={s.planPillar}>{p.pillar}</Text>
                                <Text style={s.planBadge}>{p.impact}</Text>
                            </View>
                            <Text style={s.planAction}>{p.action}</Text>
                        </View>
                    ))}
                    {data.enhancements?.map((e, i) => (
                        <View key={`enh-${i}`} style={s.planEnhance}><Text style={s.planAction}>{e}</Text></View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    scoreCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', marginBottom: spacing.md, borderTopWidth: 4 },
    scoreLeft: { alignItems: 'center', marginRight: spacing.md, minWidth: 80 },
    scoreNumber: { fontSize: 48, fontWeight: fontWeight.bold, lineHeight: 52 },
    scoreOf: { color: colors.textMuted, fontSize: fontSize.sm },
    scoreLabel: { fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginTop: 4 },
    scoreSub: { color: colors.textMuted, fontSize: fontSize.xs },
    scoreRight: { flex: 1 },
    scoreDetail: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 2 },
    tip: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 3 },
    section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    sectionTitle: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base, marginBottom: spacing.sm },
    sectionSub: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: -spacing.xs, marginBottom: spacing.sm },
    pillarCard: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
    pillarName: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
    pillarMeta: { color: colors.textMuted, fontSize: fontSize.xs },
    pillarScore: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    pillarStat: { color: colors.textMuted, fontSize: fontSize.xs },
    pillarGap: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: 4 },
    barBg: { height: 5, backgroundColor: colors.card, borderRadius: 3, marginVertical: 4 },
    barFill: { height: 5, borderRadius: 3 },
    histRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    histMonth: { color: colors.textMuted, fontSize: fontSize.xs, width: 60 },
    histScore: { fontWeight: fontWeight.bold, fontSize: fontSize.sm, width: 30, textAlign: 'right' },
    projRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.bg },
    projLabel: { color: colors.textMuted, fontSize: fontSize.xs, width: 70 },
    projVal: { fontWeight: fontWeight.bold, fontSize: fontSize.sm, flex: 1 },
    projStatus: { color: colors.textMuted, fontSize: fontSize.xs },
    planItem: { borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
    planHigh: { backgroundColor: 'rgba(239,68,68,0.12)' },
    planMedium: { backgroundColor: 'rgba(245,158,11,0.12)' },
    planLow: { backgroundColor: 'rgba(59,130,246,0.12)' },
    planEnhance: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
    planPillar: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
    planBadge: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', borderWidth: 1, borderColor: colors.border, borderRadius: 3, paddingHorizontal: 4 },
    planAction: { color: colors.textSecondary, fontSize: fontSize.sm },
});
