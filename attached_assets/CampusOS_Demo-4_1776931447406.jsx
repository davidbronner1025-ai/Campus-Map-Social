import React, { useState, useEffect, useRef } from "react";

// ─── FLOOR DATA PER BUILDING ──────────────────────────────────────────────────
var FLOOR_DATA = {
  A: [
    {
      floor: 1, label: "כניסה ומנהלה",
      rooms: [
          { name: "קבלה ומנהלה", room: "101", type: "admin" },
          { name: "מעבדת מחשבים א", room: "102", type: "lab" },
          { name: "שירותים", room: "103", type: "wc" },
      ],
      events: [{ time: "14:00", name: "תכנות מערכות", prof: "פרופ׳ גולן", room: "102" }],
    },
    {
      floor: 2, label: "כיתות ומדפסות",
      rooms: [
          { name: "כיתה 201", room: "201", type: "class" },
          { name: "כיתה 204", room: "204", type: "class" },
          { name: "מדפסות + מכונות", room: "210", type: "service" },
      ],
      events: [{ time: "10:00", name: "אלגוריתמים", prof: "ד\"ר כהן", room: "204" }],
    },
    {
      floor: 3, label: "כיתות מחקר",
      rooms: [
          { name: "כיתה 301", room: "301", type: "class" },
          { name: "כיתה 310", room: "310", type: "class" },
          { name: "חדר מחקר", room: "315", type: "lab" },
      ],
      events: [
          { time: "08:00", name: "מתמטיקה דיסקרטית", prof: "פרופ׳ לוי", room: "301" },
          { time: "12:00", name: "מבנה נתונים", prof: "ד\"ר שרון", room: "310" },
      ],
    },
    {
      floor: 4, label: "חדר שקט + מחקר",
      rooms: [
          { name: "חדר שקט", room: "401", type: "quiet" },
          { name: "מעבדת ML", room: "205", type: "lab" },
      ],
      events: [{ time: "16:00", name: "למידת מכונה", prof: "ד\"ר מזרחי", room: "205" }],
    },
  ],
  B: [
    {
      floor: 1, label: "עיון וקבוצות",
      rooms: [
              { name: "אזור קריאה פתוח", room: "—", type: "quiet" },
              { name: "חדר קבוצות א", room: "G1", type: "class" },
              { name: "מדפסת צבע", room: "—", type: "service" },
      ],
      available: 12,
    },
    {
      floor: 2, label: "עבודה שקטה",
      rooms: [
              { name: "אזור שקט מלא", room: "—", type: "quiet" },
              { name: "תאי עבודה", room: "—", type: "quiet" },
      ],
      available: 8,
    },
    {
      floor: 3, label: "חדרים פרטיים",
      rooms: [
              { name: "חדר פרטי א-ה", room: "301-305", type: "quiet" },
      ],
      available: 5,
    },
  ],
  C: [
    {
      floor: 1, label: "מסעדה ראשית",
      rooms: [
              { name: "אולם אוכל ראשי", room: "—", type: "class" },
              { name: "קופות", room: "—", type: "service" },
              { name: "מזנון קפה", room: "—", type: "service" },
      ],
      waitTime: 8,
    },
  ],
  D: [
    { floor: 1, label: "כניסה ורישום", rooms: [{ name: "מדור רישום", room: "102", type: "admin" }], events: [{ time: "11:00", name: "שעת קבלה — רישום", room: "102" }] },
    { floor: 2, label: "ייעוץ אקדמי", rooms: [{ name: "ייעוץ", room: "210", type: "admin" }], events: [{ time: "15:00", name: "ייעוץ אקדמי", room: "210" }] },
    { floor: 3, label: "מועצת סטודנטים", rooms: [{ name: "חדר אגוד", room: "305", type: "class" }], events: [{ time: "17:00", name: "מועצת סטודנטים", room: "305" }] },
    { floor: 4, label: "מחלקות מנהל", rooms: [{ name: "שכר לימוד", room: "401", type: "admin" }], events: [] },
    { floor: 5, label: "ועדות והנהלה", rooms: [{ name: "חדר ועדות", room: "501", type: "admin" }], events: [{ time: "09:00", name: "ועדת הוראה", room: "501" }] },
  ],
  E: [
    { floor: 1, label: "מגרשים ובריכה", rooms: [{ name: "מגרש כדורסל", room: "—", type: "lab" }, { name: "בריכה", room: "—", type: "lab" }, { name: "מגרש טניס", room: "—", type: "lab" }], events: [{ time: "16:00", name: "טורניר פינג-פונג", room: "—" }] },
    { floor: 2, label: "חדר כושר + פינג-פונג", rooms: [{ name: "חדר כושר", room: "—", type: "lab" }, { name: "חדר פינג-פונג", room: "—", type: "lab" }], events: [{ time: "18:00", name: "אימון כדורסל", room: "—" }] },
  ],
  F: [
    { floor: 1, label: "לובי ושירותים", rooms: [{ name: "לובי", room: "—", type: "service" }, { name: "מכונות כביסה", room: "—", type: "service" }, { name: "מטבח משותף", room: "—", type: "service" }], notes: "ניקיון יום חמישי 10:00" },
    { floor: 2, label: "חדרים 201-210", rooms: [{ name: "10 חדרים", room: "201-210", type: "quiet" }], notes: "" },
    { floor: 3, label: "חדרים 301-310", rooms: [{ name: "10 חדרים", room: "301-310", type: "quiet" }], notes: "" },
    { floor: 4, label: "חדרים 401-410", rooms: [{ name: "10 חדרים", room: "401-410", type: "quiet" }], notes: "" },
    { floor: 5, label: "חדרים 501-510", rooms: [{ name: "10 חדרים", room: "501-510", type: "quiet" }], notes: "" },
    { floor: 6, label: "גג + חדר לימוד", rooms: [{ name: "חדר לימוד גג", room: "601", type: "quiet" }, { name: "מרפסת גג", room: "—", type: "service" }], notes: "גישה מוגבלת" },
  ],
};

// ─── BUILDINGS ────────────────────────────────────────────────────────────────
var BUILDINGS = [
  { id: "A", name: "בניין מדעים", short: "מדעים", x: 22, y: 28, w: 14, h: 18, floors: 4, density: 0.82, issues: 2, col: "#4A9EFF", icon: "🔬" },
  { id: "B", name: "ספרייה מרכזית", short: "ספרייה", x: 63, y: 18, w: 20, h: 14, floors: 3, density: 0.91, issues: 1, col: "#A8E6CF", icon: "📚" },
  { id: "C", name: "חדר אוכל", short: "אוכל", x: 38, y: 60, w: 16, h: 12, floors: 1, density: 0.6, issues: 0, col: "#FFB347", icon: "🍽️" },
  { id: "D", name: "בניין ראשי", short: "ראשי", x: 36, y: 28, w: 12, h: 20, floors: 5, density: 0.45, issues: 0, col: "#CE93D8", icon: "🏛️" },
  { id: "E", name: "מרכז ספורט", short: "ספורט", x: 72, y: 60, w: 18, h: 14, floors: 2, density: 0.38, issues: 1, col: "#FF8A65", icon: "⚽" },
  { id: "F", name: "מעונות", short: "מעונות", x: 14, y: 62, w: 12, h: 16, floors: 6, density: 0.2, issues: 0, col: "#80DEEA", icon: "🏠" },
];

var FRIENDS = [
  { name: "יונתן", av: "YK", bid: "B", floor: 3, status: "ספרייה קומה 3", active: true, color: "#FF6B6B" },
  { name: "מאיה", av: "MY", bid: "C", floor: 1, status: "חדר אוכל", active: true, color: "#A8E6CF" },
  { name: "תום", av: "TR", bid: null, floor: null, status: "Ghost Mode", active: false, color: "#778" },
  { name: "ליאת", av: "LT", bid: "A", floor: 2, status: "מדעים קומה 2", active: true, color: "#FFB347" },
  { name: "אור", av: "OR", bid: "E", floor: 1, status: "ספורט", active: true, color: "#CE93D8" },
];

var REPORTS = [
  { id: 1, b: "A", floor: 3, cat: "מזגן תקול", status: "בטיפול", t: "לפני שעה", pub: true, col: "#FFB347" },
  { id: 2, b: "B", floor: 1, cat: "נייר טואלט חסר", status: "פתוח", t: "לפני 20 דק׳", pub: false, col: "#FF6B6B" },
  { id: 3, b: "E", floor: 1, cat: "תאורה שבורה", status: "טופל", t: "לפני 3 שעות", pub: true, col: "#A8E6CF" },
];

var LOCATION_CHATS = {
  A: [
    { id: 1, u: "דנה כ.", av: "DK", text: "מישהו יודע מה עם המזגן בקומה 3?", t: "14:22", mine: false },
    { id: 2, u: "עומר ש.", av: "OS", text: "דיווחתי, אמרו שיטפלו", t: "14:23", mine: false },
    { id: 3, u: "את/ה", av: "ME", text: "תודה! 🙏", t: "14:24", mine: true },
  ],
  B: [
    { id: 1, u: "רון מ.", av: "RM", text: "קומה 2 פקוקה, קומה 3 שקטה", t: "13:10", mine: false },
    { id: 2, u: "את/ה", av: "ME", text: "הולך/ת לקומה 3!", t: "13:15", mine: true },
  ],
  C: [{ id: 1, u: "נועה ב.", av: "NB", text: "יש שניצל! 🎉", t: "12:01", mine: false }],
  D: [{ id: 1, u: "תמר פ.", av: "TP", text: "מישהו יודע איפה הייעוץ?", t: "11:00", mine: false }],
  E: [{ id: 1, u: "גיל ש.", av: "GS", text: "חדר הכושר ריק! 💪", t: "09:15", mine: false }],
  F: [{ id: 1, u: "הנהלה", av: "MN", text: "ניקיון יום חמישי 10:00", t: "08:00", mine: false }],
};

var PULSE_ITEMS = [
  { icon: "🍽️", text: "חדר אוכל: תור ~8 דקות — שניצל היום!" },
  { icon: "📚", text: "ספרייה: 8 מקומות בלבד — מהרו" },
  { icon: "⚽", text: "מגרש כדורסל: עומס 75% — מגרש טניס פנוי" },
  { icon: "🔔", text: "פרופ׳ לוי הגיע לבניין מדעים" },
  { icon: "🎯", text: "הרצאת אורח 13:00 — אולם ראשי" },
];

var PRIVATE_CHATS = [
  { id: "p1", name: "יונתן כ.", av: "YK", last: "מה שלומך?", t: "14:55", unread: 2, online: true, msgs: [{ id: 1, u: "יונתן", av: "YK", text: "היי! מה שלומך?", t: "14:50", mine: false }, { id: 2, u: "את/ה", av: "ME", text: "טוב! בספרייה קומה 3", t: "14:52", mine: true }] },
  { id: "p2", name: "מאיה ל.", av: "MY", last: "אפשר את הסיכום?", t: "13:30", unread: 0, online: true, msgs: [{ id: 1, u: "מאיה", av: "MY", text: "אפשר לשלוח את הסיכום?", t: "13:30", mine: false }] },
  { id: "p3", name: "תום ר.", av: "TR", last: "נפגשים אחרי שיעור?", t: "12:10", unread: 1, online: false, msgs: [] },
  { id: "p4", name: "קבוצת מדמח ב׳", av: "קב", last: "מי פתר שאלה 3?", t: "11:00", unread: 5, online: true, group: true, msgs: [{ id: 1, u: "שיר", av: "SR", text: "מי פתר שאלה 3?", t: "11:00", mine: false }] },
];

// ─── SHOPS DATA ───────────────────────────────────────────────────────────────
var SHOPS = [
  {
    id: "s1", name: "קפה הקמפוס", icon: "☕", x: 105, y: 20, col: "#FFB347",
    discount: "10% הנחה לסטודנטים עם תעודה",
    hours: "07:00–20:00",
    menu: [
      { name: "אספרסו", price: "₪12", tag: "פופולרי" },
      { name: "קפה קר", price: "₪16" },
      { name: "קפה חלב", price: "₪18" },
      { name: "קרואסון", price: "₪14" },
      { name: "מאפה יום", price: "₪10", tag: "מבצע" },
    ],
  },
  {
    id: "s2", name: "ספרי הדעת", icon: "📖", x: 115, y: 20, col: "#A8E6CF",
    discount: "15% הנחה על ספרי לימוד עם אישור מהמוסד",
    hours: "09:00–19:00",
    menu: [
      { name: "ספרי לימוד מדעים", price: "₪120–₪280" },
      { name: "ספרי הנדסה", price: "₪90–₪240" },
      { name: "כלי כתיבה", price: "₪5–₪40" },
      { name: "מחברות ויומנים", price: "₪20–₪60" },
      { name: "מדפסת תרמית", price: "₪180", tag: "מבצע שבועי" },
    ],
  },
  {
    id: "s3", name: "פיצה סטודנט", icon: "🍕", x: 105, y: 10, col: "#FF8A65",
    discount: "פיצה אישית ב-₪25 בלבד בין 11:00-14:00",
    hours: "10:00–23:00",
    menu: [
      { name: "פיצה אישית", price: "₪25", tag: "בצהריים" },
      { name: "פיצה משפחתית", price: "₪72" },
      { name: "פיצה טבעונית", price: "₪68", tag: "חדש" },
      { name: "קלזונה", price: "₪38" },
      { name: "שתייה קלה", price: "₪8" },
    ],
  },
  {
    id: "s4", name: "בית מרקחת", icon: "💊", x: 115, y: 10, col: "#80DEEA",
    discount: "מרשמים של קופות חולים ללא המתנה",
    hours: "08:00–21:00",
    menu: [
      { name: "תרופות ללא מרשם", price: "₪20–₪80" },
      { name: "ויטמינים", price: "₪35–₪120" },
      { name: "מוצרי היגיינה", price: "₪10–₪60" },
      { name: "מדידת לחץ דם", price: "חינם", tag: "שירות" },
      { name: "ייעוץ פרמצבטי", price: "חינם", tag: "שירות" },
    ],
  },
  {
    id: "s5", name: "בנק הדואר", icon: "🏦", x: 105, y: 86, col: "#CE93D8",
    discount: "פתיחת חשבון לסטודנטים ללא עמלה לשנתיים",
    hours: "08:30–14:00",
    menu: [
      { name: "חשבון עו\"ש סטודנט", price: "ללא עמלה 2 שנים", tag: "מיוחד" },
      { name: "כרטיס אשראי", price: "ללא דמי כרטיס", tag: "מיוחד" },
      { name: "העברת כספים", price: "₪5 לפעולה" },
      { name: "הפקדת צ\'קים", price: "חינם" },
    ],
  },
  {
    id: "s6", name: "מיני סופר", icon: "🛒", x: 115, y: 86, col: "#4A9EFF",
    discount: "5% הנחה על עגלה מעל ₪80 עם כרטיס סטודנט",
    hours: "07:00–23:00",
    menu: [
      { name: "מוצרי בסיס", price: "₪3–₪30" },
      { name: "פירות וירקות", price: "₪5–₪25" },
      { name: "חטיפים ומתוקים", price: "₪5–₪20" },
      { name: "שתייה קלה", price: "₪7–₪14" },
      { name: "מוצרי חלב", price: "₪8–₪25" },
    ],
  },
  {
    id: "s7", name: "מסעדת הנגב", icon: "🍔", x: 125, y: 86, col: "#FF6B6B",
    discount: "מנה ראשונה חינם בהזמנה מעל ₪60 בשעות 12:00-15:00",
    hours: "11:00–22:00",
    menu: [
      { name: "המבורגר קלאסי", price: "₪52", tag: "הכי נמכר" },
      { name: "המבורגר טבעוני", price: "₪58" },
      { name: "שניצל עם תוספות", price: "₪48" },
      { name: "סלט גדול", price: "₪38" },
      { name: "עוגה יומית", price: "₪22", tag: "ביתי" },
    ],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function dColor(d) { return d > 0.75 ? "#FF6B6B" : d > 0.5 ? "#FFB347" : "#A8E6CF"; }
function dLabel(d) { return d > 0.75 ? "עמוס מאוד" : d > 0.5 ? "עמוס" : d > 0.25 ? "בינוני" : "שקט"; }

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Av(props) {
  var sz = props.size || 36;
  return (
    <div style={{ width: sz, height: sz, borderRadius: "50%", background: props.color || "#1B3A6B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.34, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {props.initials}
    </div>
  );
}

function Badge(props) {
  return (
    <span style={{ background: props.color + "22", color: props.color, border: "1px solid " + props.color + "55", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
      {props.label}
    </span>
  );
}

function Bubble(props) {
  var m = props.msg;
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: m.mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
      {!m.mine && <Av initials={m.av} size={26} color="#1e3a5f" />}
      <div>
        {!m.mine && <div style={{ color: "#556", fontSize: 10, marginBottom: 2 }}>{m.u}</div>}
        <div style={{ background: m.mine ? "#1B3A6B" : "#0d2040", border: "1px solid " + (m.mine ? "#2E5FA3" : "#1e3a5f"), borderRadius: m.mine ? "11px 11px 2px 11px" : "11px 11px 11px 2px", padding: "6px 10px", color: "#E8F4FF", fontSize: 13, maxWidth: 200 }}>
          {m.text}
        </div>
        <div style={{ color: "#445", fontSize: 10, marginTop: 2, textAlign: m.mine ? "right" : "left" }}>{m.t}</div>
      </div>
    </div>
  );
}

// ─── MAP SCREEN ───────────────────────────────────────────────────────────────
function MapScreen(props) {
  var onBuilding = props.onBuilding;
  var onShop = props.onShop;
  var hovState = useState(null);
  var hovered = hovState[0];
  var setHovered = hovState[1];
  var hovShopState = useState(null);
  var hovShop = hovShopState[0];
  var setHovShop = hovShopState[1];
  var piState = useState(0);
  var pi = piState[0];
  var setPi = piState[1];
  var friendsVisState = useState(true);
  var friendsVisible = friendsVisState[0];
  var setFriendsVisible = friendsVisState[1];

  useEffect(function() {
    var t = setInterval(function() { setPi(function(p) { return (p + 1) % PULSE_ITEMS.length; }); }, 3200);
    return function() { clearInterval(t); };
  }, []);

  var pulse = PULSE_ITEMS[pi];

  var HEAT_DOTS = {
    A: [[25,32],[27,35],[29,30],[24,37],[30,34],[26,40],[28,38]],
    B: [[68,22],[72,20],[74,24],[70,26],[66,25],[73,28]],
    C: [[42,62],[45,65],[40,64],[44,67],[47,63],[43,69]],
    D: [[39,33],[41,30],[38,36],[43,35],[40,38]],
    E: [[76,63],[80,65],[82,62],[78,68],[75,66]],
    F: [[17,65],[19,68],[16,70],[20,72]],
  };

  function buildFloorLines(b) {
    var lines = [];
    for (var fi = 1; fi < b.floors; fi++) {
      lines.push(
        React.createElement("line", {key:"fl"+fi, x1:b.x+1, y1:b.y+b.h*fi/b.floors, x2:b.x+b.w-1, y2:b.y+b.h*fi/b.floors, stroke:b.col, strokeWidth:"0.18", opacity:"0.35"})
      );
    }
    return lines;
  }

  function buildWindows(b) {
    if (b.w < 10) return [];
    var rects = [];
    var cols = Math.min(3, Math.floor(b.w / 5));
    var rows = Math.min(b.floors, 3);
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        rects.push(
          React.createElement("rect", {key:"w"+row+col, x:b.x+2+col*((b.w-4)/cols), y:b.y+2+row*(b.h/b.floors), width:"2.2", height:"1.4", rx:"0.3", fill:b.col, opacity:"0.22"})
        );
      }
    }
    return rects;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#04080f", borderBottom: "1px solid #1a2d44", padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>{pulse.icon}</span>
        <span style={{ color: "#89bcd4", fontSize: 12, flex: 1 }}>{pulse.text}</span>
        <button onClick={function() { setFriendsVisible(function(v) { return !v; }); }} style={{ background: friendsVisible ? "#1B3A6B" : "#0a1828", border: "1px solid "+(friendsVisible?"#4A9EFF":"#1e3a5f"), borderRadius: 8, color: friendsVisible?"#A8D8FF":"#445", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>
          👥
        </button>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#040d1a" }}>
        <svg viewBox="0 0 130 100" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="finegrid" width="2" height="2" patternUnits="userSpaceOnUse">
              <path d="M 2 0 L 0 0 0 2" fill="none" stroke="#0a1f32" strokeWidth="0.15"/>
            </pattern>
            <pattern id="coarsegrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0d253c" strokeWidth="0.4"/>
            </pattern>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <filter id="shopglow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="1.8" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <filter id="subtleglow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="0.7" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <radialGradient id="fountainGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4A9EFF" stopOpacity="0.5"/>
              <stop offset="60%" stopColor="#2E5FA3" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#1B3A6B" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="mainRoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f2238"/>
              <stop offset="100%" stopColor="#0a1a2c"/>
            </linearGradient>
          </defs>

          <rect width="130" height="100" fill="#040d1a"/>
          <rect width="130" height="100" fill="url(#finegrid)"/>
          <rect width="130" height="100" fill="url(#coarsegrid)" opacity="0.7"/>

          {/* Top-left residential */}
          <rect x="0" y="0" width="18" height="16" fill="#050e1c" stroke="#0d1f30" strokeWidth="0.3"/>
          <rect x="1" y="1" width="7" height="5" rx="0.4" fill="#08192a" stroke="#102436" strokeWidth="0.3"/>
          <rect x="10" y="1" width="6" height="5" rx="0.4" fill="#08192a" stroke="#102436" strokeWidth="0.3"/>
          <rect x="1" y="7" width="5" height="4" rx="0.4" fill="#08192a" stroke="#102436" strokeWidth="0.3"/>
          <rect x="8" y="7" width="8" height="4" rx="0.4" fill="#08192a" stroke="#102436" strokeWidth="0.3"/>
          <rect x="1" y="12" width="6" height="3" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>
          <rect x="9" y="12" width="7" height="3" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>
          <text x="9" y="15.5" textAnchor="middle" fill="#0f2d44" fontSize="1.6" fontWeight="bold">שכונת סטודנטים</text>

          {/* Top-right shops strip */}
          <rect x="90" y="0" width="40" height="16" fill="#050e1c" stroke="#0d1f30" strokeWidth="0.3"/>
          <rect x="90" y="13" width="40" height="3" fill="#08172a" opacity="0.9"/>
          <line x1="90" y1="14.5" x2="130" y2="14.5" stroke="#122238" strokeWidth="0.4" strokeDasharray="4,3"/>
          <text x="110" y="15.2" textAnchor="middle" fill="#0f2d44" fontSize="1.6">רחוב המסחר</text>

          {/* Bottom-left houses */}
          <rect x="0" y="83" width="14" height="17" fill="#050e1c"/>
          <rect x="1" y="84" width="4" height="4" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>
          <rect x="7" y="84" width="5" height="4" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>
          <rect x="1" y="90" width="4" height="4" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>
          <rect x="7" y="90" width="5" height="4" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>
          <rect x="1" y="96" width="11" height="3" rx="0.4" fill="#07162a" stroke="#0f2235" strokeWidth="0.3"/>

          {/* Bottom-right shops */}
          <rect x="92" y="80" width="38" height="20" fill="#050e1c" stroke="#0d1f30" strokeWidth="0.3"/>
          <rect x="92" y="78" width="38" height="3" fill="#08172a"/>
          <line x1="92" y1="79.5" x2="130" y2="79.5" stroke="#122238" strokeWidth="0.4" strokeDasharray="4,3"/>
          <text x="111" y="79" textAnchor="middle" fill="#0f2d44" fontSize="1.6">שדרת המסחר</text>

          {/* Top boulevard */}
          <rect x="0" y="14" width="130" height="6" fill="url(#mainRoad)"/>
          <line x1="0" y1="17" x2="130" y2="17" stroke="#142840" strokeWidth="0.5" strokeDasharray="5,4"/>
          <line x1="0" y1="14.3" x2="130" y2="14.3" stroke="#0c1e30" strokeWidth="0.25"/>
          <line x1="0" y1="19.7" x2="130" y2="19.7" stroke="#0c1e30" strokeWidth="0.25"/>
          <text x="47" y="16" textAnchor="middle" fill="#112a42" fontSize="1.9" fontWeight="bold">שדרות האוניברסיטה</text>

          {/* Bottom boulevard */}
          <rect x="0" y="78" width="130" height="6" fill="url(#mainRoad)"/>
          <line x1="0" y1="81" x2="130" y2="81" stroke="#142840" strokeWidth="0.5" strokeDasharray="5,4"/>
          <line x1="0" y1="78.3" x2="130" y2="78.3" stroke="#0c1e30" strokeWidth="0.25"/>
          <line x1="0" y1="83.7" x2="130" y2="83.7" stroke="#0c1e30" strokeWidth="0.25"/>
          <text x="47" y="76.5" textAnchor="middle" fill="#112a42" fontSize="1.9">רחוב הרצל</text>

          {/* Side roads */}
          <rect x="0" y="14" width="5" height="64" fill="#0a1825"/>
          <line x1="2.5" y1="14" x2="2.5" y2="78" stroke="#142840" strokeWidth="0.35" strokeDasharray="4,3"/>
          <rect x="88" y="14" width="4" height="64" fill="#0a1825"/>
          <line x1="90" y1="14" x2="90" y2="78" stroke="#142840" strokeWidth="0.35" strokeDasharray="4,3"/>

          {/* Campus boundary */}
          <rect x="6" y="20" width="82" height="57" rx="2" fill="#050d1a" stroke="#162a42" strokeWidth="0.7" strokeDasharray="5,3"/>
          <text x="47" y="22.5" textAnchor="middle" fill="#102d48" fontSize="2.2" fontWeight="bold">• קמפוס אוניברסיטת הנגב •</text>

          {/* Inner roads - H-spine */}
          <rect x="6" y="44" width="82" height="4.5" fill="#08172a"/>
          <line x1="6" y1="46.2" x2="88" y2="46.2" stroke="#142840" strokeWidth="0.5" strokeDasharray="5,3"/>
          <line x1="6" y1="44.3" x2="88" y2="44.3" stroke="#0c1f30" strokeWidth="0.25"/>
          <line x1="6" y1="48.2" x2="88" y2="48.2" stroke="#0c1f30" strokeWidth="0.25"/>

          {/* V-spine */}
          <rect x="51" y="20" width="4.5" height="57" fill="#08172a"/>
          <line x1="53.2" y1="20" x2="53.2" y2="77" stroke="#142840" strokeWidth="0.5" strokeDasharray="5,3"/>

          {/* Sub-paths */}
          <line x1="6" y1="34" x2="51" y2="34" stroke="#0e2035" strokeWidth="1.2"/>
          <line x1="22" y1="20" x2="22" y2="44" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="36" y1="20" x2="36" y2="44" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="55.5" y1="60" x2="88" y2="60" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="63" y1="20" x2="63" y2="44" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="83" y1="20" x2="83" y2="44" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="19" y1="62" x2="19" y2="77" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="6" y1="62" x2="51" y2="62" stroke="#0c1e30" strokeWidth="1"/>
          <line x1="88" y1="48.5" x2="88" y2="77" stroke="#0c1e30" strokeWidth="1"/>
          <text x="28" y="43" fill="#0f2840" fontSize="1.7">שביל הספר</text>

          {/* Green zones */}
          <rect x="22" y="35" width="13" height="8" rx="1.5" fill="#071a0e" opacity="0.9"/>
          <rect x="56" y="49.5" width="12" height="9" rx="1.5" fill="#071a0e" opacity="0.9"/>
          <rect x="8" y="49" width="5" height="12" rx="1" fill="#071a0e" opacity="0.8"/>
          <rect x="66" y="49" width="8" height="10" rx="1" fill="#071a0e" opacity="0.8"/>

          {/* Trees */}
          {[
            [22,36.5],[25,36.5],[28,36.5],[31,36.5],[22,41],[25,41],[28,41],[31,41],
            [57.5,51],[61,51],[64.5,51],[57.5,55],[61,55],[64.5,55],
            [9,51],[9,54],[9,57],[12,51],[12,54],[12,57],
            [67,51],[71,51],[74,51],[67,55],[71,55],[74,55],
          ].map(function(pos, i) {
            return (
              <g key={"tr"+i}>
                <circle cx={pos[0]} cy={pos[1]} r="1.6" fill="#0c2a12" stroke="#1a4a20" strokeWidth="0.4" opacity="0.85"/>
                <circle cx={pos[0]} cy={pos[1]} r="0.7" fill="#1a5a22" opacity="0.6"/>
              </g>
            );
          })}

          {/* FOUNTAIN */}
          <circle cx="43" cy="46.2" r="7" fill="url(#fountainGrad)" opacity="0.6"/>
          <circle cx="43" cy="46.2" r="5.5" fill="none" stroke="#0f2540" strokeWidth="2.8"/>
          <circle cx="43" cy="46.2" r="5.5" fill="none" stroke="#142e4e" strokeWidth="0.4"/>
          <circle cx="43" cy="46.2" r="4.2" fill="#071525" stroke="#0d2238" strokeWidth="0.5"/>
          <circle cx="43" cy="46.2" r="2.8" fill="#081a30" stroke="#1a3a60" strokeWidth="0.7"/>
          <circle cx="43" cy="46.2" r="1.8" fill="#091f38" stroke="#2a5080" strokeWidth="0.5"/>
          <circle cx="43" cy="46.2" r="1.2" fill="#1040a0" opacity="0.7"/>
          <circle cx="43" cy="46.2" r="0.7" fill="#4A9EFF" opacity="0.9"/>
          <circle cx="43" cy="46.2" r="2.2" fill="none" stroke="#2255a0" strokeWidth="0.3" opacity="0.6" strokeDasharray="1,1"/>
          <circle cx="43" cy="46.2" r="2.6" fill="none" stroke="#1a4080" strokeWidth="0.2" opacity="0.4" strokeDasharray="1.5,1"/>
          <circle cx="43" cy="44.7" r="0.35" fill="#80C8FF" opacity="0.9"/>
          <circle cx="44.3" cy="45.3" r="0.3" fill="#80C8FF" opacity="0.8"/>
          <circle cx="44.3" cy="47.1" r="0.3" fill="#80C8FF" opacity="0.8"/>
          <circle cx="43" cy="47.7" r="0.35" fill="#80C8FF" opacity="0.9"/>
          <circle cx="41.7" cy="47.1" r="0.3" fill="#80C8FF" opacity="0.8"/>
          <circle cx="41.7" cy="45.3" r="0.3" fill="#80C8FF" opacity="0.8"/>
          <line x1="37.5" y1="46.2" x2="40.5" y2="46.2" stroke="#0f2038" strokeWidth="1.4"/>
          <line x1="45.5" y1="46.2" x2="51" y2="46.2" stroke="#0f2038" strokeWidth="1.4"/>
          <line x1="43" y1="40.7" x2="43" y2="43.4" stroke="#0f2038" strokeWidth="1.4"/>
          <line x1="43" y1="49" x2="43" y2="51.7" stroke="#0f2038" strokeWidth="1.4"/>
          <text x="43" y="52.8" textAnchor="middle" fill="#1a3a60" fontSize="1.6">כיכר המזרקה</text>

          {/* Parking */}
          <rect x="62" y="73" width="22" height="7" rx="1" fill="#060f1c" stroke="#0f2235" strokeWidth="0.4"/>
          {[62,65,68,71,74,77,80,83].map(function(x,i){ return <line key={"p1"+i} x1={x} y1="73" x2={x} y2="80" stroke="#0d2035" strokeWidth="0.3"/>; })}
          <text x="73" y="77.5" textAnchor="middle" fill="#102535" fontSize="1.8" fontWeight="bold">P</text>
          <rect x="15" y="84" width="20" height="8" rx="0.5" fill="#05101c" stroke="#0c1e2e" strokeWidth="0.3"/>
          {[15,18,21,24,27,30,33].map(function(x,i){ return <line key={"p2"+i} x1={x} y1="84" x2={x} y2="92" stroke="#0c1e2e" strokeWidth="0.25"/>; })}
          <text x="25" y="88.5" textAnchor="middle" fill="#0e2535" fontSize="1.7">P חיצוני</text>

          {/* Heat dots */}
          {BUILDINGS.map(function(b) {
            var dots = HEAT_DOTS[b.id] || [];
            var dc = dColor(b.density);
            return dots.map(function(dot, i) {
              var size = 0.7 + (i % 3) * 0.35;
              return <circle key={"hd"+b.id+i} cx={dot[0]} cy={dot[1]} r={size} fill={dc} opacity={0.45 + (i%4)*0.12}/>;
            });
          })}

          {/* Buildings */}
          {BUILDINGS.map(function(b) {
            var isHov = hovered === b.id;
            return (
              <g key={"bld"+b.id} onClick={function() { onBuilding(b); }} onMouseEnter={function() { setHovered(b.id); }} onMouseLeave={function() { setHovered(null); }} style={{ cursor: "pointer" }} filter={isHov ? "url(#glow)" : "none"}>
                <rect x={b.x+1.3} y={b.y+1.3} width={b.w} height={b.h} rx="1.5" fill="#010810" opacity="0.7"/>
                <rect x={b.x+b.w} y={b.y+1.3} width="1.3" height={b.h} fill="#030c1a" stroke={b.col} strokeWidth="0.2" opacity="0.5"/>
                <rect x={b.x+1.3} y={b.y+b.h} width={b.w} height="1.3" fill="#030c1a" stroke={b.col} strokeWidth="0.2" opacity="0.5"/>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="1.5" fill={isHov ? "#0e2240" : "#07172c"} stroke={b.col} strokeWidth={isHov ? 1.4 : 0.75}/>
                {buildFloorLines(b)}
                {buildWindows(b)}
                <line x1={b.x+1} y1={b.y+0.5} x2={b.x+b.w-1} y2={b.y+0.5} stroke={b.col} strokeWidth="0.5" opacity="0.6"/>
                <circle cx={b.x+b.w-1.8} cy={b.y+2} r="1.5" fill={dColor(b.density)} opacity="0.95"/>
                {b.issues > 0 && (
                  <g>
                    <circle cx={b.x+2} cy={b.y+2} r="1.8" fill="#FF6B6B"/>
                    <text x={b.x+2} y={b.y+2.7} textAnchor="middle" fill="white" fontSize="2" fontWeight="bold">{b.issues}</text>
                  </g>
                )}
                <text x={b.x+b.w/2} y={b.y+b.h/2+1.2} textAnchor="middle" fontSize="4.2">{b.icon}</text>
                <text x={b.x+b.w/2} y={b.y+b.h+3.8} textAnchor="middle" fill={isHov ? b.col : "#4a7a9a"} fontSize="2.4" fontWeight={isHov?"bold":"normal"}>{b.short}</text>
              </g>
            );
          })}

          {/* Shops */}
          {SHOPS.map(function(s) {
            var isHov2 = hovShop === s.id;
            return (
              <g key={"shop"+s.id} onClick={function() { onShop(s); }} onMouseEnter={function() { setHovShop(s.id); }} onMouseLeave={function() { setHovShop(null); }} style={{ cursor: "pointer" }} filter={isHov2 ? "url(#shopglow)" : "url(#subtleglow)"}>
                <rect x={s.x-4} y={s.y-4} width="9" height="11" rx="1.2" fill={isHov2 ? "#0e1e30" : "#060e1c"} stroke={s.col} strokeWidth={isHov2 ? 1.2 : 0.7}/>
                <text x={s.x+0.5} y={s.y+1.5} textAnchor="middle" fontSize="4">{s.icon}</text>
                <text x={s.x+0.5} y={s.y+6} textAnchor="middle" fill={isHov2 ? s.col : "#3a6080"} fontSize="1.6" fontWeight={isHov2?"bold":"normal"}>{s.name.split(" ")[0]}</text>
                {isHov2 && (
                  <g>
                    <rect x={s.x-4} y={s.y+6.5} width="9" height="2.5" rx="0.5" fill={s.col} opacity="0.25"/>
                    <text x={s.x+0.5} y={s.y+8.2} textAnchor="middle" fill={s.col} fontSize="1.5">✨ הנחה!</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Friend pins */}
          {friendsVisible && FRIENDS.filter(function(f){ return f.active && f.bid; }).map(function(f) {
            var b = BUILDINGS.find(function(b){ return b.id === f.bid; });
            if (!b) return null;
            return (
              <g key={"fr"+f.name}>
                <circle cx={b.x+b.w+2.2} cy={b.y+2.5} r="3" fill={f.color} opacity="0.2"/>
                <circle cx={b.x+b.w+2.2} cy={b.y+2.5} r="2.3" fill={f.color} stroke="white" strokeWidth="0.5"/>
                <text x={b.x+b.w+2.2} y={b.y+3.2} textAnchor="middle" fill="white" fontSize="2" fontWeight="bold">{f.av[0]}</text>
                <text x={b.x+b.w+2.2} y={b.y+7} textAnchor="middle" fill={f.color} fontSize="1.5">{f.name}</text>
              </g>
            );
          })}

          {/* Maintenance pins */}
          {REPORTS.filter(function(r){ return r.pub && r.status !== "טופל"; }).map(function(r) {
            var b = BUILDINGS.find(function(b){ return b.id === r.b; });
            if (!b) return null;
            return (
              <g key={"rp"+r.id}>
                <circle cx={b.x+b.w/2} cy={b.y+b.h+2} r="1.8" fill={r.col} stroke="#040d1a" strokeWidth="0.5"/>
                <circle cx={b.x+b.w/2} cy={b.y+b.h+2} r="3" fill={r.col} opacity="0.12"/>
              </g>
            );
          })}

          {/* You are here */}
          <circle cx="37" cy="46.2" r="4" fill="#4A9EFF" opacity="0.08"/>
          <circle cx="37" cy="46.2" r="2.5" fill="#4A9EFF" opacity="0.15"/>
          <circle cx="37" cy="46.2" r="1.4" fill="#4A9EFF" stroke="white" strokeWidth="0.7"/>
          <text x="37" y="43.2" textAnchor="middle" fill="#4A9EFF" fontSize="1.7">📍 אתה/את</text>

          {/* Compass */}
          <g transform="translate(84,24)">
            <circle cx="0" cy="0" r="4.2" fill="#040d1a" stroke="#1a3050" strokeWidth="0.6"/>
            <circle cx="0" cy="0" r="3.5" fill="none" stroke="#0d2038" strokeWidth="0.3"/>
            <polygon points="0,-2.8 0.65,0 -0.65,0" fill="#4A9EFF"/>
            <polygon points="0,2.8 0.65,0 -0.65,0" fill="#1e3a5f"/>
            <text x="0" y="-0.8" textAnchor="middle" fill="#4A9EFF" fontSize="2.2" fontWeight="bold">N</text>
          </g>

          {/* Scale */}
          <g transform="translate(7,94)">
            <rect x="0" y="-1" width="12" height="2" rx="0.5" fill="#091828"/>
            <rect x="0" y="-1" width="6" height="2" rx="0.5" fill="#142840"/>
            <text x="6" y="-2.5" textAnchor="middle" fill="#142840" fontSize="1.8">100מ</text>
          </g>
        </svg>

        <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(4,13,26,0.95)", borderRadius: 8, padding: "5px 9px", border: "1px solid #1a3050" }}>
          {[["#FF6B6B","עמוס מאוד"],["#FFB347","עמוס"],["#A8E6CF","שקט"]].map(function(item) {
            return (
              <div key={item[1]} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: item[0] }}/>
                <span style={{ color: "#5a8090", fontSize: 10 }}>{item[1]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", bottom: 10, right: 10, background: "#0a1e35", borderRadius: 8, padding: "5px 9px", border: "1px solid #1B3A6B" }}>
          <span style={{ color: "#4A9EFF", fontSize: 11, fontWeight: 700 }}>🎯 5 אירועים</span>
        </div>
      </div>
    </div>
  );
}

// ─── SHOP DRAWER ──────────────────────────────────────────────────────────────
function ShopDrawer(props) {
  var shop = props.shop;
  var onClose = props.onClose;
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#0D1B2A", borderTop: "2px solid " + shop.col, borderRadius: "20px 20px 0 0", zIndex: 110, maxHeight: "72%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "9px 0 4px" }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: shop.col }}/>
      </div>
      <div style={{ padding: "0 14px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24 }}>{shop.icon}</span>
            <div style={{ color: "#E8F4FF", fontSize: 17, fontWeight: 800 }}>{shop.name}</div>
          </div>
          <div style={{ color: "#778", fontSize: 12, marginTop: 4 }}>🕐 {shop.hours}</div>
        </div>
        <button onClick={onClose} style={{ background: "#1e3a5f", border: "none", color: "#A8D8FF", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Discount banner */}
      <div style={{ margin: "0 14px 12px", background: shop.col + "22", border: "1px solid " + shop.col + "55", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 9, alignItems: "center" }}>
        <span style={{ fontSize: 20 }}>🎉</span>
        <div>
          <div style={{ color: shop.col, fontSize: 12, fontWeight: 800, marginBottom: 2 }}>הנחה לסטודנטים!</div>
          <div style={{ color: "#A8D8FF", fontSize: 12 }}>{shop.discount}</div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ color: "#A8D8FF", fontSize: 12, fontWeight: 700, padding: "0 14px 8px" }}>תפריט / מוצרים</div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
        {shop.menu.map(function(item, i) {
          return (
            <div key={"mi"+i} style={{ background: "#0d2040", borderRadius: 10, padding: "9px 12px", border: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <div>
                <div style={{ color: "#E8F4FF", fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                {item.tag && (
                  <span style={{ background: shop.col + "22", color: shop.col, fontSize: 10, borderRadius: 8, padding: "1px 7px", marginTop: 2, display: "inline-block" }}>{item.tag}</span>
                )}
              </div>
              <span style={{ color: "#FFB347", fontWeight: 700, fontSize: 14 }}>{item.price}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BUILDING DRAWER ──────────────────────────────────────────────────────────
function BuildingDrawer(props) {
  var building = props.building;
  var onClose = props.onClose;
  var tabState = useState("info");
  var tab = tabState[0];
  var setTab = tabState[1];
  var floorState = useState(1);
  var activeFloor = floorState[0];
  var setActiveFloor = floorState[1];
  var msgState = useState("");
  var chatMsg = msgState[0];
  var setChatMsg = msgState[1];
  var initMsgs = LOCATION_CHATS[building.id] || [];
  var msgsState = useState(initMsgs);
  var messages = msgsState[0];
  var setMessages = msgsState[1];
  var chatRef = useRef(null);

  useEffect(function() {
    if (chatRef.current) { chatRef.current.scrollTop = chatRef.current.scrollHeight; }
  }, [messages, tab]);

  function sendMsg() {
    if (!chatMsg.trim()) return;
    var nm = { id: Date.now(), u: "את/ה", av: "ME", text: chatMsg, t: "עכשיו", mine: true };
    setMessages(function(m) { return m.concat([nm]); });
    setChatMsg("");
  }

  var floors = FLOOR_DATA[building.id] || [];
  var currentFloorData = floors.find(function(f) { return f.floor === activeFloor; });
  var buildingReports = REPORTS.filter(function(r) { return r.b === building.id; });
  var friendsHere = FRIENDS.filter(function(f) { return f.active && f.bid === building.id; });
  var friendsOnFloor = FRIENDS.filter(function(f) { return f.active && f.bid === building.id && f.floor === activeFloor; });

  var roomTypeColor = { class: "#4A9EFF", lab: "#A8E6CF", admin: "#CE93D8", quiet: "#FFB347", service: "#778", wc: "#80DEEA" };
  var roomTypeLabel = { class: "כיתה", lab: "מעבדה", admin: "מנהלה", quiet: "שקט", service: "שירות", wc: "שירותים" };

  var floorButtons = [];
  for (var i = 1; i <= building.floors; i++) {
    var fi = i;
    floorButtons.push(
      <div key={"flbtn" + fi} onClick={function(fnum) { return function() { setActiveFloor(fnum); }; }(fi)} style={{ background: activeFloor === fi ? "#1B3A6B" : "#0d2040", border: "1px solid " + (activeFloor === fi ? "#4A9EFF" : "#1e3a5f"), borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: activeFloor === fi ? "#A8D8FF" : "#556", fontSize: 11, fontWeight: 700, flexShrink: 0, textAlign: "center", minWidth: 44 }}>
        <div>{fi}</div>
        <div style={{ fontSize: 9, color: activeFloor === fi ? "#7ab" : "#334" }}>קומה</div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#0D1B2A", borderTop: "2px solid #1e3a5f", borderRadius: "20px 20px 0 0", zIndex: 100, maxHeight: "78%", display: "flex", flexDirection: "column" }}>
      {/* Handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "9px 0 4px" }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: "#2E5FA3" }} />
      </div>

      {/* Header */}
      <div style={{ padding: "0 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 22 }}>{building.icon}</span>
            <div style={{ color: "#E8F4FF", fontSize: 17, fontWeight: 800 }}>{building.name}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <Badge label={dLabel(building.density)} color={dColor(building.density)} />
            <Badge label={building.floors + " קומות"} color="#4A9EFF" />
            {friendsHere.length > 0 && <Badge label={"👥 " + friendsHere.length + " חברים כאן"} color="#CE93D8" />}
            {buildingReports.length > 0 && <Badge label={"⚠ " + buildingReports.length} color="#FF6B6B" />}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "#1e3a5f", border: "none", color: "#A8D8FF", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Floor slider */}
      <div style={{ padding: "0 14px 8px" }}>
        <div style={{ color: "#556", fontSize: 10, marginBottom: 5 }}>בחר קומה — החלק לצדדים</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {floorButtons}
        </div>
        {currentFloorData && (
          <div style={{ color: "#4A9EFF", fontSize: 12, marginTop: 5, fontWeight: 700 }}>
            קומה {activeFloor} — {currentFloorData.label}
            {friendsOnFloor.length > 0 && (
              <span style={{ color: "#CE93D8", marginRight: 8 }}>
                {friendsOnFloor.map(function(f) { return f.name; }).join(", ")} כאן
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e3a5f", padding: "0 14px" }}>
        {[["info", "מידע"], ["floor", "קומה " + activeFloor], ["chat", "צ׳אט"], ["reports", "דיווחים"]].map(function(item) {
          return (
            <button key={"tab" + item[0]} onClick={function() { setTab(item[0]); }} style={{ background: "none", border: "none", cursor: "pointer", color: tab === item[0] ? "#4A9EFF" : "#556", borderBottom: tab === item[0] ? "2px solid #4A9EFF" : "2px solid transparent", padding: "7px 10px", fontSize: 11, fontWeight: tab === item[0] ? 700 : 400, whiteSpace: "nowrap" }}>
              {item[1]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 13 }}>

        {/* INFO TAB - general building info */}
        {tab === "info" && (
          <div>
            {friendsHere.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: "#A8D8FF", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>👥 חברים בבניין</div>
                {friendsHere.map(function(f) {
                  return (
                    <div key={"fh" + f.name} style={{ background: "#0d2040", borderRadius: 9, padding: "8px 11px", border: "1px solid #1e3a5f", display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                      <Av initials={f.av} size={30} color={f.color} />
                      <div>
                        <div style={{ color: "#E8F4FF", fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ color: "#778", fontSize: 11 }}>📍 {f.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ color: "#A8D8FF", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>פרטי בניין</div>
            <div style={{ background: "#0d2040", borderRadius: 9, padding: "9px 11px", border: "1px solid #1e3a5f", marginBottom: 6 }}>
              <div style={{ color: "#778", fontSize: 12 }}>שעות פתיחה</div>
              <div style={{ color: "#E8F4FF", fontSize: 14, fontWeight: 700 }}>
                {building.id === "A" ? "07:00–22:00" : building.id === "B" ? "08:00–23:00" : building.id === "C" ? "07:30–20:00" : building.id === "F" ? "24/7" : "08:00–20:00"}
              </div>
            </div>
            <div style={{ color: "#A8D8FF", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>קומות בבניין</div>
            {floors.map(function(fl) {
              return (
                <div key={"fl" + fl.floor} onClick={function() { setActiveFloor(fl.floor); setTab("floor"); }} style={{ background: "#0d2040", borderRadius: 9, padding: "8px 11px", border: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, cursor: "pointer" }}>
                  <div>
                    <span style={{ color: "#4A9EFF", fontSize: 12, fontWeight: 700, marginLeft: 8 }}>קומה {fl.floor}</span>
                    <span style={{ color: "#E8F4FF", fontSize: 13 }}>{fl.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {FRIENDS.filter(function(f) { return f.active && f.bid === building.id && f.floor === fl.floor; }).map(function(f) {
                      return <div key={f.name} style={{ width: 18, height: 18, borderRadius: "50%", background: f.color, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{f.av[0]}</div>;
                    })}
                    <span style={{ color: "#556", fontSize: 11 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FLOOR TAB - specific floor info */}
        {tab === "floor" && currentFloorData && (
          <div>
            <div style={{ background: "#0d2040", borderRadius: 9, padding: "9px 11px", border: "1px solid #1B3A6B", marginBottom: 10 }}>
              <div style={{ color: "#4A9EFF", fontSize: 13, fontWeight: 800 }}>קומה {activeFloor} — {currentFloorData.label}</div>
              {friendsOnFloor.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {friendsOnFloor.map(function(f) {
                    return (
                      <div key={"fof" + f.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: f.color, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{f.av[0]}</div>
                        <span style={{ color: f.color, fontSize: 11 }}>{f.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {currentFloorData.events && currentFloorData.events.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: "#A8D8FF", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>אירועים בקומה זו</div>
                {currentFloorData.events.map(function(ev, i) {
                  return (
                    <div key={"ev" + i} style={{ background: "#0d2040", borderRadius: 9, padding: "8px 11px", border: "1px solid #4A9EFF44", display: "flex", gap: 10, marginBottom: 6 }}>
                      <div style={{ color: "#4A9EFF", fontSize: 12, fontWeight: 700, minWidth: 36 }}>{ev.time}</div>
                      <div>
                        <div style={{ color: "#E8F4FF", fontSize: 13, fontWeight: 600 }}>{ev.name || ev.event}</div>
                        <div style={{ color: "#778", fontSize: 11 }}>חדר {ev.room}{ev.prof ? " · " + ev.prof : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ color: "#A8D8FF", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>חדרים בקומה</div>
            {currentFloorData.rooms && currentFloorData.rooms.map(function(room, i) {
              var rc = roomTypeColor[room.type] || "#778";
              var rl = roomTypeLabel[room.type] || room.type;
              return (
                <div key={"room" + i} style={{ background: "#0d2040", borderRadius: 9, padding: "8px 11px", border: "1px solid " + rc + "44", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <div style={{ color: "#E8F4FF", fontSize: 13 }}>{room.name}</div>
                    <div style={{ color: "#556", fontSize: 11 }}>{room.room !== "—" ? "חדר " + room.room : ""}</div>
                  </div>
                  <Badge label={rl} color={rc} />
                </div>
              );
            })}

            {currentFloorData.available !== undefined && (
              <div style={{ background: "#0d2040", borderRadius: 9, padding: "9px 11px", border: "1px solid #1e3a5f", marginTop: 8 }}>
                <div style={{ color: "#A8D8FF", fontSize: 12 }}>מקומות פנויים</div>
                <div style={{ color: currentFloorData.available < 5 ? "#FF6B6B" : "#A8E6CF", fontSize: 18, fontWeight: 800 }}>{currentFloorData.available}</div>
              </div>
            )}
            {currentFloorData.notes && (
              <div style={{ background: "rgba(30,58,95,0.2)", border: "1px solid #1e3a5f", borderRadius: 8, padding: "7px 10px", color: "#A8D8FF", fontSize: 12, marginTop: 8 }}>📢 {currentFloorData.notes}</div>
            )}
            {currentFloorData.waitTime !== undefined && (
              <div style={{ background: "#0d2040", borderRadius: 9, padding: "9px 11px", border: "1px solid #1e3a5f", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#A8D8FF", fontSize: 12 }}>⏱ זמן המתנה</span>
                <span style={{ color: "#FFB347", fontWeight: 700 }}>{currentFloorData.waitTime} דקות</span>
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: 200 }}>
            <div ref={chatRef} style={{ flex: 1, paddingBottom: 8 }}>
              {messages.length === 0 ? (
                <div style={{ color: "#445", fontSize: 12, textAlign: "center", marginTop: 20 }}>היה הראשון לכתוב!</div>
              ) : (
                messages.map(function(m) { return <Bubble key={m.id} msg={m} />; })
              )}
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
              <input value={chatMsg} onChange={function(e) { setChatMsg(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") sendMsg(); }} placeholder="כתוב הודעה..." style={{ flex: 1, background: "#0d2040", border: "1px solid #1e3a5f", borderRadius: 18, padding: "7px 12px", color: "#E8F4FF", fontSize: 13, outline: "none" }} />
              <button onClick={sendMsg} style={{ background: "#1B3A6B", border: "1px solid #2E5FA3", borderRadius: 18, color: "#4A9EFF", padding: "7px 13px", cursor: "pointer", fontSize: 14 }}>↑</button>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === "reports" && (
          <div>
            {buildingReports.length === 0 ? (
              <div style={{ color: "#445", fontSize: 12, textAlign: "center", marginTop: 20 }}>אין דיווחים פתוחים</div>
            ) : (
              buildingReports.map(function(r) {
                return (
                  <div key={"r" + r.id} style={{ background: "#0d2040", borderRadius: 9, padding: "9px 11px", border: "1px solid " + r.col + "44", display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: r.col, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#E8F4FF", fontSize: 13, fontWeight: 600 }}>{r.cat}</div>
                      <div style={{ color: "#556", fontSize: 11 }}>קומה {r.floor} · {r.t}</div>
                    </div>
                    <Badge label={r.status} color={r.status === "טופל" ? "#A8E6CF" : r.status === "בטיפול" ? "#FFB347" : "#FF6B6B"} />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHAT SCREEN ──────────────────────────────────────────────────────────────
function ChatScreen() {
  var activeState = useState(null);
  var activeChat = activeState[0];
  var setActiveChat = activeState[1];
  var replyState = useState("");
  var replyMsg = replyState[0];
  var setReplyMsg = replyState[1];
  var allMsgsState = useState(function() {
    var r = {};
    PRIVATE_CHATS.forEach(function(p) { r[p.id] = p.msgs.slice(); });
    return r;
  });
  var allMsgs = allMsgsState[0];
  var setAllMsgs = allMsgsState[1];
  var endRef = useRef(null);

  useEffect(function() {
    if (endRef.current) { endRef.current.scrollTop = endRef.current.scrollHeight; }
  }, [allMsgs, activeChat]);

  function sendReply() {
    if (!replyMsg.trim() || !activeChat) return;
    var nm = { id: Date.now(), u: "את/ה", av: "ME", text: replyMsg, t: "עכשיו", mine: true };
    setAllMsgs(function(prev) {
      var next = Object.assign({}, prev);
      next[activeChat.id] = (next[activeChat.id] || []).concat([nm]);
      return next;
    });
    setReplyMsg("");
  }

  if (activeChat) {
    var curMsgs = allMsgs[activeChat.id] || [];
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "#060d18", borderBottom: "1px solid #1e3a5f", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button onClick={function() { setActiveChat(null); }} style={{ background: "none", border: "none", color: "#4A9EFF", cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
          <div style={{ position: "relative" }}>
            <Av initials={activeChat.av} size={34} color="#1B3A6B" />
            {activeChat.online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: "#A8E6CF", border: "2px solid #060d18" }} />}
          </div>
          <div>
            <div style={{ color: "#E8F4FF", fontSize: 14, fontWeight: 700 }}>{activeChat.name}</div>
            <div style={{ color: "#556", fontSize: 11 }}>{activeChat.online ? "מחובר/ת" : "לא מחובר/ת"}</div>
          </div>
        </div>
        <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: 13 }}>
          {curMsgs.length === 0 ? <div style={{ color: "#445", fontSize: 12, textAlign: "center", marginTop: 30 }}>התחל/י שיחה</div> : curMsgs.map(function(m) { return <Bubble key={m.id} msg={m} />; })}
        </div>
        <div style={{ padding: "10px 13px", borderTop: "1px solid #1e3a5f", display: "flex", gap: 8, flexShrink: 0 }}>
          <input value={replyMsg} onChange={function(e) { setReplyMsg(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") sendReply(); }} placeholder="כתוב הודעה..." style={{ flex: 1, background: "#0d2040", border: "1px solid #1e3a5f", borderRadius: 20, padding: "8px 14px", color: "#E8F4FF", fontSize: 13, outline: "none" }} />
          <button onClick={sendReply} style={{ background: "#1B3A6B", border: "1px solid #2E5FA3", borderRadius: 20, color: "#4A9EFF", padding: "8px 14px", cursor: "pointer", fontSize: 14 }}>↑</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ color: "#E8F4FF", fontSize: 16, fontWeight: 800 }}>הודעות</div>
        <button style={{ background: "#1B3A6B", border: "1px solid #2E5FA3", borderRadius: 8, color: "#A8D8FF", fontSize: 12, padding: "4px 11px", cursor: "pointer" }}>+ חדש</button>
      </div>
      <div style={{ padding: "0 14px 10px", display: "flex", gap: 10, overflowX: "auto", flexShrink: 0, borderBottom: "1px solid #1e3a5f" }}>
        {FRIENDS.filter(function(f) { return f.active; }).map(function(f) {
          return (
            <div key={"online" + f.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <Av initials={f.av} size={38} color={f.color} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#A8E6CF", border: "2px solid #0D1B2A" }} />
              </div>
              <span style={{ color: "#778", fontSize: 10 }}>{f.name}</span>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {PRIVATE_CHATS.map(function(c) {
          return (
            <div key={"pc" + c.id} onClick={function() { setActiveChat(c); }} style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid #0d2040", cursor: "pointer" }}>
              <div style={{ position: "relative" }}>
                <Av initials={c.av} size={42} color={c.group ? "#1e3a5f" : "#1B3A6B"} />
                {c.online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#A8E6CF", border: "2px solid #0D1B2A" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#E8F4FF", fontSize: 14, fontWeight: 700 }}>{c.name}</span>
                  <span style={{ color: "#445", fontSize: 11 }}>{c.t}</span>
                </div>
                <div style={{ color: "#778", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last}</div>
              </div>
              {c.unread > 0 && <div style={{ background: "#4A9EFF", borderRadius: 10, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", padding: "0 5px" }}>{c.unread}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── REPORT SCREEN ────────────────────────────────────────────────────────────
function ReportScreen() {
  var stepState = useState(0);
  var step = stepState[0];
  var setStep = stepState[1];
  var bldState = useState("A");
  var selBld = bldState[0];
  var setSelBld = bldState[1];
  var catState = useState("");
  var selCat = catState[0];
  var setSelCat = catState[1];
  var cats = ["מזגן תקול", "נזילת מים", "תאורה שבורה", "נייר טואלט חסר", "מדפסת תקולה", "ספסל שבור", "ריצפה רטובה", "אחר"];
  var isPrivate = selCat && ["נייר טואלט חסר", "מדפסת תקולה", "ספסל שבור"].includes(selCat);

  if (step === 1) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
        <div style={{ fontSize: 60 }}>✅</div>
        <div style={{ color: "#E8F4FF", fontSize: 19, fontWeight: 800 }}>הדיווח נשלח!</div>
        <div style={{ color: "#778", fontSize: 13, textAlign: "center", maxWidth: 230 }}>הצוות יטפל בהקדם. תקבל/י עדכון כשיסתיים הטיפול.</div>
        <div style={{ background: "#0d2040", borderRadius: 12, padding: "11px 14px", border: "1px solid #FFB34744", width: "100%", maxWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#FFB347" }} />
            <span style={{ color: "#FFB347", fontSize: 13, fontWeight: 700 }}>ממתין לשיבוץ טכנאי</span>
          </div>
        </div>
        <button onClick={function() { setStep(0); setSelCat(""); }} style={{ background: "#1B3A6B", border: "1px solid #2E5FA3", borderRadius: 11, color: "#A8D8FF", padding: "9px 22px", cursor: "pointer", fontSize: 14 }}>דיווח נוסף</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      <div style={{ color: "#A8D8FF", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>בחר בניין</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {BUILDINGS.map(function(b) {
          return (
            <button key={"rb" + b.id} onClick={function() { setSelBld(b.id); }} style={{ background: selBld === b.id ? "#1B3A6B" : "#0d2040", border: "1px solid " + (selBld === b.id ? "#4A9EFF" : "#1e3a5f"), borderRadius: 8, padding: "5px 11px", cursor: "pointer", color: selBld === b.id ? "#A8D8FF" : "#778", fontSize: 12 }}>
              {b.icon} {b.short}
            </button>
          );
        })}
      </div>
      <div style={{ color: "#A8D8FF", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>קטגוריה</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {cats.map(function(c) {
          return (
            <button key={"rc" + c} onClick={function() { setSelCat(c); }} style={{ background: selCat === c ? "#1B3A6B" : "#0d2040", border: "1px solid " + (selCat === c ? "#4A9EFF" : "#1e3a5f"), borderRadius: 8, padding: "5px 11px", cursor: "pointer", color: selCat === c ? "#A8D8FF" : "#778", fontSize: 12 }}>
              {c}
            </button>
          );
        })}
      </div>
      {selCat && (
        <div style={{ background: "#0d2040", border: "1px solid " + (isPrivate ? "#FFB34744" : "#4A9EFF44"), borderRadius: 10, padding: "9px 11px", marginBottom: 14 }}>
          <div style={{ color: isPrivate ? "#FFB347" : "#4A9EFF", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>🔒 חשיפה</div>
          <div style={{ color: "#778", fontSize: 11 }}>{isPrivate ? "רק לצוות ולמשתמשים בחדר" : "גלוי לכולם על המפה"}</div>
        </div>
      )}
      <button onClick={function() { if (selCat) setStep(1); }} style={{ background: selCat ? "#1B3A6B" : "#0d2040", border: "1px solid " + (selCat ? "#4A9EFF" : "#1e3a5f"), borderRadius: 12, padding: "12px", width: "100%", cursor: selCat ? "pointer" : "not-allowed", color: selCat ? "#E8F4FF" : "#445", fontSize: 15, fontWeight: 700 }}>
        {selCat ? "שלח דיווח" : "בחר קטגוריה"}
      </button>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen() {
  var ghostState = useState(false);
  var ghost = ghostState[0];
  var setGhost = ghostState[1];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      <div style={{ background: "#0d2040", borderRadius: 16, padding: 14, border: "1px solid #1e3a5f", textAlign: "center", marginBottom: 13 }}>
        <div style={{ display: "flex", justifyContent: "center" }}><Av initials="DC" size={60} color="#1B3A6B" /></div>
        <div style={{ color: "#E8F4FF", fontSize: 17, fontWeight: 800, marginTop: 9 }}>דוד כהן</div>
        <div style={{ color: "#778", fontSize: 13 }}>שנה ב׳ · מדעי המחשב</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 11 }}>
          {[["24", "דיווחים"], ["8", "אירועים"], ["142", "נקודות"]].map(function(it) {
            return (
              <div key={it[1]} style={{ textAlign: "center" }}>
                <div style={{ color: "#4A9EFF", fontSize: 18, fontWeight: 800 }}>{it[0]}</div>
                <div style={{ color: "#556", fontSize: 11 }}>{it[1]}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: "#0d2040", borderRadius: 12, padding: "11px 14px", border: "1px solid " + (ghost ? "#4A9EFF" : "#1e3a5f"), display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
        <div>
          <div style={{ color: "#E8F4FF", fontSize: 14, fontWeight: 700 }}>👻 Ghost Mode</div>
          <div style={{ color: "#778", fontSize: 12 }}>{ghost ? "אינך נראה/ת לאחרים" : "חברים יכולים לראות אותך"}</div>
        </div>
        <div onClick={function() { setGhost(function(g) { return !g; }); }} style={{ width: 42, height: 23, borderRadius: 12, cursor: "pointer", background: ghost ? "#1B3A6B" : "#1e3a5f", border: "2px solid " + (ghost ? "#4A9EFF" : "#334"), position: "relative", transition: "all 0.2s" }}>
          <div style={{ position: "absolute", top: 2, left: ghost ? 18 : 2, width: 15, height: 15, borderRadius: "50%", background: ghost ? "#4A9EFF" : "#445", transition: "left 0.2s" }} />
        </div>
      </div>
      <div style={{ color: "#4A9EFF", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>פעילות אחרונה</div>
      {[
        { icon: "⚠️", text: "דיווחת על מזגן תקול — מדעים", t: "לפני שעה" },
        { icon: "🎯", text: "הצטרפת לטורניר פינג-פונג", t: "אתמול" },
        { icon: "💬", text: "כתבת בצ׳אט הספרייה", t: "לפני 2 ימים" },
        { icon: "📍", text: "ביקרת ב-4 בניינים השבוע", t: "שבועי" },
      ].map(function(a, i) {
        return (
          <div key={"act" + i} style={{ background: "#0d2040", borderRadius: 10, padding: "9px 11px", border: "1px solid #1e3a5f", display: "flex", gap: 9, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 17 }}>{a.icon}</span>
            <div>
              <div style={{ color: "#C8E0FF", fontSize: 13 }}>{a.text}</div>
              <div style={{ color: "#556", fontSize: 11 }}>{a.t}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  var screenState = useState("map");
  var screen = screenState[0];
  var setScreen = screenState[1];
  var bldState = useState(null);
  var selBuilding = bldState[0];
  var setSelBuilding = bldState[1];
  var shopState = useState(null);
  var selShop = shopState[0];
  var setSelShop = shopState[1];

  var tabs = [
    { id: "map", icon: "🗺️", label: "מפה" },
    { id: "chat", icon: "💬", label: "צ׳אט" },
    { id: "report", icon: "⚠️", label: "דיווח" },
    { id: "profile", icon: "👤", label: "פרופיל" },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#020a14" }}>
      <style>{"\n        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');\n        * { font-family: 'Assistant', sans-serif; box-sizing: border-box; }\n        button, input, textarea { font-family: 'Assistant', sans-serif; }\n        ::-webkit-scrollbar { width: 3px; }\n        ::-webkit-scrollbar-track { background: #060d18; }\n        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }\n      "}</style>
      <div style={{ width: 375, height: 812, background: "#0D1B2A", borderRadius: 44, overflow: "hidden", position: "relative", boxShadow: "0 0 120px rgba(27,58,107,0.5), 0 0 0 1px #1e3a5f", display: "flex", flexDirection: "column", border: "1px solid #1e3a5f" }}>
        {/* Status bar */}
        <div style={{ background: "#060d18", padding: "12px 20px 7px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ color: "#A8D8FF", fontSize: 11, fontWeight: 700 }}>9:41</span>
          <div style={{ background: "#0D1B2A", borderRadius: 18, padding: "2px 14px", border: "1px solid #1e3a5f" }}>
            <span style={{ color: "#4A9EFF", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>CAMPUS OS</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: "#A8D8FF", fontSize: 10 }}>●●●</span>
            <span style={{ fontSize: 11 }}>🔋</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          {screen === "map" && (
            <MapScreen
              onBuilding={function(b) { setSelShop(null); setSelBuilding(b); }}
              onShop={function(s) { setSelBuilding(null); setSelShop(s); }}
            />
          )}
          {screen === "chat" && <ChatScreen />}
          {screen === "report" && <ReportScreen />}
          {screen === "profile" && <ProfileScreen />}
          {selBuilding !== null && screen === "map" && (
            <BuildingDrawer building={selBuilding} onClose={function() { setSelBuilding(null); }} />
          )}
          {selShop !== null && screen === "map" && (
            <ShopDrawer shop={selShop} onClose={function() { setSelShop(null); }} />
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ background: "#060d18", borderTop: "1px solid #1e3a5f", display: "flex", flexShrink: 0, paddingBottom: 8 }}>
          {tabs.map(function(t) {
            return (
              <button key={"nav" + t.id} onClick={function() { setScreen(t.id); setSelBuilding(null); setSelShop(null); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "9px 0 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  {t.id === "chat" && <div style={{ position: "absolute", top: -2, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#FF6B6B", border: "2px solid #060d18" }} />}
                </div>
                <span style={{ fontSize: 10, fontWeight: screen === t.id ? 700 : 400, color: screen === t.id ? "#4A9EFF" : "#445" }}>{t.label}</span>
                {screen === t.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4A9EFF" }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
