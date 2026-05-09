import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { createConversation, getConversations, getNearbyUsers } from "../api/client";
import type { ConversationListItem, NearbyUser } from "../api/types";
import { Avatar } from "../components/Avatar";
import { Screen } from "../components/Screen";
import { RootStackParamList } from "../../App";
import { colors, radius, spacing } from "../theme";
import { timeAgo } from "../utils/format";
import { useCampusLocation } from "../hooks/useCampusLocation";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ChatsScreen() {
  const navigation = useNavigation<Nav>();
  const { coords } = useCampusLocation();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConversations(await getConversations());
    } finally {
      setLoading(false);
    }
  }, []);

  const openNewChat = useCallback(async () => {
    setNewChatOpen(true);
    setNearby(await getNearbyUsers(coords.lat, coords.lng).catch(() => []));
  }, [coords.lat, coords.lng]);

  const startChat = async (user: NearbyUser) => {
    const conv = await createConversation({ type: "direct", memberIds: [user.id] });
    setNewChatOpen(false);
    navigation.navigate("ChatThread", { conversationId: conv.id, title: user.displayName });
  };

  useEffect(() => {
    void load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Direct and group messages</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={openNewChat}>
          <Ionicons name="create" size={20} color={colors.text} />
        </Pressable>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet. Start one from a nearby person on the map.</Text>}
        renderItem={({ item }) => {
          const title = item.name || item.members.map((member) => member.displayName).filter(Boolean).join(", ") || "Conversation";
          const preview = item.lastMessage?.content || "No messages yet";
          const color = item.members[0]?.bannerColor;
          return (
            <Pressable style={styles.row} onPress={() => navigation.navigate("ChatThread", { conversationId: item.id, title })}>
              <Avatar name={title} color={color} size={50} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
                  {item.lastMessage ? <Text style={styles.time}>{timeAgo(item.lastMessage.createdAt)}</Text> : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>{preview}</Text>
              </View>
              {item.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      <Modal transparent visible={newChatOpen} animationType="slide" onRequestClose={() => setNewChatOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>New chat</Text>
              <Pressable style={styles.close} onPress={() => setNewChatOpen(false)}>
                <Ionicons name="close" color={colors.text} size={22} />
              </Pressable>
            </View>
            <FlatList
              data={nearby}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.sheetList}
              ListEmptyComponent={<Text style={styles.empty}>No nearby visible users right now.</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.personRow} onPress={() => startChat(item)}>
                  <Avatar name={item.displayName} color={item.bannerColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.displayName}</Text>
                    <Text style={styles.preview}>{item.title || (item.active ? "Active nearby" : "Nearby")}</Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 3
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  empty: {
    color: colors.muted,
    textAlign: "center",
    padding: spacing.xl,
    lineHeight: 22
  },
  row: {
    minHeight: 76,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowBody: {
    flex: 1,
    minWidth: 0
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  rowTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  preview: {
    color: colors.muted,
    marginTop: 4
  },
  time: {
    color: colors.muted,
    fontSize: 12
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900"
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "72%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border
  },
  sheetHead: {
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center"
  },
  sheetList: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md
  },
  personRow: {
    minHeight: 70,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  }
});
