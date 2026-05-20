import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const ALL_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

interface Props {
    value: string;        // YYYY-MM selecionado
    months: string[];     // lista de meses com dados (ex: ["2026-05", "2025-12"])
    onChange: (m: string) => void;
}

export function SeletorMes({ value, months, onChange }: Props) {
    const [openMonth, setOpenMonth] = useState(false);
    const [openYear, setOpenYear] = useState(false);

    const [selYear, selMonth] = value ? value.split('-') : ['', ''];

    // Anos disponíveis extraídos da lista de meses com dados
    const years: string[] = [...new Set(months.map(m => m.split('-')[0]))].sort().reverse();
    // Se não há dados ainda, mostra o ano atual
    if (years.length === 0 && selYear) years.push(selYear);

    const monthLabel = selMonth ? MONTH_NAMES[parseInt(selMonth, 10) - 1] : '—';

    function selectMonth(mm: string) {
        onChange(`${selYear}-${mm}`);
        setOpenMonth(false);
    }

    function selectYear(yy: string) {
        onChange(`${yy}-${selMonth}`);
        setOpenYear(false);
    }

    return (
        <View style={styles.row}>
            {/* Seletor de mês */}
            <TouchableOpacity style={styles.pill} onPress={() => setOpenMonth(true)}>
                <Text style={styles.pillText}>{monthLabel}</Text>
                <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>

            {/* Seletor de ano */}
            <TouchableOpacity style={styles.pill} onPress={() => setOpenYear(true)}>
                <Text style={styles.pillText}>{selYear || '—'}</Text>
                <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>

            {/* Modal — mês (todos os 12) */}
            <Modal visible={openMonth} transparent animationType="slide" onRequestClose={() => setOpenMonth(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpenMonth(false)} />
                <View style={styles.sheet}>
                    <Text style={styles.sheetTitle}>Selecionar mês</Text>
                    <ScrollView>
                        {ALL_MONTHS.map(mm => (
                            <TouchableOpacity
                                key={mm}
                                style={[styles.option, mm === selMonth && styles.optionActive]}
                                onPress={() => selectMonth(mm)}
                            >
                                <Text style={[styles.optionText, mm === selMonth && styles.optionTextActive]}>
                                    {MONTH_NAMES[parseInt(mm, 10) - 1]}
                                </Text>
                                {mm === selMonth && <Text style={styles.check}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* Modal — ano */}
            <Modal visible={openYear} transparent animationType="slide" onRequestClose={() => setOpenYear(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpenYear(false)} />
                <View style={styles.sheet}>
                    <Text style={styles.sheetTitle}>Selecionar ano</Text>
                    <ScrollView>
                        {years.map(yy => (
                            <TouchableOpacity
                                key={yy}
                                style={[styles.option, yy === selYear && styles.optionActive]}
                                onPress={() => selectYear(yy)}
                            >
                                <Text style={[styles.optionText, yy === selYear && styles.optionTextActive]}>
                                    {yy}
                                </Text>
                                {yy === selYear && <Text style={styles.check}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.xs },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
    pillText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    chevron: { color: colors.textMuted, fontSize: 10 },
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '55%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
    option: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionActive: { backgroundColor: 'rgba(59,130,246,0.12)' },
    optionText: { color: colors.textSecondary, fontSize: fontSize.base },
    optionTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
    check: { color: colors.primary, fontWeight: fontWeight.bold },
});

