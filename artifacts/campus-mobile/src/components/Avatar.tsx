import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function Avatar({ name, color, size = 42 }: { name?: string | null; color?: string | null; size?: number }) {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || colors.primarySoft }]}>
      <Text style={[styles.initial, { fontSize: Math.max(14, size * 0.38) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)"
  },
  initial: {
    color: colors.text,
    fontWeight: "800"
  }
});
