import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MapScreen } from "../screens/MapScreen";
import { ChatsScreen } from "../screens/ChatsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme";

export type TabParamList = {
  Map: undefined;
  Chats: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8
        },
        tabBarIcon: ({ color, size }) => {
          const icon = route.name === "Map" ? "map" : route.name === "Chats" ? "chatbubbles" : "person-circle";
          return <Ionicons name={icon} color={color} size={size} />;
        }
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
