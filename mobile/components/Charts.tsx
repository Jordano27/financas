/**
 * Gráficos simples usando react-native-svg puro.
 * Substitui react-native-chart-kit que tem bug de `transform-origin` no web.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, G, Text as SvgText, Circle, Path } from 'react-native-svg';
import { colors, fontSize, fontWeight, spacing } from '@/constants/theme';

// ─────────────── Bar Chart ──────────────────────────────────────────────────

interface BarDataset {
    label: string;
    values: number[];
    color: string;
}

interface BarChartProps {
    labels: string[];
    datasets: BarDataset[];
    width: number;
    height?: number;
}

export function SimpleBarChart({ labels, datasets, width, height = 180 }: BarChartProps) {
    const paddingLeft = 52;
    const paddingRight = 12;
    const paddingTop = 16;
    const paddingBottom = 28;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const numGroups = labels.length;
    const numDs = datasets.length;
    const allValues = datasets.flatMap(d => d.values);
    const max = Math.max(...allValues, 1);

    const groupW = chartW / numGroups;
    const barGap = 2;
    const barW = Math.max(4, (groupW * 0.78 - barGap * (numDs - 1)) / numDs);

    const ticks = [0, 0.25, 0.5, 0.75, 1];

    return (
        <View>
            <Svg width={width} height={height}>
                {/* Grid lines + Y labels */}
                {ticks.map((pct, i) => {
                    const y = paddingTop + chartH * (1 - pct);
                    return (
                        <G key={i}>
                            <Rect x={paddingLeft} y={y} width={chartW} height={0.5} fill="rgba(255,255,255,0.06)" />
                            <SvgText x={paddingLeft - 4} y={y + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
                                {pct === 0 ? '' : `${Math.round(max * pct / 1000)}k`}
                            </SvgText>
                        </G>
                    );
                })}

                {/* Grouped bars */}
                {labels.map((lbl, gi) => {
                    const groupCenterX = paddingLeft + groupW * gi + groupW / 2;
                    const totalBarsW = barW * numDs + barGap * (numDs - 1);
                    const startX = groupCenterX - totalBarsW / 2;
                    return (
                        <G key={gi}>
                            {datasets.map((ds, di) => {
                                const v = ds.values[gi] ?? 0;
                                const barH = Math.max(v > 0 ? 2 : 0, (v / max) * chartH);
                                const bx = startX + di * (barW + barGap);
                                const by = paddingTop + chartH - barH;
                                return (
                                    <Rect key={di} x={bx} y={by} width={barW} height={barH}
                                        fill={ds.color} rx={2} ry={2} opacity={0.85} />
                                );
                            })}
                            <SvgText
                                x={groupCenterX}
                                y={paddingTop + chartH + 14}
                                fontSize={10}
                                fill={colors.textMuted}
                                textAnchor="middle"
                            >
                                {lbl}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>

            {/* Legend */}
            <View style={s.barLegend}>
                {datasets.map((ds, i) => (
                    <View key={i} style={s.barLegendItem}>
                        <View style={[s.barLegendDot, { backgroundColor: ds.color }]} />
                        <Text style={s.barLegendText}>{ds.label}</Text>
                    </View>
                ))}
            </View>
        </View>
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
    barLegend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.md, marginTop: 2 },
    barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    barLegendDot: { width: 10, height: 10, borderRadius: 2 },
    barLegendText: { color: colors.textMuted, fontSize: 10 },
});
