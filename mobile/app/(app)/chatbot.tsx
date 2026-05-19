import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { api } from '@/services/api';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
}

interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

const FAQ_SUGGESTIONS = [
    'Como adicionar um lançamento?',
    'Como criar uma meta?',
    'Como funciona a saúde financeira?',
    'Como marcar uma conta como paga?',
    'O que é investimento manual?',
];

export default function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', role: 'bot', text: 'Olá! Sou o assistente financeiro. Posso tirar dúvidas sobre o app ou sobre finanças pessoais. Como posso ajudar?' },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const listRef = useRef<FlatList>(null);
    const historyRef = useRef<ChatHistoryItem[]>([]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages]);

    async function send(text?: string) {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;
        setInput('');

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        historyRef.current.push({ role: 'user', content: msg });

        try {
            const res = await api<{ reply: string }>('POST', '/chat', { message: msg, history: historyRef.current.slice(-10) });
            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', text: res.reply };
            historyRef.current.push({ role: 'assistant', content: res.reply });
            setMessages(prev => [...prev, botMsg]);
        } catch {
            const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', text: 'Desculpe, não consegui processar sua pergunta. Tente novamente.' };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>🤖 Assistente</Text>
                <Text style={s.headerSub}>Dúvidas sobre o app e finanças</Text>
            </View>

            {/* Messages */}
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={m => m.id}
                contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
                onContentSizeChange={scrollToBottom}
                renderItem={({ item: m }) => (
                    <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
                        <Text style={[s.bubbleText, m.role === 'user' ? s.bubbleTextUser : s.bubbleTextBot]}>{m.text}</Text>
                    </View>
                )}
                ListFooterComponent={
                    loading ? (
                        <View style={[s.bubble, s.bubbleBot]}>
                            <Text style={s.bubbleTextBot}>● ● ●</Text>
                        </View>
                    ) : null
                }
            />

            {/* Sugestões (só no início) */}
            {messages.length <= 1 && (
                <View style={s.suggestionsRow}>
                    <FlatList
                        data={FAQ_SUGGESTIONS}
                        keyExtractor={i => i}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={s.suggestion} onPress={() => send(item)}>
                                <Text style={s.suggestionText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Input */}
            <View style={s.inputBar}>
                <TextInput
                    style={s.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Digite sua pergunta…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={() => send()}
                />
                <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} onPress={() => send()} disabled={!input.trim() || loading}>
                    <Text style={s.sendBtnText}>↑</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    headerSub: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    bubble: { maxWidth: '80%', borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleBot: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },
    bubbleTextUser: { color: '#fff' },
    bubbleTextBot: { color: colors.textPrimary },
    suggestionsRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    suggestion: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    suggestionText: { color: colors.textSecondary, fontSize: fontSize.xs },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
    input: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: fontSize.sm, maxHeight: 100 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: colors.border },
    sendBtnText: { color: '#fff', fontSize: 20, fontWeight: fontWeight.bold, lineHeight: 22 },
});
