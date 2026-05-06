import type { GamePoint, ZonePolygon, Building, MapBounds } from "../types/map";

export const CAMPUS_NAME = "מכללת אשקלון";
export const MAP_CENTER: [number, number] = [31.782403, 34.699208];
export const MAP_ZOOM = 18;

export const MAP_BOUNDS: MapBounds = {
  north: 31.782403 + 0.013,
  south: 31.782403 - 0.013,
  east: 34.699208 + 0.015,
  west: 34.699208 - 0.015,
};

export const INITIAL_GAME_POINTS: GamePoint[] = [
  {
    id: "gp-001",
    name: "כניסה ראשית",
    type: "admin",
    lat: 31.7824,
    lng: 34.6992,
    description: "כניסה ראשית למכללת אשקלון",
    priority: 1,
  },
  {
    id: "gp-002",
    name: "אירוע: חוג ספורט",
    type: "event",
    lat: 31.7831,
    lng: 34.6998,
    description: "אירוע ספורט פתוח לכולם - 18:00",
    priority: 2,
  },
  {
    id: "gp-003",
    name: "פוסט: אובדת ארנקת",
    type: "post",
    lat: 31.7818,
    lng: 34.6983,
    description: "נמצאה ארנקת שחורה ליד הספרייה",
    priority: 3,
  },
  {
    id: "gp-004",
    name: "שומר: דן",
    type: "npc",
    lat: 31.7820,
    lng: 34.7005,
    description: "שומר קמפוס, משמרת בוקר",
    priority: 4,
  },
  {
    id: "gp-005",
    name: "ספרייה",
    type: "zone",
    lat: 31.7815,
    lng: 34.6995,
    description: "אזור ספרייה - שקט נדרש",
    priority: 2,
  },
  {
    id: "gp-006",
    name: "אירוע: הרצאת אורח",
    type: "event",
    lat: 31.7828,
    lng: 34.6980,
    description: "הרצאה על AI - אולם 301",
    priority: 2,
  },
  {
    id: "gp-007",
    name: "פוסט: הסעות",
    type: "post",
    lat: 31.7835,
    lng: 34.6988,
    description: "שינוי בזמני ההסעות לאשדוד",
    priority: 3,
  },
];

export const INITIAL_ZONES: ZonePolygon[] = [
  {
    id: "zone-001",
    name: "בניין מדעים",
    description: "בניין ראשי למדעים ומחשבים",
    color: "#2563eb",
    coordinates: [
      [31.7830, 34.6985],
      [31.7836, 34.6985],
      [31.7836, 34.6996],
      [31.7830, 34.6996],
    ],
  },
  {
    id: "zone-002",
    name: "אזור ספורט",
    description: "מגרשי ספורט וחדר כושר",
    color: "#dc2626",
    coordinates: [
      [31.7812, 34.7000],
      [31.7820, 34.7000],
      [31.7820, 34.7012],
      [31.7812, 34.7012],
    ],
  },
  {
    id: "zone-003",
    name: "גן קמפוס",
    description: "שטח ירוק מרכזי",
    color: "#16a34a",
    coordinates: [
      [31.7820, 34.6988],
      [31.7826, 34.6988],
      [31.7826, 34.6998],
      [31.7820, 34.6998],
    ],
  },
];

export const INITIAL_BUILDINGS: Building[] = [
  {
    id: "bld-001",
    name: "בניין A - מינהל",
    type: "admin",
    lat: 31.7824,
    lng: 34.6990,
    description: "רקטוראט, כספים, מזכירות",
    floor: 4,
  },
  {
    id: "bld-002",
    name: "בניין B - הנדסה",
    type: "academic",
    lat: 31.7831,
    lng: 34.6996,
    description: "מעבדות, כיתות, חדרי צוות",
    floor: 6,
  },
  {
    id: "bld-003",
    name: "ספרייה",
    type: "academic",
    lat: 31.7816,
    lng: 34.6995,
    description: "ספרייה מרכזית, קומות 1-3",
    floor: 3,
  },
  {
    id: "bld-004",
    name: "חדר אוכל",
    type: "dining",
    lat: 31.7828,
    lng: 34.6980,
    description: "קפיטריה ומסדרון סטודנטים",
    floor: 1,
  },
];
