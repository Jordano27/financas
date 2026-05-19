// Paleta idêntica ao style.css do web
export const colors = {
    // Backgrounds
    bg: '#0f172a',
    card: '#1e293b',
    cardHover: '#263450',
    border: '#334155',
    borderLight: '#475569',

    // Text
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',

    // Brand
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    success: '#22c55e',
    successDark: '#16a34a',
    danger: '#ef4444',
    dangerDark: '#dc2626',
    warning: '#f59e0b',
    warningDark: '#d97706',
    invest: '#8b5cf6',
    investDark: '#7c3aed',
    goals: '#06b6d4',
    goalsDark: '#0891b2',

    // Income / Expense
    income: '#22c55e',
    expense: '#ef4444',
    bills: '#3b82f6',

    // Health score
    healthA: '#22c55e',
    healthB: '#84cc16',
    healthC: '#f59e0b',
    healthD: '#ef4444',

    // Overlay / modal
    overlay: 'rgba(0,0,0,0.6)',
    modalBg: '#1e293b',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const radius = {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 999,
};

export const fontSize = {
    xs: 11,
    sm: 12,
    md: 14,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const fontWeight = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

// Sombra padrão de cards
export const shadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
};
