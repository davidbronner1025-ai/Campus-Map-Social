export type UserProfile = {
  id: number;
  phone: string;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bannerColor: string;
  visibility: "campus" | "ghost";
  lat: number | null;
  lng: number | null;
  lastSeen: string | null;
};

export type NearbyUser = {
  id: number;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  bannerColor: string;
  visibility: string;
  lat: number;
  lng: number;
  lastSeen: string | null;
  active: boolean;
};

export type NearbyMessage = {
  id: number;
  userId: number;
  lat: number;
  lng: number;
  content: string;
  type: "regular" | "invitation";
  invitationType: "smoke" | "carpool" | "phone_game" | "food_order" | "football" | null;
  maxParticipants: number | null;
  expiresAt: string | null;
  createdAt: string;
  author: { id: number; displayName: string; title: string | null; avatarUrl: string | null; bannerColor: string } | null;
  reactions: { id: number; userId: number; type: "yes" | "no" | "emoji"; emoji: string | null }[];
  replyCount: number;
};

export type NearbyEvent = {
  id: number;
  creatorId: number;
  locationId: number | null;
  title: string;
  description: string | null;
  category: "study_group" | "party" | "sports" | "club_meeting" | "food" | "other";
  lat: number;
  lng: number;
  startsAt: string;
  maxParticipants: number | null;
  createdAt: string;
  creator: { id: number; displayName: string; avatarUrl: string | null; bannerColor: string } | null;
  rsvpCount: number;
  rsvps: { id: number; userId: number; displayName: string | null; avatarUrl: string | null }[];
  distance: number;
};

export type CampusLocation = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  color: string;
  lat: number;
  lng: number;
  polygon: { lat: number; lng: number }[];
  adminName: string | null;
  managerName: string | null;
};

export type ConversationListItem = {
  id: number;
  type: "direct" | "group";
  name: string | null;
  creatorId: number | null;
  createdAt: string;
  updatedAt: string;
  members: { userId: number; displayName: string | null; avatarUrl: string | null; bannerColor: string | null }[];
  lastMessage: { id: number; content: string; messageType: "text" | "location"; senderId: number; createdAt: string } | null;
  unreadCount: number;
};

export type ChatMsg = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: "text" | "location";
  lat: number | null;
  lng: number | null;
  createdAt: string;
  senderName: string;
  senderAvatar: string | null;
  senderBannerColor: string;
};

export type AppNotification = {
  id: number;
  userId: number;
  type: "reaction" | "reply" | "event_join" | "nearby_event" | "chat_message";
  referenceId: number | null;
  referenceType: "message" | "event" | "conversation" | null;
  content: string;
  read: boolean;
  createdAt: string;
};
