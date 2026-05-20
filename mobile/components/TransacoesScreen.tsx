import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { SeletorMes } from '@/components/SeletorMes';
import { IconMenu, IconEdit, IconTrash } from '@/components/Icon';
import { currentMonth, fmt, fmtDate, todayISO } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '@/constants/theme';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    description: string;
    amount: number;
    category: string;
    date: string;
}

interface Props {
    type: 'income' | 'expense';
}

function TransactionModal({
    visible, onClose, onSaved, categories, initial, type,
}: {
    visible: boolean;
    onClose: () => void;
    onSaved: () => void;
    categories: string[];
    initial?: Transaction | null;
    type: 'income' | 'expense';
}) {
    const toast = useToast();
    const accent = type === 'income' ? colors.income : colors.expense;
    const [description, setDescription] = useState(initial?.description ?? '');
    const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
    const [category, setCategory] = useState(initial?.category ?? (categories[0] ?? ''));
    const [date, setDate] = useState(initial?.date ?? todayISO());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setDescription(initial?.description ?? '');
            setAmount(initial ? String(initial.amount) : '');
            setCategory(initial?.category ?? (categories[0] ?? ''));
            setDate(initial?.date ?? todayISO());
        }
    }, [visible, initial]);

    async function save() {
        if (!category) { toast('Selecione a categoria', 'error'); return; }
        if (!description.trim()) { toast('Informe a descrição', 'error'); return; }
        const val = parseFloat(amount.replace(',', '.'));
        if (!val || val <= 0) { toast('Valor inválido', 'error'); return; }
        setSaving(true);
        try {
            if (initial) {
                await api('PUT', `/transactions/${initial.id}`, { description: description.trim(), amount: val, category, date });
                toast('Lançamento atualizado', 'success');
            } else {
                await api('POST', '/transactions', { type, description: description.trim(), amount: val, category, date });
                toast(type === 'income' ? 'Ganho adicionado!' : 'Gasto adicionado!', 'success');
            }
            onSaved();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Erro', 'error');
        } finally {
            setSaving(false);
        }
    }

    const title = initial
        ? (type === 'income' ? 'Editar Ganho' : 'Editar Gasto')
        : (type === 'income' ? '+ Adicionar Ganho' : '+ Adicionar Gasto');

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.sheet}>
                <Text style={s.sheetTitle}>{title}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={s.label}>Categoria *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                            {categories.map(c => (
                                <TouchableOpacity key={c} style={[s.chip, category === c && { backgroundColor: accent, borderColor: accent }]} onPress={() => setCategory(c)}>
                                    <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <Text style={s.label}>Descrição *</Text>
                    <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="Ex: Salário" placeholderTextColor={colors.textMuted} />

                    <View style={s.formRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Valor (R$) *</Text>
                            <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Data *</Text>
                            <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} />
                        </View>
                    </View>

                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.btnPrimary, { backgroundColor: accent }]} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salvar</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

export function TransacoesScreen({ type }: Props) {
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const accent = type === 'income' ? colors.income : colors.expense;
    const label = type === 'income' ? 'Ganhos' : 'Gastos';

    const [month, setMonth] = useState(currentMonth());
    const [months, setMonths] = useState<string[]>([]);
    const [items, setItems] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);

    useEffect(() => {
        api<string[]>('GET', '/months').then(d => { setMonths(d); if (d.length) setMonth(d[0]); }).catch(() => { });
        api<string[]>('GET', `/categories/${type}`).then(setCategories).catch(() => { });
    }, []);

    const load = useCallback(async (m: string) => {
        try {
            const [txs, stats] = await Promise.all([
                api<Transaction[]>('GET', `/transactions?month=${m}&type=${type}`),
                api<{ totalIncome: number; totalExpense: number }>('GET', `/stats/${m}`),
            ]);
            setItems(txs);
            setTotal(type === 'income' ? stats.totalIncome : stats.totalExpense);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, [type]);

    useEffect(() => { setLoading(true); load(month).finally(() => setLoading(false)); }, [month]);

    const onRefresh = useCallback(async () => { setRefreshing(true); await load(month); setRefreshing(false); }, [month]);

    async function deleteItem(id: string) {
        Alert.alert('Excluir', 'Tem certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await api('DELETE', `/transactions/${id}`);
                        toast('Lançamento excluído', 'success');
                        load(month);
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const filtered = query
        ? items.filter(t => t.description.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase()))
        : items;

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={openSidebar} style={s.hamburger} hitSlop={8}>
                    <IconMenu color={colors.textPrimary} size={22} />
                </TouchableOpacity>
                <View style={s.headerInfo}>
                    <Text style={s.headerTitle}>{label}</Text>
                    <View style={[s.summaryPill, { backgroundColor: type === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                        <Text style={[s.summaryPillText, { color: accent }]}>
                            {type === 'income' ? '\u2191' : '\u2193'} {label}: {fmt(total)}
                        </Text>
                    </View>
                </View>
                <View style={{ gap: spacing.xs }}>
                    <SeletorMes value={month} months={months} onChange={m => setMonth(m)} />
                    <TouchableOpacity style={[s.addBtn, { backgroundColor: accent }]} onPress={() => { setEditing(null); setModalVisible(true); }}>
                        <Text style={s.addBtnText}>+ Adicionar {label}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Busca */}
            <View style={s.searchWrap}>
                <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Buscar por descrição ou categoria…" placeholderTextColor={colors.textMuted} />
                {!!query && <TouchableOpacity onPress={() => setQuery('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity>}
            </View>
            {!!query && <Text style={s.searchCount}>{filtered.length} de {items.length} resultado{items.length !== 1 ? 's' : ''}</Text>}

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={t => t.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={s.empty}>{query ? 'Nenhum resultado encontrado' : 'Nenhum lançamento neste mês'}</Text>}
                    ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 0 }} />}
                    renderItem={({ item: t }) => (
                        <View style={s.txRow}>
                            <View style={[s.txDot, { backgroundColor: accent }]} />
                            <View style={s.txInfo}>
                                <Text style={s.txDesc} numberOfLines={1}>{t.description}</Text>
                                <View style={s.txMetaRow}>
                                    <Text style={s.txMeta}>{fmtDate(t.date)}</Text>
                                    <View style={s.catBadge}><Text style={s.catBadgeText}>{t.category}</Text></View>
                                </View>
                            </View>
                            <Text style={[s.txAmt, { color: accent }]}>{fmt(t.amount)}</Text>
                            <TouchableOpacity style={s.iconBtn} onPress={() => { setEditing(t); setModalVisible(true); }}>
                                <IconEdit color={colors.textSecondary} size={17} />
                            </TouchableOpacity>
                            <TouchableOpacity style={s.iconBtn} onPress={() => deleteItem(t.id)}>
                                <IconTrash color={colors.expense} size={17} />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}

            <TransactionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSaved={() => { setModalVisible(false); load(month); }}
                categories={categories}
                initial={editing}
                type={type}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
    hamburger: { paddingTop: 2 },
    headerInfo: { flex: 1, alignItems: 'flex-start' },
    headerTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    summaryPill: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4, alignItems: 'flex-start' },
    summaryPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    addBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, alignItems: 'center' },
    addBtnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
    searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: 4 },
    search: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, paddingVertical: spacing.sm },
    searchClear: { color: colors.textMuted, fontSize: fontSize.base, paddingLeft: spacing.sm },
    searchCount: { color: colors.textMuted, fontSize: fontSize.xs, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: colors.bg },
    txDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
    txInfo: { flex: 1 },
    txDesc: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    txMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    catBadge: { backgroundColor: colors.card, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
    catBadgeText: { color: colors.textSecondary, fontSize: 10, fontWeight: fontWeight.medium },
    txAmt: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginRight: spacing.sm },
    iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, marginLeft: 2 },
    // Modal
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
    label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: fontSize.base, marginBottom: spacing.md },
    chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
    chipActive: { borderColor: colors.primary },
    chipText: { color: colors.textSecondary, fontSize: fontSize.sm },
    chipTextActive: { color: '#fff', fontWeight: fontWeight.semibold },
    formRow: { flexDirection: 'row', gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnGhostText: { color: colors.textSecondary, fontWeight: fontWeight.medium },
    btnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: fontWeight.semibold },
});
