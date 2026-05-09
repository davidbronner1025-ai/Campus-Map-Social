import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import type { CampusLocation, NearbyEvent, NearbyMessage, NearbyUser } from "../api/types";
import { colors } from "../theme";

type Props = {
  coords: { lat: number; lng: number };
  messages: NearbyMessage[];
  events: NearbyEvent[];
  people: NearbyUser[];
  locations: CampusLocation[];
};

export function CampusMap({ coords, messages, events, people, locations }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
      region={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
      showsUserLocation
      showsMyLocationButton={false}
    >
      {locations.map((loc) => (
        <Polygon
          key={loc.id}
          coordinates={loc.polygon.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
          strokeColor={loc.color}
          fillColor={`${loc.color}33`}
          strokeWidth={2}
        />
      ))}
      {messages.map((message) => (
        <Marker key={`m-${message.id}`} coordinate={{ latitude: message.lat, longitude: message.lng }} title={message.author?.displayName || "Message"} description={message.content} pinColor={colors.accent} />
      ))}
      {events.map((event) => (
        <Marker key={`e-${event.id}`} coordinate={{ latitude: event.lat, longitude: event.lng }} title={event.title} description={event.startsAt} pinColor={colors.success} />
      ))}
      {people.map((user) => (
        <Marker key={`u-${user.id}`} coordinate={{ latitude: user.lat, longitude: user.lng }} title={user.displayName} description={user.title || "Nearby"} pinColor={colors.primary} />
      ))}
    </MapView>
  );
}
