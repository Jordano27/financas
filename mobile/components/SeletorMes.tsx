import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import { fmtMonth } from '@/utils/format';

interface Props {
    value: string;           // YYYY-MM selecionado
    months: string[];        // lista de meses disponíveis
    onChange: (m: string) => void;
}

export function SeletorMes({ value, months, onChange }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
                <Text style={styles.triggerText}>{fmtMonth(value) || '—'}</Text>
                <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
                <View style={styles.sheet}>
                    <Text style={styles.sheetTitle}>Selecionar mês</Text>
                    <ScrollView>
                        {months.map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.option, m === value && styles.optionActive]}
                                onPress={() => { onChange(m); setOpen(false); }}
                            >
                                <Text style={[styles.optionText, m === value && styles.optionTextActive]}>
                                    {fmtMonth(m)}
                                </Text>
                                {m === value && <Text style={styles.check}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    triggerText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    chevron: { color: colors.textMuted, fontSize: fontSize.sm },
    backdrop: { flex: 1, backgroundColor: colors.overlay },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '60%' },
    sheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
    option: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionActive: { backgroundColor: 'rgba(59,130,246,0.12)' },
    optionText: { color: colors.textSecondary, fontSize: fontSize.base },
    optionTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
    check: { color: colors.primary, fontWeight: fontWeight.bold },
});
