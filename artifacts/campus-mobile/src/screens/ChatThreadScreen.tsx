import React, { useCallback, useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { getChatMessages, sendChatMessage } from "../api/client";
import type { ChatMsg } from "../api/types";
import { Avatar } from "../components/Avatar";
import { RootStackParamList } from "../../App";
import { colors, radius, spacing } from "../theme";
import { timeAgo } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "ChatThread">;

export function ChatThreadScreen({ navigation, route }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setMessages(await getChatMessages(route.params.conversationId));
  }, [route.params.conversationId]);

  useEffect(() => {
    void load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendChatMessage(route.params.conversationId, { content: text.trim(), messageType: "text" });
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" color={colors.text} size={26} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{route.params.title}</Text>
      </View>

      <FlatList
        data={[...messages].reverse()}
        inverted
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Avatar name={item.senderName} color={item.senderBannerColor} size={34} />
            <View style={styles.bubble}>
              <View style={styles.bubbleTop}>
                <Text style={styles.sender}>{item.senderName}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.message}>{item.messageType === "location" ? "Shared a location" : item.content}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable disabled={sending || !text.trim()} style={[styles.send, (!text.trim() || sending) && styles.sendDisabled]} onPress={send}>
          <Ionicons name="send" size={18} color={colors.text} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md
  },
  messageRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end"
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md
  },
  bubbleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  sender: {
    color: colors.text,
    fontWeight: "800"
  },
  time: {
    color: colors.muted,
    fontSize: 12
  },
  message: {
    color: colors.text,
    lineHeight: 21,
    marginTop: 5
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  sendDisabled: {
    opacity: 0.45
  }
});
