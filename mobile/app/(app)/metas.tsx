import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { fmt, todayISO } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import { IconMenu } from '@/components/Icon';

interface Contribution { id: string; amount: number; date: string; note?: string; }

interface Goal {
    id: string;
    description: string;
    category?: string;
    targetAmount: number;
    savedAmount?: number;
    targetDate: string;
    contributions?: Contribution[];
}

function progressColor(pct: number) {
    if (pct >= 80) return colors.income;
    if (pct >= 40) return '#f59e0b';
    return colors.primary;
}

function fmtGoalDate(iso: string) {
    if (!iso) return '';
    const [y, m] = iso.split('-');
    const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${names[parseInt(m, 10) - 1]} ${y}`;
}

function monthsUntil(targetDate: string) {
    const now = new Date();
    const t = new Date(targetDate + (targetDate.length === 7 ? '-01' : '') + 'T00:00:00');
    const diff = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
    return Math.max(0, diff);
}

// ─────────────── Modal Criar/Editar ─────────────────────────────────────────
function GoalModal({ visible, onClose, onSaved, initial }: {
    visible: boolean; onClose: () => void; onSaved: () => void; initial?: Goal | null;
}) {
    const toast = useToast();
    const [description, setDescription] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [category, setCategory] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setDescription(initial?.description ?? '');
            setTargetAmount(initial ? String(initial.targetAmount) : '');
            setTargetDate(initial ? initial.targetDate.substring(0, 7) : '');
            setCategory(initial?.category ?? '');
        }
    }, [visible, initial]);

    async function save() {
        if (!description.trim()) { toast('Informe a descrição', 'error'); return; }
        const val = parseFloat(targetAmount.replace(',', '.'));
        if (!val || val <= 0) { toast('Valor inválido', 'error'); return; }
        if (!targetDate) { toast('Informe a data alvo', 'error'); return; }
        setSaving(true);
        try {
            const body = { description: description.trim(), targetAmount: val, targetDate: targetDate + '-01', category: category.trim() || 'Geral' };
            if (initial) {
                await api('PUT', `/goals/${initial.id}`, body);
                toast('Meta atualizada', 'success');
            } else {
                await api('POST', '/goals', body);
                toast('Meta criada!', 'success');
            }
            onSaved();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Erro', 'error');
        } finally { setSaving(false); }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.sheet}>
                <Text style={s.sheetTitle}>{initial ? 'Editar Meta' : 'Nova Meta'}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={s.label}>Descrição *</Text>
                    <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="Ex: Viagem ao Japão" placeholderTextColor={colors.textMuted} />

                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Valor Alvo (R$) *</Text>
                            <TextInput style={s.input} value={targetAmount} onChangeText={setTargetAmount} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Data Alvo *</Text>
                            <TextInput style={s.input} value={targetDate} onChangeText={setTargetDate} placeholder="AAAA-MM" placeholderTextColor={colors.textMuted} />
                        </View>
                    </View>

                    <Text style={s.label}>Categoria</Text>
                    <TextInput style={s.input} value={category} onChangeText={setCategory} placeholder="Ex: Viagem, Carro" placeholderTextColor={colors.textMuted} />

                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={s.btnPrimary} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{initial ? 'Salvar' : 'Criar Meta'}</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─────────────── Modal Aportar ───────────────────────────────────────────────
function ContributeModal({ visible, onClose, onSaved, goal }: {
    visible: boolean; onClose: () => void; onSaved: () => void; goal: Goal | null;
}) {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayISO());
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible && goal) {
            const months = monthsUntil(goal.targetDate);
            const remaining = Math.max(0, goal.targetAmount - (goal.savedAmount || 0));
            setAmount(months > 0 ? (remaining / months).toFixed(2) : '');
            setDate(todayISO());
            setNote('');
        }
    }, [visible, goal]);

    async function save() {
        if (!goal) return;
        const val = parseFloat(amount.replace(',', '.'));
        if (!val || val <= 0) { toast('Valor inválido', 'error'); return; }
        setSaving(true);
        try {
            await api('POST', `/goals/${goal.id}/contributions`, { amount: val, date, note });
            toast('Aporte registrado!', 'success');
            onSaved();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Erro', 'error');
        } finally { setSaving(false); }
    }

    if (!goal) return null;
    const pct = Math.min(100, ((goal.savedAmount || 0) / goal.targetAmount) * 100);
    const color = progressColor(pct);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.sheet}>
                <Text style={s.sheetTitle}>Aportar: {goal.description}</Text>
                <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} /></View>
                <Text style={s.subLabel}>{fmt(goal.savedAmount || 0)} de {fmt(goal.targetAmount)} ({pct.toFixed(1)}%)</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Valor (R$) *</Text>
                            <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Data</Text>
                            <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} />
                        </View>
                    </View>
                    <Text style={s.label}>Nota (opcional)</Text>
                    <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Ex: Salário de maio" placeholderTextColor={colors.textMuted} />
                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={s.btnPrimary} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Confirmar Aporte</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─────────────── Modal Histórico Aportes ────────────────────────────────────
function ContribsHistoryModal({ visible, onClose, onDeleted, goal }: {
    visible: boolean; onClose: () => void; onDeleted: () => void; goal: Goal | null;
}) {
    const toast = useToast();

    async function remove(cid: string) {
        if (!goal) return;
        Alert.alert('Remover', 'Remover este aporte?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover', style: 'destructive', onPress: async () => {
                    try {
                        await api('DELETE', `/goals/${goal.id}/contributions/${cid}`);
                        toast('Aporte removido', 'success');
                        onDeleted();
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const contribs = goal?.contributions?.slice().reverse() ?? [];
    const total = contribs.reduce((s, c) => s + c.amount, 0);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.sheet}>
                <Text style={s.sheetTitle}>Aportes — {goal?.description}</Text>
                <Text style={s.subLabel}>Total: {fmt(total)}</Text>
                <ScrollView>
                    {contribs.map(c => (
                        <View key={c.id} style={s.contribRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.contribAmt}>{fmt(c.amount)}</Text>
                                <Text style={s.contribMeta}>{c.date ? c.date.split('-').reverse().join('/') : '—'}{c.note ? ` · ${c.note}` : ''}</Text>
                            </View>
                            <TouchableOpacity onPress={() => remove(c.id)} style={s.iconBtnDanger}>
                                <Text style={{ fontSize: 12, color: colors.expense }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
                <TouchableOpacity style={[s.btnGhost, { marginTop: spacing.md }]} onPress={onClose}>
                    <Text style={s.btnGhostText}>Fechar</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

// ─────────────── Tela Principal ──────────────────────────────────────────────
export default function MetasPage() {
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [goalModal, setGoalModal] = useState(false);
    const [contribModal, setContribModal] = useState(false);
    const [histModal, setHistModal] = useState(false);
    const [editing, setEditing] = useState<Goal | null>(null);
    const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await api<Goal[]>('GET', '/goals');
            setGoals(data);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

    async function deleteGoal(id: string, desc: string) {
        Alert.alert('Excluir', `Excluir "${desc}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await api('DELETE', `/goals/${id}`);
                        toast('Meta excluída', 'success');
                        load();
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const filtered = query ? goals.filter(g => g.description.toLowerCase().includes(query.toLowerCase()) || (g.category ?? '').toLowerCase().includes(query.toLowerCase())) : goals;
    const total = goals.length;
    const done = goals.filter(g => (g.savedAmount || 0) >= g.targetAmount).length;

    return (
        <View style={s.root}>
            {/* Header fixo: 3 linhas */}
            <View style={s.stickyHeader}>
                {/* Linha 1: Hambúrguer + Título */}
                <View style={s.hRow1}>
                    <TouchableOpacity onPress={openSidebar} style={s.hamburger} hitSlop={8}>
                        <IconMenu color={colors.textPrimary} size={22} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Metas</Text>
                </View>
                {/* Linha 2: Contagem + Botão Nova Meta */}
                <View style={s.hRow2}>
                    <Text style={s.headerSub}>{total > 0 ? `${total} meta${total !== 1 ? 's' : ''} · ${done} concluída${done !== 1 ? 's' : ''}` : '0 metas'}</Text>
                    <TouchableOpacity style={s.addBtn} onPress={() => { setEditing(null); setGoalModal(true); }}>
                        <Text style={s.addBtnText}>+ Nova Meta</Text>
                    </TouchableOpacity>
                </View>
                {/* Linha 3: Barra de Busca */}
                <View style={s.hRow3}>
                    <View style={s.searchWrap}>
                        <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Buscar…" placeholderTextColor={colors.textMuted} />
                        {!!query && <TouchableOpacity onPress={() => setQuery('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity>}
                    </View>
                </View>
            </View>

            {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={filtered}
                    keyExtractor={g => g.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={s.empty}>{query ? 'Nenhum resultado' : 'Nenhuma meta cadastrada'}</Text>}
                    renderItem={({ item: g }) => {
                        const saved = g.savedAmount || 0;
                        const target = g.targetAmount || 1;
                        const pct = Math.min(100, (saved / target) * 100);
                        const color = progressColor(pct);
                        const isDone = saved >= target;
                        const months = monthsUntil(g.targetDate);
                        const remaining = target - saved;
                        const monthlyNeeded = months > 0 ? remaining / months : 0;
                        const isOverdue = !isDone && months === 0;

                        return (
                            <View style={[s.card, isDone && s.cardDone, isOverdue && s.cardOverdue]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.goalName} numberOfLines={1}>{g.description}</Text>
                                        <Text style={s.goalCat}>{g.category ?? 'Geral'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[s.goalPct, { color }]}>{pct.toFixed(1)}%</Text>
                                        <Text style={s.goalSaved}>{fmt(saved)} / {fmt(target)}</Text>
                                    </View>
                                </View>
                                <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} /></View>
                                <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs }}>
                                    <Text style={s.metaText}>🎯 {fmtGoalDate(g.targetDate)}</Text>
                                    {isDone ? <Text style={[s.metaText, { color: colors.income }]}>🎉 Meta atingida!</Text>
                                        : months > 0 ? <><Text style={s.metaText}>📅 {fmt(monthlyNeeded)}/mês</Text><Text style={s.metaText}>⏳ {months} {months === 1 ? 'mês' : 'meses'}</Text></>
                                            : <Text style={[s.metaText, { color: colors.expense }]}>⚠️ Prazo vencido</Text>}
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                                    {!isDone && (
                                        <TouchableOpacity style={s.actionChip} onPress={() => { setActiveGoal(g); setContribModal(true); }}>
                                            <Text style={s.actionChipText}>Aportar</Text>
                                        </TouchableOpacity>
                                    )}
                                    {(g.contributions?.length ?? 0) > 0 && (
                                        <TouchableOpacity style={s.actionChip} onPress={() => { setActiveGoal(g); setHistModal(true); }}>
                                            <Text style={s.actionChipText}>Aportes ({g.contributions!.length})</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity style={s.iconBtn} onPress={() => { setEditing(g); setGoalModal(true); }}>
                                        <Text style={s.iconBtnText}>✏</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[s.iconBtn, s.iconBtnDangerStyle]} onPress={() => deleteGoal(g.id, g.description)}>
                                        <Text style={s.iconBtnText}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            <GoalModal visible={goalModal} onClose={() => setGoalModal(false)} onSaved={() => { setGoalModal(false); load(); }} initial={editing} />
            <ContributeModal visible={contribModal} onClose={() => setContribModal(false)} onSaved={() => { setContribModal(false); load(); }} goal={activeGoal} />
            <ContribsHistoryModal visible={histModal} onClose={() => setHistModal(false)} onDeleted={() => load()} goal={activeGoal} />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    stickyHeader: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
    hRow1: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs, gap: spacing.sm },
    hRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.sm },
    hRow3: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
    hamburger: { padding: 2 },
    headerTitle: { flex: 1, color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    headerSub: { flex: 1, color: colors.textMuted, fontSize: fontSize.xs },
    addBtn: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center' },
    addBtnText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.md },
    search: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, paddingVertical: spacing.sm },
    searchClear: { color: colors.textMuted, fontSize: fontSize.base, paddingLeft: spacing.sm },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    cardDone: { borderLeftWidth: 3, borderLeftColor: colors.income },
    cardOverdue: { borderLeftWidth: 3, borderLeftColor: colors.expense },
    goalName: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
    goalCat: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    goalPct: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    goalSaved: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    barBg: { height: 6, backgroundColor: colors.bg, borderRadius: 3, marginVertical: spacing.xs },
    barFill: { height: 6, borderRadius: 3 },
    metaText: { color: colors.textMuted, fontSize: fontSize.xs },
    actionChip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary },
    actionChipText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.bg },
    iconBtnDangerStyle: { backgroundColor: 'rgba(239,68,68,0.15)' },
    iconBtnText: { fontSize: 13 },
    // Modal
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    subLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.sm },
    label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: fontSize.base, marginBottom: spacing.md },
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnGhostText: { color: colors.textSecondary, fontWeight: fontWeight.medium },
    btnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: fontWeight.semibold },
    contribRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
    contribAmt: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
    contribMeta: { color: colors.textMuted, fontSize: fontSize.xs },
    iconBtnDanger: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.15)' },
});
