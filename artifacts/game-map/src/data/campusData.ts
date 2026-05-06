import type { GamePoint, ZonePolygon, Building, MapBounds } from "../types/map";

export const MAP_CENTER: [number, number] = [31.668, 34.574];
export const MAP_ZOOM = 18;

export const MAP_BOUNDS: MapBounds = {
  north: 31.668 + 0.012,
  south: 31.668 - 0.012,
  east: 34.574 + 0.014,
  west: 34.574 - 0.014,
};

export const INITIAL_GAME_POINTS: GamePoint[] = [
  {
    id: "gp-001",
    name: "כניסה ראשית",
    type: "admin",
    lat: 31.6685,
    lng: 34.5745,
    description: "כניסה ראשית לקמפוס",
    priority: 1,
  },
  {
    id: "gp-002",
    name: "אירוע: חוג ספורט",
    type: "event",
    lat: 31.6692,
    lng: 34.5752,
    description: "אירוע ספורט פתוח לכולם - 18:00",
    priority: 2,
  },
  {
    id: "gp-003",
    name: "פוסט: אובדת ארנקת",
    type: "post",
    lat: 31.6678,
    lng: 34.5738,
    description: "נמצאה ארנקת שחורה ליד הספרייה",
    priority: 3,
  },
  {
    id: "gp-004",
    name: "שומר: דן",
    type: "npc",
    lat: 31.6682,
    lng: 34.5760,
    description: "שומר קמפוס, משמרת בוקר",
    priority: 4,
  },
  {
    id: "gp-005",
    name: "אזור: ספרייה",
    type: "zone",
    lat: 31.6675,
    lng: 34.5748,
    description: "אזור ספרייה - שקט נדרש",
    priority: 2,
  },
  {
    id: "gp-006",
    name: "אירוע: הרצאת אורח",
    type: "event",
    lat: 31.6688,
    lng: 34.5735,
    description: "הרצאה על AI - אולם 301",
    priority: 2,
  },
  {
    id: "gp-007",
    name: "פוסט: הסעות",
    type: "post",
    lat: 31.6695,
    lng: 34.5742,
    description: "שינוי בזמני ההסעות לאשדוד",
    priority: 3,
  },
];

export const INITIAL_ZONES: ZonePolygon[] = [
  {
    id: "zone-001",
    name: "בניין מדעים",
    description: "בניין ראשי למדעים ומחשבים",
    color: "#00f5ff",
    coordinates: [
      [31.6690, 34.5740],
      [31.6695, 34.5740],
      [31.6695, 34.5750],
      [31.6690, 34.5750],
    ],
  },
  {
    id: "zone-002",
    name: "אזור ספורט",
    description: "מגרשי ספורט וחדר כושר",
    color: "#ff0080",
    coordinates: [
      [31.6672, 34.5755],
      [31.6680, 34.5755],
      [31.6680, 34.5768],
      [31.6672, 34.5768],
    ],
  },
  {
    id: "zone-003",
    name: "גן קמפוס",
    description: "שטח ירוק מרכזי",
    color: "#7fff00",
    coordinates: [
      [31.6681, 34.5742],
      [31.6685, 34.5742],
      [31.6685, 34.5752],
      [31.6681, 34.5752],
    ],
  },
];

export const INITIAL_BUILDINGS: Building[] = [
  {
    id: "bld-001",
    name: "בניין A - מינהל",
    type: "admin",
    lat: 31.6685,
    lng: 34.5744,
    description: "רקטוראט, כספים, מזכירות",
    floor: 4,
  },
  {
    id: "bld-002",
    name: "בניין B - הנדסה",
    type: "academic",
    lat: 31.6692,
    lng: 34.5748,
    description: "מעבדות, כיתות, חדרי צוות",
    floor: 6,
  },
  {
    id: "bld-003",
    name: "ספרייה",
    type: "academic",
    lat: 31.6676,
    lng: 34.5748,
    description: "ספרייה מרכזית, קומות 1-3",
    floor: 3,
  },
  {
    id: "bld-004",
    name: "חדר אוכל",
    type: "dining",
    lat: 31.6688,
    lng: 34.5735,
    description: "קפיטריה ומסדרון סטודנטים",
    floor: 1,
  },
];
