import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { updateMe } from "../api/client";
import { Avatar } from "../components/Avatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../state/AuthContext";
import { colors, radius, spacing } from "../theme";

export function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [title, setTitle] = useState(user?.title || "");
  const [ghost, setGhost] = useState(user?.visibility === "ghost");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMe({ displayName, title, visibility: ghost ? "ghost" : "campus" });
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={user?.displayName} color={user?.bannerColor} size={82} />
        <Text style={styles.title}>{user?.displayName || "Campus user"}</Text>
        <Text style={styles.subtitle}>{user?.phone}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Display name</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} />

        <Text style={styles.label}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Student, mentor, club lead..." placeholderTextColor={colors.muted} style={styles.input} />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Ghost mode</Text>
            <Text style={styles.switchHelp}>Hide your position from nearby users.</Text>
          </View>
          <Switch value={ghost} onValueChange={setGhost} trackColor={{ true: colors.primarySoft, false: colors.surfaceHigh }} thumbColor={ghost ? colors.primary : colors.muted} />
        </View>

        <PrimaryButton label="Save profile" onPress={save} loading={saving} />
        <PrimaryButton label="Log out" tone="danger" onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    marginTop: spacing.md
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontWeight: "800"
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    fontSize: 16
  },
  switchRow: {
    minHeight: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  switchTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 16
  },
  switchHelp: {
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20
  }
});
