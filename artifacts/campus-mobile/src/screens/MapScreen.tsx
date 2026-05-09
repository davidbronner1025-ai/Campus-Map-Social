import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createEvent, getLocations, getNearbyEvents, getNearbyMessages, getNearbyUsers, pinMessage, reactToMessage, rsvpEvent, unrsvpEvent } from "../api/client";
import type { CampusLocation, NearbyEvent, NearbyMessage, NearbyUser } from "../api/types";
import { Avatar } from "../components/Avatar";
import { CampusMap } from "../components/CampusMap";
import { NotificationsButton } from "../components/NotificationsModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useCampusLocation } from "../hooks/useCampusLocation";
import { colors, radius, spacing } from "../theme";
import { eventTime, timeAgo } from "../utils/format";

type FeedItem = (NearbyMessage & { kind: "message" }) | (NearbyEvent & { kind: "event" });

const INVITE_TYPES = [
  { key: "smoke", label: "Smoke" },
  { key: "carpool", label: "Carpool" },
  { key: "phone_game", label: "Game" },
  { key: "food_order", label: "Food" },
  { key: "football", label: "Sports" }
];

const EVENT_CATEGORIES = [
  { key: "study_group", label: "Study" },
  { key: "party", label: "Party" },
  { key: "sports", label: "Sports" },
  { key: "club_meeting", label: "Club" },
  { key: "food", label: "Food" },
  { key: "other", label: "Other" }
];

export function MapScreen() {
  const { coords, status, refresh } = useCampusLocation();
  const [messages, setMessages] = useState<NearbyMessage[]>([]);
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [people, setPeople] = useState<NearbyUser[]>([]);
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState<"message" | "event" | null>(null);
  const [content, setContent] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [messageKind, setMessageKind] = useState<"regular" | "invitation">("regular");
  const [inviteType, setInviteType] = useState("food_order");
  const [eventCategory, setEventCategory] = useState("other");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextMessages, nextEvents, nextPeople, nextLocations] = await Promise.all([
        getNearbyMessages(coords.lat, coords.lng),
        getNearbyEvents(coords.lat, coords.lng),
        getNearbyUsers(coords.lat, coords.lng),
        getLocations()
      ]);
      setMessages(nextMessages);
      setEvents(nextEvents);
      setPeople(nextPeople);
      setLocations(nextLocations);
    } finally {
      setLoading(false);
    }
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    void load();
  }, [load]);

  const feed: FeedItem[] = useMemo(
    () => [
      ...messages.map((item) => ({ ...item, kind: "message" as const })),
      ...events.map((item) => ({ ...item, kind: "event" as const }))
    ].sort((a, b) => {
      const bDate = b.kind === "message" ? b.createdAt : b.startsAt;
      const aDate = a.kind === "message" ? a.createdAt : a.startsAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }),
    [events, messages]
  );

  const submitMessage = async () => {
    await pinMessage({
      lat: coords.lat,
      lng: coords.lng,
      content,
      type: messageKind,
      invitationType: messageKind === "invitation" ? inviteType : undefined,
      expiresInMinutes: messageKind === "invitation" ? 90 : undefined
    });
    setContent("");
    setComposer(null);
    await load();
  };

  const submitEvent = async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await createEvent({ lat: coords.lat, lng: coords.lng, title: eventTitle, category: eventCategory, startsAt });
    setEventTitle("");
    setComposer(null);
    await load();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Campus Map</Text>
          <Text style={styles.subtitle}>{status === "denied" ? "Location permission denied" : "Live nearby activity"}</Text>
        </View>
        <View style={styles.headerActions}>
          <NotificationsButton />
          <Pressable style={styles.iconButton} onPress={refresh}>
            <Ionicons name="navigate" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <CampusMap coords={coords} messages={messages} events={events} people={people} locations={locations} />
        {loading ? <ActivityIndicator style={styles.mapLoading} color={colors.primary} /> : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Pin message" onPress={() => setComposer("message")} />
        <PrimaryButton label="Create event" tone="secondary" onPress={() => setComposer("event")} />
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.feed}
        ListEmptyComponent={<Text style={styles.empty}>No nearby activity yet.</Text>}
        renderItem={({ item }) => <FeedCard item={item} onChanged={load} />}
      />

      <Modal transparent visible={composer !== null} animationType="slide" onRequestClose={() => setComposer(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{composer === "event" ? "Create event" : "Pin message"}</Text>
            {composer === "message" ? (
              <>
                <View style={styles.segment}>
                  <Pressable style={[styles.segmentItem, messageKind === "regular" && styles.segmentActive]} onPress={() => setMessageKind("regular")}>
                    <Text style={[styles.segmentText, messageKind === "regular" && styles.segmentTextActive]}>Post</Text>
                  </Pressable>
                  <Pressable style={[styles.segmentItem, messageKind === "invitation" && styles.segmentActive]} onPress={() => setMessageKind("invitation")}>
                    <Text style={[styles.segmentText, messageKind === "invitation" && styles.segmentTextActive]}>Invite</Text>
                  </Pressable>
                </View>
                {messageKind === "invitation" ? (
                  <View style={styles.chipRow}>
                    {INVITE_TYPES.map((item) => (
                      <Pressable key={item.key} style={[styles.chip, inviteType === item.key && styles.chipActive]} onPress={() => setInviteType(item.key)}>
                        <Text style={styles.chipText}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.chipRow}>
                {EVENT_CATEGORIES.map((item) => (
                  <Pressable key={item.key} style={[styles.chip, eventCategory === item.key && styles.chipActive]} onPress={() => setEventCategory(item.key)}>
                    <Text style={styles.chipText}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <TextInput
              value={composer === "event" ? eventTitle : content}
              onChangeText={composer === "event" ? setEventTitle : setContent}
              placeholder={composer === "event" ? "Event title" : "What is happening here?"}
              placeholderTextColor={colors.muted}
              multiline={composer !== "event"}
              style={[styles.input, composer !== "event" && styles.textArea]}
            />
            <PrimaryButton label={composer === "event" ? "Create" : "Post"} onPress={composer === "event" ? submitEvent : submitMessage} disabled={composer === "event" ? !eventTitle.trim() : !content.trim()} />
            <PrimaryButton label="Cancel" tone="secondary" onPress={() => setComposer(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function FeedCard({ item, onChanged }: { item: FeedItem; onChanged: () => void }) {
  const isEvent = item.kind === "event";
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar name={isEvent ? item.creator?.displayName : item.author?.displayName} color={isEvent ? item.creator?.bannerColor : item.author?.bannerColor} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{isEvent ? item.title : item.author?.displayName || "Campus post"}</Text>
          <Text style={styles.cardMeta}>{isEvent ? eventTime(item.startsAt) : `${timeAgo(item.createdAt)} ago`}</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>{isEvent ? item.description || `${item.rsvpCount} going` : item.content}</Text>
      <View style={styles.cardActions}>
        {isEvent ? (
          <>
            <Pressable style={styles.smallButton} onPress={async () => { await rsvpEvent(item.id); onChanged(); }}>
              <Text style={styles.smallButtonText}>Join</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={async () => { await unrsvpEvent(item.id); onChanged(); }}>
              <Text style={styles.smallButtonText}>Leave</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.smallButton} onPress={async () => { await reactToMessage(item.id, "yes"); onChanged(); }}>
              <Text style={styles.smallButtonText}>Yes</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={async () => { await reactToMessage(item.id, "no"); onChanged(); }}>
              <Text style={styles.smallButtonText}>No</Text>
            </Pressable>
            <Text style={styles.cardMeta}>{item.replyCount} replies</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 2
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  mapWrap: {
    height: 300,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  mapLoading: {
    position: "absolute",
    top: 14,
    right: 14
  },
  actions: {
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md
  },
  feed: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  empty: {
    color: colors.muted,
    textAlign: "center",
    padding: spacing.xl
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12
  },
  cardBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  smallButton: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  smallButtonText: {
    color: colors.text,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    padding: spacing.lg,
    fontSize: 16
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm
  },
  segmentActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.text
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  chipText: {
    color: colors.text,
    fontWeight: "700"
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top"
  }
});
