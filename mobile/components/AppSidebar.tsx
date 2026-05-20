import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import {
    IconHome,
    IconArrowUp,
    IconArrowDown,
    IconCreditCard,
    IconTrendingUp,
    IconTarget,
    IconLightbulb,
    IconActivity,
    IconBarChart,
    IconX,
    IconLogOut,
    IconChevronDown,
    IconUser,
} from '@/components/Icon';

const SIDEBAR_WIDTH = 280;

const NAV_ITEMS = [
    { Icon: IconHome, label: 'Dashboard', route: '/', path: '/' },
    { Icon: IconArrowUp, label: 'Ganhos', route: '/ganhos', path: '/ganhos' },
    { Icon: IconArrowDown, label: 'Gastos', route: '/gastos', path: '/gastos' },
    { Icon: IconCreditCard, label: 'Contas Fixas', route: '/contas', path: '/contas' },
    { Icon: IconTrendingUp, label: 'Investimentos', route: '/investimentos', path: '/investimentos' },
    { Icon: IconTarget, label: 'Metas', route: '/metas', path: '/metas' },
    { Icon: IconLightbulb, label: 'Inteligência', route: '/insights', path: '/insights' },
    { Icon: IconActivity, label: 'Saúde Financeira', route: '/saude', path: '/saude', premium: true },
    { Icon: IconBarChart, label: 'Relatórios', route: '/relatorios', path: '/relatorios' },
];

export function AppSidebar() {
    const { isOpen, close } = useSidebar();
    const { user, signOut, updateUserState } = useAuth();
    const toast = useToast();
    const pathname = usePathname();

    // ── Animações ──────────────────────────────────────────────────────────────
    const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isOpen) {
            Animated.parallel([
                Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateX, { toValue: -SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
            setDropdownOpen(false);
        }
    }, [isOpen]);

    // ── Estado local ──────────────────────────────────────────────────────────
    const isPremium = user?.plan === 'premium' || user?.role === 'admin';
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [saving, setSaving] = useState(false);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleNav = (route: string) => {
        close();
        router.navigate(route as never);
    };

    const handleSignOut = async () => {
        close();
        await signOut();
    };

    const openProfile = () => {
        setDropdownOpen(false);
        setFormName(user?.name ?? '');
        setFormEmail(user?.email ?? '');
        setFormPassword('');
        setModalOpen(true);
    };

    const handleSaveProfile = async () => {
        if (formName.trim().length < 2) {
            toast('Nome deve ter pelo menos 2 caracteres.', 'error');
            return;
        }
        setSaving(true);
        try {
            const body: Record<string, string> = {
                name: formName.trim(),
                email: formEmail.trim(),
            };
            if (formPassword) body.password = formPassword;
            await api('PUT', '/me', body);
            const credentialsChanged = !!formPassword || formEmail.trim() !== user?.email;
            if (credentialsChanged) {
                setModalOpen(false);
                toast('Dados atualizados! Faça login novamente para continuar.', 'success');
                setTimeout(() => signOut(), 1500);
            } else {
                updateUserState({ name: formName.trim() });
                setModalOpen(false);
                toast('Dados atualizados com sucesso!', 'success');
            }
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View
            pointerEvents={isOpen ? 'auto' : 'none'}
            style={StyleSheet.absoluteFillObject}
        >
            {/* Backdrop */}
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
            </Animated.View>

            {/* Sidebar panel */}
            <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
                {/* Header */}
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>💰 Finanças</Text>
                    <TouchableOpacity onPress={close} style={styles.closeBtn} hitSlop={8}>
                        <IconX color={colors.textMuted} size={20} />
                    </TouchableOpacity>
                </View>

                {/* Nav items */}
                <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
                    {NAV_ITEMS.map(item => {
                        if (item.premium && !isPremium) return null;
                        const isActive = pathname === item.path;
                        return (
                            <TouchableOpacity
                                key={item.route}
                                style={[styles.navItem, isActive && styles.navItemActive]}
                                onPress={() => handleNav(item.route)}
                                activeOpacity={0.7}
                            >
                                <item.Icon
                                    color={isActive ? colors.primary : colors.textMuted}
                                    size={20}
                                />
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                                    {item.label}
                                </Text>
                                {item.premium && (
                                    <View style={styles.premiumBadge}>
                                        <Text style={styles.premiumText}>Premium</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Dropdown — "Minha conta" */}
                {dropdownOpen && (
                    <View style={styles.dropdown}>
                        <TouchableOpacity style={styles.dropdownItem} onPress={openProfile} activeOpacity={0.7}>
                            <IconUser color={colors.textMuted} size={16} />
                            <Text style={styles.dropdownItemText}>Minha conta</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Footer: avatar + nome + chevron | sair */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.userInfo}
                        onPress={() => setDropdownOpen(v => !v)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                                {user?.name?.charAt(0).toUpperCase() ?? '?'}
                            </Text>
                        </View>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user?.name?.split(' ')[0] ?? 'Usuário'}
                        </Text>
                        <IconChevronDown color={colors.textMuted} size={16} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7} hitSlop={8}>
                        <IconLogOut color={colors.danger} size={20} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Minha Conta — modal */}
            <Modal
                visible={modalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
                        <Pressable style={styles.modalCard} onPress={() => { /* absorb taps */ }}>
                            <Text style={styles.modalTitle}>Minha Conta</Text>

                            <Text style={styles.inputLabel}>Nome</Text>
                            <TextInput
                                style={styles.input}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="Seu nome"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="words"
                            />

                            <Text style={styles.inputLabel}>E-mail</Text>
                            <TextInput
                                style={styles.input}
                                value={formEmail}
                                onChangeText={setFormEmail}
                                placeholder="seu@email.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.inputLabel}>
                                Nova senha{' '}
                                <Text style={styles.inputHint}>(deixe vazio para não alterar)</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={formPassword}
                                onChangeText={setFormPassword}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                secureTextEntry
                                autoCapitalize="none"
                            />

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnGhost]}
                                    onPress={() => setModalOpen(false)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalBtnGhostText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnPrimary, saving && styles.modalBtnDisabled]}
                                    onPress={handleSaveProfile}
                                    activeOpacity={0.7}
                                    disabled={saving}
                                >
                                    <Text style={styles.modalBtnPrimaryText}>
                                        {saving ? 'Salvando...' : 'Salvar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    panel: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: colors.card,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 16,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl + 8, // account for status bar
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    panelTitle: {
        color: colors.textPrimary,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
    },
    closeBtn: {
        padding: spacing.xs,
    },
    navList: {
        flex: 1,
        paddingVertical: spacing.sm,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 13,
        gap: spacing.md,
        borderRadius: radius.md,
        marginHorizontal: spacing.sm,
        marginVertical: 1,
    },
    navItemActive: {
        backgroundColor: `${colors.primary}20`,
    },
    navLabel: {
        flex: 1,
        color: colors.textMuted,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    navLabelActive: {
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },
    premiumBadge: {
        backgroundColor: `${colors.primary}30`,
        borderRadius: radius.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    premiumText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: fontWeight.semibold,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    userAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        color: '#fff',
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
    },
    userName: {
        color: colors.textPrimary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        flexShrink: 1,
    },
    signOutBtn: {
        padding: spacing.xs,
    },
    // ── Dropdown ──────────────────────────────────────────────────────────────
    dropdown: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingVertical: spacing.xs,
        backgroundColor: colors.card,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
    },
    dropdownItemText: {
        color: colors.textPrimary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    // ── Modal ─────────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: colors.modalBg,
        borderRadius: radius.lg,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        marginBottom: spacing.md,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    inputHint: {
        color: colors.textMuted,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.normal,
    },
    input: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        color: colors.textPrimary,
        fontSize: fontSize.sm,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    modalBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.md,
    },
    modalBtnGhost: {
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBtnGhostText: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
    },
    modalBtnPrimary: {
        backgroundColor: colors.primary,
    },
    modalBtnDisabled: {
        opacity: 0.6,
    },
    modalBtnPrimaryText: {
        color: '#fff',
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
    },
});
