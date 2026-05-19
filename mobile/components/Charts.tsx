/**
 * Gráficos simples usando react-native-svg puro.
 * Substitui react-native-chart-kit que tem bug de `transform-origin` no web.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, G, Text as SvgText, Circle, Path } from 'react-native-svg';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';
import { fmt } from '@/utils/format';

// ─────────────── Bar Chart ──────────────────────────────────────────────────

interface BarChartProps {
    labels: string[];
    values: number[];
    width: number;
    height?: number;
    barColor?: string;
}

export function SimpleBarChart({ labels, values, width, height = 160, barColor = colors.income }: BarChartProps) {
    const paddingLeft = 48;
    const paddingRight = 12;
    const paddingTop = 16;
    const paddingBottom = 36;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const max = Math.max(...values, 1);
    const barW = Math.max(4, (chartW / values.length) * 0.55);
    const gap = chartW / values.length;

    // Linhas horizontais (4)
    const lines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        y: paddingTop + chartH * (1 - pct),
        label: fmt(max * pct),
    }));

    return (
        <Svg width={width} height={height}>
            {/* Grid lines */}
            {lines.map((l, i) => (
                <G key={i}>
                    <Rect x={paddingLeft} y={l.y} width={chartW} height={0.5} fill="rgba(255,255,255,0.06)" />
                    <SvgText x={paddingLeft - 4} y={l.y + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
                        {i === 0 ? '' : `${Math.round(max * [0, 0.25, 0.5, 0.75, 1][i] / 1000)}k`}
                    </SvgText>
                </G>
            ))}

            {/* Bars */}
            {values.map((v, i) => {
                const barH = Math.max(2, (v / max) * chartH);
                const x = paddingLeft + gap * i + gap / 2 - barW / 2;
                const y = paddingTop + chartH - barH;
                return (
                    <G key={i}>
                        <Rect x={x} y={y} width={barW} height={barH} fill={barColor} rx={3} ry={3} opacity={0.85} />
                        <SvgText x={x + barW / 2} y={height - paddingBottom + 14} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                            {labels[i] ?? ''}
                        </SvgText>
                    </G>
                );
            })}
        </Svg>
    );
}

// ─────────────── Pie Chart ──────────────────────────────────────────────────

interface PieSlice {
    name: string;
    amount: number;
    color: string;
}

interface PieChartProps {
    data: PieSlice[];
    size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function SimplePieChart({ data, size = 140 }: PieChartProps) {
    const total = data.reduce((s, d) => s + d.amount, 0);
    if (!total) return null;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 6;

    let cursor = 0;
    const slices = data.map(d => {
        const angle = (d.amount / total) * 360;
        const start = cursor;
        cursor += angle;
        return { ...d, startAngle: start, endAngle: cursor };
    });

    return (
        <View style={s.pieWrap}>
            {/* Donut */}
            <Svg width={size} height={size}>
                {slices.map((sl, i) => (
                    <Path key={i} d={slicePath(cx, cy, r, sl.startAngle, sl.endAngle)} fill={sl.color} opacity={0.9} />
                ))}
                {/* Hole */}
                <Circle cx={cx} cy={cy} r={r * 0.48} fill={colors.card} />
            </Svg>

            {/* Legend */}
            <View style={s.legend}>
                {slices.map((sl, i) => (
                    <View key={i} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: sl.color }]} />
                        <Text style={s.legendName} numberOfLines={1}>{sl.name}</Text>
                        <Text style={s.legendVal}>{((sl.amount / total) * 100).toFixed(0)}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    pieWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    legend: { flex: 1, gap: 5 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    legendName: { flex: 1, color: colors.textSecondary, fontSize: fontSize.xs },
    legendVal: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
