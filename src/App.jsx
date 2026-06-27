import React, { useState, useMemo, useContext, createContext, useEffect } from "react";
import {
  MapPin, Calendar, Sparkles, Moon, Landmark, Compass,
  Search, Mountain, CloudFog, Sun, Clock, ExternalLink,
  Tent, ShoppingBag, Coffee, Waves, Navigation,
  Gauge, Users, Info, Plane, Car, Stethoscope, Building2,
  Sprout, Route, Sunrise, Sunset, CloudDrizzle, CloudSun,
  Cloud, MoreHorizontal, X, Fuel, Footprints, Download, Share2, Star, Megaphone,
  Siren, ShieldAlert, Wallet, Phone, ClipboardList, MapPinned, ListOrdered,
  Bell, BellRing, AlertTriangle, RefreshCw, Thermometer, Wind, Droplets
} from "lucide-react";

/* ===================================================================
   LANGUAGE CONTEXT
=================================================================== */

const LangContext = createContext({ lang: "ar", t: null, theme: "light", th: null, liveWeather: null });
function XIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function useLang() {
  return useContext(LangContext);
}

// helper: resolve a {ar,en,hi} sentence object
function tx(obj, lang) {
  if (!obj) return "";
  return obj[lang] || obj.en || obj.ar || "";
}
// helper: resolve a name — Arabic stays Arabic, English used for both en & hi
function nm(item, lang) {
  return lang === "ar" ? item.nAr : item.nEn;
}
// helper: resolve a location/area label the same way
function lc(item, lang) {
  if (item.locAr === undefined) return undefined;
  return lang === "ar" ? item.locAr : item.locEn;
}

function mapsUrl(name, lang = "ar") {
  const suffix = lang === "ar" ? "ظفار صلالة عمان" : "Dhofar Salalah Oman";
  const q = encodeURIComponent(`${name} ${suffix}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
function mapsUrlCoord(lat, lng) {
  // Use maps/place URL format which navigates directly to coordinates
  return `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},15z`;
}

function bestUrl(item, lang) {
  if (item && item.lat != null && item.lng != null)
    return mapsUrlCoord(item.lat, item.lng);
  if (item && item.nEn)
    return mapsUrl(item.nEn + " Salalah Oman", lang);
  return mapsUrl(item && item.nAr ? item.nAr : "", lang);
}

function directionsUrl(destination, origin) {
  const d = encodeURIComponent(destination);
  const base = `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=driving`;
  return origin ? `${base}&origin=${encodeURIComponent(origin)}` : base;
}

/* ===================================================================
   WEATHER PATTERN MODEL (typical pattern by time of day — not a live feed)
=================================================================== */

function getWeatherNow(lang) {
  const hr = new Date().getHours();
  const isDay = hr >= 6 && hr < 18;
  let p;
  if (hr >= 5 && hr < 7)
    p = { key: "sunrise", icon: Sunrise, color: "#C98A2E",
      label: { ar: "شروق ضبابي", en: "Foggy Sunrise", hi: "धुंधला सूर्योदय", fr: "Lever de soleil brumeux" },
      desc: { ar: "ضباب خفيف يتلاشى تدريجياً مع شروق الشمس", en: "Light fog gradually clearing as the sun rises", hi: "सूर्योदय के साथ हल्का कोहरा धीरे-धीरे छंट रहा है", fr: "Brouillard léger se dissipant progressivement avec le lever du soleil" } };
  else if (hr >= 7 && hr < 11)
    p = { key: "fog", icon: CloudFog, color: "#6B8CA3",
      label: { ar: "ضباب صباحي", en: "Morning Fog", hi: "सुबह का कोहरा", fr: "Brouillard matinal" },
      desc: { ar: "ضباب كثيف على قمم الجبال، الرؤية محدودة", en: "Dense fog over the mountain tops, limited visibility", hi: "पहाड़ों की चोटियों पर घना कोहरा, सीमित दृश्यता", fr: "Brouillard dense sur les sommets, visibilité réduite" } };
  else if (hr >= 11 && hr < 15)
    p = { key: "cloudy", icon: Cloud, color: "#5C7A8A",
      label: { ar: "غائم", en: "Overcast", hi: "बादल छाए हुए", fr: "Couvert" },
      desc: { ar: "سماء ملبدة بالغيوم طوال فترة الظهيرة", en: "Overcast skies through the midday hours", hi: "दोपहर के समय आसमान बादलों से ढका रहता है", fr: "Ciel couvert tout au long de la journée" } };
  else if (hr >= 15 && hr < 17)
    p = { key: "drizzle", icon: CloudDrizzle, color: "#3C6E8F",
      label: { ar: "رذاذ خفيف", en: "Light Drizzle", hi: "हल्की बूंदाबांदी", fr: "Bruine légère" },
      desc: { ar: "احتمال هطول رذاذ متقطع وأجواء رطبة", en: "Chance of intermittent drizzle and humid air", hi: "रुक-रुक कर बूंदाबांदी और नम मौसम की संभावना", fr: "Risque de bruine intermittente et air humide" } };
  else if (hr >= 17 && hr < 19)
    p = { key: "sunset", icon: Sunset, color: "#B5582C",
      label: { ar: "غروب ضبابي", en: "Foggy Sunset", hi: "धुंधला सूर्यास्त", fr: "Coucher de soleil brumeux" },
      desc: { ar: "ضباب خفيف يكسو الأفق وقت الغروب", en: "A light fog covers the horizon at sunset", hi: "सूर्यास्त के समय क्षितिज पर हल्का कोहरा छाया रहता है", fr: "Un léger brouillard couvre l'horizon au coucher du soleil" } };
  else if (hr >= 19 && hr < 23)
    p = { key: "cloudynight", icon: CloudSun, color: "#4A5D6B",
      label: { ar: "غائم مساءً", en: "Cloudy Evening", hi: "बादल भरी शाम", fr: "Soirée nuageuse" },
      desc: { ar: "غيوم منخفضة وأجواء معتدلة مساءً", en: "Low clouds and mild weather in the evening", hi: "शाम के समय नीचे बादल और सुहावना मौसम", fr: "Nuages bas et température douce en soirée" } };
  else
    p = { key: "nightfog", icon: Moon, color: "#2F3E4D",
      label: { ar: "ضباب ليلي", en: "Night Fog", hi: "रात का कोहरा", fr: "Brouillard nocturne" },
      desc: { ar: "ضباب خفيف وبرودة لطيفة في الليل", en: "Light fog and pleasant cool air at night", hi: "रात में हल्का कोहरा और सुखद ठंडक", fr: "Brouillard léger et fraîcheur agréable la nuit" } };

  return {
    ...p,
    isDay,
    label: tx(p.label, lang),
    desc: tx(p.desc, lang),
    sky: isDay ? "linear-gradient(135deg,#FBE3B8,#F4C879)" : "linear-gradient(135deg,#202C49,#3C4C72)",
    text: isDay ? "#6B4A1A" : "#E7E9F2",
  };
}

// Last known real reading for Salalah (not a live continuous feed)
const LAST_KNOWN_TEMP = {
  celsius: 32,
  label: { ar: "غائم جزئياً", en: "Partly Cloudy", hi: "आंशिक रूप से बादल", fr: "Partiellement nuageux" },
};

// Daily condition palette used by the 7-day forecast pattern below
const WEATHER_CONDITIONS = {
  cloudy: { icon: Cloud, color: "#5C7A8A", label: { ar: "غائم", en: "Overcast", hi: "बादल छाए हुए", fr: "Couvert" } },
  fog: { icon: CloudFog, color: "#6B8CA3", label: { ar: "ضباب", en: "Fog", hi: "कोहरा", fr: "Brouillard" } },
  drizzle: { icon: CloudDrizzle, color: "#3C6E8F", label: { ar: "رذاذ خفيف", en: "Light Drizzle", hi: "हल्की बूंदाबांदी", fr: "Bruine légère" } },
  cloudysun: { icon: CloudSun, color: "#C98A2E", label: { ar: "غائم جزئياً", en: "Partly Cloudy", hi: "आंशिक बादल", fr: "Partiellement nuageux" } },
};

// Typical 7-day khareef pattern (NOT a live forecast feed — see disclaimer in the UI)
const FORECAST_7DAY = [
  { offset: 0, cond: "cloudysun", temp: 32 },
  { offset: 1, cond: "fog", temp: 31 },
  { offset: 2, cond: "drizzle", temp: 30 },
  { offset: 3, cond: "cloudy", temp: 32 },
  { offset: 4, cond: "fog", temp: 31 },
  { offset: 5, cond: "cloudy", temp: 33 },
  { offset: 6, cond: "drizzle", temp: 30 },
];

const weatherKeyframes = `
@keyframes wxFloat { 0%,100% { transform: translateY(0px);} 50% { transform: translateY(-4px);} }
@keyframes wxDrift { 0% { transform: translateX(-12%); opacity:.4;} 50% { opacity:.85;} 100% { transform: translateX(12%); opacity:.4;} }
@keyframes wxSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
@keyframes wxFall { 0% { transform: translateY(-6px); opacity:0;} 30% { opacity:1;} 100% { transform: translateY(16px); opacity:0;} }
@keyframes wxPulse { 0%,100% { opacity:.5; transform: scale(1);} 50% { opacity:1; transform: scale(1.12);} }
`;

function WeatherScene({ w }) {
  return (
    <div className="relative h-20 w-full overflow-hidden rounded-2xl" style={{ background: `linear-gradient(180deg, ${w.color}22, ${w.color}08)` }}>
      <div
        className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full"
        style={{ width: 34, height: 34, background: `${w.color}33`, animation: "wxPulse 2.6s ease-in-out infinite" }}
      />
      <w.icon
        size={30}
        color={w.color}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          animation:
            w.key === "sunrise" || w.key === "sunset"
              ? "wxSpin 14s linear infinite"
              : w.key === "drizzle"
              ? "wxFall 1.1s ease-in infinite"
              : "wxFloat 3.2s ease-in-out infinite",
        }}
      />
      {(w.key === "fog" || w.key === "nightfog" || w.key === "sunset") && (
        <>
          <div className="absolute bottom-3 h-1.5 w-2/3 rounded-full" style={{ left: "10%", background: `${w.color}55`, animation: "wxDrift 6s ease-in-out infinite" }} />
          <div className="absolute bottom-6 h-1.5 w-1/2 rounded-full" style={{ left: "30%", background: `${w.color}40`, animation: "wxDrift 8s ease-in-out infinite reverse" }} />
        </>
      )}
      {(w.key === "cloudy" || w.key === "cloudynight") && (
        <>
          <Cloud size={16} color={w.color} className="absolute left-[20%] top-4 opacity-60" style={{ animation: "wxFloat 4s ease-in-out infinite" }} />
          <Cloud size={20} color={w.color} className="absolute right-[18%] top-7 opacity-50" style={{ animation: "wxFloat 5s ease-in-out infinite .8s" }} />
        </>
      )}
      {w.key === "drizzle" && (
        <>
          <div className="absolute h-3 w-0.5 rounded-full" style={{ left: "30%", top: 10, background: w.color, animation: "wxFall 1s ease-in infinite .1s" }} />
          <div className="absolute h-3 w-0.5 rounded-full" style={{ left: "55%", top: 10, background: w.color, animation: "wxFall 1.2s ease-in infinite .4s" }} />
          <div className="absolute h-3 w-0.5 rounded-full" style={{ left: "70%", top: 10, background: w.color, animation: "wxFall .9s ease-in infinite .2s" }} />
        </>
      )}
    </div>
  );
}

function WeatherBadge() {
  const { lang, t, theme, liveWeather, refetchWeather } = useLang();
  const th = THEMES[theme];
  const pattern = getWeatherNow(lang);

  // Always prefer live data
  const temp = liveWeather ? Math.round(liveWeather.current.temperature_2m) : LAST_KNOWN_TEMP.celsius;
  const code = liveWeather?.current?.weather_code ?? null;
  const label = code != null ? wmoLabel(code, lang) : pattern.label;
  const BIcon = code != null ? wmoIcon(code) : pattern.icon;
  const color = code != null ? wmoColor(code) : pattern.color;
  const isLive = !!liveWeather;

  return (
    <button
      type="button"
      onClick={refetchWeather}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition active:scale-95"
      style={{ background: pattern.sky }}
      title={isLive ? (lang==="ar"?"بيانات حية":"Live data") : (lang==="ar"?"نمط تقديري":"Estimated")}
    >
      <BIcon size={15} color={pattern.text} />
      <span className="text-[11px] font-bold" style={{ color: pattern.text, fontFamily: "Tajawal" }}>
        {temp}°{lang === "ar" ? "م" : "C"}
      </span>
      <span className="text-[10px] font-medium opacity-90" style={{ color: pattern.text, fontFamily: "Tajawal" }}>
        · {label}
      </span>
      <span className="text-[9px]">{isLive ? "🟢" : "⭕"}</span>
    </button>
  );
}

/* ===================================================================
   SHARED LABEL DICTIONARIES (categories used across many items)
=================================================================== */

const TYPE_LABELS = {
  govHospital: { ar: "حكومي - رعاية ثالثية", en: "Government – Tertiary Care", hi: "सरकारी – तृतीयक देखभाल", fr: "Public – Soins tertiaires" },
  gov: { ar: "حكومي", en: "Government", hi: "सरकारी", fr: "Public" },
  govHealthCenter: { ar: "مركز صحي حكومي", en: "Government Health Center", hi: "सरकारी स्वास्थ्य केंद्र", fr: "Centre de santé public" },
  private: { ar: "خاص", en: "Private", hi: "निजी", fr: "Privé" },
  privateClinic: { ar: "عيادة خاصة", en: "Private Clinic", hi: "निजी क्लीनिक", fr: "Clinique privée" },
  govMuseum: { ar: "متحف حكومي", en: "Government Museum", hi: "सरकारी संग्रहालय", fr: "Musée national" },
  royalFarm: { ar: "مزرعة سلطانية", en: "Royal Farm", hi: "शाही फार्म", fr: "Ferme royale" },
  royalFarmPartial: { ar: "مزرعة سلطانية مفتوحة جزئياً", en: "Royal Farm (Partially Open)", hi: "शाही फार्म (आंशिक रूप से खुला)", fr: "Ferme royale (partiellement ouverte)" },
  govPark: { ar: "حديقة حكومية", en: "Government Park", hi: "सरकारी पार्क", fr: "Parc public" },
};

const LEVEL_LABELS = {
  easy: { ar: "سهل", en: "Easy", hi: "आसान", fr: "Facile" },
  moderate: { ar: "متوسط", en: "Moderate", hi: "मध्यम", fr: "Modéré" },
  hard: { ar: "صعب", en: "Hard", hi: "कठिन", fr: "Difficile" },
};

/* ===================================================================
   DATA
=================================================================== */

const APP_DOWNLOAD_URL = "https://khareef-dhofar.vercel.app";
const APP_VERSION = "1.48";

// Salalah coordinates for Open-Meteo live weather (no API key needed)
const SALALAH_LAT = 17.0151;
const SALALAH_LNG = 54.0924;
const WEATHER_API = `https://api.open-meteo.com/v1/forecast?latitude=${SALALAH_LAT}&longitude=${SALALAH_LNG}&current=temperature_2m,weather_code,cloud_cover,precipitation_probability,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Asia%2FMuscat&forecast_days=7`;

// WMO code → label (4 languages)
function wmoLabel(code, lang) {
  const m = {
    0:{ ar:"صافٍ",en:"Clear",hi:"साफ",fr:"Clair"},
    1:{ ar:"صافٍ جزئياً",en:"Mainly Clear",hi:"मुख्यतः साफ",fr:"Dégagé"},
    2:{ ar:"غائم جزئياً",en:"Partly Cloudy",hi:"आंशिक बादल",fr:"Partiellement nuageux"},
    3:{ ar:"غائم",en:"Overcast",hi:"बादल छाए",fr:"Couvert"},
    45:{ ar:"ضباب",en:"Fog",hi:"कोहरा",fr:"Brouillard"},
    48:{ ar:"ضباب كثيف",en:"Dense Fog",hi:"घना कोहरा",fr:"Brouillard dense"},
    51:{ ar:"رذاذ خفيف",en:"Light Drizzle",hi:"हल्की बूंदाबांदी",fr:"Bruine légère"},
    53:{ ar:"رذاذ",en:"Drizzle",hi:"बूंदाबांदी",fr:"Bruine"},
    61:{ ar:"مطر خفيف",en:"Light Rain",hi:"हल्की बारिश",fr:"Pluie légère"},
    63:{ ar:"مطر",en:"Rain",hi:"बारिश",fr:"Pluie"},
    65:{ ar:"مطر غزير",en:"Heavy Rain",hi:"भारी बारिश",fr:"Pluie forte"},
    80:{ ar:"زخات مطر",en:"Showers",hi:"बारिश की फुहारें",fr:"Averses"},
    95:{ ar:"عاصفة رعدية",en:"Thunderstorm",hi:"तूफान",fr:"Orage"},
  };
  const entry = m[code] || m[3];
  return lang==="ar"?entry.ar:lang==="hi"?entry.hi:lang==="fr"?entry.fr:entry.en;
}

function wmoIcon(code) {
  if (code===0||code===1) return CloudSun;
  if (code<=3) return Cloud;
  if (code<=48) return CloudFog;
  if (code<=65) return CloudDrizzle;
  if (code<=82) return CloudDrizzle;
  return Cloud;
}

function wmoColor(code) {
  if (code<=1) return "#C98A2E";
  if (code<=3) return "#5C7A8A";
  if (code<=48) return "#6B8CA3";
  return "#3C6E8F";
}

// Alert system — /alert.json on Vercel CDN, updated by admin on GitHub
const ALERT_SEEN_KEY = "khareef_alert_seen_id";



const SOCIAL = [
  { handle: "@khareefdhofar", url: "https://x.com/khareefdhofar" },
  { handle: "@dhofar_mun", url: "https://x.com/dhofar_mun" },
];

/* ===================================================================
   INSTAGRAM FEEDS — Powered by Behold.so (free plan)
   Update public/featured.json to add posts from X (Twitter)
   Replace BEHOLD_FEED_ID_X below with your actual IDs from Behold
=================================================================== */
const INSTAGRAM_FEEDS = [
  {
    nameAr: "@omanfox",
    nameEn: "@omanfox",
    handle: "@omanfox",
    url: "https://www.instagram.com/omanfox/",
    feedId: "izROJ9pQq69ESBBrW",
    color: "#2F5D45",
  },
  // أضف حسابات أخرى هنا بعد ربطها في Behold:
  // {
  //   nameAr: "اسم الحساب",
  //   handle: "@handle",
  //   url: "https://www.instagram.com/handle/",
  //   feedId: "BEHOLD_FEED_ID",
  //   color: "#C98A2E",
  // },
];



const TAG_LABELS = {
  walkway: { ar: "ممشى", en: "Walkway", hi: "वॉकवे", fr: "Promenade" },
  rides: { ar: "ألعاب", en: "Rides & Games", hi: "राइड्स और गेम्स", fr: "Manèges et jeux" },
  restaurants: { ar: "مطاعم", en: "Restaurants", hi: "रेस्तरां", fr: "Restaurants" },
  worldCup: { ar: "مهرجان كأس العالم", en: "World Cup Festival", hi: "वर्ल्ड कप उत्सव", fr: "Festival de la Coupe du Monde" },
  worldCupFanFest: { ar: "مهرجان صلالة لمشجعي كأس العالم", en: "Salalah Festival for World Cup Fans", hi: "विश्व कप प्रशंसकों के लिए सलालाह उत्सव", fr: "Festival de Salalah pour les fans de la Coupe du Monde" },
  gameCity: { ar: "مدينة الألعاب", en: "Game City", hi: "गेम सिटी", fr: "Cité des jeux" },
  kidsCity: { ar: "مدينة ترفيهية وتعليمية ومهنية للأطفال والعائلة", en: "An entertainment, educational & career city for kids and families", hi: "बच्चों और परिवारों के लिए मनोरंजन, शिक्षा और करियर सिटी", fr: "Une cité ludique, éducative et professionnelle pour enfants et familles" },
  pilotsCity: { ar: "مدينة الطيارين", en: "Pilots City", hi: "पायलट्स सिटी", fr: "Cité des pilotes" },
  engineeringCity: { ar: "المدينة الهندسية", en: "Engineering City", hi: "इंजीनियरिंग सिटी", fr: "Cité de l'ingénierie" },
  talentsCity: { ar: "مدينة المواهب", en: "Talents City", hi: "टैलेंट्स सिटी", fr: "Cité des talents" },
  worldShows: { ar: "العروض العالمية", en: "International Shows", hi: "अंतर्राष्ट्रीय शो", fr: "Spectacles internationaux" },
  heritageFest: { ar: "مهرجان تراثي", en: "Heritage Festival", hi: "विरासत उत्सव", fr: "Festival du patrimoine" },
  ourArts: { ar: "فنوننا", en: "Our Arts", hi: "हमारी कलाएं", fr: "Nos arts" },
  ourMarkets: { ar: "اسواقنا", en: "Our Markets", hi: "हमारे बाज़ार", fr: "Nos marchés" },
  ourPast: { ar: "ماضينا", en: "Our Past", hi: "हमारा अतीत", fr: "Notre passé" },
  ourHeritage: { ar: "موروثنا", en: "Our Heritage", hi: "हमारी विरासत", fr: "Notre héritage" },
  ourCustoms: { ar: "عاداتنا وتقاليدنا", en: "Our Customs & Traditions", hi: "हमारी रीति-रिवाज़ और परंपराएं", fr: "Nos coutumes et traditions" },
  mainFest: { ar: "المهرجان العام", en: "Main Festival", hi: "मुख्य उत्सव", fr: "Festival principal" },
  atinTheatre: { ar: "مسرح ساحة اتين", en: "Atin Square Theatre", hi: "अतिन स्क्वायर थिएटर", fr: "Théâtre de la place Atin" },
  perfumeStreet: { ar: "شارع العطور", en: "Perfume Street", hi: "इत्र गली", fr: "Rue des parfums" },
  restaurantRow: { ar: "ردهة المطاعم", en: "Restaurant Row", hi: "रेस्तरां पंक्ति", fr: "Allée des restaurants" },
  sportsPrograms: { ar: "برامج رياضية", en: "Sports Programs", hi: "खेल कार्यक्रम", fr: "Programmes sportifs" },
  awarenessPrograms: { ar: "برامج توعوية", en: "Awareness Programs", hi: "जागरूकता कार्यक्रम", fr: "Programmes de sensibilisation" },
  sculptureCompetition: { ar: "مسابقة نحت دولية", en: "International Sculpture Competition", hi: "अंतर्राष्ट्रीय मूर्तिकला प्रतियोगिता", fr: "Concours international de sculpture" },
  theatrePerformances: { ar: "عروض مسرحية دولية", en: "International Theatre Performances", hi: "अंतर्राष्ट्रीय रंगमंच प्रदर्शन", fr: "Représentations théâtrales internationales" },
};


const DHOFAR_WEATHER_REGIONS = [
  { id: "salalah",  nameAr: "صلالة",        nameEn: "Salalah",    lat: 17.0151, lng: 54.0924 },
  { id: "mughsail", nameAr: "المغسيل",       nameEn: "Mughsail",   lat: 16.8794, lng: 53.7766 },
  { id: "rakhyut",  nameAr: "رخيوت",         nameEn: "Rakhyut",    lat: 16.7491, lng: 53.4378 },
  { id: "taqah",    nameAr: "طاقة",          nameEn: "Taqah",      lat: 17.0334, lng: 54.3942 },
  { id: "mirbat",   nameAr: "مرباط",         nameEn: "Mirbat",     lat: 16.9925, lng: 54.6916 },
  { id: "sadah",    nameAr: "سدح",           nameEn: "Sadah",      lat: 17.0299, lng: 54.7851 },
  { id: "thumrait", nameAr: "ثمريت (شمال)", nameEn: "Thumrait",   lat: 17.6617, lng: 54.0319 },
];

function rainLabel(code, lang) {
  const isRain = code >= 51 && code <= 99;
  const isFog  = code === 45 || code === 48;
  const isCloudy = code >= 2 && code <= 3;
  if (isRain) return lang === "ar" ? "🌧️ أمطار" : "🌧️ Rain";
  if (isFog)  return lang === "ar" ? "🌫️ ضباب"  : "🌫️ Fog";
  if (isCloudy) return lang === "ar" ? "⛅ غيوم" : "⛅ Cloudy";
  return lang === "ar" ? "☀️ صحو" : "☀️ Clear";
}
function rainColor(code) {
  if (code >= 51 && code <= 99) return "#3C6E8F";
  if (code === 45 || code === 48) return "#888";
  if (code >= 2) return "#7AA87A";
  return "#C98A2E";
}

const EVENTS = [
  {
    nAr: "الواجهة العصرية (أب تاون)", nEn: "Modern Frontage (Uptown)",
    placeAr: "سهل اتين", placeEn: "Atin Plain",
    fromAr: "21 يونيو", toAr: "20 سبتمبر", fromEn: "Jun 21", toEn: "Sep 20", fromHi: "21 जून", toHi: "20 सितंबर",
    tags: ["walkway", "rides", "restaurants", "worldCupFanFest", "gameCity", "worldShows"],
    color: "#2F5D45", crowdBase: "fest",
    lat: 17.0567545, lng: 54.0650162},
  {
    nAr: "حديقة وقت الطفل", nEn: "Kid's Time",
    placeAr: "حديقة عوقد", placeEn: "Auqad Park",
    fromAr: "5 يوليو", toAr: "5 سبتمبر", fromEn: "Jul 5", toEn: "Sep 5", fromHi: "5 जुलाई", toHi: "5 सितंबर",
    tags: ["kidsCity", "pilotsCity", "engineeringCity", "talentsCity"],
    color: "#C98A2E", crowdBase: "fest",
    lat: 17.0174522, lng: 54.0357409},
  {
    nAr: "فعاليات عودة الماضي", nEn: "Return of the Past",
    placeAr: "السعادة", placeEn: "Al Saada",
    fromAr: "10 يوليو", toAr: "31 أغسطس", fromEn: "Jul 10", toEn: "Aug 31", fromHi: "10 जुलाई", toHi: "31 अगस्त",
    tags: ["heritageFest", "ourArts", "ourMarkets", "ourPast", "ourHeritage", "ourCustoms"],
    color: "#B5582C", crowdBase: "festHigh",
    lat: 17.0594084, lng: 54.1417767},
  {
    nAr: "ساحة أتين (أتين سكوير)", nEn: "Atin Square",
    placeAr: "سهل اتين", placeEn: "Atin Plain",
    fromAr: "15 يوليو", toAr: "31 أغسطس", fromEn: "Jul 15", toEn: "Aug 31", fromHi: "15 जुलाई", toHi: "31 अगस्त",
    tags: ["mainFest", "atinTheatre", "perfumeStreet", "restaurantRow"],
    color: "#4C7A3D", crowdBase: "festHigh",
    lat: 17.0749228, lng: 54.0688028},
  {
    nAr: "الحديقة الصحية", nEn: "Health Park",
    placeAr: "حديقة صلالة العامة", placeEn: "Salalah Public Park",
    fromAr: "25 يونيو", toAr: "20 سبتمبر", fromEn: "Jun 25", toEn: "Sep 20", fromHi: "25 जून", toHi: "20 सितंबर",
    tags: ["sportsPrograms", "awarenessPrograms"],
    color: "#1FA37D", crowdBase: "fest",
    lat: 17.0124515, lng: 54.0704936},
  {
    nAr: "مهرجان ظفار الدولي للنحت (الدورة الأولى)", nEn: "Dhofar International Sculpture Festival (1st Edition)",
    placeAr: "صلالة", placeEn: "Salalah",
    fromAr: "15 أغسطس", toAr: "3 سبتمبر", fromEn: "Aug 15", toEn: "Sep 3", fromHi: "15 अगस्त", toHi: "3 सितंबर",
    tags: ["sculptureCompetition"],
    color: "#C98A2E", crowdBase: "fest",
  },
  {
    nAr: "مهرجان ظفار الدولي للمسرح (الدورة الثانية)", nEn: "Dhofar International Theatre Festival (2nd Edition)",
    placeAr: "صلالة", placeEn: "Salalah",
    fromAr: "14 سبتمبر", toAr: "22 سبتمبر", fromEn: "Sep 14", toEn: "Sep 22", fromHi: "14 सितंबर", toHi: "22 सितंबर",
    tags: ["theatrePerformances"],
    color: "#6B4FA0", crowdBase: "fest",
  },
];

const COMPANION_SITES = [
  { nAr: "الغارف", nEn: "Al Gharef",
    desc: { ar: "مقاهي ومطاعم وسط أجواء زراعية خضراء، مكان هادئ للاسترخاء بعد جولات الطبيعة.", en: "Cafés and restaurants set in a green farm-like atmosphere — a relaxing stop after a day exploring nature.", hi: "हरे-भरे कृषि वातावरण में कैफे और रेस्तरां — प्रकृति यात्रा के बाद आराम करने की एक शांत जगह।", fr: "Cafés et restaurants dans une ambiance agricole verdoyante — un endroit paisible pour se détendre après une excursion nature." , lat: 17.0125313, lng: 54.1127123} },
  { nAr: "نوفا", nEn: "Nova",
    desc: { ar: "مجمع ترفيهي وتجاري حديث يجمع المقاهي والمحال في أجواء عصرية.", en: "A modern entertainment and retail complex combining cafés and shops in a contemporary setting.", hi: "एक आधुनिक मनोरंजन और रिटेल कॉम्प्लेक्स जो कैफे और दुकानों को समकालीन माहौल में जोड़ता है।", fr: "Un complexe moderne de divertissement et de commerces alliant cafés et boutiques dans une ambiance contemporaine." , lat: 17.0424722, lng: 54.0624964} },
  { nAr: "اوسارا", nEn: "Ausara",
    desc: { ar: "منطقة مطلة على شاطئ ريسوت، تجمع بين المطاعم والأجواء البحرية المسائية.", en: "An area overlooking Raysut beach, combining restaurants with an evening seaside atmosphere.", hi: "रायसुत समुद्र तट को निहारता एक क्षेत्र, रेस्तरां और शाम के समुद्री माहौल का मिश्रण।", fr: "Un secteur donnant sur la plage de Raysut, combinant restaurants et ambiance maritime en soirée." , lat: 16.9662899, lng: 54.0037033} },
  { nAr: "واجهة شاطيء ريسوت", nEn: "Raysut Beach Front",
    desc: { ar: "ممشى ساحلي بإطلالة مباشرة على شاطئ ريسوت، مناسب للمشي والجلسات المسائية.", en: "A coastal promenade directly overlooking Raysut beach, ideal for walks and evening sit-downs.", hi: "रायसुत समुद्र तट के सामने एक तटीय वॉकवे, टहलने और शाम बैठने के लिए उपयुक्त।", fr: "Une promenade côtière donnant directement sur la plage de Raysut, idéale pour les balades et soirées." , lat: 16.9676977, lng: 54.0058121} },
  { nAr: "لامير المغسيل", nEn: "La Mer",
    desc: { ar: "مطاعم ومقاهي بإطلالة بحرية أنيقة، من الوجهات المفضلة للسهرات المسائية.", en: "Restaurants and cafés with an elegant seaside view, a popular spot for evening outings.", hi: "खूबसूरत समुद्री दृश्य वाले रेस्तरां और कैफे, शाम की सैर के लिए एक लोकप्रिय जगह।", fr: "Restaurants et cafés avec une élégante vue sur la mer, un lieu prisé pour les sorties en soirée." , lat: 17.0193, lng: 54.0868} },
  { nAr: "مسرح المروج", nEn: "Al Muruj Theatre",
    desc: { ar: "مسرح مفتوح يستضيف فعاليات وعروضاً مصاحبة لموسم الخريف.", en: "An open-air theatre hosting shows and events that accompany the khareef season.", hi: "एक ओपन-एयर थिएटर जो ख़रीफ़ सीज़न के साथ होने वाले कार्यक्रमों और शो की मेज़बानी करता है।", fr: "Un théâtre en plein air accueillant spectacles et événements accompagnant la saison du khareef." , lat: 17.0416281, lng: 54.0558082} }
  
  
  ,
];

const BEST_PERIODS = [
  { periodAr: "21 إلى 30 يونيو", periodEn: "Jun 21–30", periodHi: "21–30 जून", pct: 20, fest: 15, nature: 15, weather: 30 },
  { periodAr: "1 إلى 10 يوليو", periodEn: "Jul 1–10", periodHi: "1–10 जुलाई", pct: 35, fest: 35, nature: 35, weather: 35 },
  { periodAr: "10 إلى 20 يوليو", periodEn: "Jul 10–20", periodHi: "10–20 जुलाई", pct: 50, fest: 70, nature: 40, weather: 50 },
  { periodAr: "20 إلى 31 يوليو", periodEn: "Jul 20–31", periodHi: "20–31 जुलाई", pct: 75, fest: 90, nature: 70, weather: 75 },
  { periodAr: "شهر أغسطس كامل", periodEn: "All of August", periodHi: "पूरा अगस्त माह", pct: 100, fest: 100, nature: 100, weather: 100 },
  { periodAr: "1 إلى 10 سبتمبر", periodEn: "Sep 1–10", periodHi: "1–10 सितंबर", pct: 60, fest: 20, nature: 80, weather: 50 },
  { periodAr: "10 إلى 21 سبتمبر", periodEn: "Sep 10–21", periodHi: "10–21 सितंबर", pct: 35, fest: 0, nature: 80, weather: 35 },
];

const FUEL_STATIONS = [
  // ── صلالة المدينة ───────────────────────────────────────────────
  { nAr: "محطة ظفار – عوقد", nEn: "Dhofar Station – Auqad", locAr: "عوقد، صلالة", locEn: "Auqad, Salalah", lat: 17.0084, lng: 54.0208, h24: true, company: "عُمان أويل" },
  { nAr: "محطة ريسوت – شل", nEn: "Raysut – Shell", locAr: "ريسوت، صلالة", locEn: "Raysut, Salalah", lat: 17.0037, lng: 54.0387, h24: true, company: "Shell" },
  { nAr: "محطة الوادي – عُمان أويل", nEn: "Al Wadi – Oman Oil", locAr: "الوادي، صلالة", locEn: "Al Wadi, Salalah", lat: 17.0215, lng: 54.0690, h24: true, company: "عُمان أويل" },
  { nAr: "محطة اتين – عُمان أويل", nEn: "Atin – Oman Oil", locAr: "اتين، صلالة", locEn: "Atin, Salalah", lat: 17.0437, lng: 54.0626, h24: true, company: "عُمان أويل" },
  { nAr: "محطة السلام – عُمان أويل", nEn: "Al Salam – Oman Oil", locAr: "صلالة", locEn: "Salalah", lat: 17.0112, lng: 54.0856, h24: true, company: "عُمان أويل" },
  { nAr: "محطة الدهاريز – عُمان أويل", nEn: "Al Dahariz – Oman Oil", locAr: "الدهاريز، صلالة", locEn: "Al Dahariz, Salalah", lat: 17.0254, lng: 54.1715, h24: true, company: "عُمان أويل" },
  { nAr: "محطة السعادة – شل", nEn: "Al Saada – Shell", locAr: "السعادة، صلالة", locEn: "Al Saada, Salalah", lat: 17.0825, lng: 54.1588, h24: true, company: "Shell" },
  // ── شرق صلالة ───────────────────────────────────────────────────
  { nAr: "محطة صحلنوت – طاقة الغربية", nEn: "Sahalnout – West Taqah", locAr: "طاقة الغربية", locEn: "West Taqah", lat: 17.0486, lng: 54.2116, h24: true, company: "عُمان أويل" },
  { nAr: "محطة شل – طاقة", nEn: "Shell – Taqah", locAr: "طاقة", locEn: "Taqah", lat: 17.0408, lng: 54.3686, h24: true, company: "Shell" },
  { nAr: "محطة عُمان أويل – طاقة", nEn: "Oman Oil – Taqah", locAr: "طاقة", locEn: "Taqah", lat: 17.0496, lng: 54.3908, h24: true, company: "عُمان أويل" },
  { nAr: "محطة عُمان أويل – مرباط", nEn: "Oman Oil – Mirbat", locAr: "مرباط", locEn: "Mirbat", lat: 16.9976, lng: 54.7281, h24: true, company: "عُمان أويل" },
  // ── شمال صلالة – ثمريت ──────────────────────────────────────────
  { nAr: "محطة المها – ثمريت", nEn: "Al Maha – Thumrait", locAr: "ثمريت", locEn: "Thumrait", lat: 17.6048, lng: 54.0326, h24: true, company: "Al Maha" },
  { nAr: "محطة شل – ثمريت", nEn: "Shell – Thumrait", locAr: "ثمريت", locEn: "Thumrait", lat: 17.6107, lng: 54.0354, h24: true, company: "Shell" },
  { nAr: "محطة عُمان أويل – ثمريت", nEn: "Oman Oil – Thumrait", locAr: "ثمريت", locEn: "Thumrait", lat: 17.6554, lng: 54.0597, h24: true, company: "عُمان أويل" },
  // ── الغرب البعيد ────────────────────────────────────────────────
  { nAr: "محطة حسن – المزيونة", nEn: "Hassan Station – Al Mazyounah", locAr: "المزيونة", locEn: "Al Mazyounah", lat: 17.8437, lng: 52.6636, h24: true, company: "محلية" },
];

const HIKING_TRAILS = [
  // ── المسارات الساحلية والسهلية (سهل إلى متوسط) ─────────────────────────────
  { no:1, nAr:"مسار وادي دربات", nEn:"Wadi Darbat Trail", lat:17.107690, lng:54.452799, level:"easy", km:4, durAr:"2 س", durEn:"2 hrs", durHi:"2 घं", elev:250, fourByFour:false, camp:5 },
  { no:2, nAr:"مسار عين حشير وأشجار التبلدي", nEn:"Ayn Ishat / Baobab Trail", lat:17.029853, lng:54.218536, level:"easy", km:4, durAr:"2 س", durEn:"2 hrs", durHi:"2 घं", elev:300, fourByFour:false, camp:4 },
  { no:3, nAr:"مسار المغسيل", nEn:"Al Mughsayl Trail", lat:16.866037, lng:53.774439, level:"easy", km:3, durAr:"1.5 س", durEn:"1.5 hrs", durHi:"1.5 घं", elev:120, fourByFour:false, camp:4 },
  { no:4, nAr:"مسار عين رزات", nEn:"Ayn Razat Trail", lat:17.126588, lng:54.269093, level:"easy", km:2, durAr:"1 س", durEn:"1 hr", durHi:"1 घं", elev:180, fourByFour:false, camp:4 },
  { no:5, nAr:"مسار عين أثوم", nEn:"Ayn Athum Trail", lat:17.113241, lng:54.360564, level:"easy", km:2.5, durAr:"1.5 س", durEn:"1.5 hrs", durHi:"1.5 घं", elev:200, fourByFour:false, camp:4 },
  { no:6, nAr:"مسار عين جرزيز", nEn:"Ayn Jarziz Trail", lat:17.153920, lng:54.128761, level:"easy", km:8, durAr:"3 س", durEn:"3 hrs", durHi:"3 घं", elev:350, fourByFour:false, camp:4 },
  { no:7, nAr:"مسار عين صحلنوت", nEn:"Ayn Sahalnot Trail", lat:17.165412, lng:54.208451, level:"easy", km:4, durAr:"2 س", durEn:"2 hrs", durHi:"2 घं", elev:280, fourByFour:false, camp:4 },
  { no:8, nAr:"مسار عين طبيرق", nEn:"Ayn Tubruq Trail", lat:17.126435, lng:54.321855, level:"easy", km:2, durAr:"1 س", durEn:"1 hr", durHi:"1 घं", elev:220, fourByFour:false, camp:3 },
  { no:9, nAr:"مسار عين حمران", nEn:"Ayn Hamran Trail", lat:17.067342, lng:54.428522, level:"easy", km:3, durAr:"1.5 س", durEn:"1.5 hrs", durHi:"1.5 घं", elev:250, fourByFour:false, camp:4 },
  { no:10, nAr:"مسار وادي نحيز", nEn:"Wadi Nahiz Trail", lat:17.152837, lng:54.020478, level:"moderate", km:6, durAr:"3 س", durEn:"3 hrs", durHi:"3 घं", elev:600, fourByFour:false, camp:4 },
  // ── مسارات المغامرة الجبلية والأودية (متوسط إلى وعر) ─────────────────────
  { no:11, nAr:"مسار جبل سمحان", nEn:"Jabal Samhan Trail", lat:17.135263, lng:54.790598, level:"hard", km:12, durAr:"5 س", durEn:"5 hrs", durHi:"5 घं", elev:1400, fourByFour:true, camp:5 },
  { no:12, nAr:"مسار شلالات عين نكبت", nEn:"Ayn Nakbat Waterfalls", lat:17.086432, lng:54.437192, level:"hard", km:15, durAr:"6 س", durEn:"6 hrs", durHi:"6 घं", elev:900, fourByFour:true, camp:4 },
  { no:13, nAr:"مسار عين روب – رخيوت", nEn:"Ayn Rub – Rakhyut", lat:16.745634, lng:53.670155, level:"moderate", km:3.5, durAr:"2 س", durEn:"2 hrs", durHi:"2 घं", elev:400, fourByFour:true, camp:4 },
  { no:14, nAr:"مسار حفرة طيق وطوي أعتير", nEn:"Tawi Atair Sinkhole Trail", lat:17.120278, lng:54.310793, level:"moderate", km:5, durAr:"2.5 س", durEn:"2.5 hrs", durHi:"2.5 घं", elev:800, fourByFour:false, camp:4 },
  { no:15, nAr:"مسار كهف طيق", nEn:"Tayq Cave Trail", lat:17.129334, lng:54.269412, level:"hard", km:4, durAr:"3 س", durEn:"3 hrs", durHi:"3 घं", elev:900, fourByFour:false, camp:4 },
  { no:16, nAr:"مسار جبل القمر", nEn:"Jabal Qamar Trail", lat:16.903415, lng:53.619043, level:"hard", km:7, durAr:"4 س", durEn:"4 hrs", durHi:"4 घं", elev:1200, fourByFour:true, camp:5 },
  { no:17, nAr:"مسار جوجب", nEn:"Jowja Trail", lat:17.040921, lng:54.024512, level:"moderate", km:6, durAr:"3 س", durEn:"3 hrs", durHi:"3 घं", elev:700, fourByFour:true, camp:4 },
  { no:18, nAr:"مسار جبل الحصن – طاقة", nEn:"Jabal Al Husn Trail", lat:17.042534, lng:54.398031, level:"moderate", km:8, durAr:"4 س", durEn:"4 hrs", durHi:"4 घं", elev:800, fourByFour:false, camp:4 },
  { no:19, nAr:"مسار شعت", nEn:"Shaat Viewpoint Trail", lat:16.711534, lng:53.118921, level:"hard", km:4, durAr:"2.5 س", durEn:"2.5 hrs", durHi:"2.5 घं", elev:900, fourByFour:true, camp:4 },
  { no:20, nAr:"مسار ضلكوت وديم", nEn:"Dhalkut & Deim Trail", lat:16.700312, lng:53.245831, level:"moderate", km:6, durAr:"3 س", durEn:"3 hrs", durHi:"3 घं", elev:400, fourByFour:false, camp:4 },
];

const BEST_CAMPING_SPOTS = [
  { nAr: "جبل سمحان (إطلالات السحاب والشروق)", nEn: "Jabal Samhan (cloud & sunrise views)" , lat: 17.1121, lng: 54.7119},
  { nAr: "الفزايح", nEn: "Al Fazayeh" },
  { nAr: "وادي حنة", nEn: "Wadi Hinna" },
  { nAr: "جوجب", nEn: "Jujub" },
  { nAr: "جبل القمر", nEn: "Jabal Al Qamar" },
  { nAr: "عين خويت", nEn: "Ayn Khuwait" },
  { nAr: "طوي أعتير", nEn: "Tawi Atair" , lat: 17.1237, lng: 54.5867},
  { nAr: "رأس الجمل بالمغسيل", nEn: "Ras Al Jamal, Mughsail" , lat: 16.9602, lng: 53.8701},
];

const TOP5_HIKER_TRAILS = [
  { nAr: "جبل القمر الغربي (18 كم)", nEn: "Western Jabal Al Qamar (18 km)" , lat: 16.76, lng: 53.54},
  { nAr: "دربات – طوي أعتير (14 كم)", nEn: "Darbat – Tawi Atair (14 km)" , lat: 17.0778, lng: 54.4389},
  { nAr: "جبل سمحان الشرقي", nEn: "Eastern Jabal Samhan" },
  { nAr: "جوجب – الشلالات", nEn: "Jujub – Waterfalls" }
  ,
];

const REGIONS = {
  west: {
    label: { ar: "جهة الغرب", en: "Western Area", hi: "पश्चिमी क्षेत्र", fr: "Zone Ouest" },
    icon: Mountain,
    color: "#2F5D45",
    note: {
      ar: "مابعد المغسيل مناطق بعيدة، يفضل فوروفيل. إذا عندك أكثر من يوم يمكن تضيفها للجدول. ولاية رخيوت (شعت، الفرزايج، الحوطة) وولاية ضلكوت بالقرب من الحدود اليمنية.",
      en: "Beyond Mughsail the areas are remote and a 4x4 is preferred. If you have more than one day, add them to your itinerary. Rakhyut (Sha'at, Al Farzayej, Al Hawta) and Dalkut are near the Yemen border.",
      hi: "मुग़सैल के बाद के क्षेत्र दूर हैं, 4x4 वाहन बेहतर रहेगा। यदि आपके पास एक से अधिक दिन हैं तो इन्हें यात्रा कार्यक्रम में जोड़ें। रखयूत (शअत, अल फ़रज़ाएज, अल हौता) और दलकूत यमन सीमा के पास हैं।",
      fr: "Au-delà de Mughsail, les zones sont reculées et un 4x4 est préférable. Si vous avez plus d'une journée, ajoutez-les à votre itinéraire. Rakhyut (Sha'at, Al Farzayej, Al Hawta) et Dalkut sont proches de la frontière yéménite.",
    },
    spots: [
      { nAr: "عين كور", nEn: "Ayn Khor", km: 21, extra: { ar: "(فوروفيل)", en: "(4x4 only)", hi: "(केवल 4x4)" } , lat: 17.048874, lng: 53.963692},
      { nAr: "افتلقوت", nEn: "Aftalqut", km: 38, extra: { ar: "(فوروفيل)", en: "(4x4 only)", hi: "(केवल 4x4)" , lat: 17.0512, lng: 53.9823} },
      { nAr: "نوافير المغسيل", nEn: "Mughsail Waterfalls", km: 44, extra: { ar: "طريق صعب نوعاً ما للمبتدئين", en: "Fairly difficult route for beginners", hi: "शुरुआती लोगों के लिए कुछ कठिन रास्ता" }, crowdBase: "natureHigh" , lat: 16.9602, lng: 53.8701},
      { nAr: "شعت", nEn: "Sha'at", km: 83 },
      { nAr: "إطلالة رخيوت", nEn: "Rakhyut", km: 110 , spotType: "viewpoint", spotDescAr: "ولاية ساحلية جبلية بعيدة بطبيعة بكر ومناظر استثنائية بين الجبال والبحر.", spotDescEn: "A remote coastal mountain wilayat with pristine nature and exceptional scenery.", lat: 16.7491631, lng: 53.4377971},
      { nAr: "إطلالة ضلكوت", nEn: "Dalkut", km: 155 , spotType: "mountain", spotDescAr: "ولاية في أقصى الغرب تجمع بين الطبيعة الجبلية الخلابة وضباب الخريف الكثيف.", spotDescEn: "A far-western wilayat combining stunning mountain nature with dense khareef mist.", lat: 16.711611, lng: 53.212773},
      { nAr: "شجرة التبلدي (البولاب) – ضلكوت", nEn: "Dalkut Baobab Tree", km: 157, extra: { ar: "من أضخم أشجار شبه الجزيرة العربية", en: "One of the largest trees on the Arabian Peninsula", hi: "अरब प्रायद्वीप के सबसे बड़े पेड़ों में से एक", fr: "L'un des plus grands arbres de la péninsule arabique" , spotType: "tree", spotDescAr: "من أضخم وأندر الأشجار في شبه الجزيرة العربية، معلم طبيعي فريد.", spotDescEn: "One of the largest and rarest trees on the Arabian Peninsula — a unique natural landmark.", lat: 16.726, lng: 53.258} }
  ,
      { nAr: "إطلالة صرفيت (بالقرب من الحدود العمانية اليمنية)", nEn: "Sarfait (Oman–Yemen border)", km: null , lat: 16.6793665, lng: 53.118577},
    ],
  },
  mid: {
    label: { ar: "جهة الوسط", en: "Central Area", hi: "मध्य क्षेत्र", fr: "Zone Centrale" },
    icon: CloudFog,
    color: "#3C6E8F",
    note: {
      ar: "أقرب المناطق الطبيعية لوسط مدينة صلالة، مناسبة لمن يملك وقتاً محدوداً.",
      en: "The closest natural sites to central Salalah — ideal if your time is limited.",
      hi: "सलालाह शहर के केंद्र के सबसे नज़दीकी प्राकृतिक स्थल — सीमित समय वालों के लिए उपयुक्त।",
      fr: "Les sites naturels les plus proches du centre de Salalah — idéal si votre temps est limité.",
    },
    spots: [
      { nAr: "عين رزات", hours: "6:00 - 22:00", nEn: "Ayn Razat", km: 23, crowdBase: "natureHigh" , spotType: "spring", spotDescAr: "من أشهر عيون ظفار وأجملها، تتدفق مياهها وسط الأشجار الكثيفة المعمّرة.", spotDescEn: "One of Dhofar's most famous springs, with water flowing through ancient dense trees.", lat: 17.1299371, lng: 54.238073},
      { nAr: "مرتفعات ألسان", nEn: "Jabal Al San", km: 33, crowdBase: "natureMid" , spotType: "mountain", spotDescAr: "قمة جبلية خضراء في موسم الخريف تكسوها الضباب والسحاب.", spotDescEn: "A green mountain peak during khareef season, draped in mist and clouds.", lat: 17.1750555, lng: 54.2501138},
      { nAr: "عين صحلنوت", nEn: "Ayn Sahalnoot", km: 18, crowdBase: "natureMid" , spotType: "spring", spotDescAr: "منبع ماء طبيعي تحيط به الأشجار والمتحجرات، مثالي للاسترخاء العائلي.", spotDescEn: "A natural spring surrounded by trees and petrified wood, ideal for family relaxation.", lat: 17.1481424, lng: 54.178309},
      { nAr: "إطلالة شير", nEn: "Jabal Shir", km: 23, crowdBase: "natureMid" , spotType: "mountain", spotDescAr: "قمة جبلية خضراء هادئة تناسب المشي والتأمل في أجواء الخريف.", spotDescEn: "A quiet green mountain peak ideal for walking and contemplation during khareef.", lat: 17.1945748, lng: 54.1676345},
      { nAr: "شلالات جبوجب", nEn: "Ayn Gogob", km: 31, crowdBase: "natureMid" , spotType: "spring", spotDescAr: "عين مائية جميلة بالقرب من منطقة جوجب الجبلية الخلابة.", spotDescEn: "A beautiful spring near the stunning Jujub mountain area.", lat: 17.2199709, lng: 54.1112974},
      { nAr: "وادي نحيز", nEn: "Wadi Nuheiz", km: 29, crowdBase: "natureMid" , spotType: "wadi", spotDescAr: "واد طبيعي تحيط به الجبال يزخر بجمال النباتات والتكوينات الصخرية.", spotDescEn: "A natural wadi surrounded by mountains, rich with plants and rock formations.", lat: 17.1895277, lng: 54.0860812},
      { nAr: "عين جرزيز", nEn: "Ayn Gharziz", km: 17, crowdBase: "natureMid" , spotType: "spring", spotDescAr: "عين مائية خفية بمجرى قصير بين الأشجار وأجواء باردة منعشة.", spotDescEn: "A hidden spring along a short trail through cool, refreshing trees.", lat: 17.1059336, lng: 54.0742133},
      { nAr: "سهل أتين", nEn: "Jabal Ittin", km: 21, crowdBase: "natureHigh" , spotType: "mountain", spotDescAr: "قمة جبلية تطل على السحاب والوديان، وجهة مفضلة لعشاق التصوير.", spotDescEn: "A mountain peak overlooking clouds and valleys, a favourite for photographers.", lat: 17.0713432, lng: 54.0670953},
      { nAr: "إطلالة حمرير", nEn: "Hamrir Viewpoint", km: 19, crowdBase: "natureMid" , spotType: "viewpoint", spotDescAr: "منظر بانورامي خلاب يطل على خضرة الجبال وأجواء ظفار الساحرة.", spotDescEn: "A stunning panoramic view over the green mountains and enchanting Dhofar scenery.", lat: 17.1233081, lng: 54.1449883},
      { nAr: "حنجة القوارب - دربات", nEn: "Wadi Darbat", km: 48, crowdBase: "natureMid" , spotType: "marina", spotDescAr: "مكان مميز لركوب القوارب وسط المياه والطبيعة بأجواء ترفيهية فريدة.", spotDescEn: "A lovely spot for boat rides surrounded by water and nature in a unique atmosphere.", lat: 17.1053125, lng: 54.4530625},
      { nAr: "ضريح النبي أيوب", hours: "6:00 - 20:00", nEn: "Tomb of Job", km: 29, crowdBase: "natureLow" , spotType: "religious", spotDescAr: "مقام النبي أيوب عليه السلام في جبل إيثيوم بأجواء روحانية هادئة.", spotDescEn: "The shrine of Prophet Ayoub (Job) on Jabal Ithoum, with a peaceful spiritual atmosphere.", lat: 17.1119757, lng: 53.9938344},
      { nAr: "متحف ارض اللبان", nEn: "Land of Frankincense Museum", km: 6, crowdBase: "cultureMid" , spotType: "museum", spotDescAr: "متحف متخصص في تاريخ طريق اللبان، مدرج مع البليد على قائمة التراث العالمي.", spotDescEn: "A museum specialising in the history of the frankincense trade route, UNESCO-listed with Al Baleed.", lat: 17.0094009, lng: 54.1360877},
      { nAr: "اكشاك جوز الهند", nEn: "Coconut Stalls", km: 4, crowdBase: "cultureMid" , spotType: "market", spotDescAr: "أكشاك شعبية تبيع جوز الهند الطازج وسط الطبيعة — توقف لا يُفوَّت.", spotDescEn: "Popular stalls selling fresh coconuts in nature — a stop not to be missed.", lat: 17.0035962, lng: 54.1155011},
      { nAr: "ضريح النبي عمران", hours: "6:00 - 20:00", nEn: "Nabi Imran Tomb", km: 1, crowdBase: "natureLow" , spotType: "religious", spotDescAr: "موقع ديني وتراثي يُقال إنه ضريح النبي عمران، يزوره كثيرون للتباركيّة.", spotDescEn: "A religious and heritage site said to be the tomb of Prophet Imran, visited by many for blessings.", lat: 17.0214943, lng: 54.1113373},
    ],
  },
  east: {
    label: { ar: "جهة الشرق (طاقة + مرباط)", en: "Eastern Area (Taqah & Mirbat)", hi: "पूर्वी क्षेत्र (तक़ा और मिरबात)", fr: "Zone Est (Taqah et Mirbat)" },
    icon: Waves,
    color: "#8A4A23",
    note: {
      ar: "تجمع بين الطبيعة والمواقع الأثرية وشاطئ مرباط التاريخي.",
      en: "Combines nature, archaeological sites, and Mirbat's historic beach.",
      hi: "प्रकृति, पुरातात्विक स्थल और मिरबात के ऐतिहासिक समुद्र तट का संगम।",
      fr: "Combine nature, sites archéologiques et la plage historique de Mirbat.",
    },
    spots: [
      { nAr: "عين حمران", nEn: "Ayn Hamran", km: 24, crowdBase: "natureHigh" , spotType: "spring", spotDescAr: "واحة خضراء هادئة تحيط بها الأشجار وتتناسب فيها المياه وسط الطبيعة.", spotDescEn: "A lush, peaceful oasis where water flows gently through surrounding trees.", lat: 17.0974375, lng: 54.2809375},
      { nAr: "عين وشلالات طبرق", nEn: "Ayn Tabruk", km: 33, crowdBase: "natureMid" , spotType: "spring", spotDescAr: "عين طبيعية نضرة بمياه صافية وأجواء خلابة بين الجبال الخضراء.", spotDescEn: "A fresh natural spring with clear waters amid beautiful green mountain scenery.", lat: 17.1005625, lng: 54.3265625},
      { nAr: "عين وشلالات أثوم", nEn: "Ayn Athum", km: 36, crowdBase: "natureMid" , lat: 17.1132375, lng: 54.3649531},
      { nAr: "جبل ناشب", nEn: "Jabal Nashib", km: 41, crowdBase: "natureLow" , spotType: "mountain", spotDescAr: "قمة هادئة بمناظر خضراء ضبابية تناسب عشاق الطبيعة والتأمل.", spotDescEn: "A quiet peak with green misty views, ideal for nature lovers and contemplation.", lat: 17.1035625, lng: 54.3104375},
      { nAr: "مدينة الحق", nEn: "City of Al Haq (Mountain)", km: 54, crowdBase: "natureLow" , spotType: "mountain", spotDescAr: "موقع تاريخي في قمة الجبل يُعرف بمدينة الحق القديمة.", spotDescEn: "A historical site on a mountain peak known as the ancient City of Al Haq.", lat: 17.1771844, lng: 54.387809},
      { nAr: "كورنيش طاقة", nEn: "Taqah Corniche", km: 32, crowdBase: "cultureMid" , spotType: "corniche", spotDescAr: "واجهة بحرية هادئة تطل على بحر العرب، مناسبة للتنزه والجلسات المسائية.", spotDescEn: "A peaceful seafront overlooking the Arabian Sea, ideal for strolling and evening gatherings.", lat: 17.0334727, lng: 54.3942161},
      { nAr: "موقع السمهرم الأثري (خور روري)", hours: "8:00 - 18:00", nEn: "Samhuram Archaeological Site (Khor Rori)", km: 41, crowdBase: "cultureLow" , spotType: "heritage", spotDescAr: "ميناء لبان قديم مدرج في التراث العالمي، قرب مصبّ نهر مفتون خور روري.", spotDescEn: "An ancient frankincense port UNESCO World Heritage site, near Khor Rori estuary.", lat: 17.0390375, lng: 54.4342344},
      { nAr: "وادي دربات", hours: "6:00 - 22:00", nEn: "Wadi Darbat", km: 47, crowdBase: "natureHigh" , spotType: "wadi", spotDescAr: "من أجمل وديان ظفار: شلالات، مياه متدفقة، وبهائم تشرب — مشهد لا يُنسى.", spotDescEn: "One of Dhofar's most beautiful wadis: waterfalls, flowing water, and grazing cattle — unforgettable.", lat: 17.102124, lng: 54.4517814},
      { nAr: "حنجة القوارب - دربات", nEn: "Wadi Darbat", km: 48, crowdBase: "natureMid" , spotType: "marina", spotDescAr: "مكان مميز لركوب القوارب وسط المياه والطبيعة بأجواء ترفيهية فريدة.", spotDescEn: "A lovely spot for boat rides surrounded by water and nature in a unique atmosphere.", lat: 17.1053125, lng: 54.4530625}
  ,
      { nAr: "طريق انعدام الجاذبية", nEn: "Anti Gravity Point Salalah", km: 62, crowdBase: "natureMid" , spotType: "road", spotDescAr: "طريق فريد يوهم بانعدام الجاذبية — تجربة بصرية مذهلة تتحدى المنطق!", spotDescEn: "A unique road creating an anti-gravity optical illusion — a mind-bending experience!", lat: 17.0394417, lng: 54.6134819},
      { nAr: "المحمية الوطنية لأشجار اللبان", hours: "7:00 - 19:00", nEn: "Ancient Frankincense Trees", km: 64, crowdBase: "natureLow" , spotType: "forest", spotDescAr: "أشجار ضخمة نادرة عمرها مئات السنين تضيف طابعاً أسطورياً لطبيعة ظفار.", spotDescEn: "Rare giant trees hundreds of years old adding a legendary character to Dhofar's nature.", lat: 17.3384278, lng: 54.076292},
      { nAr: "جبل طوي اعتير", nEn: "Jabal Tawi Atair", km: 56, crowdBase: "natureLow" , spotType: "cave", spotDescAr: "منطقة فريدة تحتضن إحدى أضخم حفر الانهيار الطبيعية في العالم.", spotDescEn: "A unique area home to one of the world's largest natural collapse sinkholes.", lat: 17.052985, lng: 54.5547504}
  
  ,
      { nAr: "جبل سمحان (فوق السحاب)", nEn: "Jebel Samhan", km: 75, crowdBase: "natureLow" , spotType: "mountain", spotDescAr: "أعلى قمة في عُمان (~1800م) تعيش فوقها فوق غطاء السحاب السحري.", spotDescEn: "Oman's highest peak (~1,800m) — you live above the magical cloud cover here.", lat: 17.1026047, lng: 54.6980883},
      { nAr: "شاطئ مرباط", hours: "0:00 - 24:00", nEn: "Mirbat Beach", km: 70, crowdBase: "cultureMid" , spotType: "beach", spotDescAr: "شاطئ تاريخي هادئ يجمع بين جمال البحر وعراقة ولاية مرباط.", spotDescEn: "A peaceful historic beach combining sea beauty with Mirbat Wilayat's ancient heritage.", lat: 16.9931087, lng: 54.6910019},
      { nAr: "حصن مرباط", hours: "8:00 - 17:00", nEn: "Mirbat Castle", km: 71, crowdBase: "cultureLow" , spotType: "heritage", spotDescAr: "حصن يعود للقرن 18م شهد معركة مرباط الشهيرة عام 1972.", spotDescEn: "A fort dating to the 18th century that witnessed the famous Battle of Mirbat in 1972.", lat: 16.9925202, lng: 54.6916472},
      { nAr: "الحارة التراثية بمرباط", hours: "8:00 - 20:00", nEn: "Mirbat Heritage Quarter", km: 70, crowdBase: "cultureLow" , spotType: "heritage", spotDescAr: "حارة قديمة بأبراج عريقة وبيوت تاريخية تحكي قصص ماضي مرباط.", spotDescEn: "An old quarter with ancient towers and historic houses narrating Mirbat's past stories.", lat: 16.9900392, lng: 54.6901712},
    ],
  },
  fuel: {
    label: { ar: "محطات الوقود", en: "Fuel Stations", hi: "ईंधन स्टेशन", fr: "Stations-service" },
    icon: Fuel,
    color: "#B5402C",
    note: {
      ar: "يُنصح بتعبئة الوقود من صلالة أو ثمريت قبل التوجه لمناطق بعيدة كرخيوت أو ضلكوت، فالمحطات هناك متباعدة.",
      en: "It's best to fill up in Salalah or Thumrait before heading to remote areas like Rakhyut or Dalkut, where stations are far apart.",
      hi: "रखयूत या दलकूत जैसे दूरस्थ क्षेत्रों में जाने से पहले सलालाह या थुमरैत में ईंधन भरवा लें, क्योंकि वहां स्टेशन काफी दूर-दूर हैं।",
      fr: "Il est préférable de faire le plein à Salalah ou Thumrait avant de partir vers des zones reculées comme Rakhyut ou Dalkut, où les stations sont très espacées.",
    },
    spots: FUEL_STATIONS.map((f) => ({
      nAr: f.nAr, nEn: f.nEn, km: null, locAr: f.locAr, locEn: f.locEn,
      lat: f.lat, lng: f.lng,
      extra: f.h24
        ? { ar: `⛽ ${f.company} · 24 ساعة`, en: `⛽ ${f.company} · 24 hrs`, hi: `⛽ ${f.company} · 24 घं`, fr: `⛽ ${f.company} · 24h` }
        : { ar: `⛽ ${f.company} · ${f.hours} ⚠️`, en: `⛽ ${f.company} · ${f.hoursEn} ⚠️`, hi: `⛽ ${f.company} · ${f.hoursEn} ⚠️`, fr: `⛽ ${f.company} · ${f.hoursEn} ⚠️` },
    })),
  },
  hike: {
    label: { ar: "مسارات الهايكنج", en: "Hiking Trails", hi: "हाइकिंग मार्ग", fr: "Sentiers de randonnée" },
    icon: Footprints,
    color: "#4C7A3D",
    note: {
      ar: "دليل الهايكنج في محافظة ظفار (20 مساراً). المسافات والأزمنة تقريبية وقد تختلف حسب الموسم ومستوى اللياقة. تتميز منطقة جبل سمحان بارتفاعات تصل إلى نحو 1800م، وتُعد من أجمل مناطق المشي والتخييم في عُمان. يُنصح دائماً بالتأكد من آخر تحديثات السلامة والتصاريح من بلدية ظفار أو هيئة البيئة قبل المسير، خصوصاً في مواسم الضباب الكثيف.",
      en: "A hiking guide for Dhofar Governorate (20 trails). Distances and times are approximate and may vary by season and fitness level. The Jabal Samhan area reaches elevations of around 1,800m and is one of the finest walking and camping areas in Oman. Always check the latest safety updates and permits from Dhofar Municipality or the Environment Authority before setting out, especially during heavy fog.",
      hi: "ज़ुफ़ार प्रांत के लिए हाइकिंग गाइड (20 मार्ग)। दूरी और समय अनुमानित हैं और मौसम व फिटनेस स्तर के अनुसार बदल सकते हैं। जबल समहान क्षेत्र लगभग 1,800 मीटर की ऊंचाई तक पहुंचता है, और यह ओमान के सबसे सुंदर पैदल यात्रा और कैम्पिंग क्षेत्रों में से एक है। निकलने से पहले हमेशा ज़ुफ़ार नगरपालिका या पर्यावरण प्राधिकरण से नवीनतम सुरक्षा अपडेट और अनुमतियां जांच लें, खासकर घने कोहरे के मौसम में।",
      fr: "Un guide de randonnée pour le gouvernorat de Dhofar (20 sentiers). Les distances et durées sont approximatives et peuvent varier selon la saison et le niveau de forme physique. La région de Jabal Samhan atteint des altitudes d'environ 1 800 m et compte parmi les plus belles zones de randonnée et de camping d'Oman. Vérifiez toujours les dernières informations de sécurité et les autorisations auprès de la municipalité de Dhofar ou de l'Autorité de l'environnement avant de partir, surtout en cas de brouillard dense.",
    },
    spots: HIKING_TRAILS.map((tr) => ({
      nAr: `${tr.no}. ${tr.nAr}`, nEn: `${tr.no}. ${tr.nEn}`, km: tr.km,
      lat: tr.lat, lng: tr.lng, startAr: tr.startAr, startEn: tr.startEn,
      level: tr.level, durAr: tr.durAr, durEn: tr.durEn, durHi: tr.durHi,
      elev: tr.elev, fourByFour: tr.fourByFour, camp: tr.camp,
      extra: { ar: `${tx(LEVEL_LABELS[tr.level], "ar")} · ${tr.durAr}`, en: `${tx(LEVEL_LABELS[tr.level], "en")} · ${tr.durEn}`, hi: `${tx(LEVEL_LABELS[tr.level], "hi")} · ${tr.durHi}` },
    })),
  },
};

/* ===================================================================
   SPONSORED LISTINGS — example placeholder data.
   Replace these entries with real paying advertisers (restaurants,
   hotels, tour operators, car rentals...). Each one is clearly marked
   "Sponsored" in the UI for transparency with users.
=================================================================== */

const SPONSORED_LISTINGS = [
  {
    cat: "accommodation",
    nAr: "[مثال] منتجع البحر الذهبي", nEn: "[Example] Golden Sea Resort",
    descAr: "إقامة فندقية على الواجهة البحرية مع عروض خاصة لموسم الخريف.", descEn: "Beachfront hotel stay with special khareef-season offers.",
    descHi: "[उदाहरण] ख़रीफ़ सीज़न के विशेष ऑफर के साथ समुद्र तट पर होटल प्रवास।", descFr: "[Exemple] Séjour hôtelier en bord de mer avec offres spéciales pour la saison khareef.",
    category: { ar: "إقامة", en: "Accommodation", hi: "आवास", fr: "Hébergement" },
    color: "#C98A2E",
  },
  {
    cat: "restaurant",
    nAr: "[مثال] مطعم أجواء ظفار", nEn: "[Example] Dhofar Vibes Restaurant",
    descAr: "مأكولات عُمانية وبحرية طازجة، طاولات مطلة على الضباب الجبلي.", descEn: "Fresh Omani and seafood dishes with tables overlooking the misty mountains.",
    descHi: "[उदाहरण] ताज़ा ओमानी और समुद्री भोजन, धुंधले पहाड़ों के दृश्य वाली मेज़ें।", descFr: "[Exemple] Cuisine omanaise et fruits de mer frais, tables avec vue sur les montagnes brumeuses.",
    category: { ar: "مطعم", en: "Restaurant", hi: "रेस्तरां", fr: "Restaurant" },
    color: "#B5402C",
  },
  {
    cat: "tours",
    nAr: "[مثال] جولات صلالة 4×4", nEn: "[Example] Salalah 4x4 Tours",
    descAr: "رحلات مرشدة لوادي دربات وجبل سمحان مع سائق محلي خبير.", descEn: "Guided trips to Wadi Darbat and Jabal Samhan with an experienced local driver.",
    descHi: "[उदाहरण] अनुभवी स्थानीय ड्राइवर के साथ वादी दरबात और जबल समहान की निर्देशित यात्राएं।", descFr: "[Exemple] Excursions guidées vers Wadi Darbat et Jabal Samhan avec un chauffeur local expérimenté.",
    category: { ar: "جولات سياحية", en: "Tours", hi: "टूर", fr: "Excursions" },
    color: "#2F5D45",
  },
];

const EVENING = {
  malls: [
    { nAr: "جراند مول (الدهاريز)", nEn: "Grand Mall (Al Dahariz)" , lat: 17.0078, lng: 54.1128},
    { nAr: "جاردنز مول (الوادي)", nEn: "Gardens Mall (Al Wadi)" , lat: 17.0112, lng: 54.1204},
    { nAr: "الواحة مول (الصناعية)", nEn: "Al Waha Mall (Al Sinaiya)" , lat: 17.0098, lng: 54.1015},
    { nAr: "الوفاء ووك (الدهاريز)", nEn: "Al Wafa Walk (Al Dahariz)" , lat: 17.0082, lng: 54.113},
  ],
  festivals: [
    { nAr: "اتين سكوير (المهرجان العام) - سهل اتين", nEn: "Atin Square (Main Festival) – Atin Plain" , lat: 17.006, lng: 54.12},
    { nAr: "اب تاون (ممشى وفود ترك) - سهل اتين", nEn: "Uptown (Food Truck Walk) – Atin Plain" , lat: 17.006, lng: 54.12},
    { nAr: "الغارف (مقاهي في بيئة زراعية) - صلالة", nEn: "Al Gharef (Cafés in a Farm Setting) – Salalah" , lat: 17.017, lng: 54.108},
    { nAr: "عودة الماضي (مهرجان شعبي تراثي) - السعادة", nEn: "Return of the Past (Folk Heritage Festival) – Al Saada" , lat: 17.0092, lng: 54.1045},
    { nAr: "كيدي تايم (العاب الاطفال) - حديقة عوقد", nEn: "Kiddy Time (Kids' Rides) – Auqad Park" , lat: 17.0102, lng: 54.0955},
    { nAr: "حديقة صلالة (للرياضة)", nEn: "Salalah Park (Sports)" , lat: 17.0088, lng: 54.1},
    { nAr: "قرية السمهرم", nEn: "Samhuram Village" , lat: 17.0567, lng: 54.4312},
  ],
  beaches: [
    { nAr: "سوق شاطيء الحافه", nEn: "Al Hafa Beach Market" , lat: 17.0158, lng: 54.0915},
    { nAr: "كورنيش الدهاريز", nEn: "Al Dahariz Corniche" , lat: 17.0082, lng: 54.113},
    { nAr: "اوسارا (شاطيء ريسوت)", nEn: "Ausara (Raysut Beach)" , lat: 17.019, lng: 54.0865},
    { nAr: "مرسى هوانا صلالة (فندق جويرة)", nEn: "Salalah Marina (Juweira Hotel)" , lat: 17.019, lng: 54.086},
  ],
  souqs: [
    { nAr: "سوق الحصن القديم", nEn: "Old Husn Souq" , lat: 17.0158, lng: 54.0915},
    { nAr: "سوق القوف", nEn: "Al Quwaf Souq" , lat: 17.0142, lng: 54.0901},
    { nAr: "سن مارت", nEn: "Sun Mart" , lat: 17.0095, lng: 54.105},
    { nAr: "القريه الصينية", nEn: "Chinese Village" , lat: 17.0102, lng: 54.096},
  ],
  cafes: [
    { nAr: "منتجع البلازا (السعادة)", nEn: "Plaza Resort (Al Saada)" , lat: 17.0093, lng: 54.1048},
    { nAr: "كورنيش البليد (الحافة)", nEn: "Al Baleed Corniche (Al Hafa)" , lat: 17.0178, lng: 54.0934},
    { nAr: "واجهة الشاطئ (الدهاريز)", nEn: "Beach Front (Al Dahariz)" , lat: 17.0082, lng: 54.113},
    { nAr: "مجمع اثأل (السعادة)", nEn: "Ethal Complex (Al Saada)" , lat: 17.009, lng: 54.1042},
    { nAr: "السعادة سيتي (السعادة)", nEn: "Al Saada City (Al Saada)" , lat: 17.0088, lng: 54.1038},
    { nAr: "النهضة سنتر (السعادة)", nEn: "Al Nahda Center (Al Saada)" , lat: 17.0085, lng: 54.106},
    { nAr: "النور سكوير (السعادة)", nEn: "Al Noor Square (Al Saada)" , lat: 17.0091, lng: 54.1044},
    { nAr: "محطة نفط عمان (عوقد)", nEn: "Oman Oil Station (Auqad)" , lat: 17.0102, lng: 54.0955},
  ],
};

// Typical opening-hours patterns by category. Exact hours vary by site, season,
// and day — always treated as approximate; see disclaimer shown in the UI.
const HOURS_LABELS = {
  museumTypical: { ar: "الأحد–الخميس 9:00ص–9:00م (مع استراحة ظهراً) · الجمعة والسبت 3:00–9:00م", en: "Sun–Thu 9:00am–9:00pm (with a midday break) · Fri–Sat 3:00–9:00pm", hi: "रवि–गुरु सुबह 9–रात 9 (दोपहर विश्राम सहित) · शुक्र–शनि दोपहर 3–रात 9", fr: "Dim–jeu 9h–21h (avec pause de midi) · Ven–sam 15h–21h" },
  archDaylight: { ar: "موقع مفتوح في النهار فقط، تقريباً 8:00ص–6:00م", en: "Open-air site, daylight hours only, roughly 8:00am–6:00pm", hi: "खुला स्थल, केवल दिन के समय, लगभग सुबह 8–शाम 6", fr: "Site en plein air, en journée uniquement, environ 8h–18h" },
  fortTypical: { ar: "غالباً 8:00ص–6:00م يومياً (دخول مجاني للمناطق الخارجية)", en: "Usually 8:00am–6:00pm daily (outer areas often free to enter)", hi: "आमतौर पर रोज़ाना सुबह 8–शाम 6 (बाहरी क्षेत्र अक्सर निःशुल्क)", fr: "Généralement 8h–18h tous les jours (zones extérieures souvent en accès libre)" },
  restorationClosed: { ar: "مغلق حالياً أثناء أعمال الترميم", en: "Currently closed for restoration work", hi: "मरम्मत कार्य के कारण फिलहाल बंद", fr: "Actuellement fermé pour travaux de restauration" },
  callAhead: { ar: "بدون مواعيد ثابتة معلنة — يُفضّل الاتصال أو الاستفسار محلياً قبل الزيارة", en: "No fixed published hours — best to call or ask locally before visiting", hi: "कोई निश्चित प्रकाशित समय नहीं — जाने से पहले स्थानीय रूप से पूछताछ या कॉल करना बेहतर", fr: "Aucun horaire fixe publié — il est préférable d'appeler ou de se renseigner localement avant la visite" },
  openAccess: { ar: "منطقة عامة مفتوحة طوال الوقت تقريباً، بلا أوقات دخول محددة", en: "A public area open most of the time, with no fixed entry hours", hi: "एक सार्वजनिक क्षेत्र जो लगभग हमेशा खुला रहता है, कोई निश्चित प्रवेश समय नहीं", fr: "Un espace public ouvert presque en permanence, sans horaires d'entrée fixes" },
  festivalEvening: { ar: "مساءً فقط خلال فترة المهرجان في موسم الخريف", en: "Evenings only, during the festival period in khareef season", hi: "केवल शाम को, ख़रीफ़ सीज़न के उत्सव अवधि के दौरान", fr: "Le soir uniquement, pendant la période du festival en saison khareef" },
  restrictedAccess: { ar: "زيارات محدودة/بإذن مسبق — تأكد من إمكانية الدخول قبل التوجه إليها", en: "Limited access / by prior arrangement — confirm entry is possible before heading there", hi: "सीमित पहुंच / पूर्व अनुमति से — वहां जाने से पहले प्रवेश संभव होने की पुष्टि करें", fr: "Accès limité / sur rendez-vous préalable — vérifiez que l'entrée est possible avant de vous y rendre" },
  parkTypical: { ar: "غالباً 9:00ص–5:00م، وقد يُغلق يوم الجمعة", en: "Usually 9:00am–5:00pm, may be closed on Fridays", hi: "आमतौर पर सुबह 9–शाम 5, शुक्रवार को बंद हो सकता है", fr: "Généralement 9h–17h, peut être fermé le vendredi" },
};

const HERITAGE = [
  { nAr: "متحف ارض اللبان + موقع البليد الاثري", nEn: "Land of Frankincense Museum + Al Baleed Archaeological Site", locAr: "الحافة", locEn: "Al Hafa", crowdBase: "cultureMid", hoursKey: "museumTypical" , lat: 17.0178, lng: 54.0934},
  { nAr: "متحف ظفار (خاص)", nEn: "Dhofar Museum (Private)", locAr: "صلالة الوسطى", locEn: "Central Salalah", crowdBase: "cultureLow", hoursKey: "callAhead" , lat: 17.012, lng: 54.0975},
  { nAr: "المنطقة التراثية (قيد الترميم)", nEn: "Heritage Quarter (Under Restoration)", locAr: "الحافة", locEn: "Al Hafa", crowdBase: "cultureLow", hoursKey: "restorationClosed" , lat: 17.0158, lng: 54.0915},
  { nAr: "موقع السمهرم الاثري", nEn: "Samhuram Archaeological Site", locAr: "(خوروري) طاقة", locEn: "(Khor Rori) Taqah", crowdBase: "cultureLow", hoursKey: "archDaylight" , lat: 17.0390375, lng: 54.4342344},
  { nAr: "برج العسكر", nEn: "Al Askar Tower", locAr: "طاقة", locEn: "Taqah", crowdBase: "cultureLow", hoursKey: "archDaylight" , lat: 17.0288, lng: 54.3869},
  { nAr: "بيت كوفان (نزل)", nEn: "Bait Kawfan (Heritage Lodge)", locAr: "طاقة", locEn: "Taqah", crowdBase: "cultureLow", hoursKey: "callAhead" , lat: 17.0293, lng: 54.3875},
  { nAr: "متحف تواصل الاجيال (خاص)", nEn: "Generations Connect Museum (Private)", locAr: "طاقة", locEn: "Taqah", crowdBase: "cultureLow", hoursKey: "callAhead" },
  { nAr: "حصن مرباط", hours: "8:00 - 17:00", nEn: "Mirbat Castle", locAr: "مرباط", locEn: "Mirbat", crowdBase: "cultureMid", hoursKey: "fortTypical" , lat: 16.9925202, lng: 54.6916472},
  { nAr: "الحارة القديمة", nEn: "Old Quarter", locAr: "مرباط", locEn: "Mirbat", crowdBase: "cultureLow", hoursKey: "openAccess" , lat: 16.9888, lng: 54.691},
  { nAr: "مهرجان عودة الماضي (الأكبر والأهم)", nEn: "Return of the Past Festival (Largest & Most Important)", locAr: "في السعادة", locEn: "Al Saada", crowdBase: "festHigh", hoursKey: "festivalEvening" , lat: 17.0092, lng: 54.1045},
];

const MUSEUMS_FARMS = [
  { nAr: "متحف أرض اللبان", hours: "8:00 - 18:00", nEn: "Land of Frankincense Museum", type: "govMuseum", locAr: "الحافة", locEn: "Al Hafa", crowdBase: "cultureMid", hoursKey: "museumTypical" , lat: 17.0178, lng: 54.0934},
  { nAr: "متحف الفرنسيين (بيت فرنسا)", nEn: "The French Museum (Bait France)", type: "govMuseum", locAr: "صلالة", locEn: "Salalah", crowdBase: "cultureLow", hoursKey: "callAhead" , lat: 17.0165, lng: 54.096},
  { nAr: "متحف ظفار للتاريخ الطبيعي", nEn: "Dhofar Natural History Museum", type: "govMuseum", locAr: "صلالة", locEn: "Salalah", crowdBase: "cultureLow", hoursKey: "callAhead" , lat: 17.012, lng: 54.0975},
  { nAr: "مزرعة السلطان قابوس (الوطنية للزراعة)", nEn: "Sultan Qaboos Farm (National Agriculture)", type: "royalFarm", locAr: "صلالة", locEn: "Salalah", crowdBase: "natureMid", hoursKey: "restrictedAccess" , lat: 17.0145, lng: 54.11},
  { nAr: "مزرعة جربيب", nEn: "Jarbeeb Farm", type: "royalFarmPartial", locAr: "جربيب", locEn: "Jarbeeb", crowdBase: "natureLow", hoursKey: "restrictedAccess" , lat: 17.04, lng: 54.25},
  { nAr: "حديقة الحيوان بصلالة", nEn: "Salalah Zoo", type: "govPark", locAr: "عوقد", locEn: "Auqad", crowdBase: "cultureMid", hoursKey: "parkTypical" , lat: 17.0102, lng: 54.0955},
];

const ACCESS_LAND = [
  {
    fromAr: "منفذ خطم الشكلة الحدودي (مع الإمارات)", fromEn: "Khatam Al Shikla Border Crossing (UAE)",
    distAr: "≈ 1100 كم من المنفذ إلى صلالة", distEn: "≈ 1,100 km from the crossing to Salalah", timeAr: "≈ 10-11 ساعة", timeEn: "≈ 10–11 hours",
    note: { ar: "الأنسب للقادمين من أبوظبي والعين ومسقط. بعد العبور تتجه جنوباً عبر الطريق الصحراوي الرئيسي مروراً بنزوى ثم ثمريت وصولاً إلى صلالة. الطريق مزدوج ومخدوم بمحطات وقود تقريباً كل 100-150 كم.", en: "Best suited for travelers coming from Abu Dhabi, Al Ain, or Muscat. After crossing, head south on the main desert highway via Nizwa and Thumrait to Salalah. The road is a dual carriageway with fuel stations roughly every 100–150 km.", hi: "अबू धाबी, अल ऐन या मस्कट से आने वालों के लिए सबसे उपयुक्त। पार करने के बाद नज़वा और थुमरैत होते हुए मुख्य रेगिस्तानी राजमार्ग से दक्षिण की ओर सलालाह तक जाएं। सड़क दोहरी है और लगभग हर 100-150 कि.मी. पर ईंधन स्टेशन उपलब्ध हैं।", fr: "Idéal pour les voyageurs venant d'Abu Dhabi, Al Ain ou Mascate. Après le passage, dirigez-vous vers le sud par l'autoroute désertique principale via Nizwa puis Thumrait jusqu'à Salalah. La route est à double voie avec des stations-service environ tous les 100 à 150 km." },
  },
  {
    fromAr: "منفذ الوجاجة الحدودي (مع الإمارات)", fromEn: "Al Wajajah Border Crossing (UAE)",
    distAr: "≈ 1150 كم من المنفذ إلى صلالة", distEn: "≈ 1,150 km from the crossing to Salalah", timeAr: "≈ 11 ساعة", timeEn: "≈ 11 hours",
    note: { ar: "مناسب للقادمين من دبي. هذا المنفذ أقرب لنقطة تفتيش وقد يتطلب حجز فندق أو رحلة بحرية مسبقة لإصدار التأشيرة — تأكد من المتطلبات الحالية قبل السفر. بعد العبور، اتجه نحو مسقط ثم جنوباً عبر الطريق الصحراوي إلى صلالة.", en: "Suitable for travelers coming from Dubai. This crossing functions more like a checkpoint and may require a prior hotel booking or dhow cruise booking to issue the visa — confirm current requirements before traveling. After crossing, head toward Muscat then south via the desert highway to Salalah.", hi: "दुबई से आने वालों के लिए उपयुक्त। यह क्रॉसिंग एक चेकपॉइंट की तरह काम करती है और वीज़ा जारी करने के लिए पहले से होटल बुकिंग या नौका यात्रा बुकिंग की आवश्यकता हो सकती है — यात्रा से पहले वर्तमान आवश्यकताओं की पुष्टि करें। पार करने के बाद, मस्कट की ओर बढ़ें फिर रेगिस्तानी राजमार्ग से दक्षिण की ओर सलालाह तक।", fr: "Adapté aux voyageurs venant de Dubaï. Ce point de passage fonctionne davantage comme un poste de contrôle et peut nécessiter une réservation d'hôtel ou de croisière en dhow au préalable pour l'émission du visa — vérifiez les exigences actuelles avant de voyager. Après le passage, dirigez-vous vers Mascate puis vers le sud par l'autoroute désertique jusqu'à Salalah." },
  },
  {
    fromAr: "منفذ الربع الخالي الحدودي (مع السعودية)", fromEn: "Empty Quarter (Rub' Al Khali) Border Crossing (Saudi Arabia)",
    distAr: "المنفذ الوحيد مع السعودية، يصل إلى ولاية عبري شمال عُمان — بعيد جداً عن صلالة (~1000+ كم)", distEn: "The only Oman–Saudi crossing, connecting to Ibri in northern Oman — very far from Salalah (~1,000+ km)", timeAr: "≈ 10+ ساعات من المنفذ", timeEn: "≈ 10+ hours from the crossing",
    note: { ar: "هذا هو المعبر البري الوحيد بين عُمان والسعودية، ولا يوجد أي منفذ بري مباشر مع السعودية بالقرب من ظفار. القادمون من السعودية يحتاجون لقطع مسافة طويلة عبر شمال عُمان (عبري ثم نزوى ثم ثمريت) وصولاً لصلالة. يُنصح بشدة بالتأكد من حالة تشغيل المنفذ والمتطلبات الحالية قبل التخطيط لهذا المسار.", en: "This is the only land crossing between Oman and Saudi Arabia, and there is no direct border crossing with Saudi Arabia near Dhofar. Travelers from Saudi Arabia need to cover a long distance through northern Oman (Ibri, then Nizwa, then Thumrait) to reach Salalah. Strongly confirm the crossing's current operating status and requirements before planning this route.", hi: "यह ओमान और सऊदी अरब के बीच एकमात्र भूमि क्रॉसिंग है, और ज़ुफ़ार के पास सऊदी अरब के साथ कोई सीधी सीमा क्रॉसिंग नहीं है। सऊदी अरब से आने वालों को सलालाह पहुंचने के लिए उत्तरी ओमान (इब्री, फिर नज़वा, फिर थुमरैत) से होते हुए एक लंबी दूरी तय करनी होगी। इस मार्ग की योजना बनाने से पहले क्रॉसिंग की वर्तमान संचालन स्थिति और आवश्यकताओं की दृढ़ता से पुष्टि करें।", fr: "Il s'agit du seul point de passage terrestre entre Oman et l'Arabie saoudite, et il n'existe aucun passage frontalier direct avec l'Arabie saoudite à proximité de Dhofar. Les voyageurs venant d'Arabie saoudite doivent parcourir une longue distance à travers le nord d'Oman (Ibri, puis Nizwa, puis Thumrait) pour atteindre Salalah. Vérifiez impérativement le statut opérationnel actuel et les exigences avant de planifier cet itinéraire." },
  },
  {
    fromAr: "منفذ المزيونة الحدودي (مع اليمن - سرفيت)", fromEn: "Al Mazyounah Border Crossing (Yemen – Sarfait)",
    distAr: "أقرب نقطة حدودية جغرافياً لصلالة (~155 كم)، لكنه ليس مخصصاً لدخول السياح", distEn: "The geographically closest border point to Salalah (~155 km), but not intended for tourist entry", timeAr: "≈ 2 ساعة من المنفذ (نظرياً)", timeEn: "≈ 2 hours from the crossing (theoretical)",
    note: { ar: "منفذ المزيونة هو سوق ونقطة عبور تجارية محلية بين ظفار ومحافظة المهرة اليمنية، وليس مخصصاً لحركة السياحة الدولية العامة. هذه منطقة حدودية حساسة أمنياً ويُنصح بعدم الاقتراب منها أو محاولة العبور منها كزائر سياحي. إذا كنت من مواطني عُمان أو اليمن وتحتاج معلومات رسمية، يرجى التواصل مع الجهات الحكومية المختصة مباشرة.", en: "Al Mazyounah is a local trade market and crossing point between Dhofar and Yemen's Al Mahra governorate, and is not intended for general international tourist traffic. This is a security-sensitive border area, and tourists are advised not to approach it or attempt to cross there. If you are an Omani or Yemeni citizen needing official information, please contact the relevant government authorities directly.", hi: "अल मज़यूनाह ज़ुफ़ार और यमन के अल महरा प्रांत के बीच एक स्थानीय व्यापार बाज़ार और क्रॉसिंग पॉइंट है, और यह सामान्य अंतरराष्ट्रीय पर्यटक यातायात के लिए नहीं है। यह एक सुरक्षा की दृष्टि से संवेदनशील सीमा क्षेत्र है, और पर्यटकों को इसके पास जाने या वहां से पार करने का प्रयास न करने की सलाह दी जाती है। यदि आप ओमानी या यमनी नागरिक हैं और आधिकारिक जानकारी चाहते हैं, तो कृपया सीधे संबंधित सरकारी अधिकारियों से संपर्क करें।", fr: "Al Mazyounah est un marché commercial local et un point de passage entre Dhofar et le gouvernorat yéménite d'Al Mahra, et n'est pas destiné au trafic touristique international général. Il s'agit d'une zone frontalière sensible sur le plan sécuritaire, et il est conseillé aux touristes de ne pas s'en approcher ni de tenter d'y passer. Si vous êtes citoyen omanais ou yéménite et avez besoin d'informations officielles, veuillez contacter directement les autorités gouvernementales compétentes." },
  },
];

/* ===================================================================
   ACCOMMODATIONS — Hotels, Apartments, Villas, Resorts & Rest Houses
   in Dhofar Governorate. Data verified to best available knowledge
   as of khareef 2026; always confirm availability/rates directly.
=================================================================== */

const ACCOM_TYPES = {
  hotel:    { ar: "فندق",           en: "Hotel",            hi: "होटल",         fr: "Hôtel",           emoji: "🏨" },
  resort:   { ar: "منتجع",          en: "Resort",           hi: "रिसॉर्ट",      fr: "Resort",          emoji: "🌴" },
  apartment:{ ar: "شقق فندقية",     en: "Hotel Apartments", hi: "होटल अपार्टमेंट", fr: "Appart-hôtel",  emoji: "🏢" },
  villa:    { ar: "فيلا/استراحة",   en: "Villa / Rest House", hi: "विला",       fr: "Villa / Gîte",    emoji: "🏡" },
  chalet:   { ar: "شاليه",          en: "Chalet",           hi: "चालेट",         fr: "Chalet",          emoji: "⛺" },
};

const ACCOM_AREAS = {
  salalah:  { ar: "صلالة (المدينة)", en: "Salalah City",    hi: "सलालाह शहर",  fr: "Ville de Salalah" },
  saada:    { ar: "السعادة",         en: "Al Saada",         hi: "अल सआदा",     fr: "Al Saada" },
  dahariz:  { ar: "الدهاريز",        en: "Al Dahariz",       hi: "अल दहारिज़",  fr: "Al Dahariz" },
  hafa:     { ar: "الحافة",          en: "Al Hafa",          hi: "अल हाफ़ा",    fr: "Al Hafa" },
  auqad:    { ar: "عوقد",            en: "Auqad",            hi: "औकद",          fr: "Auqad" },
  raysut:   { ar: "ريسوت",           en: "Raysut",           hi: "रायसूत",       fr: "Raysut" },
  taqah:    { ar: "طاقة",            en: "Taqah",            hi: "तक़ा",          fr: "Taqah" },
  mirbat:   { ar: "مرباط",           en: "Mirbat",           hi: "मिरबात",       fr: "Mirbat" },
};

const ACCOMMODATIONS = [
  // ── 5-STAR HOTELS ─────────────────────────────────────────────
  { nAr: "فندق كراون بلازا صلالة", nEn: "Crowne Plaza Salalah",
    type: "hotel", area: "hafa", stars: 5, phone: "+968 23235333", lat: 17.0155, lng: 54.092,
    descAr: "فندق خمس نجوم بشاطئ خاص وحمام سباحة ومطاعم متنوعة على كورنيش الحافة.",
    descEn: "5-star hotel with a private beach, swimming pool and varied restaurants on Al Hafa corniche." },
  { nAr: "فندق هيلتون صلالة", nEn: "Hilton Salalah Resort",
    type: "resort", area: "hafa", stars: 5, phone: "+968 23211234", lat: 17.0183, lng: 54.0878,
    descAr: "منتجع هيلتون الأيقوني بشاطئ خاص وحدائق استوائية وتجربة فندقية عالمية.",
    descEn: "The iconic Hilton resort with a private beach, tropical gardens and a world-class hotel experience." },
  { nAr: "فندق جاز صلالة (سابقاً ماريوت)", nEn: "Jaz Salalah Hotel (formerly Marriott)",
    type: "hotel", area: "hafa", stars: 5, phone: "+968 23232000", lat: 17.017, lng: 54.09,
    descAr: "فندق فاخر بإطلالة مباشرة على بحر العرب ومرافق ترفيهية وعائلية متكاملة.",
    descEn: "Luxury hotel with a direct Arabian Sea view and comprehensive entertainment and family facilities." },
  { nAr: "فندق إيتاب صلالة", nEn: "Itaab Salalah Hotel",
    type: "hotel", area: "saada", stars: 5, phone: "+968 23295555", lat: 17.009, lng: 54.1042,
    descAr: "فندق حديث في قلب السعادة بتصميم عصري وخدمات خمس نجوم.",
    descEn: "A modern hotel in the heart of Al Saada with contemporary design and five-star services." },

  // ── 4-STAR HOTELS ─────────────────────────────────────────────
  { nAr: "فندق هوليداي إن صلالة", nEn: "Holiday Inn Salalah",
    type: "hotel", area: "salalah", stars: 4, phone: "+968 23211111", lat: 17.012, lng: 54.098,
    descAr: "فندق أربع نجوم في وسط صلالة قريب من المراكز التجارية والمطاعم.",
    descEn: "4-star hotel in central Salalah, close to commercial centres and restaurants." },
  { nAr: "فندق رمادا صلالة", nEn: "Ramada Salalah Hotel",
    type: "hotel", area: "salalah", stars: 4, phone: "+968 23200200", lat: 17.01, lng: 54.097,
    descAr: "فندق رمادا بموقع مركزي وخدمات أعمال ومرافق عائلية مميزة.",
    descEn: "Ramada hotel with a central location and excellent business and family facilities." },
  { nAr: "فندق صلالة روتانا", nEn: "Salalah Rotana Hotel",
    type: "hotel", area: "saada", stars: 4, phone: "+968 23210888", lat: 17.0095, lng: 54.105,
    descAr: "فندق روتانا بالسعادة بتصميم أنيق وقريب من مراكز الترفيه والفعاليات.",
    descEn: "Rotana hotel in Al Saada with elegant design, close to entertainment and events centres." },
  { nAr: "فندق الحارة التراثي", nEn: "Al Hara Heritage Hotel",
    type: "hotel", area: "hafa", stars: 4, phone: "+968 23295999", lat: 17.0158, lng: 54.0915,
    descAr: "فندق بطابع تراثي عُماني بالحافة يعكس جمال العمارة المحلية.",
    descEn: "A hotel with Omani heritage character in Al Hafa, reflecting the beauty of local architecture." },
  { nAr: "فندق سفاري صلالة", nEn: "Safari Hotel Salalah",
    type: "hotel", area: "salalah", stars: 4, phone: "+968 23215777", lat: 17.011, lng: 54.096,
    descAr: "فندق راسخ في صلالة بخدمات موثوقة وموقع مناسب لجميع الفئات.",
    descEn: "A well-established hotel in Salalah with reliable services and a convenient location for all." },

  // ── HOTEL APARTMENTS ──────────────────────────────────────────
  { nAr: "شقق سدر السعادة الفندقية", nEn: "Sidr Al Saada Hotel Apartments",
    type: "apartment", area: "saada", stars: 4, phone: "+968 23219900", lat: 17.0092, lng: 54.1045,
    descAr: "شقق فندقية فسيحة للعائلات في السعادة بمطبخ كامل وخدمات فندقية.",
    descEn: "Spacious family hotel apartments in Al Saada with a full kitchen and hotel services." },
  { nAr: "شقق الياسمين الفندقية", nEn: "Al Yasmin Hotel Apartments",
    type: "apartment", area: "salalah", stars: 3, phone: "+968 23211500", lat: 17.0115, lng: 54.0975,
    descAr: "شقق فندقية اقتصادية في قلب صلالة مناسبة للعائلات والزوار للإقامة الطويلة.",
    descEn: "Economical hotel apartments in central Salalah, suitable for families and long stays." },
  { nAr: "شقق العقيدة الفندقية", nEn: "Al Aqeedah Hotel Apartments",
    type: "apartment", area: "salalah", stars: 3, phone: "+968 23216666", lat: 17.0108, lng: 54.0968,
    descAr: "شقق مجهزة بالكامل بموقع مركزي مريح وأسعار مناسبة لموسم الخريف.",
    descEn: "Fully equipped apartments with a convenient central location and good-value rates for khareef season." },
  { nAr: "شقق وادي دربات الفندقية", nEn: "Wadi Darbat Hotel Apartments",
    type: "apartment", area: "saada", stars: 3, phone: "+968 23212255", lat: 17.0088, lng: 54.1038,
    descAr: "شقق فندقية حديثة بمطابخ مجهزة، خيار عملي للعائلات.",
    descEn: "Modern hotel apartments with equipped kitchens — a practical choice for families." },
  { nAr: "شقق أريج السعادة", nEn: "Areej Al Saada Apartments",
    type: "apartment", area: "saada", stars: 3, phone: "+968 23290100", lat: 17.0085, lng: 54.106,
    descAr: "شقق واسعة بالسعادة قريبة من الفعاليات ومناسبة للعائلات الكبيرة.",
    descEn: "Spacious apartments in Al Saada, close to events and suitable for large families." },

  // ── RESORTS & MARINA ──────────────────────────────────────────
  { nAr: "منتجع جويرة (مرسى هوانا)", nEn: "Juweira Resort (Howana Marina)",
    type: "resort", area: "hafa", stars: 5, phone: "+968 23230000", lat: 17.019, lng: 54.086,
    descAr: "منتجع بحري فاخر على مرسى هوانا بإطلالات بانورامية وأجواء هادئة على البحر.",
    descEn: "A luxury marina resort on Howana Marina with panoramic views and a peaceful sea atmosphere." },
  { nAr: "منتجع البلازا صلالة", nEn: "Plaza Salalah Resort",
    type: "resort", area: "saada", stars: 4, phone: "+968 23299888", lat: 17.0093, lng: 54.1048,
    descAr: "منتجع عائلي في السعادة بمسابح ومرافق ترفيهية وأجواء استجمام مميزة.",
    descEn: "A family resort in Al Saada with pools, entertainment facilities and relaxing atmosphere." },

  // ── VILLAS & REST HOUSES ──────────────────────────────────────
  { nAr: "استراحات وفيلل النسيم صلالة", nEn: "Al Naseem Villas & Rest Houses",
    type: "villa", area: "saada", stars: 0, phone: "+968 92345678", lat: 17.0091, lng: 54.1044,
    descAr: "فيلل واستراحات مجهزة بالكامل للعائلات والمجموعات بأجواء خاصة ومريحة.",
    descEn: "Fully equipped villas and rest houses for families and groups with a private, comfortable atmosphere." },
  { nAr: "استراحة ظفار الخضراء", nEn: "Dhofar Al Khadra Rest House",
    type: "villa", area: "auqad", stars: 0, phone: "+968 99123456", lat: 17.0102, lng: 54.0955,
    descAr: "استراحة عائلية في عوقد بحديقة خضراء وملحقات مكيفة للمجموعات.",
    descEn: "A family rest house in Auqad with a green garden and air-conditioned annexes for groups." },
  { nAr: "فيلل الشرفة الخريف", nEn: "Al Shurfa Khareef Villas",
    type: "villa", area: "saada", stars: 0, phone: "+968 91234567", lat: 17.0088, lng: 54.104,
    descAr: "فيلل خاصة بإطلالات خضراء في موسم الخريف، مناسبة للعائلات.",
    descEn: "Private villas with green khareef views, ideal for families seeking privacy." },
  { nAr: "شاليهات الواحة صلالة", nEn: "Al Waha Chalets Salalah",
    type: "chalet", area: "dahariz", stars: 0, phone: "+968 93456789", lat: 17.0135, lng: 54.0928,
    descAr: "شاليهات مجهزة في الدهاريز قريبة من المولات والمراكز التجارية.",
    descEn: "Equipped chalets in Al Dahariz, close to malls and commercial centres." },

  // ── TAQAH & MIRBAT ────────────────────────────────────────────
  { nAr: "استراحة طاقة الساحلية", nEn: "Taqah Coastal Rest House",
    type: "villa", area: "taqah", stars: 0, phone: "+968 92876543", lat: 17.0291, lng: 54.3873,
    descAr: "استراحة ساحلية هادئة في طاقة بعيداً عن ازدحام المدينة وقريبة من المعالم التراثية.",
    descEn: "A peaceful coastal rest house in Taqah, away from city crowds and close to heritage landmarks." },
  { nAr: "فندق ميناء مرباط", nEn: "Mirbat Port Hotel",
    type: "hotel", area: "mirbat", stars: 3, phone: "+968 23214500", lat: 16.9894, lng: 54.6917,
    descAr: "فندق بسيط في قلب مرباط يخدم زوار المنطقة الشرقية والحصن التاريخي.",
    descEn: "A simple hotel in the heart of Mirbat serving visitors to the eastern area and historic castle." },
];

const ACCOM_STARS_LABEL = {
  5: { ar: "5 نجوم", en: "5 Stars", hi: "5 सितारे", fr: "5 Étoiles" },
  4: { ar: "4 نجوم", en: "4 Stars", hi: "4 सितारे", fr: "4 Étoiles" },
  3: { ar: "3 نجوم", en: "3 Stars", hi: "3 सितारे", fr: "3 Étoiles" },
  0: { ar: "غير مصنف", en: "Unrated", hi: "अश्रेणीबद्ध", fr: "Non classé" },
};

// Trusted booking platforms — Masarrah is the local Omani platform (recommended first)
// Only the local Omani app — المسرة
const BOOKING_PLATFORMS = [
  {
    key: "masarra",
    nameAr: "تطبيق المسرة",
    nameEn: "Al Masarra App",
    descAr: "تطبيق عُماني محلي موثوق ومتخصص في الإقامة والشاليهات والاستراحات في سلطنة عُمان. الخيار الأول للحجز المحلي بثقة.",
    descEn: "A trusted local Omani app specialising in accommodation, chalets and rest houses across Oman — the first choice for local bookings.",
    descHi: "ओमान में आवास, चालेट और रेस्ट हाउस के लिए विश्वसनीय स्थानीय ओमानी ऐप — स्थानीय बुकिंग के लिए पहली पसंद।",
    descFr: "Application omanaise locale de confiance spécialisée dans l'hébergement, les chalets et les maisons de repos à Oman — premier choix pour les réservations locales.",
    playUrl: "https://play.google.com/store/apps/details?id=com.hanidev.massarh",
    color: "#2F5D45",
    emoji: "🇴🇲",
  },
];

const HOSPITALS = [
  { nAr: "مستشفى السلطان قابوس", nEn: "Sultan Qaboos Hospital", type: "govHospital", url: "https://maps.app.goo.gl/T9pL5XufvvAy62Q79?g_st=ac" },
  { nAr: "مستشفى القوات المسلحة بصلالة", nEn: "Armed Forces Hospital Salalah", type: "gov", locAr: "صلالة", locEn: "Salalah" , lat: 17.0098, lng: 54.101},
  { nAr: "مستشفى ضحار", nEn: "Dahar Hospital", type: "gov", locAr: "ضحار، صلالة", locEn: "Dahar, Salalah" , lat: 17.0078, lng: 54.098},
  { nAr: "مجمع صلالة الصحي", nEn: "Salalah Health Complex", type: "govHealthCenter", locAr: "صلالة", locEn: "Salalah" , lat: 17.0115, lng: 54.0972},
  { nAr: "مستشفى بدر السماء", nEn: "Badr Al Samaa Hospital", type: "private", locAr: "صلالة", locEn: "Salalah" , lat: 17.0105, lng: 54.0965},
  { nAr: "مستشفى الرفاه", nEn: "Al Raffah Hospital", type: "private", locAr: "صلالة", locEn: "Salalah" , lat: 17.0108, lng: 54.0968},
  { nAr: "مستشفى دار الشفاء", nEn: "Dar Al Shifa Hospital", type: "private", locAr: "صلالة", locEn: "Salalah" , lat: 17.0112, lng: 54.097},
  { nAr: "عيادات النهضة الطبية", nEn: "Al Nahda Medical Clinics", type: "privateClinic", locAr: "السعادة", locEn: "Al Saada" , lat: 17.0085, lng: 54.106},
  { nAr: "مركز اليسر الطبي", nEn: "Al Yusr Medical Center", type: "privateClinic", locAr: "صلالة", locEn: "Salalah" , lat: 17.0102, lng: 54.096},
];

const TIP_CATEGORIES = [
  {
    key: "before",
    icon: Calendar,
    title: { ar: "قبل السفر", en: "Before You Travel", hi: "यात्रा से पहले", fr: "Avant le voyage" },
    items: [
      { ar: "يفضل حجز السكن مبكراً، خاصة خلال موسم الخريف (يونيو – سبتمبر).", en: "It's best to book accommodation early, especially during khareef season (June–September).", hi: "विशेष रूप से ख़रीफ़ सीज़न (जून-सितंबर) के दौरान, आवास पहले से बुक करना बेहतर है।", fr: "Il est préférable de réserver l'hébergement à l'avance, surtout pendant la saison du khareef (juin-septembre)." },
      { ar: "تحقق من حالة الطقس والطرق قبل الانطلاق.", en: "Check the weather and road conditions before setting out.", hi: "निकलने से पहले मौसम और सड़कों की स्थिति जांच लें।", fr: "Vérifiez les conditions météorologiques et routières avant de partir." },
      { ar: "احمل معك ملابس خفيفة مع جاكيت خفيف للأجواء الباردة والممطرة في المرتفعات.", en: "Pack light clothing along with a light jacket for the cool, rainy weather in the highlands.", hi: "ऊंचे इलाकों के ठंडे और बरसाती मौसम के लिए हल्के कपड़ों के साथ एक हल्की जैकेट साथ रखें।", fr: "Emportez des vêtements légers ainsi qu'une veste légère pour le temps frais et pluvieux des hauteurs." },
    ],
  },
  {
    key: "driving",
    icon: Car,
    title: { ar: "أثناء القيادة", en: "While Driving", hi: "गाड़ी चलाते समय", fr: "Pendant la conduite" },
    items: [
      { ar: "قد يكون الضباب كثيفاً في بعض المناطق، لذا قُد بحذر واستخدم الأنوار المناسبة.", en: "Fog can be dense in some areas, so drive carefully and use appropriate lights.", hi: "कुछ क्षेत्रों में कोहरा घना हो सकता है, इसलिए सावधानी से चलाएं और उचित लाइट्स का उपयोग करें।", fr: "Le brouillard peut être dense dans certaines zones, conduisez donc prudemment et utilisez les phares appropriés." },
      { ar: "تجنب الوقوف على جوانب الطرق السريعة إلا في الأماكن المخصصة.", en: "Avoid stopping on the sides of highways except in designated areas.", hi: "निर्धारित स्थानों को छोड़कर हाईवे के किनारों पर रुकने से बचें।", fr: "Évitez de vous arrêter sur les bas-côtés des autoroutes, sauf aux endroits prévus à cet effet." },
      { ar: "انتبه لوجود الجمال والماشية على الطرق، خاصة ليلاً.", en: "Watch out for camels and livestock on the roads, especially at night.", hi: "सड़कों पर ऊंट और मवेशियों से सावधान रहें, खासकर रात में।", fr: "Faites attention aux chameaux et au bétail sur les routes, surtout la nuit." },
    ],
  },
  {
    key: "hiking",
    icon: Footprints,
    title: { ar: "أثناء التنزه", en: "While Hiking", hi: "पैदल यात्रा के दौरान", fr: "Pendant la randonnée" },
    items: [
      { ar: "ارتدِ أحذية مناسبة للمشي في الجبال والأودية.", en: "Wear suitable shoes for walking in the mountains and valleys.", hi: "पहाड़ों और वादियों में चलने के लिए उपयुक्त जूते पहनें।", fr: "Portez des chaussures adaptées à la marche en montagne et dans les vallées." },
      { ar: "لا تقترب من حواف المنحدرات، فالأرض قد تكون زلقة.", en: "Don't get close to cliff edges, as the ground can be slippery.", hi: "चट्टान के किनारों के पास न जाएं, क्योंकि ज़मीन फिसलन भरी हो सकती है।", fr: "Ne vous approchez pas des bords des falaises, le sol pouvant être glissant." },
      { ar: "اصطحب كمية كافية من الماء والوجبات الخفيفة.", en: "Bring enough water and light snacks.", hi: "पर्याप्त पानी और हल्का नाश्ता साथ रखें।", fr: "Emportez suffisamment d'eau et des collations légères." },
    ],
  },
  {
    key: "environment",
    icon: Sprout,
    title: { ar: "المحافظة على البيئة", en: "Protecting the Environment", hi: "पर्यावरण संरक्षण", fr: "Protection de l'environnement" },
    items: [
      { ar: "لا تترك المخلفات، واستخدم الحاويات المخصصة للنفايات.", en: "Don't leave litter behind — use the designated waste bins.", hi: "कचरा न छोड़ें — निर्धारित कूड़ेदानों का उपयोग करें।", fr: "Ne laissez pas de déchets — utilisez les poubelles prévues à cet effet." },
      { ar: "تجنب إشعال النار في غير الأماكن المسموح بها.", en: "Avoid lighting fires outside of permitted areas.", hi: "अनुमत स्थानों के अलावा कहीं आग न जलाएं।", fr: "Évitez d'allumer du feu en dehors des zones autorisées." },
      { ar: "لا تقطف النباتات أو تؤذِ الحياة البرية.", en: "Don't pick plants or harm wildlife.", hi: "पौधे न तोड़ें और वन्यजीवों को नुकसान न पहुंचाएं।", fr: "Ne cueillez pas de plantes et ne nuisez pas à la faune sauvage." },
    ],
  },
  {
    key: "enjoy",
    icon: Sparkles,
    title: { ar: "للاستمتاع أكثر", en: "To Enjoy It More", hi: "अधिक आनंद के लिए", fr: "Pour profiter davantage" },
    items: [
      { ar: "زر الأماكن الشهيرة مثل عين رزات، وادي دربات، شاطئ المغسيل، وجبل سمحان.", en: "Visit popular spots like Ayn Razat, Wadi Darbat, Mughsail Beach, and Jabal Samhan.", hi: "ऐन रज़ात, वादी दरबात, मुग़सैल बीच और जबल समहान जैसी लोकप्रिय जगहों पर जाएं।", fr: "Visitez des sites populaires comme Ayn Razat, Wadi Darbat, la plage de Mughsail et Jabal Samhan." },
      { ar: "احمل مبلغاً نقدياً، فبعض المواقع الريفية قد لا تتوفر فيها خدمات الدفع الإلكتروني.", en: "Carry some cash, as some rural sites may not offer electronic payment.", hi: "कुछ नकद साथ रखें, क्योंकि कुछ ग्रामीण स्थलों पर इलेक्ट्रॉनिक भुगतान उपलब्ध नहीं हो सकता।", fr: "Prévoyez de l'argent liquide, certains sites ruraux n'acceptant pas toujours les paiements électroniques." },
      { ar: "احرص على احترام خصوصية السكان المحليين والعادات والتقاليد.", en: "Be sure to respect the privacy of local residents and their customs and traditions.", hi: "स्थानीय निवासियों की गोपनीयता और रीति-रिवाजों का सम्मान करना सुनिश्चित करें।", fr: "Veillez à respecter la vie privée des habitants ainsi que leurs coutumes et traditions." },
    ],
  },
  {
    key: "health",
    icon: Stethoscope,
    title: { ar: "الصحة والسلامة", en: "Health & Safety", hi: "स्वास्थ्य और सुरक्षा", fr: "Santé et sécurité" },
    items: [
      { ar: "⚠️ تحذير مهم: يُمنع السباحة في البحر خلال موسم الخريف. حالة البحر تكون خطيرة جداً بسبب الأمواج العالية والتيارات البحرية القوية — يُكتفى بالاستمتاع بالمنظر من الشاطئ فقط.", en: "⚠️ Important: Swimming in the sea is not advised during the khareef season. Sea conditions are very dangerous due to high waves and strong currents — enjoy the view from the shore only.", hi: "⚠️ महत्वपूर्ण: ख़रीफ़ सीज़न के दौरान समुद्र में तैरना खतरनाक है। ऊंची लहरें और तेज धाराएं बेहद खतरनाक होती हैं — किनारे से दृश्य का आनंद लें।", fr: "⚠️ Important : La baignade en mer est déconseillée pendant la saison khareef. Les conditions sont très dangereuses en raison des fortes vagues et des courants — profitez du paysage depuis le rivage uniquement." },
      { ar: "اشرب كمية كافية من الماء، فالرطوبة العالية تزيد التعرّق رغم اعتدال الجو.", en: "Drink enough water — high humidity increases sweating even when the weather feels mild.", hi: "पर्याप्त पानी पिएं — उच्च आर्द्रता मौसम के सामान्य लगने पर भी पसीना बढ़ा देती है।", fr: "Buvez suffisamment d'eau — l'humidité élevée augmente la transpiration même par temps doux." },
      { ar: "استخدم واقي الشمس حتى في الأجواء الغائمة، فأشعة الشمس تخترق الغيوم.", en: "Use sunscreen even on cloudy days, as UV rays still pass through clouds.", hi: "बादल भरे दिनों में भी सनस्क्रीन का उपयोग करें, क्योंकि यूवी किरणें बादलों के पार भी पहुंचती हैं।", fr: "Utilisez de la crème solaire même par temps nuageux, les rayons UV traversant les nuages." },
      { ar: "احفظ رقم الطوارئ 9999 في هاتفك، وشارك موقعك مع شخص تثق به قبل الدخول لمناطق ضعيفة التغطية.", en: "Save the emergency number 9999 on your phone, and share your location with someone you trust before entering areas with weak signal coverage.", hi: "अपने फ़ोन में आपातकालीन नंबर 9999 सेव करें, और कमज़ोर नेटवर्क वाले क्षेत्रों में जाने से पहले किसी विश्वसनीय व्यक्ति के साथ अपना स्थान साझा करें।", fr: "Enregistrez le numéro d'urgence 9999 sur votre téléphone, et partagez votre position avec une personne de confiance avant d'entrer dans des zones à faible couverture réseau." },
    ],
  },
  {
    key: "money",
    icon: Wallet,
    title: { ar: "المال والاتصالات", en: "Money & Connectivity", hi: "पैसा और कनेक्टिविटी", fr: "Argent et connectivité" },
    items: [
      { ar: "تأكد من تفعيل التجوال الدولي أو احصل على شريحة محلية، فبعض المناطق الجبلية ضعيفة التغطية.", en: "Make sure international roaming is active, or get a local SIM card, as some mountain areas have weak coverage.", hi: "अंतर्राष्ट्रीय रोमिंग सक्रिय करना सुनिश्चित करें, या स्थानीय सिम कार्ड लें, क्योंकि कुछ पहाड़ी क्षेत्रों में नेटवर्क कमज़ोर है।", fr: "Assurez-vous que l'itinérance internationale est active, ou procurez-vous une carte SIM locale, certaines zones montagneuses ayant une faible couverture." },
      { ar: "الريال العماني من أعلى العملات قيمة عالمياً — تحقق من سعر الصرف قبل السفر لتقدير ميزانيتك.", en: "The Omani Rial is one of the highest-valued currencies in the world — check the exchange rate before traveling to plan your budget.", hi: "ओमानी रियाल दुनिया की सबसे ऊंची मूल्य वाली मुद्राओं में से एक है — अपना बजट तय करने के लिए यात्रा से पहले विनिमय दर जांच लें।", fr: "Le rial omanais est l'une des monnaies les plus fortes au monde — vérifiez le taux de change avant de partir pour planifier votre budget." },
      { ar: "احتفظ بنسخة إلكترونية من جواز سفرك وتأشيرتك على هاتفك أو بريدك الإلكتروني احتياطاً.", en: "Keep a digital copy of your passport and visa on your phone or email as a backup.", hi: "बैकअप के रूप में अपने फ़ोन या ईमेल पर पासपोर्ट और वीज़ा की डिजिटल कॉपी रखें।", fr: "Gardez une copie numérique de votre passeport et de votre visa sur votre téléphone ou par e-mail en cas de besoin." },
    ],
  },
];

/* ===================================================================
   IMPORTANT CONTACTS
   Only the nationally unified emergency number (9999) is a verified,
   universally reliable figure. For everything else, we point to the
   official resource rather than risk publishing an inaccurate number.
=================================================================== */

const IMPORTANT_CONTACTS = [
  {
    key: "emergency",
    icon: Siren,
    color: "#B5402C",
    title: { ar: "الطوارئ الموحدة", en: "Unified Emergency", hi: "एकीकृत आपातकालीन सेवा", fr: "Urgence unifiée" },
    desc: { ar: "للشرطة والإسعاف والإطفاء والدفاع المدني — على مدار الساعة.", en: "Police, ambulance, fire, and civil defense — available 24/7.", hi: "पुलिस, एम्बुलेंस, फायर और सिविल डिफेंस — चौबीसों घंटे उपलब्ध।", fr: "Police, ambulance, pompiers et défense civile — disponible 24h/24." },
    action: { type: "tel", value: "9999" },
  },
  {
    key: "traffic",
    icon: Car,
    color: "#C98A2E",
    title: { ar: "حوادث الطرق", en: "Traffic Accidents", hi: "सड़क दुर्घटनाएं", fr: "Accidents de la route" },
    desc: { ar: "نفس الرقم الموحد 9999 يغطي الإبلاغ عن حوادث الطرق ايضاً.", en: "The same unified number 9999 also covers reporting traffic accidents.", hi: "वही एकीकृत नंबर 9999 सड़क दुर्घटनाओं की रिपोर्टिंग को भी कवर करता है।", fr: "Le même numéro unifié 9999 couvre également le signalement des accidents de la route." },
    action: { type: "tel", value: "9999" },
  },
  {
    key: "tourism",
    icon: Info,
    color: "#3C6E8F",
    title: { ar: "وزارة التراث والسياحة", en: "Ministry of Heritage & Tourism", hi: "विरासत और पर्यटन मंत्रालय", fr: "Ministère du Patrimoine et du Tourisme" },
    desc: { ar: "الموقع الرسمي للاستعلامات السياحية والتصاريح.", en: "Official site for tourism information and permits.", hi: "पर्यटन जानकारी और अनुमतियों के लिए आधिकारिक साइट।", fr: "Site officiel pour les informations touristiques et les permis." },
    action: { type: "link", url: "https://omantourism.gov.om" },
  },
  {
    key: "embassy",
    icon: Building2,
    color: "#6B4226",
    title: { ar: "سفارتك أو قنصليتك", en: "Your Embassy or Consulate", hi: "आपका दूतावास या वाणिज्य दूतावास", fr: "Votre ambassade ou consulat" },
    desc: { ar: "احفظ رقم سفارة بلدك في مسقط قبل السفر — معظمها متوفر في العاصمة.", en: "Save your country's embassy number in Muscat before traveling — most are based in the capital.", hi: "यात्रा से पहले मस्कट में अपने देश के दूतावास का नंबर सेव करें — अधिकांश राजधानी में स्थित हैं।", fr: "Enregistrez le numéro de l'ambassade de votre pays à Mascate avant de voyager — la plupart sont situées dans la capitale." },
    action: { type: "search", query: "Embassies in Muscat Oman" },
  },
  {
    key: "airport",
    icon: Plane,
    color: "#2F5D45",
    title: { ar: "مطار صلالة الدولي", en: "Salalah International Airport", hi: "सलालाह अंतरराष्ट्रीय हवाई अड्डा", fr: "Aéroport international de Salalah" },
    desc: { ar: "موقع المطار على الخريطة لمعرفة الاتجاهات.", en: "Airport location on the map for directions.", hi: "दिशा-निर्देशों के लिए मानचित्र पर हवाई अड्डे का स्थान।", fr: "Emplacement de l'aéroport sur la carte pour s'y rendre." },
    action: { type: "search", query: "مطار صلالة الدولي" },
  },
  {
    key: "hospital",
    icon: Stethoscope,
    color: "#B5402C",
    title: { ar: "مستشفى السلطان قابوس", en: "Sultan Qaboos Hospital", hi: "सुल्तान क़ाबूस अस्पताल", fr: "Hôpital Sultan Qaboos" },
    desc: { ar: "أقرب مستشفى حكومي رئيسي في صلالة — راجع صفحة الصحة لكامل القائمة.", en: "The nearest major government hospital in Salalah — see the Health page for the full list.", hi: "सलालाह का निकटतम प्रमुख सरकारी अस्पताल — पूरी सूची के लिए स्वास्थ्य पृष्ठ देखें।", fr: "Le principal hôpital public le plus proche à Salalah — voir la page Santé pour la liste complète." },
    action: { type: "link", url: "https://maps.app.goo.gl/T9pL5XufvvAy62Q79?g_st=ac" },
  },
];

const TIPS_CLOSING = {
  ar: "نصيحة مهمة: إذا كنت تزور ظفار في موسم الخريف، فاحرص على الاستمتاع بالطبيعة دون الإضرار بها، واترك المكان كما وجدته ليستمتع به غيرك.",
  en: "Important tip: If you're visiting Dhofar during khareef season, enjoy nature without harming it, and leave the place as you found it for others to enjoy.",
  hi: "महत्वपूर्ण सुझाव: यदि आप ख़रीफ़ सीज़न में ज़ुफ़ार आ रहे हैं, तो प्रकृति को नुकसान पहुंचाए बिना उसका आनंद लें, और जगह को वैसे ही छोड़ें जैसे आपने पाया था ताकि अन्य लोग भी इसका आनंद ले सकें।",
  fr: "Conseil important : Si vous visitez Dhofar pendant la saison du khareef, profitez de la nature sans lui nuire, et laissez les lieux tels que vous les avez trouvés pour que d'autres puissent en profiter.",
};

// Flat list (kept for the short Home-page preview)
const TIPS = TIP_CATEGORIES.flatMap((c) => c.items);

const DAYS = [
  { ar: "الأحد", en: "Sun", hi: "रवि", fr: "Dim" },
  { ar: "الاثنين", en: "Mon", hi: "सोम", fr: "Lun" },
  { ar: "الثلاثاء", en: "Tue", hi: "मंगल", fr: "Mar" },
  { ar: "الأربعاء", en: "Wed", hi: "बुध", fr: "Mer" },
  { ar: "الخميس", en: "Thu", hi: "गुरु", fr: "Jeu" },
  { ar: "الجمعة", en: "Fri", hi: "शुक्र", fr: "Ven" },
  { ar: "السبت", en: "Sat", hi: "शनि", fr: "Sam" },
];

const TIMES = [
  { key: "morning", ar: "صباحاً (7-11)", en: "Morning (7–11)", hi: "सुबह (7–11)", fr: "Matin (7–11)" },
  { key: "noon", ar: "ظهراً (11-4)", en: "Midday (11–4)", hi: "दोपहर (11–4)", fr: "Midi (11–16)" },
  { key: "evening", ar: "مساءً (4-9)", en: "Evening (4–9)", hi: "शाम (4–9)", fr: "Soir (16–21)" },
  { key: "night", ar: "ليلاً (9-12)", en: "Night (9–12)", hi: "रात (9–12)", fr: "Nuit (21–00)" },
];

const PROFILES = {
  festHigh:   [25, 20, 75, 95],
  fest:       [15, 15, 60, 80],
  natureHigh: [80, 55, 35, 5],
  natureMid:  [55, 35, 25, 5],
  natureLow:  [30, 20, 15, 5],
  cultureMid: [40, 50, 30, 10],
  cultureLow: [20, 25, 15, 5],
};

function getCrowdScore(base, dayIdx, timeKey) {
  const curve = PROFILES[base] || PROFILES.natureMid;
  const tIdx = TIMES.findIndex((t) => t.key === timeKey);
  const weekend = dayIdx === 5 || dayIdx === 4;
  const weekendBoost = weekend ? 1.35 : 1;
  let score = curve[tIdx] * weekendBoost;
  return Math.min(100, Math.round(score));
}

function crowdLevel(score, lang) {
  if (score >= 65) return { label: { ar: "مزدحم", en: "Busy", hi: "व्यस्त", fr: "Animé" }, color: "#B5402C", bg: "#B5402C1A" };
  if (score >= 35) return { label: { ar: "متوسط", en: "Moderate", hi: "मध्यम", fr: "Modéré" }, color: "#C98A2E", bg: "#C98A2E1A" };
  return { label: { ar: "هادئ", en: "Quiet", hi: "शांत", fr: "Calme" }, color: "#2F7D4A", bg: "#2F7D4A1A" };
}

const ALL_CROWD_PLACES_RAW = [
  ...EVENTS.map((e) => ({ nAr: e.nAr, nEn: e.nEn, base: e.crowdBase, subAr: e.placeAr, subEn: e.placeEn })),
  ...["west", "mid", "east"].flatMap((key) =>
    REGIONS[key].spots.map((s) => ({ nAr: s.nAr, nEn: s.nEn, base: s.crowdBase || "natureMid", subAr: tx(REGIONS[key].label, "ar"), subEn: tx(REGIONS[key].label, "en") }))
  ),
  ...HERITAGE.map((h) => ({ nAr: h.nAr, nEn: h.nEn, base: h.crowdBase, subAr: h.locAr, subEn: h.locEn })),
  ...MUSEUMS_FARMS.map((m) => ({ nAr: m.nAr, nEn: m.nEn, base: m.crowdBase, subAr: m.locAr, subEn: m.locEn })),
];

// De-duplicate by Arabic name — the same place can appear in more than one
// source list above (e.g. a heritage site that's also listed regionally),
// which previously caused duplicate React keys and broke the crowd list
// after repeated re-sorts.
const ALL_CROWD_PLACES = Array.from(
  new Map(ALL_CROWD_PLACES_RAW.map((p) => [p.nAr, p])).values()
);

/* ===================================================================
   I18N — UI chrome strings
=================================================================== */

/* ===================================================================
   ITINERARY DATA — 6-day Khareef Salalah plan (based on @maryamalsaadiii)
   Organised by region → day → spots, each with Google Maps link.
   Spots within each day are ordered geographically (nearest → farthest
   from Salalah centre) so the user covers ground efficiently.
=================================================================== */

// Site type icons and labels — used in the Sites page
const SPOT_TYPES = {
  spring:       { emoji: "💧", label: { ar: "عين مائية",   en: "Spring",       hi: "झरना",      fr: "Source" } },
  wadi:         { emoji: "🌊", label: { ar: "وادي",        en: "Wadi",         hi: "घाटी",       fr: "Oued" } },
  mountain:     { emoji: "⛰️", label: { ar: "جبل",         en: "Mountain",     hi: "पर्वत",     fr: "Montagne" } },
  viewpoint:    { emoji: "🔭", label: { ar: "إطلالة",      en: "Viewpoint",    hi: "दृश्य स्थल", fr: "Belvédère" } },
  beach:        { emoji: "🏖️", label: { ar: "شاطئ",       en: "Beach",        hi: "समुद्र तट", fr: "Plage" } },
  heritage:     { emoji: "🏛️", label: { ar: "موقع تراثي", en: "Heritage Site", hi: "विरासत स्थल", fr: "Site patrimonial" } },
  museum:       { emoji: "🏺", label: { ar: "متحف",        en: "Museum",       hi: "संग्रहालय",  fr: "Musée" } },
  cave:         { emoji: "🕳️", label: { ar: "كهف/حفرة",   en: "Cave/Sinkhole", hi: "गुफा",      fr: "Grotte/Gouffre" } },
  religious:    { emoji: "🕌", label: { ar: "موقع ديني",   en: "Religious Site", hi: "धार्मिक स्थल", fr: "Site religieux" } },
  market:       { emoji: "🛍️", label: { ar: "سوق",         en: "Market",       hi: "बाज़ार",    fr: "Marché" } },
  park:         { emoji: "🌳", label: { ar: "متنزه/حديقة", en: "Park/Garden",  hi: "पार्क",      fr: "Parc/Jardin" } },
  marina:       { emoji: "⚓", label: { ar: "مرسى/ممشى",   en: "Marina",       hi: "मरीना",     fr: "Marina" } },
  forest:       { emoji: "🌿", label: { ar: "غابة/أشجار",  en: "Forest/Trees", hi: "वन/पेड़",   fr: "Forêt/Arbres" } },
  road:         { emoji: "🛣️", label: { ar: "طريق مميز",   en: "Scenic Road",  hi: "दर्शनीय सड़क", fr: "Route panoramique" } },
  corniche:     { emoji: "🌅", label: { ar: "كورنيش/ممشى", en: "Corniche",     hi: "कॉर्निश",   fr: "Corniche" } },
  fuel:         { emoji: "⛽", label: { ar: "محطة وقود",   en: "Fuel Station", hi: "ईंधन स्टेशन", fr: "Station-service" } },
  village:      { emoji: "🏘️", label: { ar: "قرية",        en: "Village",      hi: "गांव",       fr: "Village" } },
  tree:         { emoji: "🌲", label: { ar: "شجرة نادرة",   en: "Rare Tree",    hi: "दुर्लभ पेड़", fr: "Arbre rare" } },
};

function itinUrl(name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " Dhofar Oman")}`;
}

// Style tags used on each spot — a spot can have multiple tags
const TRAVEL_STYLES = {
  family:      { icon: "👨‍👩‍👧‍👦", label: { ar: "عائلي",  en: "Family",       hi: "परिवार",  fr: "Famille" },   color: "#2F5D45" },
  youth:       { icon: "🏃",       label: { ar: "شبابي",  en: "Youth",        hi: "युवा",    fr: "Jeunes" },    color: "#3C6E8F" },
  entertainment:{ icon: "🎡",      label: { ar: "ترفيه",  en: "Entertainment",hi: "मनोरंजन",  fr: "Divertissement" }, color: "#C98A2E" },
  nature:      { icon: "🌿",       label: { ar: "طبيعة",  en: "Nature",       hi: "प्रकृति", fr: "Nature" },    color: "#4C7A3D" },
  heritage:    { icon: "🏛️",      label: { ar: "تراث",   en: "Heritage",     hi: "विरासत",  fr: "Patrimoine" }, color: "#8A4A23" },
};

const ITIN_REGIONS = {
  central: {
    label: { ar: "الوسط", en: "Central", hi: "मध्य", fr: "Centre" },
    color: "#3C6E8F", icon: CloudFog,
    days: [
      {
        titleAr: "البلد الأثري • إطلالة حمرير • جوجب • عين صحلنوت",
        titleEn: "Al Baleed • Hamrir Viewpoint • Jujub • Ayn Sahalnaut",
        descAr: "ابدأ بمنتزه البلد الأثري، ثم إطلالة حمرير البانورامية، وتابع إلى وادي نحيز ومنطقة جوجب الجبلية، واختتم في عين صحلنوت.",
        descEn: "Start at Al Baleed, take in Hamrir Viewpoint, continue to Wadi Nuheiz and the mountain area of Jujub, end at Ayn Sahalnaut.",
        spots: [
          { nAr: "متحف أرض اللبان + منتزه البليد الأثري", nEn: "Land of Frankincense Museum + Al Baleed Park", descAr: "موقع تاريخي مدرج بالتراث العالمي يروي حضارة عُمان العريقة وسط الأطلال والأسوار القديمة.", descEn: "UNESCO World Heritage site narrating Oman's ancient civilisation among ruins and old walls.", styles: ["heritage","family"] , lat: 17.0178, lng: 54.0934},
          { nAr: "اكشاك جوز الهند", nEn: "Coconut Stalls", descAr: "أكشاك مميزة تبيع جوز الهند الطازج وسط الطبيعة على مقربة من البليد.", descEn: "Charming stalls selling fresh coconuts near Al Baleed, a refreshing stop.", styles: ["family","entertainment"] , lat: 17.0035962, lng: 54.1155011},
          { nAr: "ضريح النبي عمران", hours: "6:00 - 20:00", nEn: "Nabi Imran Tomb", descAr: "موقع ديني وتاريخي هادئ في قلب المدينة، يزوره كثيرون تباركاً وتأملاً.", descEn: "A peaceful religious and historic site in the heart of the city, visited for reflection.", styles: ["heritage","family"] , lat: 17.0214943, lng: 54.1113373},
          { nAr: "إطلالة حمرير", nEn: "Hamrir Viewpoint", descAr: "منظر بانورامي خلاب يطل على خضرة الجبال وأجواء ظفار الساحرة.", descEn: "A stunning panoramic view over the green mountains and enchanting Dhofar scenery.", styles: ["nature","youth"] , lat: 17.1233081, lng: 54.1449883},
          { nAr: "وادي نحيز", nEn: "Wadi Nuheiz", descAr: "واد طبيعي تحيط به الجبال ويزخر بجمال النباتات والتكوينات الصخرية.", descEn: "A natural valley rich with beautiful plants and rock formations.", styles: ["nature","family","youth"] , lat: 17.1895277, lng: 54.0860812},
          { nAr: "منطقة جوجب (المنطقة الزلقة)", nEn: "Jujub Area (Slippery Zone)", descAr: "منطقة جبلية مدهشة تجذب عشاق المغامرة — المنطقة الزلقة الشهيرة.", descEn: "A stunning mountain zone famous with adventure lovers — the slippery zone.", styles: ["youth","nature"] , lat: 17.203, lng: 54.296},
          { nAr: "عين صحلنوت", nEn: "Ayn Sahalnoot", descAr: "منبع ماء طبيعي تحيط به الأشجار والمتحجرات، مثالي للاسترخاء العائلي.", descEn: "A natural spring surrounded by trees and petrified wood, perfect for family relaxation.", styles: ["nature","family"] , lat: 17.1481424, lng: 54.178309},
        ],
      },
      {
        titleAr: "عين ارزات • عين جرزيز • جبل اتين • وادي دربات • مارينا هوانا",
        titleEn: "Ayn Razat • Ayn Jarziz • Jabal Atin • Wadi Darbat • Howana Marina",
        descAr: "جولة شاملة في عيون ظفار وشلالاتها الخلابة، صعوداً لجبل اتين، ثم هدوء وادي دربات وأجواء مارينا هوانا المسائية.",
        descEn: "A full tour of Dhofar's springs and waterfalls, up to Jabal Atin, then the calm of Wadi Darbat and Howana Marina's evening atmosphere.",
        spots: [
          { nAr: "عين رزات", hours: "6:00 - 22:00", nEn: "Ayn Razat", descAr: "واحة خضراء من أشهر عيون ظفار، تتدفق مياهها وسط الأشجار الكثيفة.", descEn: "One of Dhofar's most famous springs, with water flowing through dense trees.", styles: ["nature","family"] , lat: 17.1299371, lng: 54.238073},
          { nAr: "عين جرزيز", nEn: "Ayn Gharziz", descAr: "عين مائية خفية تكتشفها عبر مسار قصير بين الأشجار بأجواء باردة منعشة.", descEn: "A hidden spring discovered along a short trail through cool, refreshing trees.", styles: ["nature","youth"] , lat: 17.1059336, lng: 54.0742133},
          { nAr: "سهل أتين", nEn: "Jabal Ittin", descAr: "قمة جبلية تطل على السحاب والوديان، وجهة مفضلة لعشاق التصوير والطبيعة.", descEn: "A mountain peak overlooking clouds and valleys, a favourite for photography and nature lovers.", styles: ["nature","youth"] , lat: 17.0713432, lng: 54.0670953},
          { nAr: "وادي دربات", hours: "6:00 - 22:00", nEn: "Wadi Darbat", descAr: "واد ساحر يجمع الشلالات والطبيعة الخلابة مع أجواء مثالية للعائلات.", descEn: "A magical wadi combining waterfalls and stunning nature, perfect for families.", styles: ["nature","family","youth"] , lat: 17.102124, lng: 54.4517814},
          { nAr: "حنجة القوارب - دربات", nEn: "Wadi Darbat", descAr: "مكان مميز لركوب القوارب وسط المياه والطبيعة في أجواء ترفيهية فريدة.", descEn: "A unique spot for boat rides surrounded by nature and water in a fun atmosphere.", styles: ["family","entertainment"] , lat: 17.1053125, lng: 54.4530625},
          { nAr: "منتزه سمهرم الأثري (خور روري)", nEn: "Samhuram Archaeological Park (Khor Rori)", descAr: "موقع تاريخي مدرج في التراث العالمي، يحكي قصة ميناء اللبان القديم وحضارة أرض اللبان.", descEn: "A UNESCO-listed historical site telling the story of the ancient frankincense port.", styles: ["heritage","family"] , lat: 17.0567, lng: 54.4312},
          { nAr: "لامير المغسيل", nEn: "Hawana Salalah", descAr: "واجهة بحرية أنيقة بمطاعم وممشى بحري، وجهة مسائية مميزة.", descEn: "An elegant seafront with restaurants and a marina promenade, a great evening destination.", styles: ["entertainment","family"] , lat: 16.8890489, lng: 53.8230531},
        ],
      },
    ],
  },
  east: {
    label: { ar: "الشرق (طاقة + مرباط)", en: "East (Taqah & Mirbat)", hi: "पूर्व", fr: "Est (Taqah & Mirbat)" },
    color: "#8A4A23", icon: Waves,
    days: [
      {
        titleAr: "عين حمران • عين أثوم • كورنيش طاقة • طاقة التراثية",
        titleEn: "Ayn Hamran • Ayn Athum • Taqah Corniche • Heritage Taqah",
        descAr: "انطلق لعين حمران وعين أثوم بين الصخور والمياه، ثم كورنيش طاقة المطل على البحر، فمدينة طاقة التراثية بحصنها وبيت كومان ومتحف تواصل الأجيال وسفح طاقة.",
        descEn: "Head to Ayn Hamran and Ayn Athum, then Taqah Corniche overlooking the sea, followed by Taqah's heritage with its castle, Bait Kowan, Generations Museum, and the Taqah Slope.",
        spots: [
          { nAr: "عين حمران", nEn: "Ayn Hamran", descAr: "واحة خضراء هادئة تحيط بها الأشجار وتتناسب فيها المياه وسط الطبيعة.", descEn: "A lush, peaceful oasis where water flows gently through nature.", styles: ["nature","family"] , lat: 17.0974375, lng: 54.2809375},
          { nAr: "عين وشلالات أثوم", nEn: "Ayn Athum", descAr: "عين مائية تنبع من بين الصخور بجمال طبيعي وأجواء باردة منعشة.", descEn: "A spring emerging from the rocks with natural beauty and cool air.", styles: ["nature","youth"] , lat: 17.1132375, lng: 54.3649531},
          { nAr: "عين وشلالات طبرق", nEn: "Ayn Tabruk", descAr: "عين طبيعية نضرة بمياه صافية وأجواء خلابة بين الجبال الخضراء.", descEn: "A fresh natural spring with clear waters and beautiful scenery among green mountains.", styles: ["nature","family"] , lat: 17.1005625, lng: 54.3265625},
          { nAr: "كورنيش طاقة", nEn: "Taqah Corniche", descAr: "واجهة بحرية هادئة تطل على بحر العرب، مناسبة للتنزه والاسترخاء.", descEn: "A peaceful seafront overlooking the Arabian Sea, ideal for strolling and relaxing.", styles: ["family","entertainment"] , lat: 17.0334727, lng: 54.3942161},
          { nAr: "مدينة طاقة التراثية", nEn: "Taqah Castle", descAr: "بلدة تاريخية تحتضن معالم عريقة تروي قصص الماضي بجماليات معمارية فريدة.", descEn: "A historic town holding ancient landmarks that narrate stories of the past.", styles: ["heritage","family"] , lat: 17.03901, lng: 54.395323},
          { nAr: "حصن طاقة", nEn: "Taqah Castle", descAr: "حصن أثري متين يطل على المدينة والبحر، شاهد على التاريخ العُماني العريق.", descEn: "A solid historical fortress overlooking the city and sea, witness to Oman's ancient history.", styles: ["heritage"] , lat: 17.03901, lng: 54.395323},
          { nAr: "بيت كومان التراثي", nEn: "Bait Kowan Heritage House", descAr: "بيت قديم يعكس تفاصيل الحياة الأُمانية التقليدية بلمسة تاريخية أصيلة.", descEn: "An old house reflecting traditional Omani life with an authentic historical touch.", styles: ["heritage"] , lat: 17.0293, lng: 54.3875},
          { nAr: "متحف تواصل الأجيال", nEn: "Generations Museum", descAr: "متحف ثقافي يعرض تاريخ عُمان وحكاياته بين الماضي والحاضر.", descEn: "A cultural museum displaying Oman's history between past and present.", styles: ["heritage","family"] , lat: 17.0291, lng: 54.387},
          { nAr: "برج العسكر وسفح طاقة", nEn: "Al Askar Tower Taqah", descAr: "برج دفاعي قديم ومنطقة مرتفعة توفر إطلالة بانورامية رائعة على البحر والمدينة.", descEn: "Ancient defensive tower and elevated area with a stunning panoramic sea view.", styles: ["heritage","youth"] , lat: 17.0288, lng: 54.3869},
        ],
      },
      {
        titleAr: "شاطئ الحمر • طريق انعدام الجاذبية • اللبان المعمرة • جبل سمحان • مرباط",
        titleEn: "Al Hamr Beach • Anti-Gravity Road • Frankincense Trees • Jabal Samhan • Mirbat",
        descAr: "يوم استثنائي شرقاً: بانوراما شاطئ الحمر، طريق انعدام الجاذبية الفريد، ضخامة اللبان المعمرة، قمة جبل سمحان فوق السحاب، وتراث مرباط العريق.",
        descEn: "An exceptional day eastward: Al Hamr Beach panorama, the unique anti-gravity road, giant frankincense trees, Samhan's peak above the clouds, and Mirbat's ancient heritage.",
        spots: [
          { nAr: "طريق انعدام الجاذبية", nEn: "Anti Gravity Point Salalah", descAr: "طريق فريد يوهم بانعدام الجاذبية وكأنه يتحدى قوانين الفيزياء — تجربة لا تُنسى!", descEn: "A unique road creating an anti-gravity illusion as if defying physics — an unforgettable experience!", styles: ["youth","entertainment","family"] , lat: 17.0394417, lng: 54.6134819},
          { nAr: "المحمية الوطنية لأشجار اللبان", hours: "7:00 - 19:00", nEn: "Ancient Frankincense Trees", descAr: "أشجار ضخمة نادرة تضيف طابعاً أسطورياً لطبيعة ظفار الخضراء.", descEn: "Rare giant trees adding a legendary character to Dhofar's lush nature.", styles: ["nature","heritage","family"] , lat: 17.3384278, lng: 54.076292},
          { nAr: "جبل ناشب", nEn: "Jabal Nashib", descAr: "قمة هادئة بمناظر خضراء ضبابية تناسب عشاق الطبيعة والتأمل.", descEn: "A quiet peak with green misty views, ideal for nature lovers and contemplation.", styles: ["nature","youth"] , lat: 17.1035625, lng: 54.3104375},
          { nAr: "جبل سمحان (فوق السحاب)", nEn: "Jebel Samhan", descAr: "أعلى قمة في عُمان — تلامس الغيوم وتكشف من فوقها سحر الطبيعة والسحاب.", descEn: "Oman's highest peak — touching the clouds and revealing the magic of nature from above.", styles: ["youth","nature"] , lat: 17.1026047, lng: 54.6980883},
          { nAr: "وادي دربات", hours: "6:00 - 22:00", nEn: "Wadi Darbat", descAr: "واد ساحر جامع للشلالات والطبيعة الخلابة، محطة مثالية في طريق العودة.", descEn: "A magical wadi with waterfalls and stunning nature, a perfect stop on the way back.", styles: ["nature","family"] , lat: 17.102124, lng: 54.4517814}
  ,
          { nAr: "حصن مرباط والحارة القديمة", nEn: "Mirbat Castle", descAr: "حصن مرباط شاهد التاريخ العريق والحارة القديمة تعيش بتفاصيلها الأصيلة.", descEn: "Mirbat Castle as witness to ancient history, and the Old Quarter still alive in authentic detail.", styles: ["heritage","family"] , lat: 16.9925202, lng: 54.6916472},
          { nAr: "شاطئ مرباط", hours: "0:00 - 24:00", nEn: "Mirbat Beach", descAr: "شاطئ تاريخي هادئ يجمع بين جمال البحر وعراقة المدينة التاريخية.", descEn: "A peaceful historic beach combining sea beauty with the city's ancient heritage.", styles: ["nature","family"] , lat: 16.9931087, lng: 54.6910019},
        ],
      },
    ],
  },
  west: {
    label: { ar: "الغرب (المغسيل + ضلكوت)", en: "West (Mughsail & Dalkut)", hi: "पश्चिम", fr: "Ouest (Mughsail & Dalkut)" },
    color: "#2F5D45", icon: Mountain,
    days: [
      {
        titleAr: "افتلقوت • عين كور • شاطئ المغسيل • جبل السان • منطقة شعت • سهل اتين",
        titleEn: "Aftalqut • Ayn Kour • Mughsail Beach • Jabal Al San • Sha'at • Atin Plain",
        descAr: "انطلق لإطلالة افتلقوت الخلابة، ثم عين كور الجبلية، شاطئ المغسيل بتوافيره وكهوفه الطبيعية، وجبل السان المميز، فمنطقة شعت الساحرة على بحر العرب، واختتم في سهل أتين الأخضر.",
        descEn: "Head to Aftalqut Viewpoint, then Ayn Kour, Mughsail Beach with its blowholes and caves, the distinctive Jabal Al San, the magical Sha'at overlooking the Arabian Sea, and end at Atin Plain.",
        spots: [
          { nAr: "إطلالة افتلقوت", nEn: "Affalqut Viewpoint", descAr: "موقع مرتفع يوفر منظراً بانورامياً يخطف الأنفاس للجبال والبحر معاً.", descEn: "An elevated spot offering a breathtaking panoramic view of mountains and sea.", styles: ["nature","youth"] , lat: 17.0512, lng: 53.9823},
          { nAr: "عين كور", nEn: "Ayn Khor", descAr: "عين مخفية في قلب الجبال يصلها أصحاب المغامرة بدفع رباعي.", descEn: "A hidden spring in the heart of the mountains, reached by 4×4 adventurers.", styles: ["youth","nature"] , lat: 17.048874, lng: 53.963692},
          { nAr: "شاطئ المغسيل وكهف المرنيف", nEn: "Mughsail Beach & Marnif Cave", descAr: "شاطئ فريد برماله النظيفة وتوافيره الطبيعية المدهشة وكهف المرنيف المبهر.", descEn: "A unique beach with clean sands, amazing natural blowholes, and the spectacular Marnif Cave.", styles: ["nature","family","youth","entertainment"] , lat: 16.8751388, lng: 53.7666298},
          { nAr: "نوافير المغسيل الطبيعية", hours: "0:00 - 24:00", nEn: "Mughsail Natural Blowholes", descAr: "ظاهرة طبيعية مدهشة: مياه البحر تتدفق من شقوق الصخور لتشكّل توافير عملاقة!", descEn: "A stunning natural phenomenon: seawater rushing through rock cracks to form giant jets!", styles: ["nature","family","entertainment"] , lat: 16.8751388, lng: 53.7666298},
          { nAr: "مرتفعات ألسان", nEn: "Jabal Al San", descAr: "قمة جبلية مميزة تكسوها الضباب والخضرة، تناسب التنزه والتصوير الفوتوغرافي.", descEn: "A distinctive misty green mountain peak, perfect for hiking and photography.", styles: ["nature","youth"] , lat: 17.1750555, lng: 54.2501138},
          { nAr: "قمة مطل شعت", nEn: "Shaat Salalah", descAr: "إطلالة ساحرة على بحر العرب من فوق السحاب في أجواء هادئة ومهيبة.", descEn: "A magical view over the Arabian Sea from above the clouds in calm, majestic surroundings.", styles: ["nature","youth"] , lat: 16.7646569, lng: 53.6017708},
          { nAr: "سهل اتين", nEn: "Ittin", descAr: "مساحة خضراء فسيحة تُقام فيها فعاليات خريف ظفار وسط الطبيعة البديعة.", descEn: "A vast green area alive with khareef season events surrounded by beautiful nature.", styles: ["entertainment","family"] , lat: 17.006, lng: 54.12},
        ],
      },
      {
        titleAr: "رخيوت • ولاية ضلكوت • شجرة التبلدي • قرية ديم • شاطئ ضلكوت",
        titleEn: "Rakhyut • Dalkut • Baobab Tree • Daim Village • Dalkut Beach",
        descAr: "يوم مغامرة بامتياز في أقصى الغرب: رخيوت الجبلية، ضلكوت الضبابية، شجرة التبلدي العملاقة، قرية ديم المعلقة في السحاب، وهدوء شاطئ ضلكوت.",
        descEn: "A full adventure day in the far west: mountainous Rakhyut, misty Dalkut, the giant Baobab tree, cloud-perched Daim Village, and the peaceful Dalkut Beach.",
        spots: [
          { nAr: "إطلالة رخيوت", nEn: "Rakhyut", descAr: "ولاية ساحلية جبلية نائية بطبيعة بكر ومناظر لا تُصدّق بين الجبال والبحر.", descEn: "A remote coastal mountain wilayat with pristine nature and incredible scenery between mountains and sea.", styles: ["nature","youth"] , lat: 16.7491631, lng: 53.4377971},
          { nAr: "ولاية ضلكوت (المسارات الجبلية)", nEn: "Dhalkut", descAr: "ضلكوت تتميز بطبيعتها الجبلية الخلابة وإطلالاتها الضبابية التي تجذب عشاق الهدوء والمغامرة.", descEn: "Dalkut's stunning mountain nature and misty views attract lovers of tranquility and adventure.", styles: ["nature","youth"] , lat: 16.726, lng: 53.258},
          { nAr: "شجرة التبلدي (البولاب) – ضلكوت", nEn: "Dalkut Baobab Tree", descAr: "من أضخم وأندر الأشجار في شبه الجزيرة العربية، معلم طبيعي فريد يستحق الزيارة.", descEn: "One of the largest and rarest trees on the Arabian Peninsula — a unique natural landmark.", styles: ["nature","family","youth"] , lat: 16.726, lng: 53.258}
  ,
          { nAr: "جبل القمر الغربي", nEn: "Western Jabal Al Qamar", descAr: "من أطول مسارات الهايكنج في ظفار، بمناظر خضراء وإطلالات بحرية مذهلة.", descEn: "One of Dhofar's longest hiking trails, with green scenery and stunning sea views.", styles: ["youth","nature"] , lat: 16.76, lng: 53.54},
          { nAr: "شاطئ ضلكوت", nEn: "Dhalkut Beach", descAr: "شاطئ بمياه نقية ورمال داكنة، وجهة مثالية للراحة والتأمل بعيداً عن الزحام.", descEn: "A beach with pure waters and dark sands, a perfect spot for rest and contemplation away from crowds.", styles: ["nature","family"] , lat: 16.701983, lng: 53.232871},
        ],
      },
    ],
  },
};

const MAX_ITIN_DAYS = 6;

function buildItinerary(regions, days, styleFilter) {
  const result = [];
  if (regions.length === 0 || days === 0) return result;

  const regList = regions.filter((r) => ITIN_REGIONS[r]);
  const totalRegDays = regList.reduce((sum, r) => sum + ITIN_REGIONS[r].days.length, 0);
  let dayBudget = { ...Object.fromEntries(regList.map((r) => [r, 0])) };

  let remaining = days;
  regList.forEach((r, idx) => {
    const available = ITIN_REGIONS[r].days.length;
    const share = idx === regList.length - 1
      ? remaining
      : Math.min(available, Math.round((available / totalRegDays) * days));
    dayBudget[r] = Math.min(share, available);
    remaining -= dayBudget[r];
  });

  const GEO_ORDER = ["central", "east", "west"];
  let dayNum = 1;
  GEO_ORDER.filter((r) => dayBudget[r] > 0).forEach((reg) => {
    const regionData = ITIN_REGIONS[reg];
    for (let d = 0; d < dayBudget[reg]; d++) {
      if (dayNum > days) break;
      const dayData = regionData.days[d];
      // Filter spots by style — if no style selected, show all
      const spots = styleFilter
        ? dayData.spots.filter((s) => s.styles && s.styles.includes(styleFilter))
        : dayData.spots;
      if (spots.length > 0) {
        result.push({ dayNum: dayNum++, region: reg, ...dayData, spots });
      } else {
        // Day has no matching spots for this style — still count the day but note it
        result.push({ dayNum: dayNum++, region: reg, ...dayData, spots: [], noMatch: true });
      }
    }
  });

  return result;
}


const I18N = {
  ar: {
    appTitle: "خريف ظفار 2026", more: "المزيد",
    home: "الرئيسية", events: "الفعاليات", sites: "المواقع", crowd: "الازدحام",
    best: "أفضل وقت", evening: "المساء", heritage: "التراث", access: "الوصول", health: "الصحة",
    bestDesc: "حسب قوة الخريف", eveningDesc: "مولات ومهرجانات", heritageDesc: "متاحف ومزارع سلطانية",
    accessDesc: "براً وجواً", healthDesc: "مستشفيات وعيادات",
    namesNote: "أسماء الأماكن والفعاليات تُعرض بالإنجليزية لتسهيل البحث عنها في الخرائط.",
    weatherNote1: "درجة الحرارة هي آخر قراءة فعلية معروفة لصلالة، وليست بثاً حياً متجدداً تلقائياً داخل هذا التطبيق.",
    weatherNote2: "تصوير الضباب/الغيوم نمط معتاد لهذا الوقت من اليوم في موسم الخريف.",
    forecastTitle: "توقعات الأسبوع القادم", today: "اليوم",
    forecastDisclaimer: "هذا نمط تقريبي معتاد للطقس في موسم الخريف، وليس توقعات أرصاد حية فعلية.",
    heroEyebrow: "مساعدك الشخصي لموسم", heroSub: "2026 · صلالة، عُمان",
    heroDesc: "ضباب الجبل، رائحة المطر، وفعاليات على مدار الموسم. اسألني عن أي مكان أو موعد وسأرشدك.",
    todayEyebrow: "اليوم", todayTitle: "فعاليات جارية الآن",
    followTitle: "تابع آخر المستجدات", followNote: "بيانات المواعيد بالتطبيق تُحدَّث يدوياً اعتماداً على منشورات الحسابين أعلاه — التطبيق لا يسحب المحتوى تلقائياً من إنستقرام.",
    tipsTitle: "نصائح الزائر", location: "الموقع", openMaps: "افتح في خرائط جوجل",
    eventsEyebrow: "#شيء_ثاني", eventsTitle: "مواعيد أهم الفعاليات", companionTitle: "فعاليات مصاحبة",
    to: "إلى",
    bestEyebrow: "مهرجانات · طبيعة · أجواء", bestTitle: "أفضل فترات الخريف",
    bestIntro: "نسبة قوة الخريف تقديرية وتعتمد على ثلاثة عوامل، وقد تتغير حسب الأرصاد الجوية أسبوعياً.",
    colFest: "مهرجانات", colNature: "طبيعة", colWeather: "أجواء",
    sitesEyebrow: "دليل خريف صلالة", sitesTitle: "المواقع",
    searchPlaceholder: "ابحث عن موقع...", noResults: "لا توجد نتائج مطابقة",
    distanceFooter: "جميع المسافات تقريبية من وسط مدينة صلالة (برج النهضة). اضغط أي موقع لفتحه في خرائط جوجل.",
    km: "كم", elevationLabel: "الارتفاع", fourByFourYes: "يتطلب دفع رباعي", fourByFourNo: "لا يتطلب دفع رباعي",
    campingLabel: "التخييم", bestCampingTitle: "أفضل أماكن التخييم", top5Title: "أفضل 5 مسارات لمحبي الهايكنج الحقيقي",
    eveningEyebrow: "بعد الغروب", eveningTitle: "أفضل الأماكن المسائية",
    grpBeaches: "شواطئ مسائية", grpFestivals: "مهرجانات", grpMalls: "مولات", grpSouqs: "أسواق", grpCafes: "مجمعات ومقاهي",
    heritageEyebrow: "مناسبة لزوار الخريف", heritageTitle: "أماكن تراثية وتاريخية",
    museumsFarmsTitle: "متاحف حكومية ومزارع سلطانية", visitTipsTitle: "نصائح للزيارة",
    hoursLabel: "أوقات الزيارة", hoursDisclaimer: "الأوقات أدناه تقريبية وقد تتغير حسب اليوم والموسم — يُنصح بالتأكد من الجهة الرسمية أو الاتصال المسبق قبل الزيارة، خصوصاً للمواقع الخاصة.",
    accessEyebrow: "كيف تصل", accessTitle: "الوصول إلى ظفار",
    byLand: "عن طريق البر", byAir: "عن طريق الجو",
    landIntro: "نقاط الحدود البرية الرئيسية لدخول عُمان متجهاً إلى صلالة، مع معلومات مساندة للطريق. اضغط \"ابدأ الملاحة\" لفتح المسار في خرائط جوجل. تأكد دائماً من حالة تشغيل المنفذ والمستندات المطلوبة قبل السفر.",
    startNav: "ابدأ الملاحة",
    airportTitle: "مطار صلالة الدولي",
    airportDesc: "رحلات داخلية يومية من مسقط (مدتها تقريباً ساعة)، إضافة إلى رحلات إقليمية ومواسم خريف مباشرة من بعض دول الخليج. يُنصح بالحجز المبكر خلال ذروة الموسم (أغسطس).",
    airportBtn: "موقع المطار",
    airportNote: "تحقق دائماً من شركة الطيران لمعرفة الوجهات المباشرة الحالية لأنها قد تتغير موسمياً.",
    healthEyebrow: "للطوارئ والزيارات الطبية", healthTitle: "المستشفيات والعيادات",
    emergencyNote: "في الطوارئ اتصل بالرقم الموحد",
    emergencyNote2: "الإحداثيات الدقيقة متوفرة عند الضغط على المستشفى لفتحه في خرائط جوجل.",
    crowdEyebrow: "تقدير ذكي · ليس بيانات حية", crowdTitle: "ازدحام المواقع",
    crowdDisclaimer: "هذا تقدير مبني على نمط الازدحام المعتاد حسب اليوم والوقت ونوع المكان (مهرجان / طبيعة / تراث)، وليس بيانات لحظية فعلية. استخدمه كدليل تقريبي فقط.",
    liveTodayNote: "لا تتوفر إمكانية فنية لعرض بيانات الازدحام المباشرة من جوجل داخل هذا التطبيق مباشرة. لليوم الحالي فقط، اضغط على أي موقع لفتحه في خرائط جوجل حيث يمكنك رؤية \"أوقات الذروة\" المباشرة إن كانت متوفرة لذلك المكان (غير متاحة لبعض المواقع الطبيعية النائية). بقية الأيام تبقى تقديرات تقريبية.",
    openLive: "افتح المباشر في خرائط جوجل",
    chooseDay: "اختر اليوم", chooseTime: "اختر الوقت", chooseType: "نوع الفعالية",
    filterAll: "الكل", filterFest: "مهرجانات", filterNature: "طبيعة", filterHeritage: "تراث",
    legendQuiet: "هادئ", legendMod: "متوسط", legendBusy: "مزدحم",
    installTitle: "ثبّت التطبيق على شاشتك الرئيسية", installDesc: "وصول أسرع بدون فتح المتصفح في كل مرة.",
    installBtn: "تثبيت الآن", installIOSDesc: "اضغط زر المشاركة ⬆️ في Safari ثم اختر \"إضافة إلى الشاشة الرئيسية\".",
    sponsoredBadge: "مُموّل", sponsoredTitle: "مقترح لك", sponsoredDisclosure: "محتوى مُموّل من شركاء التطبيق",
    becomeSponsorTitle: "هل تملك نشاطاً تجارياً في ظفار؟", becomeSponsorDesc: "اعرض مطعمك أو فندقك أو نشاطك السياحي هنا أمام آلاف زوار موسم الخريف.", becomeSponsorCta: "تواصل معنا للإعلان",
    tips: "نصائح وأرقام", tipsDesc: "كل ما تحتاج معرفته",
    stays: "الإقامة والفنادق", staysDesc: "فنادق وشقق واستراحات",
    about: "عن التطبيق",
    staysEyebrow: "دليل الإقامة في ظفار", staysTitle: "أماكن الإقامة",
    filterAll: "الكل", filterArea: "المنطقة", filterType: "النوع",
    callReservation: "اتصل للحجز",
    staysNote: "الأسعار وتوفر الغرف تتغير حسب الموسم. يُنصح بالحجز المبكر خلال أغسطس (الذروة). تأكد من الأسعار مباشرة مع الفندق.",
        bookingTitle: "احجز عبر منصة موثوقة",
    bookingNote: "المسرة هو تطبيق الإقامة العُماني المحلي الموثوق — الخيار الأول للحجز في ظفار وسلطنة عُمان.",
    downloadApp: "حمّل التطبيق",
    openWebsite: "فتح الموقع",
    localBadge: "محلي عُماني",
    crowdEyebrow: "دليل الزيارة الذكي", crowdTitle: "أفضل أوقات زيارة المواقع",
    crowdNewNote: "لا يوجد طريقة تقنية لعرض الازدحام الحقيقي داخل التطبيق. هذا الجدول يوضح الأوقات المناسبة للزيارة بناءً على طبيعة كل نوع من المواقع — اضغط على أي موقع لفتحه في جوجل ماب لرؤية الازدحام الفعلي إذا توفر.",
    bestMorning: "الصباح الباكر", bestMidday: "الظهيرة", bestEvening: "المساء",
    goodTime: "وقت مناسب", crowdedTime: "وقت مزدحم", avoidTime: "يُفضّل تجنّبه",
    openInMaps: "الازدحام الفعلي في جوجل",
    tipsEyebrow: "دليلك الشامل", contactsTitle: "أرقام التواصل المهمة",
    contactsNote: "الرقم 9999 هو الرقم الموحد الوحيد الموثّق رسمياً للطوارئ في عُمان. الجهات الأخرى أدناه تقودك لمصدرها الرسمي مباشرة بدل أرقام قد تكون غير دقيقة.",
    callNow: "اتصل الآن", visitSite: "زيارة الموقع", search: "بحث",
    copyEmail: "نسخ البريد", copied: "تم النسخ ✓", seeAll: "عرض الكل", instaTitle: "أخبار ظفار على منصة X", instaSetup: "أضف Feed ID من Behold.so لعرض منشورات إنستقرام تلقائياً.", instaOpen: "فتح إنستقرام", instaLoading: "جاري التحميل...", instaError: "تعذر تحميل المنشورات",
    aboutTitle: "عن التطبيق",
    aboutDesc: "تطبيق خريف ظفار 2026 دليلك السياحي الشامل لموسم الخريف في محافظة ظفار، صلالة — عُمان. يشمل الفعاليات، المواقع الطبيعية، أفضل الأوقات، المخطط السياحي، ازدحام المواقع، والوصول والصحة. متعدد اللغات، يعمل بدون إنترنت.",
    downloadBtn: "حمّل التطبيق على جهازك",
    shareBtn: "شارك التطبيق",
    downloadNote: "افتح الرابط من متصفح Chrome (أندرويد) أو Safari (آيفون) لتثبيته كتطبيق مستقل على الشاشة الرئيسية.",
    linkCopied: "تم نسخ الرابط ✓",
    planner: "مخطط سياحي", plannerDesc: "جدولك الشخصي في ظفار",
    plannerEyebrow: "رحلتك المثالية", plannerTitle: "مخطط رحلة ظفار",
    plannerStep1: "كم عدد الأيام؟", plannerStep2: "أي منطقة تريد زيارتها؟",
    plannerGenerate: "أنشئ جدول رحلتي", plannerReset: "بداية جديدة",
    plannerDay: "اليوم", plannerRegion: "المنطقة",
    plannerNote: "الجدول مرتب جغرافياً (الأقرب → الأبعد) لتوفير وقتك. المسافات تقريبية من وسط صلالة.",
    selectRegionNote: "يمكنك اختيار منطقة واحدة أو أكثر",
    plannerEmpty: "اختر عدد الأيام والمنطقة لإنشاء جدولك",
    plannerStep3: "ما نوع رحلتك؟", plannerStep3Note: "اختياري — اتركه فارغاً لعرض كل المواقع",
    noMatchSpots: "لا توجد مواقع مطابقة لهذا النوع في هذا اليوم — جرّب نوعاً آخر أو اتركه فارغاً.",
    openMapLink: "فتح على الخريطة",
  },
  en: {
    appTitle: "Khareef Dhofar 2026", more: "More",
    home: "Home", events: "Events", sites: "Places", crowd: "Crowd",
    best: "Best Time", evening: "Evenings", heritage: "Heritage", access: "Getting There", health: "Health",
    bestDesc: "By monsoon strength", eveningDesc: "Malls & festivals", heritageDesc: "Museums & royal farms",
    accessDesc: "By land & air", healthDesc: "Hospitals & clinics",
    namesNote: "Place and event names are shown in English to make them easier to search for on maps.",
    weatherNote1: "The temperature is the last known real reading for Salalah, not a continuously live feed inside this app.",
    weatherNote2: "The fog/cloud illustration reflects the typical pattern for this time of day during khareef season.",
    forecastTitle: "Next 7 Days", today: "Today",
    forecastDisclaimer: "This is a typical approximate pattern for khareef-season weather, not a live meteorological forecast.",
    heroEyebrow: "Your personal guide for", heroSub: "2026 · Salalah, Oman",
    heroDesc: "Mountain fog, the scent of rain, and events all season long. Ask me about any place or date and I'll guide you.",
    todayEyebrow: "Today", todayTitle: "Events happening now",
    followTitle: "Follow the latest updates", followNote: "Event dates in this app are updated manually based on the two accounts above — the app does not automatically pull content from X.",
    tipsTitle: "Visitor Tips", location: "Location", openMaps: "Open in Google Maps",
    eventsEyebrow: "#somethingelse", eventsTitle: "Key Event Dates", companionTitle: "Companion Events",
    to: "to",
    bestEyebrow: "Festivals · Nature · Weather", bestTitle: "Best Khareef Periods",
    bestIntro: "The monsoon strength percentage is an estimate based on three factors, and may shift weekly based on forecasts.",
    colFest: "Festivals", colNature: "Nature", colWeather: "Weather",
    sitesEyebrow: "Khareef Salalah Guide", sitesTitle: "Places",
    searchPlaceholder: "Search for a place...", noResults: "No matching results",
    distanceFooter: "All distances are approximate from central Salalah (Al Nahda Tower). Tap any place to open it in Google Maps.",
    km: "km", elevationLabel: "Elevation", fourByFourYes: "4×4 required", fourByFourNo: "No 4×4 needed",
    campingLabel: "Camping", bestCampingTitle: "Best Camping Spots", top5Title: "Top 5 Trails for Serious Hikers",
    eveningEyebrow: "After Sunset", eveningTitle: "Best Evening Spots",
    grpBeaches: "Evening Beaches", grpFestivals: "Festivals", grpMalls: "Malls", grpSouqs: "Souqs", grpCafes: "Complexes & Cafés",
    heritageEyebrow: "Ideal for Khareef Visitors", heritageTitle: "Heritage & Historic Sites",
    museumsFarmsTitle: "Government Museums & Royal Farms", visitTipsTitle: "Visiting Tips",
    hoursLabel: "Opening Hours", hoursDisclaimer: "Hours below are approximate and may change by day and season — confirm with the official authority or call ahead before visiting, especially for private sites.",
    accessEyebrow: "How to Get There", accessTitle: "Getting to Dhofar",
    byLand: "By Land", byAir: "By Air",
    landIntro: "The main land border crossings into Oman on the way to Salalah, with helpful info for the road ahead. Tap \"Start Navigation\" to open the route in Google Maps. Always confirm the crossing's current operating status and required documents before traveling.",
    startNav: "Start Navigation",
    airportTitle: "Salalah International Airport",
    airportDesc: "Daily domestic flights from Muscat (about an hour), plus regional flights and direct khareef-season routes from some Gulf countries. Early booking is recommended during peak season (August).",
    airportBtn: "Airport Location",
    airportNote: "Always check with the airline for current direct destinations as they may change seasonally.",
    healthEyebrow: "For Emergencies & Medical Visits", healthTitle: "Hospitals & Clinics",
    emergencyNote: "In an emergency, call the unified number",
    emergencyNote2: "Exact coordinates are available by tapping a hospital to open it in Google Maps.",
    crowdEyebrow: "Smart Estimate · Not Live Data", crowdTitle: "Site Crowd Levels",
    crowdDisclaimer: "This is an estimate based on the usual crowd pattern by day, time, and place type (festival / nature / heritage) — not real-time data. Use it as a rough guide only.",
    liveTodayNote: "There's no technical way to pull live Google crowd data directly inside this app. For today only, tap any place to open it in Google Maps, where you can see live \"Popular times\" if available for that location (not available for some remote natural sites). Other days remain rough estimates.",
    openLive: "Open Live on Google Maps",
    chooseDay: "Choose a Day", chooseTime: "Choose a Time", chooseType: "Activity Type",
    filterAll: "All", filterFest: "Festivals", filterNature: "Nature", filterHeritage: "Heritage",
    legendQuiet: "Quiet", legendMod: "Moderate", legendBusy: "Busy",
    installTitle: "Install this app on your home screen", installDesc: "Faster access without opening the browser every time.",
    installBtn: "Install Now", installIOSDesc: "Tap the Share button ⬆️ in Safari, then choose \"Add to Home Screen\".",
    sponsoredBadge: "Sponsored", sponsoredTitle: "Suggested for You", sponsoredDisclosure: "Sponsored content from app partners",
    becomeSponsorTitle: "Own a business in Dhofar?", becomeSponsorDesc: "Showcase your restaurant, hotel, or tour operation here in front of thousands of khareef-season visitors.", becomeSponsorCta: "Contact Us to Advertise",
    tips: "Tips & Numbers", tipsDesc: "Everything you need to know",
    stays: "Hotels & Stays", staysDesc: "Hotels, apartments & rest houses",
    about: "About",
    staysEyebrow: "Dhofar Accommodation Guide", staysTitle: "Places to Stay",
    filterAll: "All", filterArea: "Area", filterType: "Type",
    callReservation: "Call to Book",
    staysNote: "Prices and room availability change by season. Early booking is advised in August (peak). Confirm rates directly with the property.",
        bookingTitle: "Book via a trusted platform",
    bookingNote: "Al Masarra is the trusted local Omani accommodation app — the first choice for booking in Dhofar and Oman.",
    downloadApp: "Download App",
    openWebsite: "Open Website",
    localBadge: "Local Omani",
    crowdEyebrow: "Smart Visit Guide", crowdTitle: "Best Times to Visit",
    crowdNewNote: "There is no technical way to show real-time crowd data inside the app. This guide shows the best visit windows based on each site type — tap any place to open it in Google Maps to see live Popular Times if available.",
    bestMorning: "Early Morning", bestMidday: "Midday", bestEvening: "Evening",
    goodTime: "Good time", crowdedTime: "Tends to be busy", avoidTime: "Best avoided",
    openInMaps: "Live crowd on Google",
    tipsEyebrow: "Your Complete Guide", contactsTitle: "Important Contact Numbers",
    contactsNote: "9999 is the only officially documented unified emergency number in Oman. The other resources below link directly to their official source rather than risking an inaccurate number.",
    callNow: "Call Now", visitSite: "Visit Site", search: "Search",
    copyEmail: "Copy Email", copied: "Copied ✓", seeAll: "See All", instaTitle: "Dhofar News on X", instaSetup: "Add your Behold.so Feed ID to display Instagram posts automatically.", instaOpen: "Open Instagram", instaLoading: "Loading...", instaError: "Could not load posts",
    aboutTitle: "About the App",
    aboutDesc: "Khareef Dhofar 2026 is your all-in-one tourism guide for the khareef monsoon season in Dhofar Governorate, Salalah — Oman. Covering events, natural sites, best visit times, a travel planner, crowd levels, access routes, and health info. Multilingual, works offline.",
    downloadBtn: "Install the App on Your Device",
    shareBtn: "Share the App",
    downloadNote: "Open the link in Chrome (Android) or Safari (iPhone) to install it as a standalone app on your home screen.",
    linkCopied: "Link copied ✓",
    planner: "Travel Planner", plannerDesc: "Your personal Dhofar itinerary",
    plannerEyebrow: "Your perfect trip", plannerTitle: "Dhofar Trip Planner",
    plannerStep1: "How many days?", plannerStep2: "Which area do you want to visit?",
    plannerGenerate: "Build My Itinerary", plannerReset: "Start Over",
    plannerDay: "Day", plannerRegion: "Area",
    plannerNote: "The itinerary is ordered geographically (nearest → farthest) to save your time. Distances are approximate from central Salalah.",
    selectRegionNote: "You can select one or more areas",
    plannerEmpty: "Select days and a region to build your itinerary",
    plannerStep3: "What kind of trip?", plannerStep3Note: "Optional — leave blank to show all sites",
    noMatchSpots: "No matching sites for this style on this day — try another style or leave it blank.",
    openMapLink: "Open on Map",
  },
  hi: {
    appTitle: "ख़रीफ़ ज़ुफ़ार 2026", more: "अधिक",
    home: "होम", events: "कार्यक्रम", sites: "स्थान", crowd: "भीड़",
    best: "सर्वोत्तम समय", evening: "शाम", heritage: "विरासत", access: "कैसे पहुँचें", health: "स्वास्थ्य",
    bestDesc: "मानसून की तीव्रता अनुसार", eveningDesc: "मॉल और उत्सव", heritageDesc: "संग्रहालय और शाही फार्म",
    accessDesc: "सड़क और हवाई मार्ग", healthDesc: "अस्पताल और क्लीनिक",
    namesNote: "मानचित्र पर खोजना आसान बनाने के लिए स्थानों और कार्यक्रमों के नाम अंग्रेज़ी में दिखाए गए हैं।",
    weatherNote1: "तापमान सलालाह की आखिरी ज्ञात वास्तविक रीडिंग है, यह ऐप के अंदर लगातार लाइव फ़ीड नहीं है।",
    weatherNote2: "कोहरा/बादल चित्रण ख़रीफ़ मौसम में दिन के इस समय के सामान्य पैटर्न को दर्शाता है।",
    forecastTitle: "अगले 7 दिन", today: "आज",
    forecastDisclaimer: "यह ख़रीफ़ मौसम के लिए एक सामान्य अनुमानित पैटर्न है, वास्तविक लाइव मौसम पूर्वानुमान नहीं।",
    heroEyebrow: "आपका व्यक्तिगत गाइड", heroSub: "2026 · सलालाह, ओमान",
    heroDesc: "पहाड़ी कोहरा, बारिश की खुशबू, और पूरे मौसम कार्यक्रम। किसी भी स्थान या तारीख़ के बारे में पूछें, मैं आपका मार्गदर्शन करूँगा।",
    todayEyebrow: "आज", todayTitle: "अभी चल रहे कार्यक्रम",
    followTitle: "नवीनतम अपडेट फॉलो करें", followNote: "इस ऐप में कार्यक्रम तारीखें ऊपर दिए गए दोनों अकाउंट्स के आधार पर मैन्युअल रूप से अपडेट की जाती हैं — ऐप इंस्टाग्राम से स्वतः सामग्री नहीं लाता।",
    tipsTitle: "यात्री सुझाव", location: "स्थान", openMaps: "गूगल मैप्स में खोलें",
    eventsEyebrow: "#समथिंगएल्स", eventsTitle: "मुख्य कार्यक्रमों की तारीखें", companionTitle: "साथी कार्यक्रम",
    to: "से",
    bestEyebrow: "उत्सव · प्रकृति · मौसम", bestTitle: "ख़रीफ़ के सर्वोत्तम समय",
    bestIntro: "मानसून तीव्रता प्रतिशत तीन कारकों पर आधारित एक अनुमान है, और पूर्वानुमान के अनुसार साप्ताहिक रूप से बदल सकता है।",
    colFest: "उत्सव", colNature: "प्रकृति", colWeather: "मौसम",
    sitesEyebrow: "ख़रीफ़ सलालाह गाइड", sitesTitle: "स्थान",
    searchPlaceholder: "किसी स्थान को खोजें...", noResults: "कोई परिणाम नहीं मिला",
    distanceFooter: "सभी दूरियां सलालाह के केंद्र (अल नहदा टावर) से अनुमानित हैं। किसी भी स्थान को गूगल मैप्स में खोलने के लिए टैप करें।",
    km: "कि.मी.", elevationLabel: "ऊंचाई", fourByFourYes: "4×4 आवश्यक", fourByFourNo: "4×4 की आवश्यकता नहीं",
    campingLabel: "कैम्पिंग", bestCampingTitle: "सर्वोत्तम कैम्पिंग स्थल", top5Title: "गंभीर हाइकर्स के लिए शीर्ष 5 मार्ग",
    eveningEyebrow: "सूर्यास्त के बाद", eveningTitle: "बेहतरीन शाम के स्थान",
    grpBeaches: "शाम के समुद्र तट", grpFestivals: "उत्सव", grpMalls: "मॉल", grpSouqs: "बाज़ार", grpCafes: "कॉम्प्लेक्स और कैफ़े",
    heritageEyebrow: "ख़रीफ़ आगंतुकों के लिए उपयुक्त", heritageTitle: "विरासत और ऐतिहासिक स्थल",
    museumsFarmsTitle: "सरकारी संग्रहालय और शाही फार्म", visitTipsTitle: "यात्रा सुझाव",
    hoursLabel: "खुलने का समय", hoursDisclaimer: "नीचे दिए गए समय अनुमानित हैं और दिन व मौसम के अनुसार बदल सकते हैं — विशेष रूप से निजी स्थलों के लिए, जाने से पहले आधिकारिक प्राधिकरण से पुष्टि करें या पहले से कॉल करें।",
    accessEyebrow: "कैसे पहुँचें", accessTitle: "ज़ुफ़ार कैसे पहुँचें",
    byLand: "सड़क मार्ग से", byAir: "हवाई मार्ग से",
    landIntro: "सलालाह की ओर ओमान में प्रवेश करने के लिए मुख्य भूमि सीमा क्रॉसिंग, साथ ही आगे के रास्ते के लिए सहायक जानकारी। मार्ग को गूगल मैप्स में खोलने के लिए \"नेविगेशन शुरू करें\" पर टैप करें। यात्रा से पहले हमेशा क्रॉसिंग की वर्तमान संचालन स्थिति और आवश्यक दस्तावेज़ों की पुष्टि करें।",
    startNav: "नेविगेशन शुरू करें",
    airportTitle: "सलालाह अंतरराष्ट्रीय हवाई अड्डा",
    airportDesc: "मस्कट से प्रतिदिन घरेलू उड़ानें (लगभग एक घंटा), साथ ही क्षेत्रीय उड़ानें और कुछ खाड़ी देशों से सीधी ख़रीफ़-सीज़न उड़ानें। पीक सीज़न (अगस्त) के दौरान जल्दी बुकिंग की सलाह दी जाती है।",
    airportBtn: "हवाई अड्डे का स्थान",
    airportNote: "वर्तमान सीधी उड़ानों के लिए हमेशा एयरलाइन से जांच करें क्योंकि वे मौसम के अनुसार बदल सकती हैं।",
    healthEyebrow: "आपातकाल और चिकित्सा यात्राओं के लिए", healthTitle: "अस्पताल और क्लीनिक",
    emergencyNote: "आपातकाल में इस एकीकृत नंबर पर कॉल करें",
    emergencyNote2: "अस्पताल पर टैप करके गूगल मैप्स में खोलने पर सटीक निर्देशांक उपलब्ध हैं।",
    crowdEyebrow: "स्मार्ट अनुमान · लाइव डेटा नहीं", crowdTitle: "स्थानों पर भीड़ का स्तर",
    crowdDisclaimer: "यह दिन, समय और स्थान के प्रकार (उत्सव / प्रकृति / विरासत) के सामान्य भीड़ पैटर्न पर आधारित अनुमान है — वास्तविक समय का डेटा नहीं। इसे केवल एक मोटा मार्गदर्शक मानें।",
    liveTodayNote: "इस ऐप के अंदर सीधे गूगल की लाइव भीड़ डेटा लाने का कोई तकनीकी तरीका नहीं है। केवल आज के लिए, किसी भी स्थान पर टैप करके गूगल मैप्स में खोलें, जहां उस स्थान के लिए उपलब्ध होने पर लाइव \"लोकप्रिय समय\" देखे जा सकते हैं (कुछ दूरस्थ प्राकृतिक स्थलों के लिए उपलब्ध नहीं)। अन्य दिनों के लिए मोटे अनुमान ही दिखाए जाते हैं।",
    openLive: "गूगल मैप्स में लाइव खोलें",
    chooseDay: "दिन चुनें", chooseTime: "समय चुनें", chooseType: "गतिविधि का प्रकार",
    filterAll: "सभी", filterFest: "उत्सव", filterNature: "प्रकृति", filterHeritage: "विरासत",
    legendQuiet: "शांत", legendMod: "मध्यम", legendBusy: "व्यस्त",
    installTitle: "इस ऐप को अपनी होम स्क्रीन पर इंस्टॉल करें", installDesc: "हर बार ब्राउज़र खोले बिना तेज़ पहुंच।",
    installBtn: "अभी इंस्टॉल करें", installIOSDesc: "Safari में शेयर बटन ⬆️ दबाएं, फिर \"होम स्क्रीन पर जोड़ें\" चुनें।",
    sponsoredBadge: "प्रायोजित", sponsoredTitle: "आपके लिए सुझाव", sponsoredDisclosure: "ऐप पार्टनर्स की ओर से प्रायोजित सामग्री",
    becomeSponsorTitle: "ज़ुफ़ार में आपका कोई व्यवसाय है?", becomeSponsorDesc: "अपने रेस्तरां, होटल या टूर सेवा को यहां ख़रीफ़ सीज़न के हज़ारों आगंतुकों के सामने प्रदर्शित करें।", becomeSponsorCta: "विज्ञापन के लिए संपर्क करें",
    tips: "सुझाव और नंबर", tipsDesc: "वह सब कुछ जो आपको जानना चाहिए",
    stays: "होटल और आवास", staysDesc: "होटल, अपार्टमेंट और रेस्ट हाउस",
    about: "ऐप के बारे में",
    staysEyebrow: "ज़ुफ़ार आवास गाइड", staysTitle: "ठहरने के स्थान",
    filterAll: "सभी", filterArea: "क्षेत्र", filterType: "प्रकार",
    callReservation: "बुकिंग के लिए कॉल करें",
    staysNote: "कीमतें और कमरे की उपलब्धता मौसम के अनुसार बदलती है। अगस्त (पीक) में जल्दी बुकिंग की सलाह दी जाती है। कीमतें सीधे संपत्ति से कन्फर्म करें।",
        bookingTitle: "किसी विश्वसनीय प्लेटफॉर्म से बुक करें",
    bookingNote: "मसर्रह एक विश्वसनीय स्थानीय ओमानी आवास ऐप है। अन्य प्लेटफॉर्म वैश्विक रूप से मान्यता प्राप्त हैं।",
    downloadApp: "ऐप डाउनलोड करें",
    openWebsite: "वेबसाइट खोलें",
    localBadge: "स्थानीय ओमानी",
    crowdEyebrow: "स्मार्ट विज़िट गाइड", crowdTitle: "जाने का सबसे अच्छा समय",
    crowdNewNote: "ऐप के अंदर वास्तविक समय की भीड़ डेटा दिखाने का कोई तकनीकी तरीका नहीं है। यह गाइड प्रत्येक साइट प्रकार के आधार पर सर्वोत्तम यात्रा समय दिखाता है — लाइव Popular Times देखने के लिए किसी भी स्थान पर टैप करें।",
    bestMorning: "तड़के सुबह", bestMidday: "दोपहर", bestEvening: "शाम",
    goodTime: "अच्छा समय", crowdedTime: "व्यस्त रहता है", avoidTime: "से बचना बेहतर",
    openInMaps: "गूगल पर लाइव भीड़",
    tipsEyebrow: "आपकी संपूर्ण गाइड", contactsTitle: "महत्वपूर्ण संपर्क नंबर",
    contactsNote: "9999 ओमान में आधिकारिक रूप से प्रलेखित एकमात्र एकीकृत आपातकालीन नंबर है। नीचे दिए गए अन्य संसाधन सीधे उनके आधिकारिक स्रोत से जुड़ते हैं, गलत नंबर का जोखिम उठाने के बजाय।",
    callNow: "अभी कॉल करें", visitSite: "साइट देखें", search: "खोजें",
    copyEmail: "ईमेल कॉपी करें", copied: "कॉपी हो गया ✓", seeAll: "सभी देखें", instaTitle: "X पर ताज़ा खबरें", instaSetup: "Instagram पोस्ट स्वचालित रूप से दिखाने के लिए Behold.so Feed ID जोड़ें।", instaOpen: "Instagram खोलें", instaLoading: "लोड हो रहा है...", instaError: "पोस्ट लोड नहीं हो सकीं",
    aboutTitle: "ऐप के बारे में",
    aboutDesc: "ख़रीफ़ ज़ुफ़ार 2026 ओमान के ज़ुफ़ार प्रांत, सलालाह में ख़रीफ़ मानसून सीज़न के लिए आपकी सम्पूर्ण पर्यटन गाइड है। कार्यक्रम, प्राकृतिक स्थल, यात्रा योजनाकार, भीड़ स्तर और स्वास्थ्य जानकारी सब एक जगह। बहुभाषी, ऑफलाइन काम करता है।",
    downloadBtn: "अपने डिवाइस पर ऐप इंस्टॉल करें",
    shareBtn: "ऐप शेयर करें",
    downloadNote: "Chrome (Android) या Safari (iPhone) में लिंक खोलें और होम स्क्रीन पर इंस्टॉल करें।",
    linkCopied: "लिंक कॉपी हो गया ✓",
    planner: "यात्रा योजनाकार", plannerDesc: "ज़ुफ़ार में आपका व्यक्तिगत कार्यक्रम",
    plannerEyebrow: "आपकी परफेक्ट यात्रा", plannerTitle: "ज़ुफ़ार यात्रा योजनाकार",
    plannerStep1: "कितने दिन?", plannerStep2: "कौन सा क्षेत्र देखना चाहते हैं?",
    plannerGenerate: "मेरा कार्यक्रम बनाएं", plannerReset: "नए सिरे से शुरू करें",
    plannerDay: "दिन", plannerRegion: "क्षेत्र",
    plannerNote: "कार्यक्रम भौगोलिक क्रम में है (निकटतम → सबसे दूर) ताकि आपका समय बचे। दूरियां सलालाह केंद्र से अनुमानित हैं।",
    selectRegionNote: "आप एक या अधिक क्षेत्र चुन सकते हैं",
    plannerEmpty: "अपना कार्यक्रम बनाने के लिए दिन और क्षेत्र चुनें",
    plannerStep3: "आपकी यात्रा का प्रकार?", plannerStep3Note: "वैकल्पिक — सभी स्थान देखने के लिए खाली छोड़ें",
    noMatchSpots: "इस दिन इस शैली से मेल खाने वाले कोई स्थान नहीं — दूसरी शैली आज़माएं या खाली छोड़ें।",
    openMapLink: "मानचित्र पर खोलें",
  },
  fr: {
    appTitle: "Khareef Dhofar 2026", more: "Plus",
    home: "Accueil", events: "Événements", sites: "Lieux", crowd: "Affluence",
    best: "Meilleure période", evening: "Soirées", heritage: "Patrimoine", access: "Y accéder", health: "Santé",
    bestDesc: "Selon l'intensité de la mousson", eveningDesc: "Centres commerciaux et festivals", heritageDesc: "Musées et fermes royales",
    accessDesc: "Par voie terrestre et aérienne", healthDesc: "Hôpitaux et cliniques",
    namesNote: "Les noms de lieux et d'événements sont affichés en anglais pour faciliter leur recherche sur les cartes.",
    weatherNote1: "La température est la dernière lecture réelle connue pour Salalah, et non un flux en direct continu dans cette application.",
    weatherNote2: "L'illustration de brouillard/nuages reflète le schéma habituel pour ce moment de la journée durant la saison du khareef.",
    forecastTitle: "Les 7 prochains jours", today: "Aujourd'hui",
    forecastDisclaimer: "Il s'agit d'un schéma approximatif typique de la météo en saison khareef, et non d'une prévision météorologique en direct.",
    heroEyebrow: "Votre guide personnel pour", heroSub: "2026 · Salalah, Oman",
    heroDesc: "Brouillard de montagne, odeur de pluie, et des événements toute la saison. Demandez-moi n'importe quel lieu ou date et je vous guiderai.",
    todayEyebrow: "Aujourd'hui", todayTitle: "Événements en cours",
    followTitle: "Suivez les dernières actualités", followNote: "Les dates des événements dans cette application sont mises à jour manuellement à partir des deux comptes ci-dessus — l'application ne récupère pas automatiquement le contenu de X.",
    tipsTitle: "Conseils aux visiteurs", location: "Emplacement", openMaps: "Ouvrir dans Google Maps",
    eventsEyebrow: "#autrechose", eventsTitle: "Dates clés des événements", companionTitle: "Événements associés",
    to: "au",
    bestEyebrow: "Festivals · Nature · Météo", bestTitle: "Meilleures périodes du Khareef",
    bestIntro: "Le pourcentage d'intensité de la mousson est une estimation basée sur trois facteurs, et peut varier chaque semaine selon les prévisions.",
    colFest: "Festivals", colNature: "Nature", colWeather: "Météo",
    sitesEyebrow: "Guide du Khareef à Salalah", sitesTitle: "Lieux",
    searchPlaceholder: "Rechercher un lieu...", noResults: "Aucun résultat correspondant",
    distanceFooter: "Toutes les distances sont approximatives depuis le centre de Salalah (Tour Al Nahda). Appuyez sur un lieu pour l'ouvrir dans Google Maps.",
    km: "km", elevationLabel: "Altitude", fourByFourYes: "4×4 requis", fourByFourNo: "4×4 non nécessaire",
    campingLabel: "Camping", bestCampingTitle: "Meilleurs spots de camping", top5Title: "Top 5 des sentiers pour randonneurs confirmés",
    eveningEyebrow: "Après le coucher du soleil", eveningTitle: "Meilleurs endroits en soirée",
    grpBeaches: "Plages en soirée", grpFestivals: "Festivals", grpMalls: "Centres commerciaux", grpSouqs: "Souks", grpCafes: "Complexes et cafés",
    heritageEyebrow: "Idéal pour les visiteurs du Khareef", heritageTitle: "Sites patrimoniaux et historiques",
    museumsFarmsTitle: "Musées nationaux et fermes royales", visitTipsTitle: "Conseils de visite",
    hoursLabel: "Heures d'ouverture", hoursDisclaimer: "Les horaires ci-dessous sont approximatifs et peuvent varier selon le jour et la saison — confirmez auprès de l'autorité officielle ou appelez à l'avance avant de visiter, surtout pour les sites privés.",
    accessEyebrow: "Comment y accéder", accessTitle: "Se rendre à Dhofar",
    byLand: "Par voie terrestre", byAir: "Par voie aérienne",
    landIntro: "Les principaux points de passage terrestres pour entrer à Oman en direction de Salalah, avec des informations utiles pour la route. Appuyez sur \"Démarrer la navigation\" pour ouvrir l'itinéraire dans Google Maps. Vérifiez toujours le statut opérationnel actuel du poste frontière et les documents requis avant de voyager.",
    startNav: "Démarrer la navigation",
    airportTitle: "Aéroport international de Salalah",
    airportDesc: "Vols intérieurs quotidiens depuis Mascate (environ une heure), ainsi que des vols régionaux et des liaisons directes en saison khareef depuis certains pays du Golfe. Une réservation anticipée est recommandée en haute saison (août).",
    airportBtn: "Emplacement de l'aéroport",
    airportNote: "Vérifiez toujours auprès de la compagnie aérienne les destinations directes actuelles, car elles peuvent changer selon la saison.",
    healthEyebrow: "Pour les urgences et visites médicales", healthTitle: "Hôpitaux et cliniques",
    emergencyNote: "En cas d'urgence, appelez le numéro unifié",
    emergencyNote2: "Les coordonnées exactes sont disponibles en appuyant sur un hôpital pour l'ouvrir dans Google Maps.",
    crowdEyebrow: "Estimation intelligente · Pas de données en direct", crowdTitle: "Niveaux d'affluence des sites",
    crowdDisclaimer: "Il s'agit d'une estimation basée sur le schéma d'affluence habituel selon le jour, l'heure et le type de lieu (festival / nature / patrimoine) — pas de données en temps réel. À utiliser comme simple guide approximatif.",
    liveTodayNote: "Il n'existe aucun moyen technique d'afficher directement les données d'affluence en direct de Google dans cette application. Pour aujourd'hui uniquement, appuyez sur un lieu pour l'ouvrir dans Google Maps, où vous pouvez voir les \"heures d'affluence\" en direct si elles sont disponibles pour ce lieu (non disponibles pour certains sites naturels isolés). Les autres jours restent des estimations approximatives.",
    openLive: "Voir en direct sur Google Maps",
    chooseDay: "Choisir un jour", chooseTime: "Choisir une heure", chooseType: "Type d'activité",
    filterAll: "Tous", filterFest: "Festivals", filterNature: "Nature", filterHeritage: "Patrimoine",
    legendQuiet: "Calme", legendMod: "Modéré", legendBusy: "Animé",
    installTitle: "Installez l'application sur votre écran d'accueil", installDesc: "Accès plus rapide sans ouvrir le navigateur à chaque fois.",
    installBtn: "Installer maintenant", installIOSDesc: "Appuyez sur le bouton Partager ⬆️ dans Safari, puis choisissez \"Sur l'écran d'accueil\".",
    sponsoredBadge: "Sponsorisé", sponsoredTitle: "Suggéré pour vous", sponsoredDisclosure: "Contenu sponsorisé par des partenaires de l'application",
    becomeSponsorTitle: "Vous avez un commerce à Dhofar ?", becomeSponsorDesc: "Présentez votre restaurant, hôtel ou activité touristique ici, devant des milliers de visiteurs de la saison khareef.", becomeSponsorCta: "Nous contacter pour annoncer",
    tips: "Conseils et numéros", tipsDesc: "Tout ce que vous devez savoir",
    stays: "Hôtels et séjours", staysDesc: "Hôtels, appartements et maisons de repos",
    about: "À propos",
    staysEyebrow: "Guide hébergement à Dhofar", staysTitle: "Lieux d'hébergement",
    filterAll: "Tous", filterArea: "Zone", filterType: "Type",
    callReservation: "Appeler pour réserver",
    staysNote: "Les prix et la disponibilité changent selon la saison. Réservez tôt en août (pic de saison). Confirmez les tarifs directement avec l'établissement.",
        bookingTitle: "Réservez via une plateforme de confiance",
    bookingNote: "Masarrah est l'application locale omanaise de confiance pour l'hébergement. Les autres plateformes sont reconnues mondialement.",
    downloadApp: "Télécharger l'app",
    openWebsite: "Ouvrir le site",
    localBadge: "Local omanais",
    crowdEyebrow: "Guide de visite intelligent", crowdTitle: "Meilleures heures pour visiter",
    crowdNewNote: "Il n'est pas possible techniquement d'afficher les données d'affluence en temps réel dans l'application. Ce guide indique les meilleures plages horaires selon le type de site — appuyez sur un lieu pour l'ouvrir dans Google Maps et voir l'affluence en direct si disponible.",
    bestMorning: "Tôt le matin", bestMidday: "Midi", bestEvening: "Soir",
    goodTime: "Bon moment", crowdedTime: "Généralement animé", avoidTime: "Mieux à éviter",
    openInMaps: "Affluence en direct sur Google",
    tipsEyebrow: "Votre guide complet", contactsTitle: "Numéros de contact importants",
    contactsNote: "Le 9999 est le seul numéro d'urgence unifié officiellement documenté à Oman. Les autres ressources ci-dessous renvoient directement à leur source officielle plutôt que de risquer un numéro inexact.",
    callNow: "Appeler maintenant", visitSite: "Visiter le site", search: "Rechercher",
    copyEmail: "Copier l'e-mail", copied: "Copié ✓", seeAll: "Voir tout", instaTitle: "Actualités sur X", instaSetup: "Ajoutez votre Feed ID Behold.so pour afficher automatiquement les posts Instagram.", instaOpen: "Ouvrir Instagram", instaLoading: "Chargement...", instaError: "Impossible de charger les posts",
    aboutTitle: "À propos de l'application",
    aboutDesc: "Khareef Dhofar 2026 est votre guide touristique complet pour la saison de la mousson khareef dans le gouvernorat de Dhofar, Salalah — Oman. Événements, sites naturels, planificateur de voyage, niveaux d'affluence, accès et santé. Multilingue, fonctionne hors ligne.",
    downloadBtn: "Installer l'application sur votre appareil",
    shareBtn: "Partager l'application",
    downloadNote: "Ouvrez le lien dans Chrome (Android) ou Safari (iPhone) pour l'installer comme application autonome sur votre écran d'accueil.",
    linkCopied: "Lien copié ✓",
    planner: "Planificateur", plannerDesc: "Votre itinéraire personnalisé à Dhofar",
    plannerEyebrow: "Votre voyage idéal", plannerTitle: "Planificateur de voyage à Dhofar",
    plannerStep1: "Combien de jours ?", plannerStep2: "Quelle zone souhaitez-vous visiter ?",
    plannerGenerate: "Créer mon itinéraire", plannerReset: "Recommencer",
    plannerDay: "Jour", plannerRegion: "Zone",
    plannerNote: "L'itinéraire est organisé géographiquement (plus proche → plus loin) pour économiser votre temps. Les distances sont approximatives depuis le centre de Salalah.",
    selectRegionNote: "Vous pouvez sélectionner une ou plusieurs zones",
    plannerEmpty: "Sélectionnez des jours et une zone pour créer votre itinéraire",
    plannerStep3: "Quel type de voyage ?", plannerStep3Note: "Optionnel — laissez vide pour afficher tous les sites",
    noMatchSpots: "Aucun site correspondant à ce style ce jour-là — essayez un autre style ou laissez vide.",
    openMapLink: "Ouvrir sur la carte",
  },
};

const LANGS = [
  { key: "ar", label: "ع" },
  { key: "en", label: "EN" },
  { key: "hi", label: "हि" },
  { key: "fr", label: "FR" },
];

const THEMES = {
  light: {
    page: "#F4EFE2", headerBg: "#F4EFE2EE", navBg: "#FBF8F0", border: "#E3DCC8",
    titleColor: "#23391E", subColor: "#8A8569", sheetBg: "#FBF8F0", cardBg: "#FBF8F0",
  },
  dark: {
    page: "#15201A", headerBg: "#15201ADD", navBg: "#1B2620", border: "#2B3A30",
    titleColor: "#F4EFE2", subColor: "#9FB39A", sheetBg: "#1B2620", cardBg: "#1B2620",
  },
};

const PRIMARY_TABS = [
  { key: "home", icon: Sparkles },
  { key: "events", icon: Calendar },
  { key: "sites", icon: Compass },
  { key: "crowd", icon: Gauge },
];

const MORE_TABS = [
  { key: "planner",  labelAr:"مخطط سياحي",      labelEn:"Planner",   icon: MapPinned },
  { key: "stays",    labelAr:"الإقامة والفنادق", labelEn:"Hotels",    icon: Building2 },
  { key: "best",     labelAr:"أفضل وقت",         labelEn:"Best Time", icon: Sun },
  { key: "evening",  labelAr:"المساء",            labelEn:"Evening",   icon: Moon },
  { key: "heritage", labelAr:"التراث",            labelEn:"Heritage",  icon: Landmark },
  { key: "access",   labelAr:"الوصول",            labelEn:"Access",    icon: Route },
  { key: "health",   labelAr:"الصحة",             labelEn:"Health",    icon: Stethoscope },
  { key: "tips",     labelAr:"نصائح وأرقام",      labelEn:"Tips",      icon: ClipboardList },
  { key: "today", labelAr: "اليوم", labelEn: "Today", labelHi: "आज", labelFr: "Jour", icon: Calendar },
  { key: "food", labelAr: "مطاعم", labelEn: "Food", labelHi: "भोजन", labelFr: "Food", icon: Coffee },
  { key: "about", icon: Info },
];

/* ===================================================================
   UI PRIMITIVES
=================================================================== */

function SectionTitle({ eyebrow, title, icon: Icon }) {
  const { theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="mb-5 flex items-center gap-3">
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "#2F5D45" }}>
          <Icon size={18} color="#F4EFE2" />
        </div>
      )}
      <div>
        {eyebrow && <div className="text-xs tracking-widest" style={{ color: "#8FA88A", fontFamily: "Tajawal" }}>{eyebrow}</div>}
        <h2 className="text-2xl font-bold" style={{ color: th.titleColor, fontFamily: useLang().lang === "ar" ? "Aref Ruqaa" : "inherit" }}>{title}</h2>
      </div>
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: color ? `${color}1A` : "#EFEAD9", color: color || "#5C6B53" }}>
      {children}
    </span>
  );
}

function MapLink({ name, item }) {
  const { lang, t } = useLang();
  const href = item ? bestUrl(item, lang) : mapsUrl(name, lang);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition active:scale-95"
      style={{ background: "#2F5D451A", color: "#2F5D45", fontFamily: "Tajawal" }}
    >
      <Navigation size={11} /> {t.location}
    </a>
  );
}

function SocialBar() {
  return (
    <div className="flex gap-2">
      {SOCIAL.map((s) => (
        <a key={s.handle} href={s.url} target="_blank" rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold"
          style={{ borderColor: "#E3DCC8", background: "#FBF8F0", color: "#A3373B", fontFamily: "Tajawal" }}>
          <XIcon size={13} /> {s.handle}
        </a>
      ))}
    </div>
  );
}

function SponsoredBadge() {
  const { t } = useLang();
  return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "#C98A2E", color: "#fff", fontFamily: "Tajawal" }}>
      <Star size={9} fill="#fff" /> {t.sponsoredBadge}
    </span>
  );
}

function SponsoredSection({ categories, limit }) {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  let listings = categories ? SPONSORED_LISTINGS.filter((s) => categories.includes(s.cat)) : SPONSORED_LISTINGS;
  if (limit) listings = listings.slice(0, limit);
  if (listings.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.sponsoredTitle}</h3>
        <span className="text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.sponsoredDisclosure}</span>
      </div>
      <div className="space-y-2">
        {listings.map((s) => (
          <a key={s.nAr} href={`mailto:alharthy@gmail.com?subject=${encodeURIComponent("استفسار إعلان - " + s.nAr)}`}
            className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
            style={{ borderColor: s.color, background: `${s.color}10` }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(s, lang)}</span>
                <SponsoredBadge />
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: s.color, fontFamily: "Tajawal" }}>{tx(s.category, lang)}</div>
              <div className="mt-1 text-[11px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                {lang === "ar" ? s.descAr : lang === "hi" ? s.descHi : lang === "fr" ? s.descFr : s.descEn}
              </div>
            </div>
            <ExternalLink size={13} color={th.subColor} className="shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function AboutCard() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === "ar" ? "خريف ظفار 2026" : "Khareef Dhofar 2026",
          text: lang === "ar"
            ? "تطبيق خريف ظفار 2026 — دليلك السياحي الشامل لموسم الخريف في صلالة عُمان 🌿"
            : "Khareef Dhofar 2026 — your complete tourism guide for Salalah, Oman 🌿",
          url: APP_DOWNLOAD_URL,
        });
      } catch (e) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(APP_DOWNLOAD_URL);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      } catch (e) { }
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#2F5D45" }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: "linear-gradient(135deg,#1F3D2B,#2F5D45)" }}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
          <CloudFog size={20} color="#F4EFE2" />
        </div>
        <div>
          <div className="text-base font-bold text-white" style={{ fontFamily: lang === "ar" ? "Aref Ruqaa" : "inherit" }}>
            {lang === "ar" ? "خريف ظفار 2026" : "Khareef Dhofar 2026"}
          </div>
          <div className="text-[11px] opacity-80 text-white" style={{ fontFamily: "Tajawal" }}>
            {lang === "ar" ? "صلالة، سلطنة عُمان" : "Salalah, Sultanate of Oman"}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-4 space-y-4" style={{ background: th.cardBg }}>
        <p className="text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
          {t.aboutDesc}
        </p>

        {/* Play Protect note */}
        <div className="flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: "#C98A2E", background: "#C98A2E10" }}>
          <span className="mt-0.5 shrink-0 text-base">🛡️</span>
          <span style={{ color: th.subColor, fontFamily: "Tajawal" }}>
            {lang === "ar"
              ? 'إذا ظهر لك تنبيه "Google Play للحماية" عند التثبيت، اضغط "حسنًا" أو "ثُبّت على أي حال" — هذا التطبيق آمن تماماً وهو تطبيق ويب (PWA) وليس APK.'
              : lang === "fr"
              ? 'Si un avertissement "Google Play Protect" apparaît, appuyez sur "OK" ou "Installer quand même" — cette application est entièrement sûre, c\'est une PWA et non un APK.'
              : 'If a "Google Play Protect" warning appears during install, tap "OK" or "Install anyway" — this app is completely safe, it is a web app (PWA) not an APK.'}
          </span>
        </div>

        {/* Download link */}
        <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition active:scale-[0.98]"
          style={{ background: "#2F5D45", fontFamily: "Tajawal" }}>
          <Download size={16} /> {t.downloadBtn}
        </a>

        {/* Share button */}
        <button type="button" onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition active:scale-[0.98]"
          style={{ borderColor: "#2F5D45", color: "#2F5D45", fontFamily: "Tajawal" }}>
          <Share2 size={15} />
          {linkCopied ? t.linkCopied : t.shareBtn}
        </button>

        {/* Hint */}
        <p className="text-[10px] leading-relaxed text-center" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
          {t.downloadNote}
        </p>

        {/* Version badge instead of raw URL */}
        <div className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-[11px]"
          style={{ borderColor: th.border, background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.subColor, fontFamily: "Tajawal" }}>
          <span style={{ color: "#2F5D45", fontWeight: "bold" }}>v{APP_VERSION}</span>
          <span>·</span>
          <span>{lang === "ar" ? "خريف ظفار 2026" : "Khareef Dhofar 2026"}</span>
        </div>
      </div>
    </div>
  );
}

function BecomeSponsorCard() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const sponsorEmail = "alharthy@gmail.com";

  return (
    <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: "#C98A2E", background: "#C98A2E1A" }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "#C98A2E" }}>
        <Megaphone size={18} color="#fff" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.becomeSponsorTitle}</div>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "#C98A2E", color: "#fff", fontFamily: "Tajawal" }}>v{APP_VERSION}</span>
        </div>
        <div className="mt-1 text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.becomeSponsorDesc}</div>
        <a href={`mailto:${sponsorEmail}?subject=${encodeURIComponent("استفسار عن الإعلان")}`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
          style={{ background: "#C98A2E", fontFamily: "Tajawal" }}>
          <Megaphone size={12} /> {t.becomeSponsorCta}
        </a>
      </div>
    </div>
  );
}

/* ===================================================================
   PAGES
=================================================================== */

function HomeWeatherForecast() {
  const { lang, t, theme, liveWeather, refetchWeather } = useLang();
  const th = THEMES[theme];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRefresh(e) {
    e.stopPropagation();
    setLoading(true);
    await refetchWeather();
    setLoading(false);
  }

  const pattern = getWeatherNow(lang);
  const currentTemp = liveWeather ? Math.round(liveWeather.current.temperature_2m) : LAST_KNOWN_TEMP.celsius;
  const currentCode = liveWeather?.current?.weather_code ?? null;
  const currentLabel = currentCode != null ? wmoLabel(currentCode, lang) : pattern.label;
  const CurrentIcon = currentCode != null ? wmoIcon(currentCode) : pattern.icon;
  const currentColor = currentCode != null ? wmoColor(currentCode) : pattern.color;
  const windSpeed = liveWeather ? Math.round(liveWeather.current.wind_speed_10m) : null;
  const precipProb = liveWeather ? liveWeather.current.precipitation_probability : null;
  const days = liveWeather?.daily;
  const todayIdx = new Date().getDay();
  const isLive = !!liveWeather;

  const locationLabel = lang === "ar" ? "📍 صلالة، ظفار — عُمان"
    : lang === "fr" ? "📍 Salalah, Dhofar — Oman"
    : lang === "hi" ? "📍 सलालाह, ज़ुफ़ार — ओमान"
    : "📍 Salalah, Dhofar — Oman";

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: th.border, background: th.cardBg }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between p-4 transition active:scale-[0.98]"
        style={{ textAlign: lang === "ar" ? "right" : "left" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${currentColor}20` }}>
            <CurrentIcon size={28} color={currentColor} />
          </div>
          <div>
            {/* Location label */}
            <div className="text-[10px] font-medium mb-0.5" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{locationLabel}</div>
            {/* Temperature — same as badge */}
            <div className="text-3xl font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
              {currentTemp}°{lang === "ar" ? "م" : "C"}
            </div>
            <div className="text-xs font-medium" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{currentLabel}</div>
            {(windSpeed != null || precipProb != null) && (
              <div className="flex gap-3 mt-0.5">
                {windSpeed != null && <span className="text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>💨 {windSpeed} km/h</span>}
                {precipProb != null && <span className="text-[10px]" style={{ color: "#3C6E8F", fontFamily: "Tajawal" }}>🌧️ {precipProb}%</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Live/estimated badge */}
          <span className="text-[9px] font-bold rounded-full px-2 py-0.5" style={{ background: isLive ? "#2F7D4A1A" : "#C98A2E1A", color: isLive ? "#2F7D4A" : "#C98A2E", fontFamily: "Tajawal" }}>
            {isLive ? (lang==="ar"?"🟢 حي":"🟢 Live") : (lang==="ar"?"⭕ تقديري":"⭕ Est.")}
          </span>
          {/* Forecast label + chevron */}
          <div className="flex flex-col items-center gap-0.5" style={{ color: "#2F5D45" }}>
            <span className="text-[10px] font-bold" style={{ fontFamily: "Tajawal" }}>{t.forecastTitle}</span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <path d="M1 1L8 9L15 1" stroke="#2F5D45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3" style={{ borderColor: th.border }}>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(days ? days.time : FORECAST_7DAY.map((d, i) => ({ _i: i }))).map((_, i) => {
              const dayIdx = (todayIdx + i) % 7;
              let temp2, code2, condKey;
              if (days) {
                temp2 = Math.round((days.temperature_2m_max[i] + days.temperature_2m_min[i]) / 2);
                code2 = days.weather_code[i];
              } else {
                temp2 = FORECAST_7DAY[i]?.temp || 31;
                code2 = null;
                condKey = FORECAST_7DAY[i]?.cond || "cloudy";
              }
              const DayIcon = code2 != null ? wmoIcon(code2) : (WEATHER_CONDITIONS[condKey]?.icon || Cloud);
              const dayColor = code2 != null ? wmoColor(code2) : (WEATHER_CONDITIONS[condKey]?.color || "#5C7A8A");
              const precipP = days ? days.precipitation_probability_max[i] : null;
              return (
                <div key={i} className="flex shrink-0 flex-col items-center gap-1 rounded-xl p-2.5"
                  style={{ background: theme === "light" ? "#F0ECDD" : "#212E27", minWidth: 62 }}>
                  <span className="text-[10px] font-bold" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                    {i === 0 ? t.today : tx(DAYS[dayIdx], lang)}
                  </span>
                  <DayIcon size={20} color={dayColor} />
                  <span className="text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{temp2}°</span>
                  {precipP != null && precipP > 0 && (
                    <span className="text-[9px]" style={{ color: "#3C6E8F", fontFamily: "Tajawal" }}>💧{precipP}%</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
              {isLive ? locationLabel : t.forecastDisclaimer}
            </p>
            <button type="button" onClick={handleRefresh}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold"
              style={{ background: "#2F5D451A", color: "#2F5D45", fontFamily: "Tajawal" }}>
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              {lang === "ar" ? "تحديث" : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Home() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const EVENTS_PREVIEW = EVENTS.slice(0, 2);

  return (
    <div className="space-y-4 pb-6">
      {/* Weather */}
      <HomeWeatherForecast />

      {/* AI Where to go today */}
      <WhereToGoToday />

      {/* Latest 2 events */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-sm font-bold" style={{ color: th.titleColor, fontFamily:"Tajawal" }}>
            {lang === "ar" ? "الفعاليات الجارية" : "Current Events"}
          </span>
          <button onClick={() => window.dispatchEvent(new CustomEvent("switchTab", { detail: "events" }))}
            className="text-xs font-bold"
            style={{ background:"none", border:"none", color:"#2F5D45", cursor:"pointer", fontFamily:"Tajawal" }}>
            {lang === "ar" ? "المزيد ←" : "More →"}
          </button>
        </div>
        <div className="space-y-2">
          {EVENTS_PREVIEW.map(ev => (
            <a key={ev.nAr} href={bestUrl(ev, lang)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl p-3 active:scale-[0.98] transition"
              style={{ background: th.cardBg, border:`1px solid ${th.border}` }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ background: (ev.color||"#2F5D45") + "20" }}>🎪</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate" style={{ color:th.titleColor, fontFamily:"Tajawal" }}>
                  {lang==="ar" ? ev.nAr : ev.nEn}
                </div>
                <div className="text-[11px]" style={{ color:th.subColor, fontFamily:"Tajawal" }}>
                  📍 {lang==="ar" ? ev.placeAr : ev.placeEn}
                </div>
              </div>
              <MapPin size={14} color={th.subColor} />
            </a>
          ))}
        </div>
      </div>

      {/* Quick nav grid */}
      <div>
        <div className="text-sm font-bold mb-2 px-1" style={{ color:th.titleColor, fontFamily:"Tajawal" }}>
          {lang==="ar" ? "استكشف" : "Explore"}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MORE_TABS.slice(0,6).map(tb => {
            const Icon = tb.icon;
            return (
              <button key={tb.key}
                className="flex flex-col items-center gap-1.5 rounded-2xl p-3 active:scale-95 transition"
                style={{ background:th.cardBg, border:`1px solid ${th.border}`, cursor:"pointer" }}
                onClick={() => window.dispatchEvent(new CustomEvent("switchTab", { detail: tb.key }))}>
                <Icon size={22} color="#2F5D45" />
                <span className="text-[11px] font-bold text-center leading-tight"
                  style={{ color:th.titleColor, fontFamily:"Tajawal" }}>
                  {tb.labelAr ? (lang==="ar" ? tb.labelAr : tb.labelEn) : t[tb.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* X Feed */}
      <XFeed />
    </div>
  );
}

function Tips() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-6 pb-6">
      <SectionTitle eyebrow={t.tipsEyebrow} title={t.tips} icon={ClipboardList} />

      <div>
        <div className="space-y-4">
          {TIP_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "#2F5D451A" }}>
                  <cat.icon size={14} color="#2F5D45" />
                </div>
                <h3 className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{tx(cat.title, lang)}</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {cat.items.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed" style={{ background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor, fontFamily: "Tajawal" }}>
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#2F5D45" }} />
                    {tx(tip, lang)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed" style={{ borderColor: "#2F5D45", background: "#2F5D451A", color: th.titleColor, fontFamily: "Tajawal" }}>
            <Sparkles size={14} className="mt-0.5 shrink-0" color="#2F5D45" />
            {tx(TIPS_CLOSING, lang)}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle title={t.contactsTitle} icon={Siren} />
        <div className="mb-3 flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: th.border, background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor }}>
          <Info size={13} className="mt-0.5 shrink-0" color="#A36A2E" />
          <span style={{ fontFamily: "Tajawal" }}>{t.contactsNote}</span>
        </div>
        <div className="space-y-2">
          {IMPORTANT_CONTACTS.map((c) => {
            const href =
              c.action.type === "tel" ? `tel:${c.action.value}` :
              c.action.type === "link" ? c.action.url :
              `https://www.google.com/search?q=${encodeURIComponent(c.action.query)}`;
            const actionLabel = c.action.type === "tel" ? t.callNow : c.action.type === "link" ? t.visitSite : t.search;
            return (
              <a key={c.key} href={href} target={c.action.type === "tel" ? undefined : "_blank"} rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
                style={{ borderColor: c.color, background: `${c.color}10` }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: c.color }}>
                    <c.icon size={18} color="#fff" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{tx(c.title, lang)}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{tx(c.desc, lang)}</div>
                    {c.action.type === "tel" && (
                      <div className="mt-1 text-base font-bold" style={{ color: c.color, fontFamily: "Tajawal" }}>{c.action.value}</div>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: c.color, color: "#fff", fontFamily: "Tajawal" }}>
                  {actionLabel}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Events() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-6 pb-6">
      <SectionTitle eyebrow={t.eventsEyebrow} title={t.eventsTitle} icon={Calendar} />
      <div className="space-y-3">
        {EVENTS.map((e) => (
          <div key={e.nAr} className="overflow-hidden rounded-2xl border" style={{ borderColor: th.border, background: th.cardBg }}>
            <div className="flex items-center justify-between p-4">
              <div>
                <div className="text-base font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(e, lang)}</div>
                <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {lang === "ar" ? e.placeAr : e.placeEn}</span>
                  <MapLink name={nm(e, lang)} item={e} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {e.tags.map((tk) => <Pill key={tk} color={e.color}>{tx(TAG_LABELS[tk], lang)}</Pill>)}
                </div>
              </div>
              <div className="shrink-0 rounded-xl px-3 py-2 text-center text-xs font-bold text-white" style={{ background: e.color, fontFamily: "Tajawal" }}>
                <div className="flex items-center gap-1"><Clock size={11} />{lang === "ar" ? e.fromAr : lang === "hi" ? e.fromHi : e.fromEn}</div>
                <div className="my-1 opacity-60">{t.to}</div>
                <div>{lang === "ar" ? e.toAr : lang === "hi" ? e.toHi : e.toEn}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <SectionTitle title={t.companionTitle} icon={Sparkles} />
        <div className="space-y-2">
          {COMPANION_SITES.map((s) => (
            <a key={s.nAr} href={bestUrl(s, lang)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
              style={{ borderColor: th.border, background: th.cardBg }}>
              <div className="pe-3">
                <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(s, lang)}</div>
                <div className="mt-0.5 text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{tx(s.desc, lang)}</div>
              </div>
              <ExternalLink size={13} color={th.subColor} className="shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function BestTimes() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-6 pb-6">
      <SectionTitle eyebrow={t.bestEyebrow} title={t.bestTitle} icon={Sun} />
      <p className="text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.bestIntro}</p>
      <div className="space-y-3">
        {BEST_PERIODS.map((p) => (
          <div key={p.periodAr} className="rounded-2xl border p-4" style={{ borderColor: th.border, background: th.cardBg }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{lang === "ar" ? p.periodAr : lang === "hi" ? p.periodHi : p.periodEn}</span>
              <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: p.pct >= 75 ? "#2F5D45" : p.pct >= 40 ? "#C98A2E" : "#B5582C", fontFamily: "Tajawal" }}>{p.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#EFEAD9" }}>
              <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: "#2F5D45" }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[[t.colFest, p.fest], [t.colNature, p.nature], [t.colWeather, p.weather]].map(([l, v]) => (
                <div key={l}>
                  <div className="text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{l}</div>
                  <div className="text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{v}%</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sites() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [region, setRegion] = useState("mid");
  const [query, setQuery] = useState("");
  const data = REGIONS[region];

  const filtered = useMemo(
    () => data.spots.filter((s) => nm(s, lang).toLowerCase().includes(query.trim().toLowerCase())),
    [data, query, lang]
  );

  function spotHref(s) {
    if (s.lat != null && s.lng != null) return mapsUrlCoord(s.lat, s.lng);
    if (s.startAr) return mapsUrl(lang === "ar" ? s.startAr : s.startEn, lang);
    return mapsUrl(nm(s, lang), lang);
  }

  return (
    <div className="space-y-5 pb-6">
      <SectionTitle eyebrow={t.sitesEyebrow} title={t.sitesTitle} icon={Compass} />

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: th.border, background: th.cardBg }}>
        <Search size={15} color={th.subColor} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none" style={{ fontFamily: "Tajawal", color: th.titleColor }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(REGIONS).map(([key, r]) => (
          <button key={key} onClick={() => setRegion(key)}
            className="flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition"
            style={{ borderColor: region === key ? r.color : th.border, background: region === key ? `${r.color}14` : th.cardBg, color: region === key ? r.color : th.subColor, fontFamily: "Tajawal" }}>
            <r.icon size={14} /> {tx(r.label, lang)}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: `${data.color}10`, color: th.titleColor, fontFamily: "Tajawal" }}>{tx(data.note, lang)}</div>

      <div className="space-y-2">
        {filtered.map((s, i) => (
          <a key={s.nAr} href={spotHref(s)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
            style={{ borderColor: th.border, background: th.cardBg }}>
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: data.color }}>{i + 1}</span>
              <div>
                <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(s, lang)}</div>
                {s.spotType && SPOT_TYPES[s.spotType] && (
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold" style={{ color: region === "hike" ? "#4C7A3D" : data.color, fontFamily: "Tajawal" }}>
                    <span>{SPOT_TYPES[s.spotType].emoji}</span>
                    <span>{tx(SPOT_TYPES[s.spotType].label, lang)}</span>
                  </div>
                )}
                {s.spotDescAr && (
                  <div className="mt-0.5 text-[10px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                    {lang === "ar" ? s.spotDescAr : s.spotDescEn}
                  </div>
                )}
                {s.extra && <div className="mt-0.5 text-[10px]" style={{ color: "#A36A2E", fontFamily: "Tajawal" }}>{tx(s.extra, lang)}</div>}
                {lc(s, lang) && <div className="mt-0.5 text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{lc(s, lang)}</div>}
                {region === "hike" && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "#4C7A3D1A", color: "#4C7A3D", fontFamily: "Tajawal" }}>
                      {t.elevationLabel}: {s.elev}{lang === "ar" ? "م" : "m"}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: s.fourByFour ? "#B5402C1A" : "#2F7D4A1A", color: s.fourByFour ? "#B5402C" : "#2F7D4A", fontFamily: "Tajawal" }}>
                      {s.fourByFour ? t.fourByFourYes : t.fourByFourNo}
                    </span>
                    <span className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "#C98A2E1A", color: "#C98A2E", fontFamily: "Tajawal" }}>
                      {t.campingLabel} {"⭐".repeat(s.camp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.km != null && <span className="flex items-center gap-1 text-xs font-bold" style={{ color: data.color, fontFamily: "Tajawal" }}><Navigation size={12} /> {s.km} {t.km}</span>}
              <ExternalLink size={13} color={th.subColor} />
            </div>
          </a>
        ))}
        {filtered.length === 0 && <div className="py-8 text-center text-xs" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.noResults}</div>}
      </div>

      {region === "hike" && (
        <>
          <SponsoredSection categories={["tours"]} />
          <div>
            <SectionTitle title={t.bestCampingTitle} icon={Tent} />
            <div className="flex flex-wrap gap-2">
              {BEST_CAMPING_SPOTS.map((c) => (
                <span key={c.nAr} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: th.border, background: th.cardBg, color: th.titleColor, fontFamily: "Tajawal" }}>
                  🏕️ {nm(c, lang)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle title={t.top5Title} icon={Footprints} />
            <div className="space-y-2">
              {TOP5_HIKER_TRAILS.map((tr, i) => (
                <div key={tr.nAr} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: th.border, background: th.cardBg }}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: "#4C7A3D" }}>{i + 1}</span>
                  <span className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(tr, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: th.border, color: th.subColor, fontFamily: "Tajawal" }}>{t.distanceFooter}</div>
    </div>
  );
}

function Evening() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const groups = [
    { title: t.grpBeaches, icon: Waves, list: EVENING.beaches, color: "#3C6E8F" },
    { title: t.grpFestivals, icon: Tent, list: EVENING.festivals, color: "#2F5D45" },
    { title: t.grpMalls, icon: ShoppingBag, list: EVENING.malls, color: "#8A4A23" },
    { title: t.grpSouqs, icon: ShoppingBag, list: EVENING.souqs, color: "#6B4226" },
    { title: t.grpCafes, icon: Coffee, list: EVENING.cafes, color: "#C98A2E" },
  ];
  return (
    <div className="space-y-6 pb-6">
      <SectionTitle eyebrow={t.eveningEyebrow} title={t.eveningTitle} icon={Moon} />
      <SponsoredSection categories={["restaurant"]} />
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-2 flex items-center gap-2">
            <g.icon size={16} color={g.color} />
            <h3 className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{g.title}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.list.map((item) => (
              <a key={item.nAr} href={bestUrl(item, lang)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: th.border, background: th.cardBg, color: th.titleColor, fontFamily: "Tajawal" }}>
                {nm(item, lang)} <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Heritage() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-6 pb-6">
      <SectionTitle eyebrow={t.heritageEyebrow} title={t.heritageTitle} icon={Landmark} />

      <div className="flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: th.border, background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor }}>
        <Info size={14} className="mt-0.5 shrink-0" color="#A36A2E" />
        <span style={{ fontFamily: "Tajawal" }}>{t.hoursDisclaimer}</span>
      </div>

      <div className="space-y-2">
        {HERITAGE.map((h, i) => (
          <a key={h.nAr} href={bestUrl(h, lang)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
            style={{ borderColor: th.border, background: th.cardBg }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: "#6B4226" }}>{i + 1}</span>
              <div>
                <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(h, lang)}</div>
                <div className="mt-0.5 text-[11px]" style={{ color: "#A36A2E", fontFamily: "Tajawal" }}>{lc(h, lang)}</div>
                <div className="mt-1 flex items-start gap-1 text-[10px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                  <Clock size={11} className="mt-0.5 shrink-0" />
                  <span>{tx(HOURS_LABELS[h.hoursKey], lang)}</span>
                </div>
              </div>
            </div>
            <ExternalLink size={13} color={th.subColor} className="shrink-0" />
          </a>
        ))}
      </div>

      <div>
        <SectionTitle title={t.museumsFarmsTitle} icon={Sprout} />
        <div className="space-y-2">
          {MUSEUMS_FARMS.map((m) => (
            <a key={m.nAr} href={bestUrl(m, lang)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
              style={{ borderColor: th.border, background: th.cardBg }}>
              <div>
                <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(m, lang)}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                  <span>{tx(TYPE_LABELS[m.type], lang)}</span><span>·</span><span>{lc(m, lang)}</span>
                </div>
                <div className="mt-1 flex items-start gap-1 text-[10px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                  <Clock size={11} className="mt-0.5 shrink-0" />
                  <span>{tx(HOURS_LABELS[m.hoursKey], lang)}</span>
                </div>
              </div>
              <ExternalLink size={13} color={th.subColor} className="shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Access() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [mode, setMode] = useState("land");
  return (
    <div className="space-y-5 pb-6">
      <SectionTitle eyebrow={t.accessEyebrow} title={t.accessTitle} icon={Route} />

      <SponsoredSection categories={["accommodation", "tours"]} />

      <div className="flex gap-2">
        <button onClick={() => setMode("land")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold"
          style={{ borderColor: mode === "land" ? "#2F5D45" : th.border, background: mode === "land" ? "#2F5D451A" : th.cardBg, color: mode === "land" ? "#2F5D45" : th.subColor, fontFamily: "Tajawal" }}>
          <Car size={14} /> {t.byLand}
        </button>
        <button onClick={() => setMode("air")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold"
          style={{ borderColor: mode === "air" ? "#3C6E8F" : th.border, background: mode === "air" ? "#3C6E8F1A" : th.cardBg, color: mode === "air" ? "#3C6E8F" : th.subColor, fontFamily: "Tajawal" }}>
          <Plane size={14} /> {t.byAir}
        </button>
      </div>

      {mode === "land" && (
        <div className="space-y-3">
          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "#2F5D4510", color: th.titleColor, fontFamily: "Tajawal" }}>{t.landIntro}</div>
          {ACCESS_LAND.map((r) => (
            <div key={r.fromAr} className="rounded-2xl border p-4" style={{ borderColor: th.border, background: th.cardBg }}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{lang === "ar" ? r.fromAr : r.fromEn}</div>
                <Car size={15} color="#2F5D45" />
              </div>
              <div className="mt-2 flex gap-3 text-[11px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                <span className="flex items-center gap-1"><Navigation size={11} />{lang === "ar" ? r.distAr : r.distEn}</span>
                <span className="flex items-center gap-1"><Clock size={11} />{lang === "ar" ? r.timeAr : r.timeEn}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{tx(r.note, lang)}</p>
              <a href={directionsUrl("Salalah Oman", lang === "ar" ? r.fromAr : r.fromEn)} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white" style={{ background: "#2F5D45", fontFamily: "Tajawal" }}>
                <Navigation size={13} /> {t.startNav}
              </a>
            </div>
          ))}
        </div>
      )}

      {mode === "air" && (
        <div className="space-y-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: th.border, background: th.cardBg }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.airportTitle}</div>
              <Plane size={15} color="#3C6E8F" />
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.airportDesc}</p>
            <a href="https://www.google.com/maps/search/?api=1&query=17.0392,54.0914" target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white" style={{ background: "#3C6E8F", fontFamily: "Tajawal" }}>
              <Navigation size={13} /> {t.airportBtn}
            </a>
          </div>
          <div className="rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor, fontFamily: "Tajawal" }}>{t.airportNote}</div>
        </div>
      )}
    </div>
  );
}

function Health() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-5 pb-6">
      <SectionTitle eyebrow={t.healthEyebrow} title={t.healthTitle} icon={Stethoscope} />
      <div className="rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor, fontFamily: "Tajawal" }}>
        {t.emergencyNote} <strong>9999</strong>. {t.emergencyNote2}
      </div>
      <div className="space-y-2">
        {HOSPITALS.map((h) => (
          <a key={h.nAr} href={h.url ? h.url : bestUrl(h, lang)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border p-3 transition active:scale-[0.98]"
            style={{ borderColor: th.border, background: th.cardBg }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: h.type === "private" || h.type === "privateClinic" ? "#B5402C1A" : "#2F5D451A" }}>
                <Stethoscope size={14} color={h.type === "private" || h.type === "privateClinic" ? "#B5402C" : "#2F5D45"} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{nm(h, lang)}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                  <span>{tx(TYPE_LABELS[h.type], lang)}</span>
                  {lc(h, lang) && <><span>·</span><span>{lc(h, lang)}</span></>}
                </div>
              </div>
            </div>
            <ExternalLink size={13} color={th.subColor} />
          </a>
        ))}
      </div>
    </div>
  );
}

function Crowd() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [filter, setFilter] = useState("all");

  // Best-time guide — grouped by site type, no fake crowd scores
  const VISIT_GUIDE = [
    {
      typeAr: "عيون مائية ووديان", typeEn: "Springs & Wadis", emoji: "💧",
      keys: ["natureHigh", "natureMid"],
      bestAr: "الصباح الباكر (7-10 ص)", bestEn: "Early morning (7–10am)",
      avoidAr: "ظهر الجمعة والسبت", avoidEn: "Friday & Saturday midday",
      tipAr: "المياه تكون أكثر تدفقاً وازدهاراً في ساعات الصباح. المواقع بعيدة؛ ابدأ مبكراً.",
      tipEn: "Water flows best in the morning hours. Sites are distant — start early.",
    },
    {
      typeAr: "جبال وإطلالات", typeEn: "Mountains & Viewpoints", emoji: "⛰️",
      keys: ["natureLow"],
      bestAr: "الصباح (8-11 ص) أو المساء (4-7 م)", bestEn: "Morning (8–11am) or evening (4–7pm)",
      avoidAr: "الظهيرة: ضباب كثيف يحجب المنظر", avoidEn: "Midday: dense fog may block the view",
      tipAr: "الضباب في الجبال يتقلّب خلال اليوم — الصباح الباكر يعطي أوضح منظر.",
      tipEn: "Mountain fog shifts throughout the day — early morning gives the clearest view.",
    },
    {
      typeAr: "مواقع تراثية وأثرية", typeEn: "Heritage & Archaeological Sites", emoji: "🏛️",
      keys: ["cultureMid", "cultureLow"],
      bestAr: "الصباح (9 ص - 12 م)، أيام الأسبوع", bestEn: "Morning (9am–12pm), weekdays",
      avoidAr: "عطل نهاية الأسبوع بعد الظهر", avoidEn: "Weekend afternoons",
      tipAr: "معظم المتاحف تغلق وقت الظهيرة. تحقق من أوقات الفتح قبل التوجه إليها.",
      tipEn: "Most museums close at midday. Check opening hours before heading there.",
    },
    {
      typeAr: "مهرجانات وفعاليات", typeEn: "Festivals & Events", emoji: "🎡",
      keys: ["festHigh", "fest"],
      bestAr: "المساء (7-11 م)", bestEn: "Evening (7–11pm)",
      avoidAr: "الجمعة والسبت مساءً: ذروة الازدحام", avoidEn: "Friday & Saturday evenings: peak crowd",
      tipAr: "المهرجانات تكون في أوج حيويتها بعد المغرب. للاسترخاء، حضور أبكر من 7م مثالي.",
      tipEn: "Festivals come alive after sunset. For a calmer experience, arrive before 7pm.",
    },
  ];

  const filters = [
    { key: "all", label: t.filterAll },
    { key: "nature", label: t.filterNature },
    { key: "heritage", label: t.filterHeritage },
    { key: "fest", label: t.filterFest },
  ];

  const guideFiltered = filter === "all" ? VISIT_GUIDE : VISIT_GUIDE.filter((g) => {
    if (filter === "nature") return g.keys.some((k) => k.startsWith("nature"));
    if (filter === "heritage") return g.keys.some((k) => k.startsWith("culture"));
    if (filter === "fest") return g.keys.some((k) => k.startsWith("fest"));
    return true;
  });

  return (
    <div className="space-y-5 pb-6">
      <SectionTitle eyebrow={t.crowdEyebrow} title={t.crowdTitle} icon={Gauge} />

      <div className="flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: th.border, background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor }}>
        <Info size={14} className="mt-0.5 shrink-0" color="#A36A2E" />
        <span style={{ fontFamily: "Tajawal" }}>{t.crowdNewNote}</span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold"
            style={{ borderColor: filter === f.key ? "#2F5D45" : th.border, background: filter === f.key ? "#2F5D45" : th.cardBg, color: filter === f.key ? "#fff" : th.subColor, fontFamily: "Tajawal" }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {guideFiltered.map((g) => (
          <div key={g.typeAr} className="overflow-hidden rounded-2xl border" style={{ borderColor: th.border }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: "linear-gradient(135deg,#1F3D2B,#2F5D45)" }}>
              <span className="text-xl">{g.emoji}</span>
              <span className="text-sm font-bold text-white" style={{ fontFamily: "Tajawal" }}>{lang === "ar" ? g.typeAr : g.typeEn}</span>
            </div>
            <div className="divide-y px-4" style={{ background: th.cardBg, borderColor: th.border }}>
              <div className="flex items-start gap-3 py-3">
                <span className="mt-0.5 shrink-0 text-base">✅</span>
                <div>
                  <div className="text-xs font-bold" style={{ color: "#2F7D4A", fontFamily: "Tajawal" }}>{t.goodTime}: {lang === "ar" ? g.bestAr : g.bestEn}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <span className="mt-0.5 shrink-0 text-base">⚠️</span>
                <div>
                  <div className="text-xs font-bold" style={{ color: "#B5402C", fontFamily: "Tajawal" }}>{t.avoidTime}: {lang === "ar" ? g.avoidAr : g.avoidEn}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <span className="mt-0.5 shrink-0 text-base">💡</span>
                <p className="text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{lang === "ar" ? g.tipAr : g.tipEn}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: "#3C6E8F", background: "#3C6E8F10" }}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">📍</span>
          <span className="text-sm font-bold" style={{ color: "#3C6E8F", fontFamily: "Tajawal" }}>{t.openInMaps}</span>
        </div>
        <p className="mb-3 text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
          {lang === "ar"
            ? "لمعرفة الازدحام الحقيقي والفعلي، افتح أي موقع في جوجل ماب وانظر رسم أوقات الذروة (Popular Times) إن كان متوفراً."
            : "For real crowd data, open any location in Google Maps and check the Popular Times graph if available."}
        </p>
        <a href="https://www.google.com/maps/@17.0151,54.0924,13z" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white"
          style={{ background: "#3C6E8F", fontFamily: "Tajawal" }}>
          <Navigation size={16} /> {lang === "ar" ? "افتح جوجل ماب" : "Open Google Maps"}
        </a>
      </div>
    </div>
  );
}

/* ===================================================================
   APP SHELL
=================================================================== */

function About() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-5 pb-6">
      <SectionTitle eyebrow={`v${APP_VERSION}`} title={t.about} icon={Info} />
      <AboutCard />
      <BecomeSponsorCard />
    </div>
  );
}

function Planner() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [days, setDays] = useState(3);
  const [regions, setRegions] = useState(["central"]);
  const [tripStyle, setTripStyle] = useState(null);
  const [generated, setGenerated] = useState(null);

  function toggleRegion(r) {
    setRegions((prev) =>
      prev.includes(r)
        ? prev.length > 1 ? prev.filter((x) => x !== r) : prev
        : [...prev, r]
    );
    setGenerated(null);
  }

  function generate() {
    setGenerated(buildItinerary(regions, days, tripStyle));
  }

  const DAY_COLORS = ["#2F5D45", "#3C6E8F", "#8A4A23", "#C98A2E", "#6B4226", "#B5402C"];

  return (
    <div className="space-y-6 pb-6">
      <SectionTitle eyebrow={t.plannerEyebrow} title={t.plannerTitle} icon={MapPinned} />

      {/* Step 1: days */}
      <div>
        <div className="mb-2 text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.plannerStep1}</div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: MAX_ITIN_DAYS }, (_, i) => i + 1).map((d) => (
            <button key={d} type="button" onClick={() => { setDays(d); setGenerated(null); }}
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition"
              style={{
                background: days === d ? "#2F5D45" : th.cardBg,
                color: days === d ? "#fff" : th.subColor,
                border: `2px solid ${days === d ? "#2F5D45" : th.border}`,
                fontFamily: "Tajawal",
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: regions */}
      <div>
        <div className="mb-1 text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.plannerStep2}</div>
        <div className="mb-2 text-[11px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.selectRegionNote}</div>
        <div className="space-y-2">
          {Object.entries(ITIN_REGIONS).map(([key, r]) => {
            const selected = regions.includes(key);
            return (
              <button key={key} type="button" onClick={() => toggleRegion(key)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-right transition active:scale-[0.98]"
                style={{ borderColor: selected ? r.color : th.border, background: selected ? `${r.color}14` : th.cardBg, textAlign: lang === "ar" ? "right" : "left" }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${r.color}1A` }}>
                  <r.icon size={16} color={r.color} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: selected ? r.color : th.titleColor, fontFamily: "Tajawal" }}>{tx(r.label, lang)}</div>
                  <div className="text-[11px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                    {r.days.length} {lang === "ar" ? "أيام متاحة" : lang === "fr" ? "jours disponibles" : lang === "hi" ? "दिन उपलब्ध" : "days available"}
                  </div>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: selected ? r.color : "transparent", border: `2px solid ${selected ? r.color : th.border}` }}>
                  {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: travel style */}
      <div>
        <div className="mb-1 text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.plannerStep3}</div>
        <div className="mb-2 text-[11px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.plannerStep3Note}</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TRAVEL_STYLES).map(([key, s]) => {
            const sel = tripStyle === key;
            return (
              <button key={key} type="button" onClick={() => { setTripStyle(sel ? null : key); setGenerated(null); }}
                className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition active:scale-[0.97]"
                style={{ borderColor: sel ? s.color : th.border, background: sel ? `${s.color}18` : th.cardBg }}>
                <span className="text-xl">{s.icon}</span>
                <span className="text-[11px] font-bold" style={{ color: sel ? s.color : th.subColor, fontFamily: "Tajawal" }}>{tx(s.label, lang)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button type="button" onClick={generate}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg,#2F5D45,#3C6E8F)", fontFamily: "Tajawal" }}>
        <ListOrdered size={18} /> {t.plannerGenerate}
      </button>

      {/* Generated itinerary */}
      {generated !== null && (
        <div className="space-y-4">
          {generated.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.plannerEmpty}</div>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: th.border, background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor }}>
                <Info size={13} className="mt-0.5 shrink-0" color="#A36A2E" />
                <span style={{ fontFamily: "Tajawal" }}>{t.plannerNote}</span>
              </div>

              {generated.map((day) => {
                const regionData = ITIN_REGIONS[day.region];
                const dayColor = DAY_COLORS[(day.dayNum - 1) % DAY_COLORS.length];
                return (
                  <div key={day.dayNum} className="overflow-hidden rounded-2xl border" style={{ borderColor: dayColor }}>
                    {/* Day header */}
                    <div className="flex items-center justify-between p-4" style={{ background: dayColor }}>
                      <div>
                        <div className="text-xs font-bold text-white opacity-80" style={{ fontFamily: "Tajawal" }}>{t.plannerDay} {day.dayNum}</div>
                        <div className="text-sm font-bold text-white" style={{ fontFamily: "Tajawal" }}>
                          {lang === "ar" ? day.titleAr : day.titleEn}
                        </div>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <regionData.icon size={16} color="#fff" />
                      </div>
                    </div>

                    {/* Day description */}
                    <div className="border-b px-4 py-3 text-xs leading-relaxed" style={{ borderColor: `${dayColor}30`, background: `${dayColor}08`, color: th.subColor, fontFamily: "Tajawal" }}>
                      {lang === "ar" ? day.descAr : day.descEn}
                    </div>

                    {/* Spots */}
                    <div className="divide-y" style={{ borderColor: th.border }}>
                      {day.noMatch ? (
                        <div className="p-3 text-xs italic" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.noMatchSpots}</div>
                      ) : day.spots.map((spot, si) => (
                        <a key={spot.nAr} href={itinUrl(spot.nEn)} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 transition active:bg-black/5"
                          style={{ borderColor: th.border }}>
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: dayColor }}>{si + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{lang === "ar" ? spot.nAr : spot.nEn}</div>
                            <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                              {lang === "ar" ? spot.descAr : spot.descEn}
                            </div>
                            {spot.styles && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {spot.styles.map((st) => TRAVEL_STYLES[st] && (
                                  <span key={st} className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: `${TRAVEL_STYLES[st].color}18`, color: TRAVEL_STYLES[st].color, fontFamily: "Tajawal" }}>
                                    {TRAVEL_STYLES[st].icon} {tx(TRAVEL_STYLES[st].label, lang)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <ExternalLink size={13} color={dayColor} className="mt-1 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button type="button" onClick={() => setGenerated(null)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition"
                style={{ borderColor: th.border, color: th.subColor, fontFamily: "Tajawal" }}>
                <X size={14} /> {t.plannerReset}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stays() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [areaFilter, setAreaFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");

  const areaKeys = ["all", ...Object.keys(ACCOM_AREAS)];
  const typeKeys = ["all", ...Object.keys(ACCOM_TYPES)];

  const filtered = useMemo(() => ACCOMMODATIONS.filter((a) => {
    const matchArea = areaFilter === "all" || a.area === areaFilter;
    const matchType = typeFilter === "all" || a.type === typeFilter;
    const matchQ = !query.trim() || a.nAr.includes(query.trim()) || a.nEn.toLowerCase().includes(query.trim().toLowerCase());
    return matchArea && matchType && matchQ;
  }), [areaFilter, typeFilter, query]);

  function hotelMapUrl(a) {
    if (a.lat && a.lng) return mapsUrlCoord(a.lat, a.lng);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.nEn + " " + (ACCOM_AREAS[a.area] ? ACCOM_AREAS[a.area].en : "") + " Salalah Oman")}`;
  }

  function starStr(n) { return n ? "⭐".repeat(Math.min(n, 5)) : ""; }

  return (
    <div className="space-y-5 pb-6">
      <SectionTitle eyebrow={t.staysEyebrow} title={t.staysTitle} icon={Building2} />

      {/* المسرة App Banner */}
      {BOOKING_PLATFORMS.map((p) => (
        <div key={p.key} className="overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg,#1F3D2B,#2F5D45)" }}>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: "rgba(255,255,255,0.15)" }}>
              {p.emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white" style={{ fontFamily: lang === "ar" ? "Aref Ruqaa" : "inherit" }}>{p.nameAr}</span>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontFamily: "Tajawal" }}>⭐ {t.localBadge}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white opacity-85" style={{ fontFamily: "Tajawal" }}>
                {lang === "ar" ? p.descAr : lang === "hi" ? p.descHi : lang === "fr" ? p.descFr : p.descEn}
              </p>
            </div>
          </div>
          <a href={p.playUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-white"
            style={{ background: "rgba(0,0,0,0.25)", fontFamily: "Tajawal" }}>
            📲 {t.downloadApp}
          </a>
        </div>
      ))}

      <div className="flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed" style={{ borderColor: th.border, background: theme === "light" ? "#F0ECDD" : "#212E27", color: th.titleColor }}>
        <Info size={13} className="mt-0.5 shrink-0" color="#A36A2E" />
        <span style={{ fontFamily: "Tajawal" }}>{t.staysNote}</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: th.border, background: th.cardBg }}>
        <Search size={15} color={th.subColor} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none" style={{ fontFamily: "Tajawal", color: th.titleColor }} />
      </div>

      {/* Area filter */}
      <div>
        <div className="mb-2 text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.filterArea}</div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {areaKeys.map((k) => (
            <button key={k} type="button" onClick={() => setAreaFilter(k)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition"
              style={{ borderColor: areaFilter === k ? "#2F5D45" : th.border, background: areaFilter === k ? "#2F5D45" : th.cardBg, color: areaFilter === k ? "#fff" : th.subColor, fontFamily: "Tajawal" }}>
              {k === "all" ? t.filterAll : tx(ACCOM_AREAS[k], lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div>
        <div className="mb-2 text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.filterType}</div>
        <div className="grid grid-cols-3 gap-1.5">
          {typeKeys.map((k) => (
            <button key={k} type="button" onClick={() => setTypeFilter(k)}
              className="flex items-center justify-center gap-1 rounded-xl border py-2 text-[11px] font-bold transition"
              style={{ borderColor: typeFilter === k ? "#C98A2E" : th.border, background: typeFilter === k ? "#C98A2E" : th.cardBg, color: typeFilter === k ? "#fff" : th.subColor, fontFamily: "Tajawal" }}>
              {k !== "all" && <span>{ACCOM_TYPES[k].emoji}</span>}
              {k === "all" ? t.filterAll : tx(ACCOM_TYPES[k], lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="text-xs" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
        {filtered.length} {lang === "ar" ? "نتيجة" : lang === "fr" ? "résultats" : lang === "hi" ? "परिणाम" : "results"}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.noResults}</div>
        ) : filtered.map((a) => (
          <div key={a.nAr} className="overflow-hidden rounded-2xl border" style={{ borderColor: th.border }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: theme === "light" ? "#F3EEDD" : "#1F2E24" }}>
              <span className="text-2xl">{ACCOM_TYPES[a.type]?.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
                  {lang === "ar" ? a.nAr : a.nEn}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#2F5D451A", color: "#2F5D45", fontFamily: "Tajawal" }}>
                    {tx(ACCOM_TYPES[a.type], lang)}
                  </span>
                  <span className="text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                    📍 {tx(ACCOM_AREAS[a.area], lang)}
                  </span>
                  {a.stars > 0 && <span className="text-[11px]">{starStr(a.stars)}</span>}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5" style={{ background: th.cardBg }}>
              <p className="text-xs leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
                {lang === "ar" ? a.descAr : a.descEn}
              </p>
              <div className="flex gap-2">
                <a href={`tel:${a.phone}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white"
                  style={{ background: "#2F5D45", fontFamily: "Tajawal" }}>
                  <Phone size={13} /> {t.callReservation}
                </a>
                <a href={hotelMapUrl(a)} target="_blank" rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold"
                  style={{ borderColor: "#2F5D45", color: "#2F5D45", fontFamily: "Tajawal" }}>
                  <Navigation size={13} /> {t.location}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertBanner() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const [alert, setAlert] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchAlert();
  }, []);

  async function fetchAlert() {
    try {
      const res = await fetch("/alert.json?t=" + Date.now());
      const data = await res.json();
      if (!data.active) return;
      const seenId = localStorage.getItem(ALERT_SEEN_KEY);
      if (seenId === data.id) return;
      setAlert(data);
      setVisible(true);
    } catch (e) { /* network error — silent */ }
  }

  function dismiss() {
    if (alert) localStorage.setItem(ALERT_SEEN_KEY, alert.id);
    setVisible(false);
  }

  if (!visible || !alert) return null;

  const isUrgent = alert.priority === "urgent";
  const bgColor = isUrgent ? "#B5402C" : alert.type === "weather" ? "#3C6E8F" : "#2F5D45";
  const msg = alert.message?.[lang] || alert.message?.ar || alert.message?.en || "";

  return (
    <div className="mx-0 mt-0" style={{ background: bgColor }}>
      <div className="flex items-start gap-3 px-5 py-3">
        <span className="mt-0.5 shrink-0 text-lg">
          {isUrgent ? "🚨" : alert.type === "weather" ? "🌧️" : "📢"}
        </span>
        <p className="flex-1 text-sm leading-relaxed text-white" style={{ fontFamily: "Tajawal" }}>{msg}</p>
        <button type="button" onClick={dismiss} className="shrink-0 rounded-full p-1" style={{ background: "rgba(255,255,255,0.2)" }}>
          <X size={14} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function NotificationBell({ unread }) {
  const { theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="relative">
      <Bell size={20} color={th.subColor} />
      {unread && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold text-white" style={{ background: "#B5402C" }}>!</span>
      )}
    </div>
  );
}



const PRAYER_NAMES = {
  ar: { Fajr:"الفجر", Sunrise:"الشروق", Dhuhr:"الظهر", Asr:"العصر", Maghrib:"المغرب", Isha:"العشاء" },
  en: { Fajr:"Fajr", Sunrise:"Sunrise", Dhuhr:"Dhuhr", Asr:"Asr", Maghrib:"Maghrib", Isha:"Isha" },
  hi: { Fajr:"फज्र", Sunrise:"सूर्योदय", Dhuhr:"जुहर", Asr:"अस्र", Maghrib:"मग़रिब", Isha:"इशा" },
  fr: { Fajr:"Fajr", Sunrise:"Lever", Dhuhr:"Dhuhr", Asr:"Asr", Maghrib:"Maghrib", Isha:"Isha" },
};


const RESTAURANTS = [
  { nAr:"مطعم الحصن", nEn:"Al Husn Restaurant", type:"arabic", priceAr:"متوسط", priceEn:"Mid-range", lat:17.0151, lng:54.0924, note:{ar:"أكلات عمانية أصيلة، مشهور بالمشاكيك", en:"Authentic Omani cuisine"}, open:"12:00-23:00", phone:"+96823210000" },
  { nAr:"مطعم البيك", nEn:"Al Baik", type:"fast", priceAr:"اقتصادي", priceEn:"Budget", lat:17.0144, lng:54.0867, note:{ar:"وجبات سريعة شعبي", en:"Popular fast food"}, open:"10:00-02:00", phone:"" },
  { nAr:"مطعم نزوى", nEn:"Nizwa Restaurant", type:"arabic", priceAr:"اقتصادي", priceEn:"Budget", lat:17.0200, lng:54.0950, note:{ar:"أسماك ومأكولات بحرية طازجة", en:"Fresh seafood"}, open:"11:00-23:00", phone:"" },
  { nAr:"كافيه ديلا", nEn:"Cafe Della", type:"cafe", priceAr:"متوسط", priceEn:"Mid-range", lat:17.0165, lng:54.0905, note:{ar:"مشروبات وحلويات، إطلالة رائعة", en:"Drinks and desserts with great view"}, open:"8:00-00:00", phone:"" },
  { nAr:"مطعم الساحل", nEn:"Al Sahel Restaurant", type:"seafood", priceAr:"مرتفع", priceEn:"High-end", lat:17.0080, lng:54.0820, note:{ar:"مأكولات بحرية فاخرة على الشاطئ", en:"Premium seafood on the beach"}, open:"12:00-23:00", phone:"" },
  { nAr:"مطعم السمحان", nEn:"Samhan Restaurant", type:"arabic", priceAr:"اقتصادي", priceEn:"Budget", lat:17.0190, lng:54.0970, note:{ar:"مطعم شعبي بأسعار مناسبة", en:"Popular local prices"}, open:"6:00-23:00", phone:"" },
];

const FOOD_TYPES = {
  all:     { ar:"الكل",      en:"All",      icon:"🍽️" },
  arabic:  { ar:"عماني",    en:"Omani",    icon:"🫕" },
  seafood: { ar:"مأكولات بحرية", en:"Seafood", icon:"🦞" },
  cafe:    { ar:"كافيه",    en:"Café",     icon:"☕" },
  fast:    { ar:"وجبات سريعة", en:"Fast Food", icon:"🍔" },
};

function FoodGuide() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const [filter, setFilter] = useState("all");
  const [restaurants, setRestaurants] = useState(RESTAURANTS);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/samiharthy/khareef-dhofar/main/public/restaurants.json?t=" + Date.now())
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setRestaurants(data); })
      .catch(() => {});
  }, []);

  const filtered = filter === "all" ? restaurants : restaurants.filter(r => r.type === filter);

  return (
    <div className="space-y-4 pb-6">
      <SectionTitle eyebrow={lang==="ar"?"دليل":"Guide"} title={lang==="ar"?"دليل المطاعم":"Restaurant Guide"} icon={Coffee} />
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
        {Object.entries(FOOD_TYPES).map(([key, val]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: filter===key ? "#2F5D45" : th.cardBg, color: filter===key ? "#fff" : th.subColor,
              border: `1px solid ${filter===key ? "#2F5D45" : th.border}`, fontFamily:"Tajawal" }}>
            <span>{val.icon}</span>
            <span>{lang==="ar" ? val.ar : val.en}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((r, i) => (
          <div key={i} className="overflow-hidden rounded-2xl" style={{ background: th.cardBg, border: `1px solid ${th.border}` }}>
            <div className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ background: "#2F5D4512" }}>
                  {FOOD_TYPES[r.type]?.icon || "🍽️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: th.titleColor, fontFamily:"Tajawal" }}>
                    {lang==="ar" ? r.nAr : r.nEn}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: th.subColor, fontFamily:"Tajawal" }}>
                    {lang==="ar" ? FOOD_TYPES[r.type]?.ar : FOOD_TYPES[r.type]?.en}
                    {" · "}{lang==="ar" ? r.priceAr : r.priceEn}
                    {r.open ? " · 🕐 " + r.open : ""}
                  </div>
                  {r.note && (
                    <div className="text-xs mt-1 leading-relaxed" style={{ color: th.subColor, fontFamily:"Tajawal" }}>
                      {lang==="ar" ? r.note.ar : r.note.en}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {r.lat && (
                  <a href={`https://www.google.com/maps/place/${r.lat},${r.lng}/@${r.lat},${r.lng},17z`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold"
                    style={{ background: "#2F5D4515", color: "#2F5D45", fontFamily:"Tajawal" }}>
                    <MapPin size={12} color="#2F5D45" />
                    {lang==="ar" ? "الموقع" : "Map"}
                  </a>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`}
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold"
                    style={{ background: "#3C6E8F15", color: "#3C6E8F", fontFamily:"Tajawal" }}>
                    📞 {lang==="ar" ? "اتصل" : "Call"}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8" style={{ color: th.subColor, fontFamily:"Tajawal" }}>
            {lang==="ar" ? "لا توجد نتائج" : "No results"}
          </div>
        )}
      </div>
    </div>
  );
}

const INTEREST_OPTIONS = [
  { id:"nature",    ar:"طبيعة 🌿",  en:"Nature 🌿" },
  { id:"adventure", ar:"مغامرة 🧗", en:"Adventure 🧗" },
  { id:"family",    ar:"عائلة 👨‍👩‍👧", en:"Family 👨‍👩‍👧" },
  { id:"heritage",  ar:"تراث 🏛️",  en:"Heritage 🏛️" },
  { id:"beach",     ar:"شاطئ 🏖️",  en:"Beach 🏖️" },
  { id:"hiking",    ar:"هايكنج 🥾", en:"Hiking 🥾" },
];

function WhereToGoToday() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [callCount, setCallCount] = useState(0);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("dhofar_rain_cache") || "{}");
      if (c.data) setWeather(c.data);
    } catch {}
  }, []);

  async function getSuggestions(refresh = false) {
    if (!selected) return;
    setLoading(true);
    if (refresh) setResults([]);
    const newCount = callCount + 1;
    setCallCount(newCount);

    const opt = INTEREST_OPTIONS.find(o => o.id === selected);
    const now = new Date();
    const hour = now.getHours();
    const timeLabel = hour < 10 ? "صباح" : hour < 14 ? "ظهيرة" : hour < 18 ? "عصر" : "مساء";
    const weatherSummary = weather
      ? weather.map(r => `${r.nameAr}: ${r.precip > 0 ? r.precip + "mm أمطار" : r.code >= 45 ? "ضباب" : "جاف"} ${r.temp}°`).join("، ")
      : "لا يوجد";
    const interest = opt ? (lang === "ar" ? opt.ar : opt.en) : "";
    const excludeNote = newCount > 1 ? `\nمهم: هذا الطلب رقم ${newCount}، قدّم أماكن مختلفة تماماً عن الاقتراحات السابقة.` : "";

    const prompt = `أنت مرشد سياحي خبير في محافظة ظفار، عُمان، موسم الخريف.
الوقت: ${timeLabel} (${hour}:${String(now.getMinutes()).padStart(2,'0')})
الطقس: ${weatherSummary}
اهتمام الزائر: ${interest}${excludeNote}

اقترح 3 أماكن مختلفة ومناسبة للزيارة الآن. أجب بـ JSON فقط بدون أي نص إضافي أو markdown:
[{"place":"اسم المكان","emoji":"إيموجي","reason":"سبب مختصر جملة واحدة","tip":"نصيحة سريعة"},{"place":"...","emoji":"...","reason":"...","tip":"..."},{"place":"...","emoji":"...","reason":"...","tip":"..."}]`;

    const FALLBACKS = {
      nature:    [
        {place:"وادي دربات",emoji:"🏞️",reason:"أجمل وادٍ خريفي، مياه متدفقة وخضرة كثيفة.",tip:"زر الصباح لأجمل منظر"},
        {place:"عين رزات",emoji:"💧",reason:"عين طبيعية هادئة محاطة بالأشجار.",tip:"مناسب للعائلات"},
        {place:"نوافير المغسيل",emoji:"🌊",reason:"ظاهرة طبيعية فريدة، نوافير بحرية مذهلة.",tip:"الأمواج قوية، ابقَ بعيداً عن الحافة"},
      ],
      adventure: [
        {place:"جبل سمحان",emoji:"⛰️",reason:"أعلى قمة في ظفار مع إطلالات خلابة.",tip:"انطلق مبكراً واحضر معدات مناسبة"},
        {place:"مسار وادي دربات",emoji:"🥾",reason:"مسار 4كم بين الأشجار والشلالات.",tip:"المسار رطب، احذر الانزلاق"},
        {place:"طريق انعدام الجاذبية",emoji:"🛣️",reason:"ظاهرة بصرية غريبة تبدو فيها السيارة تصعد وحدها.",tip:"مثير جداً للأطفال والكبار"},
      ],
      family:    [
        {place:"عين رزات",emoji:"💧",reason:"بيئة هادئة وآمنة للعائلات مع مياه نقية.",tip:"احضر وجبة ومفرش للجلوس"},
        {place:"حديقة ارض اللبان",emoji:"🌳",reason:"حديقة واسعة مع أشجار اللبان الأصيلة.",tip:"رائعة للتصوير العائلي"},
        {place:"شاطئ الحافة",emoji:"🏖️",reason:"شاطئ هادئ مناسب للعائلات وقت المساء.",tip:"الغروب جميل جداً هنا"},
      ],
      heritage:  [
        {place:"موقع السمهرم (خور روري)",emoji:"🏛️",reason:"موقع أثري مهم لتجارة اللبان القديمة.",tip:"أفضل في الصباح الباكر"},
        {place:"متحف أرض اللبان",emoji:"🏺",reason:"يروي تاريخ ظفار وطريق اللبان العريق.",tip:"خصص ساعتين على الأقل"},
        {place:"حصن مرباط",emoji:"🗼",reason:"قلعة تاريخية بإطلالة بحرية رائعة.",tip:"القلعة مفتوحة نهاراً فقط"},
      ],
      beach:     [
        {place:"شاطئ مرباط",emoji:"🏖️",reason:"شاطئ طويل هادئ مع قلعة تاريخية بالقرب.",tip:"الأمواج هادئة نسبياً"},
        {place:"شاطئ الحافة",emoji:"🌅",reason:"منظر الغروب من هنا استثنائي.",tip:"زر قبل الغروب بساعة"},
        {place:"شاطئ المغسيل",emoji:"🌊",reason:"شاطئ صخري مع نوافير طبيعية مذهلة.",tip:"لا تقترب كثيراً من الصخور"},
      ],
      hiking:    [
        {place:"مسار وادي دربات",emoji:"🥾",reason:"أشهر مسار في الخريف، 4كم مع شلالات.",tip:"ارتدِ حذاء مقاوم للماء"},
        {place:"جبل القمر الغربي",emoji:"⛰️",reason:"مسار طويل 18كم لمحبي التحدي الحقيقي.",tip:"مع مرشد فقط، يوم كامل"},
        {place:"مسار عين حمران",emoji:"🌿",reason:"مسار قصير 2كم بين الأشجار والينابيع.",tip:"مناسب للمبتدئين والعائلات"},
      ],
    };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 600,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const d = await res.json();
      const text = d.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setResults(Array.isArray(parsed) ? parsed.slice(0,3) : [parsed]);
    } catch {
      // Shuffle fallbacks for variety
      const fb = FALLBACKS[selected] || FALLBACKS.nature;
      const shuffled = [...fb].sort(() => Math.random() - 0.5);
      setResults(shuffled);
    }
    setLoading(false);
  }

  function reset() { setResults([]); setLoading(false); }

  return (
    <div className="overflow-hidden rounded-2xl" style={{ border:`1px solid ${th.border}`, background:th.cardBg }}>
      <div className="px-4 py-3" style={{ background:"linear-gradient(135deg,#1F3D2B,#2F5D45)", borderRadius:"16px 16px 0 0" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize:20 }}>🤖</span>
          <div>
            <div className="text-sm font-bold text-white" style={{ fontFamily:"Tajawal" }}>
              {lang==="ar" ? "أين أذهب اليوم؟" : "Where to go today?"}
            </div>
            <div className="text-[11px] text-white opacity-70" style={{ fontFamily:"Tajawal" }}>
              {lang==="ar" ? "اختر اهتماماً واحداً" : "Pick one interest"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Interest selector — always visible */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {INTEREST_OPTIONS.map(opt => (
            <button key={opt.id}
              onClick={() => { setSelected(selected === opt.id ? null : opt.id); setResults([]); }}
              className="flex flex-col items-center gap-1 rounded-2xl py-2.5 px-2 text-xs font-bold transition active:scale-95"
              style={{
                background: selected === opt.id ? "#2F5D45" : th.border,
                color: selected === opt.id ? "#fff" : th.subColor,
                border: `2px solid ${selected === opt.id ? "#1F3D2B" : "transparent"}`,
                fontFamily:"Tajawal", cursor:"pointer"
              }}>
              <span style={{ fontSize:18 }}>{opt.ar.slice(-2)}</span>
              <span>{lang==="ar" ? opt.ar.replace(/\s*\S+$/, "") : opt.en.replace(/\s*\S+$/, "")}</span>
            </button>
          ))}
        </div>

        {/* Suggest button */}
        {!loading && results.length === 0 && (
          <button onClick={() => getSuggestions(false)} disabled={!selected}
            style={{
              width:"100%", background: selected ? "#2F5D45" : "#ccc",
              color:"#fff", border:"none", borderRadius:12, padding:"11px",
              fontSize:14, fontWeight:700, cursor: selected ? "pointer" : "not-allowed",
              fontFamily:"Tajawal"
            }}>
            ✨ {lang==="ar" ? "اقترح لي 3 أماكن الآن" : "Suggest 3 places"}
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-4 text-center text-sm" style={{ color:th.subColor, fontFamily:"Tajawal" }}>
            ⏳ {lang==="ar" ? "جاري التحليل..." : "Analyzing..."}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3"
                style={{ background: i===0 ? "#2F5D4510" : th.border }}>
                <span style={{ fontSize:28, lineHeight:1, flexShrink:0 }}>{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold" style={{ color:th.titleColor, fontFamily:"Tajawal" }}>
                    {i===0 && <span className="text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded" style={{ background:"#2F5D45", color:"#fff" }}>#{i+1} الأفضل</span>} {r.place}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color:th.subColor, fontFamily:"Tajawal" }}>{r.reason}</div>
                  {r.tip && <div className="text-[10px] mt-1 font-bold" style={{ color:"#C98A2E", fontFamily:"Tajawal" }}>💡 {r.tip}</div>}
                </div>
              </div>
            ))}
            <button onClick={() => getSuggestions(true)} disabled={loading}
              style={{ width:"100%", marginTop:4, background:"none", border:`1px solid ${th.border}`,
                borderRadius:12, padding:"9px", fontSize:13, fontWeight:700,
                cursor:"pointer", color:th.subColor, fontFamily:"Tajawal" }}>
              🔄 {lang==="ar" ? "اقتراحات أخرى مختلفة" : "New suggestions"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function PrayerTimes() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const [times, setTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("prayer_times_cache");
    if (cached) {
      const { data, date } = JSON.parse(cached);
      const today = new Date().toDateString();
      if (date === today) { processTimes(data); setLoading(false); return; }
    }
    fetch("https://api.aladhan.com/v1/timingsByCity?city=Salalah&country=OM&method=4")
      .then(r => r.json())
      .then(d => {
        const t = d.data?.timings;
        if (t) {
          localStorage.setItem("prayer_times_cache", JSON.stringify({ data: t, date: new Date().toDateString() }));
          processTimes(t);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function processTimes(t) {
    const KEYS = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let next = null;
    for (const k of KEYS) {
      if (!t[k]) continue;
      const [h, m] = t[k].split(":").map(Number);
      if (h * 60 + m > nowMins) { next = k; break; }
    }
    setTimes(t);
    setNextPrayer(next || "Fajr");
  }

  const KEYS = ["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"];
  const ICONS = { Fajr:"🌙", Sunrise:"🌅", Dhuhr:"☀️", Asr:"🌤️", Maghrib:"🌇", Isha:"🌃" };

  if (loading) return null;
  if (!times) return null;

  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: `1px solid ${th.border}` }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: "#2F5D4510", borderBottom: `1px solid ${th.border}` }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>🕌</span>
          <span className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
            {lang === "ar" ? "مواقيت الصلاة — صلالة" : "Prayer Times — Salalah"}
          </span>
        </div>
        <span className="text-[11px] font-bold rounded-full px-2 py-0.5"
          style={{ background: "#2F5D45", color: "#fff", fontFamily: "Tajawal" }}>
          {lang === "ar" ? "اليوم" : "Today"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px" style={{ background: th.border }}>
        {KEYS.map(k => {
          const isNext = k === nextPrayer;
          return (
            <div key={k} className="flex flex-col items-center py-3 px-2"
              style={{ background: isNext ? "#2F5D4518" : th.cardBg }}>
              <span style={{ fontSize: 16 }}>{ICONS[k]}</span>
              <span className="text-[11px] font-bold mt-1" style={{ color: isNext ? "#2F5D45" : th.subColor, fontFamily: "Tajawal" }}>
                {PRAYER_NAMES[lang]?.[k] || PRAYER_NAMES.en[k]}
              </span>
              <span className="text-xs font-bold mt-0.5" style={{ color: th.titleColor }}>
                {times[k]?.slice(0,5) || "—"}
              </span>
              {isNext && (
                <span className="text-[9px] mt-0.5 rounded-full px-1.5 py-0.5"
                  style={{ background: "#2F5D45", color: "#fff", fontFamily: "Tajawal" }}>
                  {lang === "ar" ? "التالية" : "Next"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DhofarRainMap() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const [regionWeather, setRegionWeather] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Check cache first (update every 3 hours)
    const cached = localStorage.getItem("dhofar_rain_cache");
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const ageHours = (Date.now() - timestamp) / 3600000;
      if (ageHours < 3) {
        setRegionWeather(data);
        setLastUpdate(new Date(timestamp));
        setLoading(false);
        return;
      }
    }
    fetchAllRegions();
  }, []);

  async function fetchAllRegions() {
    setLoading(true);
    try {
      const results = await Promise.all(
        DHOFAR_WEATHER_REGIONS.map(async (region) => {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lng}&current=weather_code,precipitation,temperature_2m&timezone=Asia%2FMuscat`;
          const r = await fetch(url);
          const d = await r.json();
          return {
            ...region,
            code: d.current?.weather_code ?? 0,
            precip: d.current?.precipitation ?? 0,
            temp: Math.round(d.current?.temperature_2m ?? 0),
          };
        })
      );
      setRegionWeather(results);
      const now = Date.now();
      setLastUpdate(new Date(now));
      localStorage.setItem("dhofar_rain_cache", JSON.stringify({ data: results, timestamp: now }));
    } catch(e) {}
    setLoading(false);
  }

  const hasRain = regionWeather.some(r => r.code >= 51);

  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: `1px solid ${th.border}` }}>
      {/* Flood Alert Banner */}
      {!loading && regionWeather.some(r => r.precip >= 5) && (
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "#B5402C", borderRadius: "16px 16px 0 0" }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span className="text-sm font-bold text-white" style={{ fontFamily: "Tajawal" }}>
            {lang === "ar"
              ? `تحذير: أمطار غزيرة في ${regionWeather.filter(r=>r.precip>=5).map(r=>r.nameAr).join(" و")} — تجنّب الأودية`
              : `Warning: Heavy rain in ${regionWeather.filter(r=>r.precip>=5).map(r=>r.nameEn).join(", ")} — Avoid wadis`}
          </span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: hasRain ? "#3C6E8F15" : th.cardBg, borderBottom: `1px solid ${th.border}`,
          borderRadius: regionWeather.some(r=>r.precip>=5) ? 0 : "16px 16px 0 0" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>{hasRain ? "🌧️" : "🌤️"}</span>
          <span className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
            {lang === "ar" ? "حالة الأمطار في ظفار" : "Dhofar Rain Status"}
          </span>
        </div>
        <button onClick={fetchAllRegions} disabled={loading}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px]"
          style={{ background: th.border, color: th.subColor, border: "none", cursor: "pointer" }}>
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} color={th.subColor} />
        </button>
      </div>

      {/* Regions grid */}
      {loading ? (
        <div className="py-6 text-center" style={{ color: th.subColor, fontFamily: "Tajawal", fontSize: 13 }}>
          <RefreshCw size={16} className="mx-auto mb-2 animate-spin" color={th.subColor} />
          {lang === "ar" ? "جاري تحديث بيانات الطقس..." : "Updating weather..."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px" style={{ background: th.border }}>
          {regionWeather.map(region => (
            <div key={region.id} className="flex items-center justify-between px-3 py-2.5"
              style={{ background: th.cardBg }}>
              <div>
                <div className="text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
                  {lang === "ar" ? region.nameAr : region.nameEn}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: rainColor(region.code), fontFamily: "Tajawal" }}>
                  {rainLabel(region.code, lang)}
                  {region.precip > 0 ? ` · ${region.precip}mm` : ""}
                </div>
              </div>
              <div className="text-sm font-bold" style={{ color: th.subColor }}>
                {region.temp}°
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Last update */}
      {lastUpdate && (
        <div className="px-4 py-1.5 text-center text-[10px]" style={{ color: th.subColor, fontFamily: "Tajawal", borderTop: `1px solid ${th.border}` }}>
          {lang === "ar" ? `آخر تحديث: ${lastUpdate.toLocaleTimeString("ar-OM", { hour: "2-digit", minute: "2-digit" })}` 
                         : `Updated: ${lastUpdate.toLocaleTimeString("en-OM", { hour: "2-digit", minute: "2-digit" })}`}
        </div>
      )}
    </div>
  );
}


function TodayTab() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  return (
    <div className="space-y-4 pb-6">
      <SectionTitle eyebrow={lang==="ar"?"الحالة":"Status"} title={lang==="ar"?"حالة اليوم":"Today\'s Status"} icon={Calendar} />
      <PrayerTimes />
      <DhofarRainMap />
    </div>
  );
}

function XFeed() {
  const { lang, theme } = useLang();
  const th = THEMES[theme];
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/samiharthy/khareef-dhofar/main/public/featured.json?t=" + Date.now())
      .then(r => r.json())
      .then(data => setPosts(Array.isArray(data) ? data.slice(0, 2) : []))
      .catch(() => {
        // Fallback to local
        fetch("/featured.json?t=" + Date.now())
          .then(r => r.json())
          .then(data => setPosts(Array.isArray(data) ? data.slice(0, 2) : []))
          .catch(() => {});
      });
  }, []);

  if (posts.length === 0) return null;

  const caption = (p) => {
    if (lang === "ar") return p.captionAr || p.caption || "";
    if (lang === "en") return p.captionEn || p.captionAr || "";
    if (lang === "hi") return p.captionHi || p.captionEn || p.captionAr || "";
    if (lang === "fr") return p.captionFr || p.captionEn || p.captionAr || "";
    return p.captionAr || "";
  };

  return (
    <div className="space-y-3">
      {posts.map(post => (
        <a key={post.id}
          href={post.xUrl || post.instagramUrl || "https://x.com/khareef_dhofar"}
          target="_blank" rel="noopener noreferrer"
          className="block overflow-hidden rounded-2xl transition active:scale-[0.98]"
          style={{ background: th.cardBg, border: `1px solid ${th.border}` }}>

          {post.imageUrl && (
            <img src={post.imageUrl} alt=""
              className="w-full object-cover"
              style={{ maxHeight: 220 }}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={e => e.target.style.display = "none"} />
          )}
          {post.videoUrl && (
            <a href={post.videoUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3"
              style={{ background: "#00000010", borderBottom: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 20 }}>▶️</span>
              <span className="text-sm font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
                {lang === "ar" ? "شاهد الفيديو في X" : "Watch video on X"}
              </span>
            </a>
          )}

          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">

              
            </div>
            {caption(post) && (
              <p className="text-sm leading-relaxed" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>
                {caption(post)}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

function InstallBanner() {
  const { lang, t, theme } = useLang();
  const th = THEMES[theme];
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const ua = window.navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);

    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
    }
    if (window.navigator.standalone) {
      setIsStandalone(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed || (!deferredPrompt && !isIOS)) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setDismissed(true);
    }
  }

  return (
    <div className="mx-5 mt-3 flex items-start gap-3 rounded-2xl border p-3" style={{ borderColor: "#2F5D45", background: "#2F5D451A" }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "#2F5D45" }}>
        <Download size={16} color="#F4EFE2" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.installTitle}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>
          {isIOS && !deferredPrompt ? t.installIOSDesc : t.installDesc}
        </div>
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ background: "#2F5D45", fontFamily: "Tajawal" }}
          >
            <Download size={12} /> {t.installBtn}
          </button>
        )}
        {isIOS && !deferredPrompt && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "#2F5D45", fontFamily: "Tajawal" }}>
            <Share2 size={12} />
          </div>
        )}
      </div>
      <button type="button" onClick={() => setDismissed(true)} className="shrink-0 rounded-full p-1" style={{ color: th.subColor }}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const [lang, setLang] = useState("ar");
  const [theme, setTheme] = useState("light");
  const [liveWeather, setLiveWeather] = useState(null);
  const [isLandscape, setIsLandscape] = useState(
    () => window.innerWidth > window.innerHeight && window.innerWidth > 600
  );

  useEffect(() => {
    function handleResize() {
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth > 600);
    }
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("switchTab", handleSwitch);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);
  const isMoreActive = MORE_TABS.some((t) => t.key === tab);
  const isRTL = lang === "ar";
  const t = I18N[lang];
  const th = THEMES[theme];

  useEffect(() => {
    fetchLiveWeather();
    // Handle tab switch from Home quick nav
    const handleSwitch = (e) => setTab(e.detail);
    window.addEventListener("switchTab", handleSwitch);
    // Auto-update: check for new version daily
    const lastCheck = localStorage.getItem("last_version_check");
    const now = Date.now();
    if (!lastCheck || now - parseInt(lastCheck) > 86400000) {
      localStorage.setItem("last_version_check", now.toString());
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(reg => reg.update());
        });
      }
    }
  }, []);

  async function fetchLiveWeather() {
    try {
      const res = await fetch(WEATHER_API);
      const json = await res.json();
      setLiveWeather(json);
    } catch (e) { /* silent fallback */ }
  }

  function openTab(key) {
    setTab(key);
    setMoreOpen(false);
  }
  function toggleMore() {
    setMoreOpen((v) => !v);
  }

  return (
    <LangContext.Provider value={{ lang, t, theme, th, liveWeather, refetchWeather: fetchLiveWeather }}>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen w-full" style={{ background: th.page }}>
        <style>{weatherKeyframes}</style>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />

        {/* Main container */}
        <div className="relative mx-auto flex min-h-screen flex-col"
          style={{ background: th.page, maxWidth: 448 }}>
          <div className="sticky top-0 z-10 border-b px-5 py-3" style={{ borderColor: th.border, background: th.headerBg, backdropFilter: "blur(6px)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "#2F5D45" }}>
                  <CloudFog size={18} color="#F4EFE2" />
                </div>
                <div>
                  <span className="text-xl font-bold leading-tight" style={{ color: th.titleColor, fontFamily: isRTL ? "Aref Ruqaa" : "inherit" }}>{t.appTitle}</span>
                </div>
              </div>
              <WeatherBadge />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex gap-1 rounded-full p-0.5" style={{ background: th.navBg, border: `1px solid ${th.border}` }}>
                {LANGS.map((l) => (
                  <button key={l.key} type="button" onClick={() => setLang(l.key)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
                    style={{ background: lang === l.key ? "#2F5D45" : "transparent", color: lang === l.key ? "#F4EFE2" : th.subColor, fontFamily: "Tajawal" }}>
                    {l.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setTheme((v) => (v === "light" ? "dark" : "light"))}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition"
                style={{ background: th.navBg, border: `1px solid ${th.border}`, color: th.subColor, fontFamily: "Tajawal" }}>
                {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
                {theme === "light" ? "Dark" : "Light"}
              </button>
            </div>
          </div>

          <AlertBanner />
          <InstallBanner />

          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
            {tab === "home" && <Home go={openTab} />}
            {tab === "events" && <Events />}
            {tab === "best" && <BestTimes />}
            {tab === "sites" && <Sites />}
            {tab === "crowd" && <Crowd />}
            {tab === "evening" && <Evening />}
            {tab === "heritage" && <Heritage />}
            {tab === "access" && <Access />}
            {tab === "health" && <Health />}
            {tab === "tips" && <Tips />}
            {tab === "stays" && <Stays />}
            {tab === "about" && <About />}
          {tab === "food" && <FoodGuide />}
          {tab === "today" && <TodayTab />}
            {tab === "planner" && <Planner />}
            {lang !== "ar" && (
              <p className="mb-2 mt-6 text-center text-[10px] leading-relaxed" style={{ color: th.subColor, fontFamily: "Tajawal" }}>{t.namesNote}</p>
            )}
          </div>

          {/* Bottom Nav */}
          <div className="sticky bottom-0 grid grid-cols-5 gap-1 border-t px-2 py-2.5"
            style={{ borderColor: th.border, background: th.navBg, zIndex: 40 }}>
            {PRIMARY_TABS.map((tb) => (
              <button key={tb.key} type="button" onClick={() => openTab(tb.key)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition"
                style={{ background: tab === tb.key ? "#2F5D451A" : "transparent" }}>
                <tb.icon size={24} color={tab === tb.key ? "#2F5D45" : th.subColor} strokeWidth={tab === tb.key ? 2.3 : 2} />
                <span className="text-[10px] font-medium" style={{ color: tab === tb.key ? "#2F5D45" : th.subColor, fontFamily: "Tajawal" }}>{t[tb.key]}</span>
              </button>
            ))}
            <button type="button" onClick={toggleMore}
              className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition"
              style={{ background: isMoreActive || moreOpen ? "#2F5D451A" : "transparent" }}>
              <MoreHorizontal size={24} color={isMoreActive || moreOpen ? "#2F5D45" : th.subColor} strokeWidth={isMoreActive || moreOpen ? 2.3 : 2} />
              <span className="text-[10px] font-medium" style={{ color: isMoreActive || moreOpen ? "#2F5D45" : th.subColor, fontFamily: "Tajawal" }}>{t.more}</span>
            </button>
          </div>
        </div>

        {moreOpen && (
          <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 999 }}>
            <div className="flex-1" style={{ background: "rgba(10,15,12,0.5)" }} onClick={toggleMore} />
            <div className="mx-auto w-full max-w-md rounded-t-3xl border-t p-5" style={{ borderColor: th.border, background: th.sheetBg }}>
              <div className="mb-4 flex items-center justify-between">
                <button type="button" onClick={() => { setMoreOpen(false); setTab("home"); }}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{ background:"#2F5D4515", color:"#2F5D45", border:"none", cursor:"pointer", fontFamily:"Tajawal" }}>
                  <Sparkles size={13} color="#2F5D45" />
                  {lang === "ar" ? "الرئيسية" : "Home"}
                </button>
                <h3 className="text-base font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{t.more}</h3>
                <button type="button" onClick={toggleMore} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: th.navBg }}>
                  <X size={16} color={th.subColor} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-2">
                {MORE_TABS.map((tb) => (
                  <button key={tb.key} type="button" onClick={() => openTab(tb.key)}
                    className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition active:scale-[0.97]"
                    style={{ borderColor: tab === tb.key ? "#2F5D45" : th.border, background: tab === tb.key ? "#2F5D451A" : theme === "light" ? "#FFFFFF" : "#212E27" }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "#2F5D451A" }}>
                      <tb.icon size={18} color="#2F5D45" />
                    </div>
                    <div className="text-xs font-bold" style={{ color: th.titleColor, fontFamily: "Tajawal" }}>{tb.labelAr ? (lang === "ar" ? tb.labelAr : tb.labelEn) : t[tb.key]}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </LangContext.Provider>
  );
}