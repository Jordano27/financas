import React, { useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

// ── Seletor de plano ──────────────────────────────────────────────────────────
type Plan = 'free' | 'premium';

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
    const isPremium = plan === 'premium';
    return (
        <Pressable
            onPress={onSelect}
            style={[styles.planCard, selected && styles.planCardSelected, isPremium && styles.planCardPremium]}
        >
            <Text style={[styles.planName, isPremium && styles.planNamePremium]}>
                {isPremium ? '⭐ Premium' : 'Free'}
            </Text>
            <Text style={[styles.planPrice, isPremium && styles.planPricePremium]}>
                {isPremium ? 'R$ 19,90/mês' : 'Grátis'}
            </Text>
            <View style={styles.planFeatures}>
                {isPremium ? (
                    <>
                        <Text style={styles.planFeat}>✓ Tudo do Free</Text>
                        <Text style={styles.planFeat}>✓ Dashboard completo</Text>
                        <Text style={styles.planFeat}>✓ Metas financeiras</Text>
                        <Text style={styles.planFeat}>✓ Saúde Financeira</Text>
                        <Text style={styles.planFeat}>✓ Relatórios mensais</Text>
                        <Text style={styles.planFeat}>✓ Inteligência financeira</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.planFeat}>✓ Controle de Ganhos</Text>
                        <Text style={styles.planFeat}>✓ Controle de Gastos</Text>
                        <Text style={styles.planFeat}>✓ Contas Fixas</Text>
                        <Text style={styles.planFeat}>✓ Investimentos</Text>
                    </>
                )}
            </View>
        </Pressable>
    );
}

// ── Modal PIX ────────────────────────────────────────────────────────────────
function PixModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.pixBackdrop}>
                <View style={styles.pixCard}>
                    <Text style={styles.pixTitle}>⭐ Ativar Premium</Text>
                    <Text style={styles.pixSub}>Envie R$ 19,90 via PIX para ativar seu plano</Text>
                    <View style={styles.pixBox}>
                        <Text style={styles.pixLabel}>Chave PIX (CPF)</Text>
                        <Text style={styles.pixKey} selectable>04259296043</Text>
                    </View>
                    <View style={styles.pixBox}>
                        <Text style={styles.pixLabel}>WhatsApp (enviar comprovante)</Text>
                        <Text style={styles.pixKey} selectable>54 9 9904-7760</Text>
                    </View>
                    <Text style={styles.pixNote}>
                        Após o pagamento, envie o comprovante pelo WhatsApp. Sua conta será ativada em até 24h.
                    </Text>
                    <TouchableOpacity style={styles.pixBtn} onPress={onClose}>
                        <Text style={styles.pixBtnText}>Entendido</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ── Força da senha ───────────────────────────────────────────────────────────
function strengthOf(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: '', color: colors.border };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const map = [
        { label: 'Muito fraca', color: '#ef4444' },
        { label: 'Fraca', color: '#f97316' },
        { label: 'Razoável', color: '#f59e0b' },
        { label: 'Boa', color: '#84cc16' },
        { label: 'Forte', color: '#22c55e' },
        { label: 'Excelente', color: '#10b981' },
    ];
    return { score, ...map[Math.min(score, map.length - 1)] };
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function LoginScreen() {
    const { signIn } = useAuth();
    const toast = useToast();

    const [view, setView] = useState<'login' | 'register'>('login');

    // Login
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Cadastro
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [regPlan, setRegPlan] = useState<Plan>('free');
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    // PIX
    const [showPix, setShowPix] = useState(false);

    // ── Handlers ─────────────────────────────────────────────────────────────
    async function handleLogin() {
        if (!loginEmail || !loginPass) { setLoginError('E-mail e senha são obrigatórios'); return; }
        setLoginLoading(true); setLoginError('');
        try {
            await signIn(loginEmail.trim(), loginPass);
        } catch (e: unknown) {
            setLoginError(e instanceof Error ? e.message : 'Erro ao entrar');
        } finally {
            setLoginLoading(false);
        }
    }

    async function handleRegister() {
        if (!regName.trim() || regName.trim().length < 2) { setRegError('Nome deve ter pelo menos 2 caracteres'); return; }
        if (!regEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) { setRegError('E-mail inválido'); return; }
        if (regPass.length < 8) { setRegError('Senha deve ter pelo menos 8 caracteres'); return; }
        if (!/[a-zA-Z]/.test(regPass)) { setRegError('Senha deve conter pelo menos uma letra'); return; }
        if (!/[0-9]/.test(regPass)) { setRegError('Senha deve conter pelo menos um número'); return; }
        if (regPass !== regConfirm) { setRegError('As senhas não coincidem'); return; }

        setRegLoading(true); setRegError('');
        try {
            await api('POST', '/auth/register', { name: regName.trim(), email: regEmail.trim(), password: regPass });
            if (regPlan === 'premium') setShowPix(true);
            else toast(`Conta criada! Faça login para continuar.`, 'success');
            setLoginEmail(regEmail.trim());
            setView('login');
            setRegName(''); setRegEmail(''); setRegPass(''); setRegConfirm('');
        } catch (e: unknown) {
            setRegError(e instanceof Error ? e.message : 'Erro ao cadastrar');
        } finally {
            setRegLoading(false);
        }
    }

    const strength = strengthOf(regPass);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Logo */}
                <View style={styles.logoRow}>
                    <View style={styles.logoMark}><Text style={styles.logoLetter}>F</Text></View>
                    <Text style={styles.logoText}>Finanças</Text>
                </View>

                <View style={styles.card}>
                    {/* Abas */}
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, view === 'login' && styles.tabActive]} onPress={() => setView('login')}>
                            <Text style={[styles.tabText, view === 'login' && styles.tabTextActive]}>Entrar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, view === 'register' && styles.tabActive]} onPress={() => setView('register')}>
                            <Text style={[styles.tabText, view === 'register' && styles.tabTextActive]}>Criar conta</Text>
                        </TouchableOpacity>
                    </View>

                    {view === 'login' ? (
                        /* ── LOGIN ──────────────────────────────────────────────────── */
                        <View style={styles.form}>
                            <Text style={styles.label}>E-mail</Text>
                            <TextInput
                                style={styles.input} value={loginEmail} onChangeText={setLoginEmail}
                                placeholder="seu@email.com" placeholderTextColor={colors.textMuted}
                                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                            />
                            <Text style={styles.label}>Senha</Text>
                            <TextInput
                                style={styles.input} value={loginPass} onChangeText={setLoginPass}
                                placeholder="••••••••" placeholderTextColor={colors.textMuted}
                                secureTextEntry returnKeyType="done" onSubmitEditing={handleLogin}
                            />
                            {!!loginError && <Text style={styles.error}>{loginError}</Text>}
                            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loginLoading}>
                                {loginLoading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.btnText}>Entrar</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* ── CADASTRO ────────────────────────────────────────────────── */
                        <View style={styles.form}>
                            <Text style={styles.label}>Nome</Text>
                            <TextInput style={styles.input} value={regName} onChangeText={setRegName}
                                placeholder="Seu nome completo" placeholderTextColor={colors.textMuted} autoCapitalize="words" />

                            <Text style={styles.label}>E-mail</Text>
                            <TextInput style={styles.input} value={regEmail} onChangeText={setRegEmail}
                                placeholder="seu@email.com" placeholderTextColor={colors.textMuted}
                                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

                            <Text style={styles.label}>Senha</Text>
                            <TextInput style={styles.input} value={regPass} onChangeText={setRegPass}
                                placeholder="Mín. 8 caracteres" placeholderTextColor={colors.textMuted} secureTextEntry />
                            {regPass.length > 0 && (
                                <View style={styles.strengthWrap}>
                                    <View style={styles.strengthBar}>
                                        <View style={[styles.strengthFill, { width: `${(strength.score / 5) * 100}%` as any, backgroundColor: strength.color }]} />
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                                </View>
                            )}

                            <Text style={styles.label}>Confirmar senha</Text>
                            <TextInput style={styles.input} value={regConfirm} onChangeText={setRegConfirm}
                                placeholder="••••••••" placeholderTextColor={colors.textMuted} secureTextEntry />

                            {/* Planos */}
                            <Text style={[styles.label, { marginTop: spacing.md }]}>Escolha seu plano</Text>
                            <View style={styles.plansRow}>
                                <PlanCard plan="free" selected={regPlan === 'free'} onSelect={() => setRegPlan('free')} />
                                <PlanCard plan="premium" selected={regPlan === 'premium'} onSelect={() => setRegPlan('premium')} />
                            </View>

                            {!!regError && <Text style={styles.error}>{regError}</Text>}
                            <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={regLoading}>
                                {regLoading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.btnText}>Criar conta</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <PixModal visible={showPix} onClose={() => setShowPix(false)} />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
    logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    logoMark: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    logoLetter: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    logoText: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
    tabs: { flexDirection: 'row', marginBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
    tab: { flex: 1, paddingBottom: spacing.sm, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium },
    tabTextActive: { color: colors.primary },
    form: { gap: spacing.sm },
    label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 2 },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, color: colors.textPrimary, fontSize: fontSize.base },
    error: { color: colors.danger, fontSize: fontSize.sm },
    btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
    btnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.base },
    strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    strengthBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    strengthFill: { height: '100%', borderRadius: 2 },
    strengthLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    plansRow: { flexDirection: 'row', gap: spacing.sm },
    planCard: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, backgroundColor: colors.bg },
    planCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(59,130,246,0.08)' },
    planCardPremium: { borderColor: colors.warning },
    planName: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginBottom: 2 },
    planNamePremium: { color: colors.warning },
    planPrice: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.xs },
    planPricePremium: { color: colors.warning },
    planFeatures: { gap: 2 },
    planFeat: { color: colors.textSecondary, fontSize: fontSize.xs },
    // PIX
    pixBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
    pixCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
    pixTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
    pixSub: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
    pixBox: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, gap: 4 },
    pixLabel: { color: colors.textMuted, fontSize: fontSize.xs },
    pixKey: { color: colors.primary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    pixNote: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
    pixBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    pixBtnText: { color: '#fff', fontWeight: fontWeight.semibold },
});
