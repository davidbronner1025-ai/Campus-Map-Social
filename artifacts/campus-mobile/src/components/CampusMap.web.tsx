import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CampusLocation, NearbyEvent, NearbyMessage, NearbyUser } from "../api/types";
import { colors, spacing } from "../theme";

type Props = {
  coords: { lat: number; lng: number };
  messages: NearbyMessage[];
  events: NearbyEvent[];
  people: NearbyUser[];
  locations: CampusLocation[];
};

export function CampusMap({ coords, messages, events, people, locations }: Props) {
  return (
    <View style={styles.webMap}>
      <Text style={styles.kicker}>Web preview</Text>
      <Text style={styles.title}>Campus activity map</Text>
      <Text style={styles.coords}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Text>
      <View style={styles.statsRow}>
        <Stat label="Posts" value={messages.length} />
        <Stat label="Events" value={events.length} />
        <Stat label="People" value={people.length} />
        <Stat label="Places" value={locations.length} />
      </View>
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

const styles = StyleSheet.create({
  webMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "#10213a"
  },
  kicker: {
    color: colors.accent,
    fontWeight: "800",
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  coords: {
    color: colors.muted,
    marginTop: 8
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  stat: {
    minWidth: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    alignItems: "center"
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  }
});
