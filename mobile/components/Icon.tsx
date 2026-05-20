/**
 * Ícones SVG idênticos ao sidebar web (estilo Feather Icons).
 * Usa react-native-svg para compatibilidade nativa + web.
 */
import React from 'react';
import Svg, { Path, Line, Polyline, Rect, Circle } from 'react-native-svg';

interface IconProps {
    color?: string;
    size?: number;
}

const DEFAULTS = { color: '#94a3b8', size: 22 };

export function IconHome({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9,22 9,12 15,12 15,22" />
        </Svg>
    );
}

export function IconArrowUp({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="12" y1="19" x2="12" y2="5" />
            <Polyline points="5,12 12,5 19,12" />
        </Svg>
    );
}

export function IconArrowDown({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="12" y1="5" x2="12" y2="19" />
            <Polyline points="19,12 12,19 5,12" />
        </Svg>
    );
}

export function IconCreditCard({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
            <Line x1="2" y1="10" x2="22" y2="10" />
        </Svg>
    );
}

export function IconMenu({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="3" y1="6" x2="21" y2="6" />
            <Line x1="3" y1="12" x2="21" y2="12" />
            <Line x1="3" y1="18" x2="21" y2="18" />
        </Svg>
    );
}

export function IconTrendingUp({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
            <Polyline points="16,7 22,7 22,13" />
        </Svg>
    );
}

export function IconTarget({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Circle cx="12" cy="12" r="6" />
            <Circle cx="12" cy="12" r="2" />
        </Svg>
    );
}

export function IconLightbulb({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18h6" />
            <Path d="M10 22h4" />
            <Path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 17H9l-.7-2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z" />
        </Svg>
    );
}

export function IconActivity({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Svg>
    );
}

export function IconBarChart({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="18" y1="20" x2="18" y2="10" />
            <Line x1="12" y1="20" x2="12" y2="4" />
            <Line x1="6" y1="20" x2="6" y2="14" />
        </Svg>
    );
}

export function IconMessageCircle({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
    );
}

export function IconX({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
    );
}

export function IconLogOut({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16,17 21,12 16,7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
    );
}

export function IconUser({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Circle cx="12" cy="7" r="4" />
        </Svg>
    );
}

export function IconChevronDown({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="6,9 12,15 18,9" />
        </Svg>
    );
}

export function IconBot({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="2" y="3" width="20" height="14" rx="2" />
            <Circle cx="8.5" cy="9.5" r="1.5" />
            <Circle cx="15.5" cy="9.5" r="1.5" />
            <Path d="M8.5 13.5s1 1.5 3.5 1.5 3.5-1.5 3.5-1.5" />
            <Line x1="8" y1="3" x2="8" y2="1" />
            <Line x1="16" y1="3" x2="16" y2="1" />
            <Line x1="12" y1="17" x2="12" y2="21" />
            <Line x1="8" y1="21" x2="16" y2="21" />
        </Svg>
    );
}

export function IconEdit({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
    );
}

export function IconTrash({ color = DEFAULTS.color, size = DEFAULTS.size }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="3,6 5,6 21,6" />
            <Path d="M19 6l-1 14H6L5 6" />
            <Path d="M10 11v6M14 11v6" />
            <Path d="M9 6V4h6v2" />
        </Svg>
    );
}
