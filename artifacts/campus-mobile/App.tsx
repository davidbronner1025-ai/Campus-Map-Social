import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  getConversations,
  getMe,
  getNearbyEvents,
  getNearbyMessages,
  getNearbyUsers,
  getStoredToken,
  pinMessage,
  requestOtp,
  storeToken,
  updateMe,
  verifyOtp,
  type Conversation,
  type NearbyEvent,
  type NearbyMessage,
  type NearbyUser,
  type UserProfile
} from "./src/api";
import { colors, radius, spacing } from "./src/theme";

type AuthValue = {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  setToken: (token: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Missing AuthProvider");
  return value;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = useCallback(async (next: string | null) => {
    await storeToken(next);
    setTokenState(next);
    if (!next) setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const stored = await getStoredToken();
    setTokenState(stored);
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      setUser(await getMe());
    } catch {
      await storeToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
  }, [setToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ token, user, loading, setToken, refresh, logout }), [token, user, loading, setToken, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return value.trim() || "+972501234567";
}

function AuthScreen() {
  const { setToken, refresh } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const formatted = formatPhone(phone);
      const result = await requestOtp(formatted);
      setPhone(formatted);
      setDemoOtp(result.otp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const enter = async (demo = false) => {
    setLoading(true);
    setError("");
    try {
      const formatted = formatPhone(demo ? "+972501234567" : phone);
      const result = await verifyOtp(formatted, demo ? "123456" : otp);
      await setToken(result.token);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.authScreen}>
      <StatusBar style="light" />
      <View style={styles.brandMark}>
        <Text style={styles.brandLetter}>C</Text>
      </View>
      <Text style={styles.authTitle}>Campus</Text>
      <Text style={styles.authSub}>People, events, and chats around your campus.</Text>

      {step === "phone" ? (
        <View style={styles.form}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="05X-XXX-XXXX" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Get OTP" onPress={sendOtp} loading={loading} disabled={!phone.trim()} />
          <PrimaryButton label="Open demo" tone="secondary" onPress={() => enter(true)} loading={loading} />
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Verification code</Text>
          <Text style={styles.helper}>Sent to {phone}</Text>
          {demoOtp ? <Text style={styles.demoOtp}>Demo OTP: {demoOtp}</Text> : null}
          <TextInput value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" placeholderTextColor={colors.muted} keyboardType="number-pad" style={[styles.input, styles.otp]} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Enter app" onPress={() => enter(false)} loading={loading} disabled={otp.length !== 6} />
          <PrimaryButton label="Back" tone="secondary" onPress={() => setStep("phone")} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function PrimaryButton({ label, onPress, loading, disabled, tone = "primary" }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; tone?: "primary" | "secondary" | "danger" }) {
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, tone === "secondary" && styles.buttonSecondary, tone === "danger" && styles.buttonDanger, (pressed || disabled) && styles.buttonDisabled]}>
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

function Avatar({ name, color = colors.primary }: { name: string; color?: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}

function MainApp() {
  const [tab, setTab] = useState<"map" | "chats" | "profile">("map");
  return (
    <View style={styles.app}>
      {tab === "map" ? <MapScreen /> : tab === "chats" ? <ChatsScreen /> : <ProfileScreen />}
      <View style={styles.tabs}>
        <TabButton label="Map" active={tab === "map"} onPress={() => setTab("map")} />
        <TabButton label="Chats" active={tab === "chats"} onPress={() => setTab("chats")} />
        <TabButton label="Profile" active={tab === "profile"} onPress={() => setTab("profile")} />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MapScreen() {
  const [messages, setMessages] = useState<NearbyMessage[]>([]);
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [people, setPeople] = useState<NearbyUser[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [content, setContent] = useState("");
  const coords = { lat: 31.8, lng: 35.2 };

  const load = useCallback(async () => {
    const [nextMessages, nextEvents, nextUsers] = await Promise.all([
      getNearbyMessages(coords.lat, coords.lng),
      getNearbyEvents(coords.lat, coords.lng),
      getNearbyUsers(coords.lat, coords.lng)
    ]);
    setMessages(nextMessages);
    setEvents(nextEvents);
    setPeople(nextUsers);
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async () => {
    await pinMessage({ lat: coords.lat, lng: coords.lng, content });
    setContent("");
    setComposeOpen(false);
    await load();
  };

  const feed = [
    ...messages.map((item) => ({ kind: "message" as const, item })),
    ...events.map((item) => ({ kind: "event" as const, item }))
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Campus Map</Text>
          <Text style={styles.subtitle}>Live mobile preview</Text>
        </View>
        <Pressable style={styles.roundButton} onPress={() => setComposeOpen(true)}>
          <Text style={styles.roundButtonText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.mapCard}>
        <Text style={styles.mapKicker}>Campus center</Text>
        <Text style={styles.mapTitle}>Nearby activity</Text>
        <Text style={styles.mapCoords}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Text>
        <View style={styles.statRow}>
          <Stat label="Posts" value={messages.length} />
          <Stat label="Events" value={events.length} />
          <Stat label="People" value={people.length} />
        </View>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(row) => `${row.kind}-${row.item.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => item.kind === "message" ? <MessageCard message={item.item} /> : <EventCard event={item.item} />}
      />

      <Modal transparent visible={composeOpen} animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pin message</Text>
            <TextInput value={content} onChangeText={setContent} placeholder="What is happening here?" placeholderTextColor={colors.muted} multiline style={[styles.input, styles.textArea]} />
            <PrimaryButton label="Post" onPress={post} disabled={!content.trim()} />
            <PrimaryButton label="Cancel" tone="secondary" onPress={() => setComposeOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MessageCard({ message }: { message: NearbyMessage }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Avatar name={message.author?.displayName || "Campus"} color={message.author?.bannerColor || colors.primary} />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{message.author?.displayName || "Campus post"}</Text>
          <Text style={styles.cardMeta}>Pinned nearby</Text>
        </View>
      </View>
      <Text style={styles.cardBody}>{message.content}</Text>
    </View>
  );
}

function EventCard({ event }: { event: NearbyEvent }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{event.title}</Text>
      <Text style={styles.cardBody}>{event.description}</Text>
      <Text style={styles.cardMeta}>{event.rsvpCount} going</Text>
    </View>
  );
}

function ChatsScreen() {
  const [items, setItems] = useState<Conversation[]>([]);
  useEffect(() => {
    void getConversations().then(setItems);
  }, []);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Direct and group messages</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.chatRow}>
            <Avatar name={item.name} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.lastMessage}</Text>
            </View>
            {item.unreadCount ? <Text style={styles.unread}>{item.unreadCount}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

function ProfileScreen() {
  const { user, refresh, logout } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [title, setTitle] = useState(user?.title || "");
  const [ghost, setGhost] = useState(user?.visibility === "ghost");

  const save = async () => {
    await updateMe({ displayName: name, title, visibility: ghost ? "ghost" : "campus" });
    await refresh();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.profile}>
      <Avatar name={user?.displayName || "Campus"} color={user?.bannerColor || colors.primary} />
      <Text style={styles.title}>{user?.displayName || "Campus Student"}</Text>
      <Text style={styles.subtitle}>{user?.phone}</Text>
      <Text style={styles.label}>Display name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Student, club lead..." placeholderTextColor={colors.muted} style={styles.input} />
      <View style={styles.switchRow}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Ghost mode</Text>
          <Text style={styles.cardMeta}>Hide your position from nearby users.</Text>
        </View>
        <Switch value={ghost} onValueChange={setGhost} />
      </View>
      <PrimaryButton label="Save profile" onPress={save} />
      <PrimaryButton label="Log out" tone="danger" onPress={logout} />
    </ScrollView>
  );
}

function Root() {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return token ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md
  },
  brandMark: {
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: "#214b86",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  brandLetter: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 38
  },
  authTitle: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center"
  },
  authSub: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 17,
    marginBottom: spacing.xl
  },
  form: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15
  },
  helper: {
    color: colors.muted
  },
  demoOtp: {
    color: colors.accent,
    fontWeight: "900"
  },
  error: {
    color: colors.danger
  },
  input: {
    minHeight: 58,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16
  },
  otp: {
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "900"
  },
  button: {
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border
  },
  buttonDanger: {
    backgroundColor: colors.danger
  },
  buttonDisabled: {
    opacity: 0.58
  },
  buttonText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 17
  },
  app: {
    flex: 1,
    backgroundColor: colors.background
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    padding: spacing.xl,
    paddingTop: 52,
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
    marginTop: 4
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  roundButtonText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: -2
  },
  mapCard: {
    marginHorizontal: spacing.xl,
    minHeight: 260,
    borderRadius: radius.lg,
    backgroundColor: "#10213a",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  mapKicker: {
    color: colors.accent,
    fontWeight: "900"
  },
  mapTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  mapCoords: {
    color: colors.muted,
    marginTop: spacing.sm
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  stat: {
    minWidth: 86,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    padding: spacing.md
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12
  },
  list: {
    padding: spacing.xl,
    gap: spacing.md
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  cardText: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 16
  },
  cardMeta: {
    color: colors.muted,
    marginTop: 3
  },
  cardBody: {
    color: colors.text,
    lineHeight: 22
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 18
  },
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingVertical: spacing.lg
  },
  chatRow: {
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md
  },
  unread: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.text,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "900"
  },
  profile: {
    padding: spacing.xl,
    paddingTop: 54,
    gap: spacing.md,
    alignItems: "stretch"
  },
  switchRow: {
    minHeight: 82,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg
  },
  tabs: {
    height: 78,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: colors.primary
  },
  tabText: {
    color: colors.muted,
    fontWeight: "800"
  },
  tabTextActive: {
    color: colors.text
  },
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  }
});
