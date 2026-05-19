import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface User {
    id: string;
    name: string;
    email: string;
    active: boolean;
    plan: 'free' | 'premium';
    role: string;
}

function UserModal({ visible, onClose, onSaved, initial }: {
    visible: boolean; onClose: () => void; onSaved: () => void; initial?: User | null;
}) {
    const toast = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) { setName(initial?.name ?? ''); setEmail(initial?.email ?? ''); setPassword(''); }
    }, [visible, initial]);

    async function save() {
        if (!name.trim() || !email.trim()) { toast('Nome e e-mail obrigatórios', 'error'); return; }
        if (!initial && !password.trim()) { toast('Senha obrigatória ao criar', 'error'); return; }
        setSaving(true);
        try {
            if (initial) {
                const body: Record<string, string> = { name: name.trim(), email: email.trim() };
                if (password.trim()) body.password = password.trim();
                await api('PUT', `/admin/users/${initial.id}`, body);
                toast('Usuário atualizado', 'success');
            } else {
                await api('POST', '/admin/users', { name: name.trim(), email: email.trim(), password: password.trim() });
                toast('Usuário criado', 'success');
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
                <Text style={s.sheetTitle}>{initial ? 'Editar Usuário' : 'Novo Usuário'}</Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={s.label}>Nome *</Text>
                    <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nome completo" placeholderTextColor={colors.textMuted} />
                    <Text style={s.label}>E-mail *</Text>
                    <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="email@exemplo.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
                    <Text style={s.label}>{initial ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha *'}</Text>
                    <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.textMuted} secureTextEntry />
                    <View style={s.row}>
                        <TouchableOpacity style={s.btnGhost} onPress={onClose}><Text style={s.btnGhostText}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={s.btnAdmin} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Salvar</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

export default function AdminUsuariosPage() {
    const toast = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await api<User[]>('GET', '/admin/users');
            setUsers(data);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

    async function toggleActive(u: User) {
        Alert.alert(
            u.active ? 'Desativar' : 'Ativar',
            `${u.active ? 'Desativar' : 'Ativar'} ${u.name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: u.active ? 'Desativar' : 'Ativar',
                    style: u.active ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            await api('PATCH', `/admin/users/${u.id}/toggle`, { active: !u.active });
                            toast(`Usuário ${!u.active ? 'ativado' : 'desativado'}`, 'info');
                            load();
                        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                    },
                },
            ]
        );
    }

    async function togglePlan(u: User) {
        const newPlan = u.plan === 'premium' ? 'free' : 'premium';
        Alert.alert('Alterar plano', `Mudar para ${newPlan}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Confirmar', onPress: async () => {
                    try {
                        await api('PATCH', `/admin/users/${u.id}/plan`, { plan: newPlan });
                        toast(`Plano alterado para ${newPlan}`, 'success');
                        load();
                    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
                },
            },
        ]);
    }

    const filtered = query
        ? users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
        : users;

    return (
        <View style={s.root}>
            <View style={s.header}>
                <Text style={s.title}>👥 Usuários</Text>
                <TouchableOpacity style={s.addBtn} onPress={() => { setEditing(null); setModalVisible(true); }}>
                    <Text style={s.addBtnText}>+ Novo</Text>
                </TouchableOpacity>
            </View>

            <View style={s.searchWrap}>
                <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Buscar por nome ou e-mail…" placeholderTextColor={colors.textMuted} />
                {!!query && <TouchableOpacity onPress={() => setQuery('')}><Text style={s.searchClear}>✕</Text></TouchableOpacity>}
            </View>

            {loading ? <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={filtered}
                    keyExtractor={u => u.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={s.empty}>{query ? 'Nenhum resultado' : 'Nenhum usuário'}</Text>}
                    renderItem={({ item: u }) => (
                        <View style={[s.card, !u.active && s.cardInactive]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
                                    <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                                    <View style={[s.badge, u.plan === 'premium' ? s.badgePremium : s.badgeFree]}>
                                        <Text style={[s.badgeText, u.plan === 'premium' && s.badgeTextPremium]}>{u.plan === 'premium' ? '⭐ Premium' : 'Grátis'}</Text>
                                    </View>
                                    <View style={[s.badge, u.active ? s.badgeActive : s.badgeInactive]}>
                                        <Text style={[s.badgeText, u.active ? s.badgeTextActive : s.badgeTextInactive]}>{u.active ? '● Ativo' : '○ Inativo'}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                                <TouchableOpacity style={[s.actionChip, u.active ? s.chipDanger : s.chipSuccess]} onPress={() => toggleActive(u)}>
                                    <Text style={[s.chipText, { color: u.active ? colors.expense : colors.income }]}>{u.active ? 'Desativar' : 'Ativar'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.actionChip, u.plan === 'premium' ? s.chipFree : s.chipPremium]} onPress={() => togglePlan(u)}>
                                    <Text style={[s.chipText, { color: u.plan === 'premium' ? colors.textMuted : '#f59e0b' }]}>{u.plan === 'premium' ? 'Para Grátis' : 'Para Premium'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.iconBtn} onPress={() => { setEditing(u); setModalVisible(true); }}>
                                    <Text style={s.iconBtnText}>✏</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            <UserModal visible={modalVisible} onClose={() => setModalVisible(false)} onSaved={() => { setModalVisible(false); load(); }} initial={editing} />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
    title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    addBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, backgroundColor: '#f59e0b', alignItems: 'center' },
    addBtnText: { color: colors.bg, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
    searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
    search: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, paddingVertical: spacing.sm },
    searchClear: { color: colors.textMuted, fontSize: fontSize.base, paddingLeft: spacing.sm },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    cardInactive: { opacity: 0.55 },
    userName: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
    userEmail: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
    badgeFree: { backgroundColor: colors.bg },
    badgePremium: { backgroundColor: 'rgba(251,191,36,0.15)' },
    badgeActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
    badgeInactive: { backgroundColor: 'rgba(239,68,68,0.1)' },
    badgeText: { fontSize: fontSize.xs, color: colors.textMuted },
    badgeTextPremium: { color: '#f59e0b' },
    badgeTextActive: { color: colors.income },
    badgeTextInactive: { color: colors.expense },
    actionChip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.md, borderWidth: 1 },
    chipDanger: { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.08)' },
    chipSuccess: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
    chipPremium: { borderColor: 'rgba(251,191,36,0.4)', backgroundColor: 'rgba(251,191,36,0.08)' },
    chipFree: { borderColor: colors.border, backgroundColor: colors.bg },
    chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.bg },
    iconBtnText: { fontSize: 13 },
    // Modal
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '70%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
    label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: fontSize.base, marginBottom: spacing.md },
    row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnGhostText: { color: colors.textSecondary, fontWeight: fontWeight.medium },
    btnAdmin: { flex: 1, backgroundColor: '#f59e0b', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    btnText: { color: colors.bg, fontWeight: fontWeight.semibold },
});
