import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../api/client";
import type { AppNotification } from "../api/types";
import { colors, radius, spacing } from "../theme";
import { timeAgo } from "../utils/format";

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const result = await getNotifications().catch(() => ({ notifications: [], unreadCount: 0 }));
    setItems(result.notifications);
    setUnread(result.unreadCount);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const openModal = async () => {
    setOpen(true);
    await load();
  };

  return (
    <>
      <Pressable style={styles.iconButton} onPress={openModal}>
        <Ionicons name="notifications" size={20} color={colors.text} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.title}>Notifications</Text>
              <View style={styles.headActions}>
                <Pressable
                  style={styles.smallButton}
                  onPress={async () => {
                    await markAllNotificationsRead().catch(() => undefined);
                    await load();
                  }}
                >
                  <Text style={styles.smallButtonText}>Read all</Text>
                </Pressable>
                <Pressable style={styles.close} onPress={() => setOpen(false)}>
                  <Ionicons name="close" color={colors.text} size={22} />
                </Pressable>
              </View>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>Nothing new right now.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, !item.read && styles.unreadRow]}
                  onPress={async () => {
                    await markNotificationRead(item.id).catch(() => undefined);
                    await load();
                  }}
                >
                  <View style={[styles.dot, item.read && styles.readDot]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.body}>{item.content}</Text>
                    <Text style={styles.meta}>{timeAgo(item.createdAt)} ago</Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  badgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900"
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "78%",
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
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  headActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center"
  },
  smallButton: {
    minHeight: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: "800"
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm
  },
  empty: {
    color: colors.muted,
    textAlign: "center",
    padding: spacing.xl
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md
  },
  unreadRow: {
    borderColor: colors.primary,
    backgroundColor: "#0b2444"
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5
  },
  readDot: {
    backgroundColor: colors.border
  },
  body: {
    color: colors.text,
    lineHeight: 21
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  }
});
