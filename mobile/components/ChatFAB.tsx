import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';
import { IconBot, IconX } from '@/components/Icon';
import {
    FAQ_TREE,
    FaqOption,
    RESTART_OPTION,
    WELCOME_NODES,
} from '@/constants/chatbot-faq';

const CHAT_ACCENT = '#6366f1';

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
}

// ── Typing animation component ────────────────────────────────────────────────
function TypingDots() {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const makeAnim = (d: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(d, { toValue: -5, duration: 220, useNativeDriver: true }),
                    Animated.timing(d, { toValue: 0, duration: 220, useNativeDriver: true }),
                    Animated.delay(380),
                ]),
            );
        Animated.parallel([makeAnim(dot1, 0), makeAnim(dot2, 160), makeAnim(dot3, 320)]).start();
        return () => {
            dot1.stopAnimation();
            dot2.stopAnimation();
            dot3.stopAnimation();
        };
    }, [dot1, dot2, dot3]);

    return (
        <View style={s.typingBubble}>
            {([dot1, dot2, dot3] as Animated.Value[]).map((d, i) => (
                <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: d }] }]} />
            ))}
        </View>
    );
}

// ── Main component ──────────────────────────────────────────────────────────────────────
export function ChatFAB() {
    const { user } = useAuth();
    const isPremium = user?.plan === 'premium' || user?.role === 'admin';

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [options, setOptions] = useState<FaqOption[]>([]);
    const [typing, setTyping] = useState(false);

    const listRef = useRef<FlatList>(null);
    const genRef = useRef(0);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, typing, scrollToBottom]);

    // ── Navigate to a FAQ node ──────────────────────────────────────────────
    const chatGoto = useCallback(
        async (nodeId: string) => {
            const gen = ++genRef.current;
            const actualId =
                nodeId === '__welcome__'
                    ? isPremium
                        ? 'welcome'
                        : 'welcome_free'
                    : nodeId;
            const node = FAQ_TREE[actualId];
            if (!node) return;

            setOptions([]);
            setTyping(true);

            await new Promise<void>(r => setTimeout(r, 650));
            if (gen !== genRef.current) return;

            setTyping(false);
            setMessages(prev => [
                ...prev,
                { id: `${Date.now()}-${gen}`, role: 'bot', text: node.text },
            ]);

            const isWelcome = WELCOME_NODES.has(actualId);
            setOptions(isWelcome ? node.options : [...node.options, RESTART_OPTION]);
        },
        [isPremium],
    );

    // ── Handle option button press ────────────────────────────────────────────
    const handleOption = useCallback(
        async (opt: FaqOption) => {
            const gen = ++genRef.current;

            setMessages(prev => [
                ...prev,
                { id: `${Date.now()}-${gen}-u`, role: 'user', text: opt.label },
            ]);
            setOptions([]);

            if (opt.action === 'start_tour') {
                setTyping(true);
                await new Promise<void>(r => setTimeout(r, 650));
                if (gen !== genRef.current) return;
                setTyping(false);
                setMessages(prev => [
                    ...prev,
                    {
                        id: `${Date.now()}-${gen}-bot`,
                        role: 'bot',
                        text: 'O tour guiado está disponível apenas na versão web. Acesse pelo navegador para explorar o sistema! 😊',
                    },
                ]);
                setOptions([RESTART_OPTION]);
                return;
            }

            if (opt.next) {
                await chatGoto(opt.next);
            }
        },
        [chatGoto],
    );

    // ── Open: show welcome on first open ────────────────────────────────────────
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            chatGoto(isPremium ? 'welcome' : 'welcome_free');
        }
    }, [isOpen, isPremium, chatGoto, messages.length]);

    // ── Encerrar: reset + close ───────────────────────────────────────────────────
    const encerrar = useCallback(() => {
        genRef.current += 100;
        setMessages([]);
        setOptions([]);
        setTyping(false);
        setIsOpen(false);
    }, []);

    return (
        <>
            {/* Floating action button */}
            <TouchableOpacity style={s.fab} onPress={() => setIsOpen(true)} activeOpacity={0.85}>
                <IconBot color="#fff" size={26} />
            </TouchableOpacity>

            {/* Chat modal — slides up from bottom */}
            <Modal
                visible={isOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
                statusBarTranslucent
            >
                <View style={s.overlay}>
                    {/* Tap backdrop to close */}
                    <TouchableOpacity
                        style={s.backdropArea}
                        activeOpacity={1}
                        onPress={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <View style={s.panel}>
                        {/* Header */}
                        <View style={s.header}>
                            <View style={s.headerIconWrap}>
                                <IconBot color="#fff" size={22} />
                            </View>
                            <View style={s.headerInfo}>
                                <Text style={s.headerName}>Assistente Virtual</Text>
                                <View style={s.statusRow}>
                                    <View style={s.statusDot} />
                                    <Text style={s.statusText}>Online</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={s.encerrarBtn}
                                onPress={encerrar}
                                activeOpacity={0.7}
                            >
                                <Text style={s.encerrarText}>Encerrar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.closeBtn}
                                onPress={() => setIsOpen(false)}
                                activeOpacity={0.7}
                                hitSlop={8}
                            >
                                <IconX color="#fff" size={15} />
                            </TouchableOpacity>
                        </View>

                        {/* Messages */}
                        <FlatList
                            ref={listRef}
                            data={messages}
                            keyExtractor={m => m.id}
                            style={s.messageList}
                            contentContainerStyle={s.messageContent}
                            onContentSizeChange={scrollToBottom}
                            renderItem={({ item: m }) => (
                                <View
                                    style={[
                                        s.bubble,
                                        m.role === 'user' ? s.bubbleUser : s.bubbleBot,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.bubbleText,
                                            m.role === 'user'
                                                ? s.bubbleTextUser
                                                : s.bubbleTextBot,
                                        ]}
                                    >
                                        {m.text}
                                    </Text>
                                </View>
                            )}
                            ListFooterComponent={typing ? <TypingDots /> : null}
                        />

                        {/* Option buttons */}
                        {options.length > 0 && (
                            <ScrollView
                                style={s.optionsScroll}
                                contentContainerStyle={s.optionsContent}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {options.map(opt => (
                                    <TouchableOpacity
                                        key={opt.label}
                                        style={s.optionBtn}
                                        onPress={() => handleOption(opt)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={s.optionText}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    /* FAB */
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: CHAT_ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: CHAT_ACCENT,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        zIndex: 100,
    },
    /* Modal overlay */
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdropArea: {
        flex: 1,
    },

    /* Chat panel */
    panel: {
        height: '72%',
        backgroundColor: colors.bg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        backgroundColor: CHAT_ACCENT,
        gap: spacing.sm,
    },
    headerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        color: '#fff',
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#4ade80',
    },
    statusText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
    },
    encerrarBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: radius.sm,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    encerrarText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: fontWeight.medium,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    /* Messages */
    messageList: {
        flex: 1,
    },
    messageContent: {
        padding: spacing.md,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: radius.lg,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    bubbleBot: {
        alignSelf: 'flex-start',
        backgroundColor: colors.card,
        borderBottomLeftRadius: 4,
    },
    bubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: CHAT_ACCENT,
        borderBottomRightRadius: 4,
    },
    bubbleText: {
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    bubbleTextBot: {
        color: colors.textPrimary,
    },
    bubbleTextUser: {
        color: '#fff',
    },

    /* Typing dots */
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderBottomLeftRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 5,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    typingDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.textMuted,
    },

    /* Option buttons */
    optionsScroll: {
        maxHeight: 220,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    optionsContent: {
        padding: spacing.sm,
        gap: spacing.xs,
    },
    optionBtn: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: CHAT_ACCENT + '55',
        borderRadius: radius.md,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    optionText: {
        color: colors.textPrimary,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
});
