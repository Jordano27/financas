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

interface Contribution {
    id: string;
    amount: number;
    date: string;
    note?: string;
}

interface Investment {
    id: string;
    description: string;
    category: string;
    initialAmount: number;
    currentValue?: number;
    startDate?: string;
    marketType?: string;
    marketId?: string;
    contributions?: Contribution[];
    lastSyncAt?: string;
}

const MARKET_LABELS: Record<string, string> = {
    stock: '📈 Ação/FII',
    crypto: '₿ Cripto',
    cdi: '🏦 Renda Fixa CDI',
    tesouro: '🇧🇷 Tesouro Direto',
    manual: '✏️ Manual',
};

// ─────────────── Modal Novo/Editar ───────────────────────────────────────────
function InvestModal({ visible, onClose, onSaved, initial }: {
    visible: boolean; onClose: () => void; onSaved: () => void; initial?: Investment | null;
}) {
    const toast = useToast();
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [marketType, setMarketType] = useState('manual');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setDescription(initial?.description ?? '');
            setCategory(initial?.category ?? '');
            setAmount(initial ? String(initial.initialAmount) : '');
            setStartDate(initial?.startDate ?? todayISO());
            setMarketType(initial?.marketType ?? 'manual');
        }
    }, [visible, initial]);

    async function save() {
        if (!description.trim()) { toast('Informe a descrição', 'error'); return; }
        const val = parseFloat(amount.replace(',', '.'));
        if (!val || val <= 0) { toast('Valor inválido', 'error'); return; }
        setSaving(true);
        try {
            const body = { description: description.trim(), category: category.trim() || 'Geral', initialAmount: val, startDate, marketType };
            if (initial) {
                await api('PUT', `/investments/${initial.id}`, body);
                toast('Investimento atualizado', 'success');
            } else {
                await api('POST', '/investments', body);
                toast('Investimento criado', 'success');
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
                <Text style={s.sheetTitle}>{initial ? 'Editar Investimento' : 'Novo Investimento'}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={s.label}>Descrição *</Text>
                    <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="Ex: Tesouro Selic 2026" placeholderTextColor={colors.textMuted} />

                    <Text style={s.label}>Tipo de mercado</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                            {Object.entries(MARKET_LABELS).map(([k, v]) => (
                                <TouchableOpacity key={k} style={[s.chip, marketType === k && s.chipActive]} onPress={() => setMarketType(k)}>
                                    <Text style={[s.chipText, marketType === k && s.chipTextActive]}>{v}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Valor Inicial (R$) *</Text>
                            <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Data Início</Text>
                            <TextInput style={s.input} value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} />
                        </View>
                    </View>

                    <Text style={s.label}>Categoria</Text>
                    <TextInput style={s.input} value={category} onChangeText={setCategory} placeholder="Ex: Renda Fixa, FII" placeholderTextColor={colors.textMuted} />

                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={s.btnInvest} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salvar</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─────────────── Modal Aportes ───────────────────────────────────────────────
function ContribsModal({ visible, onClose, onSaved, investment }: {
    visible: boolean; onClose: () => void; onSaved: () => void; investment: Investment | null;
}) {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayISO());
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (visible) { setAmount(''); setDate(todayISO()); setNote(''); } }, [visible]);

    async function addContrib() {
        if (!investment) return;
        const val = parseFloat(amount.replace(',', '.'));
        if (!val || val <= 0) { toast('Valor inválido', 'error'); return; }
        setSaving(true);
        try {
            await api('POST', `/investments/${investment.id}/contributions`, { amount: val, date, note });
            toast('Aporte adicionado', 'success');
            onSaved();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Erro', 'error');
        } finally { setSaving(false); }
    }

    async function delContrib(cid: string) {
        if (!investment) return;
        Alert.alert('Remover', 'Remover este aporte?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover', style: 'destructive', onPress: async () => {
                    try {
                        await api('DELETE', `/investments/${investment.id}/contributions/${cid}`);
                        toast('Aporte removido', 'success');
                        onSaved();
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const contribs = investment?.contributions ?? [];
    const total = contribs.reduce((s, c) => s + c.amount, 0);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.sheet}>
                <Text style={s.sheetTitle}>Aportes — {investment?.description}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    {contribs.length > 0 ? (
                        <>
                            <Text style={s.subLabel}>Total aportado: {fmt(total)}</Text>
                            {contribs.slice().reverse().map(c => (
                                <View key={c.id} style={s.contribRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.contribAmt}>{fmt(c.amount)}</Text>
                                        <Text style={s.contribMeta}>{c.date ? c.date.split('-').reverse().join('/') : '—'}{c.note ? ` · ${c.note}` : ''}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => delContrib(c.id)} style={s.iconBtnDanger}>
                                        <Text style={{ fontSize: 12, color: colors.expense }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <View style={s.divider} />
                        </>
                    ) : <Text style={s.subLabel}>Nenhum aporte adicionado ainda.</Text>}

                    <Text style={[s.label, { marginTop: spacing.sm }]}>Novo Aporte</Text>
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
                    <Text style={s.label}>Nota</Text>
                    <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Ex: aporte mensal" placeholderTextColor={colors.textMuted} />

                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Fechar</Text></TouchableOpacity>
                        <TouchableOpacity style={s.btnInvest} onPress={addContrib} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Adicionar</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─────────────── Tela Principal ──────────────────────────────────────────────
export default function InvestimentosPage() {
    const toast = useToast();
    const { open: openSidebar } = useSidebar();
    const [items, setItems] = useState<Investment[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [contribsVisible, setContribsVisible] = useState(false);
    const [editing, setEditing] = useState<Investment | null>(null);
    const [contribInv, setContribInv] = useState<Investment | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await api<Investment[]>('GET', '/investments');
            setItems(data);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

    async function deleteItem(id: string) {
        Alert.alert('Excluir', 'Excluir este investimento?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await api('DELETE', `/investments/${id}`);
                        toast('Investimento excluído', 'success');
                        load();
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const filtered = query ? items.filter(i => i.description.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase())) : items;
    const totalInvested = items.reduce((s, i) => s + (i.initialAmount || 0), 0);
    const totalCurrent = items.reduce((s, i) => s + (i.currentValue ?? i.initialAmount ?? 0), 0);
    const totalGain = totalCurrent - totalInvested;

    return (
        <View style={s.root}>
            {/* Header fixo: 3 linhas */}
            <View style={s.stickyHeader}>
                {/* Linha 1: Hambúrguer + Título */}
                <View style={s.hRow1}>
                    <TouchableOpacity onPress={openSidebar} style={s.hamburger} hitSlop={8}>
                        <IconMenu color={colors.textPrimary} size={22} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Investimentos</Text>
                </View>
                {/* Linha 2: Totais + Botão Adicionar */}
                <View style={s.hRow2}>
                    <View style={s.totalsRow}>
                        <View style={s.totalItem}><Text style={s.totalLabel}>Investido</Text><Text style={s.totalVal}>{fmt(totalInvested)}</Text></View>
                        <View style={s.totalSep} />
                        <View style={s.totalItem}><Text style={s.totalLabel}>Atual</Text><Text style={[s.totalVal, { color: colors.invest }]}>{fmt(totalCurrent)}</Text></View>
                        <View style={s.totalSep} />
                        <View style={s.totalItem}><Text style={s.totalLabel}>Rendimento</Text><Text style={[s.totalVal, { color: totalGain >= 0 ? colors.income : colors.expense }]}>{totalGain >= 0 ? '+' : ''}{fmt(totalGain)}</Text></View>
                    </View>
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

            {loading ? <ActivityIndicator color={colors.invest} style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={filtered}
                    keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.invest} />}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={s.empty}>{query ? 'Nenhum resultado' : 'Nenhum investimento cadastrado'}</Text>}
                    renderItem={({ item: inv }) => {
                        const invested = inv.initialAmount || 0;
                        const current = inv.currentValue ?? invested;
                        const gain = current - invested;
                        const gainPct = invested > 0 ? ((gain / invested) * 100) : 0;
                        const gainColor = gain > 0 ? colors.income : gain < 0 ? colors.expense : colors.textMuted;
                        const arrow = gain > 0 ? '▲' : gain < 0 ? '▼' : '─';
                        const contribCount = inv.contributions?.length ?? 0;
                        const barPct = invested > 0 ? Math.min(100, (current / invested) * 100) : 100;

                        return (
                            <View style={s.card}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.invName} numberOfLines={1}>{inv.description}</Text>
                                        <Text style={s.invCat}>{inv.category} · {MARKET_LABELS[inv.marketType ?? 'manual'] ?? '✏️ Manual'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[s.invGain, { color: gainColor }]}>{arrow} {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%</Text>
                                        <Text style={s.invValue}>{fmt(current)}</Text>
                                    </View>
                                </View>
                                {/* Progress bar */}
                                <View style={s.barBg}>
                                    <View style={[s.barFill, { width: `${Math.min(100, barPct)}%` as any, backgroundColor: gainColor }]} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xs }}>
                                    <Text style={s.statText}>Invest. {fmt(invested)}</Text>
                                    <Text style={[s.statText, { color: gainColor }]}>Atual {fmt(current)}</Text>
                                    <Text style={[s.statText, { color: gainColor }]}>{gain >= 0 ? '+' : ''}{fmt(gain)}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: 4 }}>
                                    <TouchableOpacity style={s.actionChip} onPress={() => { setContribInv(inv); setContribsVisible(true); }}>
                                        <Text style={s.actionChipText}>Aportes{contribCount > 0 ? ` (${contribCount})` : ''}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.iconBtn} onPress={() => { setEditing(inv); setModalVisible(true); }}>
                                        <Text style={s.iconBtnText}>✏</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[s.iconBtn, s.iconBtnDangerStyle]} onPress={() => deleteItem(inv.id)}>
                                        <Text style={s.iconBtnText}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            <InvestModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={() => { setModalVisible(false); load(); }} initial={editing} />
            <ContribsModal visible={contribsVisible} onClose={() => setContribsVisible(false)} onSaved={() => load()} investment={contribInv} />
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
    totalsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    totalSep: { width: 1, height: 24, backgroundColor: colors.border },
    addBtn: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center' },
    addBtnText: { color: colors.invest, fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
    totalItem: { alignItems: 'center' },
    totalLabel: { color: colors.textMuted, fontSize: 10 },
    totalVal: { color: colors.textPrimary, fontWeight: fontWeight.bold, fontSize: fontSize.sm, marginTop: 1 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.md },
    search: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, paddingVertical: spacing.sm },
    searchClear: { color: colors.textMuted, fontSize: fontSize.base, paddingLeft: spacing.sm },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    invName: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
    invCat: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    invGain: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    invValue: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
    barBg: { height: 4, backgroundColor: colors.bg, borderRadius: 2, marginVertical: spacing.xs },
    barFill: { height: 4, borderRadius: 2 },
    statText: { color: colors.textMuted, fontSize: fontSize.xs },
    actionChip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.invest },
    actionChipText: { color: colors.invest, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.bg },
    iconBtnDangerStyle: { backgroundColor: 'rgba(239,68,68,0.15)' },
    iconBtnText: { fontSize: 13 },
    // Modal
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
    label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
    subLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.sm },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: fontSize.base, marginBottom: spacing.md },
    chip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
    chipActive: { backgroundColor: colors.invest, borderColor: colors.invest },
    chipText: { color: colors.textSecondary, fontSize: fontSize.xs },
    chipTextActive: { color: '#fff', fontWeight: fontWeight.semibold },
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnGhostText: { color: colors.textSecondary, fontWeight: fontWeight.medium },
    btnInvest: { flex: 1, backgroundColor: colors.invest, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: fontWeight.semibold },
    contribRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
    contribAmt: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
    contribMeta: { color: colors.textMuted, fontSize: fontSize.xs },
    iconBtnDanger: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: 'rgba(239,68,68,0.15)' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
});
