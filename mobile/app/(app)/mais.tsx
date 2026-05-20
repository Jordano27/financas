import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import {
    IconTrendingUp, IconTarget, IconLightbulb,
    IconActivity, IconBarChart, IconMessageCircle,
} from '@/components/Icon';

type IconComponent = React.ComponentType<{ color?: string; size?: number }>;

interface MenuItem {
    Icon: IconComponent;
    title: string;
    subtitle: string;
    route: string;
    premium?: boolean;
}

const ITEMS: MenuItem[] = [
    { Icon: IconTrendingUp, title: 'Investimentos', subtitle: 'Carteira, aportes e cotações', route: '/(app)/investimentos' },
    { Icon: IconTarget, title: 'Metas', subtitle: 'Planejamento e progresso', route: '/(app)/metas' },
    { Icon: IconLightbulb, title: 'Inteligência', subtitle: 'Projeção de saldo e análise de gastos', route: '/(app)/insights' },
    { Icon: IconActivity, title: 'Saúde Financeira', subtitle: 'Regra 50-30-20 e pontuação', route: '/(app)/saude', premium: true },
    { Icon: IconBarChart, title: 'Relatórios', subtitle: 'Resumo completo e comparações', route: '/(app)/relatorios' },
    { Icon: IconMessageCircle, title: 'Assistente', subtitle: 'Dúvidas e perguntas frequentes', route: '/(app)/chatbot' },
];

export default function MaisScreen() {
    const { user, signOut } = useAuth();
    const isPremium = user?.plan === 'premium';

    return (
        <ScrollView style={s.root} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
            {/* Perfil rápido */}
            <View style={s.profileCard}>
                <View style={s.avatar}><Text style={s.avatarText}>{user?.name?.split(' ')[0]}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={s.profileName} numberOfLines={1}>{user?.name ?? '—'}</Text>
                    <Text style={s.profileEmail} numberOfLines={1}>{user?.email ?? '—'}</Text>
                </View>
                <View style={[s.planBadge, isPremium && s.planBadgePremium]}>
                    <Text style={[s.planBadgeText, isPremium && s.planBadgeTextPremium]}>{isPremium ? '⭐ Premium' : 'Grátis'}</Text>
                </View>
            </View>

            {/* Menu items */}
            <Text style={s.sectionTitle}>Funcionalidades</Text>
            {ITEMS.map(item => {
                const locked = item.premium && !isPremium;
                const iconColor = locked ? colors.textMuted : colors.primary;
                return (
                    <TouchableOpacity
                        key={item.route}
                        style={[s.menuItem, locked && s.menuItemLocked]}
                        onPress={() => { if (!locked) router.push(item.route as any); }}
                        activeOpacity={locked ? 1 : 0.7}
                    >
                        <View style={s.iconWrap}>
                            <item.Icon color={iconColor} size={22} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.menuTitle, locked && s.menuTitleLocked]}>
                                {item.title}{locked ? ' 🔒' : ''}
                            </Text>
                            <Text style={s.menuSub}>{item.subtitle}</Text>
                        </View>
                        {!locked && <Text style={s.chevron}>›</Text>}
                    </TouchableOpacity>
                );
            })}

            {/* Sair */}
            <Text style={s.sectionTitle}>Conta</Text>
            <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
                <Text style={s.logoutText}>Sair da conta</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    profileName: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
    profileEmail: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    planBadgePremium: { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: '#fbbf24' },
    planBadgeText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    planBadgeTextPremium: { color: '#fbbf24' },
    sectionTitle: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.xs },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
    menuItemLocked: { opacity: 0.5 },
    iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    menuTitle: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
    menuTitleLocked: { color: colors.textMuted },
    menuSub: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    chevron: { color: colors.textMuted, fontSize: 22 },
    logoutBtn: { borderWidth: 1, borderColor: colors.expense, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.xs },
    logoutText: { color: colors.expense, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
});
