import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { SeletorMes } from '@/components/SeletorMes';
import { IconMenu } from '@/components/Icon';
import { currentMonth, fmt, fmtMonth } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface Bill {
    id: string;
    description: string;
    amount: number;
    category: string;
    dueDay: number;
    active: boolean;
    paidMonths: string[];
}

function BillModal({
    visible, onClose, onSaved, initial,
}: {
    visible: boolean;
    onClose: () => void;
    onSaved: () => void;
    initial?: Bill | null;
}) {
    const toast = useToast();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [dueDay, setDueDay] = useState('1');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setDescription(initial?.description ?? '');
            setAmount(initial ? String(initial.amount) : '');
            setCategory(initial?.category ?? '');
            setDueDay(initial ? String(initial.dueDay) : '1');
        }
    }, [visible, initial]);

    async function save() {
        if (!description.trim()) { toast('Informe a descrição', 'error'); return; }
        const val = parseFloat(amount.replace(',', '.'));
        if (!val || val <= 0) { toast('Valor inválido', 'error'); return; }
        const day = parseInt(dueDay, 10);
        if (!day || day < 1 || day > 31) { toast('Dia de vencimento inválido (1-31)', 'error'); return; }
        setSaving(true);
        try {
            const body = { description: description.trim(), amount: val, category: category.trim() || 'Geral', dueDay: day };
            if (initial) {
                await api('PUT', `/bills/${initial.id}`, body);
                toast('Conta atualizada', 'success');
            } else {
                await api('POST', '/bills', body);
                toast('Conta criada', 'success');
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
                <Text style={s.sheetTitle}>{initial ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={s.label}>Descrição *</Text>
                    <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="Ex: Netflix" placeholderTextColor={colors.textMuted} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 2 }}>
                            <Text style={s.label}>Valor (R$) *</Text>
                            <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Dia Venc.</Text>
                            <TextInput style={s.input} value={dueDay} onChangeText={setDueDay} placeholder="1" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                        </View>
                    </View>
                    <Text style={s.label}>Categoria</Text>
                    <TextInput style={s.input} value={category} onChangeText={setCategory} placeholder="Ex: Assinatura, Aluguel" placeholderTextColor={colors.textMuted} />
                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={s.btnPrimary} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salvar</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

export default function ContasPage() {
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const [month, setMonth] = useState(currentMonth());
    const [months, setMonths] = useState<string[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Bill | null>(null);

    useEffect(() => {
        api<string[]>('GET', '/months').then(d => { setMonths(d); if (d.length) setMonth(d[0]); }).catch(() => { });
    }, []);

    const load = useCallback(async (m: string) => {
        try {
            const data = await api<Bill[]>('GET', `/bills?month=${m}`);
            setBills(data);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load(month).finally(() => setLoading(false)); }, [month]);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(month); setRefreshing(false); }, [month]);

    async function togglePaid(bill: Bill) {
        try {
            await api('PATCH', `/bills/${bill.id}/paid`, { month });
            load(month);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }

    async function toggleActive(bill: Bill) {
        try {
            await api('PATCH', `/bills/${bill.id}/toggle`, { month });
            toast('Status atualizado', 'info');
            load(month);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }

    async function deleteBill(id: string) {
        Alert.alert('Excluir', `Excluir esta conta fixa em ${fmtMonth(month)}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await api('DELETE', `/bills/${id}?month=${month}`);
                        toast('Conta removida neste mês', 'success');
                        load(month);
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const filtered = query
        ? bills.filter(b => b.description.toLowerCase().includes(query.toLowerCase()) || b.category.toLowerCase().includes(query.toLowerCase()))
        : bills;

    const totalActive = bills.filter(b => b.active).reduce((s, b) => s + b.amount, 0);
    const totalPaid = bills.filter(b => b.active && (b.paidMonths || []).includes(month)).reduce((s, b) => s + b.amount, 0);

    function isOverdue(b: Bill) {
        if (!b.active || (b.paidMonths || []).includes(month)) return false;
        if (month < currentYM) return true;
        if (month > currentYM) return false;
        return today.getDate() > b.dueDay;
    }

    return (
        <View style={s.root}>
            {/* Header fixo: 3 linhas */}
            <View style={s.stickyHeader}>
                {/* Linha 1: Hambúrguer + Título + SeletorMes */}
                <View style={s.hRow1}>
                    <TouchableOpacity onPress={openSidebar} style={s.hamburger} hitSlop={8}>
                        <IconMenu color={colors.textPrimary} size={22} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Contas Fixas</Text>
                    <SeletorMes value={month} months={months} onChange={m => setMonth(m)} />
                </View>
                {/* Linha 2: Totais + Botão Adicionar */}
                <View style={s.hRow2}>
                    <Text style={s.headerSub}>Ativas: {fmt(totalActive)}/mês · Pago: {fmt(totalPaid)}</Text>
                    <TouchableOpacity style={s.addBtn} onPress={() => { setEditing(null); setModalVisible(true); }}>
                        <Text style={s.addBtnText}>+ Adicionar</Text>
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
                    keyExtractor={b => b.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={s.empty}>{query ? 'Nenhum resultado' : 'Nenhuma conta fixa cadastrada'}</Text>}
                    renderItem={({ item: b }) => {
                        const isPaid = (b.paidMonths || []).includes(month);
                        const overdue = isOverdue(b);
                        return (
                            <View style={[s.card, !b.active && s.cardInactive, isPaid && s.cardPaid, overdue && s.cardOverdue]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={s.billName} numberOfLines={1}>{b.description}</Text>
                                            {overdue && <Text style={s.overdueBadge}>⚠ Vencida</Text>}
                                        </View>
                                        <Text style={s.billCat}>{b.category} · Dia {b.dueDay}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={s.billAmt}>{fmt(b.amount)}</Text>
                                        <Text style={[s.statusBadge, { color: b.active ? colors.income : colors.textMuted }]}>
                                            {b.active ? 'Ativa' : 'Inativa'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                                    <TouchableOpacity style={[s.actionChip, isPaid && s.actionChipPaid]} onPress={() => togglePaid(b)}>
                                        <Text style={[s.actionChipText, isPaid && s.actionChipTextPaid]}>{isPaid ? '✓ Pago' : 'Em aberto'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.actionChip} onPress={() => toggleActive(b)}>
                                        <Text style={s.actionChipText}>{b.active ? '✓ Ativa' : 'Ativar'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.iconBtn} onPress={() => { setEditing(b); setModalVisible(true); }}>
                                        <Text style={s.iconBtnText}>✏</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[s.iconBtn, s.iconBtnDanger]} onPress={() => deleteBill(b.id)}>
                                        <Text style={s.iconBtnText}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            <BillModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSaved={() => { setModalVisible(false); load(month); }}
                initial={editing}
            />
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
    cardInactive: { opacity: 0.55 },
    cardPaid: { borderLeftWidth: 3, borderLeftColor: colors.income },
    cardOverdue: { borderLeftWidth: 3, borderLeftColor: colors.expense },
    billName: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold, flex: 1 },
    billCat: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    billAmt: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    statusBadge: { fontSize: fontSize.xs },
    overdueBadge: { backgroundColor: 'rgba(239,68,68,0.2)', color: colors.expense, fontSize: fontSize.xs, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm },
    actionChip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
    actionChipPaid: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: colors.income },
    actionChipText: { color: colors.textSecondary, fontSize: fontSize.xs },
    actionChipTextPaid: { color: colors.income, fontWeight: fontWeight.semibold },
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.bg },
    iconBtnDanger: { backgroundColor: 'rgba(239,68,68,0.15)' },
    iconBtnText: { fontSize: 13 },
    // Modal
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '75%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
    label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: fontSize.base, marginBottom: spacing.md },
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnGhostText: { color: colors.textSecondary, fontWeight: fontWeight.medium },
    btnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: fontWeight.semibold },
});
