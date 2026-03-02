// Data de expiração do Módulo 1 — todos os acessos (exceto VIP) expiram nesta data
export const MODULE_END_DATE = new Date("2026-05-08T23:59:59-03:00");

export const DAYS_ORDER = ["2ª","3ª","4ª","5ª","6ª","Sáb"];
export const DAY_LABELS = {"2ª":"Segunda","3ª":"Terça","4ª":"Quarta","5ª":"Quinta","6ª":"Sexta","Sáb":"Sábado"};
export const DAY_JS     = {"2ª":1,"3ª":2,"4ª":3,"5ª":4,"6ª":5,"Sáb":6};

export const TYPE_STYLE = {
  normal:       {bg:"#F8F8F7",border:"#E7E5E4",accent:"#78716C",pill:"#E7E5E4",pillText:"#57534E",dark:false},
  casa:         {bg:"#1D4ED8",border:"#1E40AF",accent:"#fff",   pill:"#1E3A8A",pillText:"#93C5FD",dark:true},
  horario_verde:{bg:"#15803D",border:"#166534",accent:"#fff",   pill:"#14532D",pillText:"#86EFAC",dark:true},
  verde:        {bg:"#F8F8F7",border:"#E7E5E4",accent:"#78716C",pill:"#E7E5E4",pillText:"#57534E",dark:false},
  ambulatorio:  {bg:"#F0FDFA",border:"#99F6E4",accent:"#0F766E",pill:"#CCFBF1",pillText:"#0D9488",dark:false},
  enfermaria:   {bg:"#FFFBEB",border:"#FCD34D",accent:"#B45309",pill:"#FEF3C7",pillText:"#92400E",dark:false},
  alojamento:   {bg:"#EEF2FF",border:"#C7D2FE",accent:"#4338CA",pill:"#E0E7FF",pillText:"#3730A3",dark:false},
  saude_mental: {bg:"#FDF4FF",border:"#E9D5FF",accent:"#7E22CE",pill:"#F3E8FF",pillText:"#6B21A8",dark:false},
  simulacao:    {bg:"#FFF7ED",border:"#FDBA74",accent:"#C2410C",pill:"#FFEDD5",pillText:"#9A3412",dark:false},
  plantao:      {bg:"#F0F9FF",border:"#7DD3FC",accent:"#0369A1",pill:"#E0F2FE",pillText:"#075985",dark:false},
  destaque:     {bg:"#DC2626",border:"#B91C1C",accent:"#fff",   pill:"#991B1B",pillText:"#FCA5A5",dark:true},
  prova:        {bg:"#DC2626",border:"#B91C1C",accent:"#fff",   pill:"#991B1B",pillText:"#FCA5A5",dark:true},
  feriado:      {bg:"#F9FAFB",border:"#E5E7EB",accent:"#9CA3AF",pill:"#F3F4F6",pillText:"#6B7280",dark:false},
};

export const TYPE_ICON = {
  normal:"📋",casa:"🏠",verde:"🌿",horario_verde:"🌿",
  ambulatorio:"🏥",enfermaria:"🛏️",alojamento:"👶",saude_mental:"🧠",
  simulacao:"🎯",plantao:"⚡",feriado:"🏖️",destaque:"📋",prova:"📝",
};

export const labelStyle = {fontSize:13, fontWeight:600, color:"#475569", display:"block", marginBottom:6};

// Status constants — evita magic strings espalhadas pelo código
export const STATUS = {
  TRIAL: "trial",
  PENDING: "pending",
  APPROVED: "aprovado",
  EXPIRED: "expirado",
};

export const SUB_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  PAUSED: "paused",
  CANCELLED: "cancelled",
};

export const CUSTOM_COLORS = [
  { id: "c_rose",    label: "Rosa",      bg: "#FFF1F2", border: "#FECDD3", accent: "#BE123C", pill: "#FFE4E6", pillText: "#9F1239" },
  { id: "c_pink",    label: "Pink",      bg: "#FDF2F8", border: "#FBCFE8", accent: "#BE185D", pill: "#FCE7F3", pillText: "#9D174D" },
  { id: "c_cyan",    label: "Ciano",     bg: "#ECFEFF", border: "#A5F3FC", accent: "#0E7490", pill: "#CFFAFE", pillText: "#155E75" },
  { id: "c_lime",    label: "Lima",      bg: "#F7FEE7", border: "#BEF264", accent: "#4D7C0F", pill: "#ECFCCB", pillText: "#3F6212" },
  { id: "c_amber",   label: "Âmbar",     bg: "#FFFBEB", border: "#FCD34D", accent: "#B45309", pill: "#FEF3C7", pillText: "#92400E" },
  { id: "c_violet",  label: "Violeta",   bg: "#F5F3FF", border: "#C4B5FD", accent: "#6D28D9", pill: "#EDE9FE", pillText: "#5B21B6" },
  { id: "c_emerald", label: "Esmeralda", bg: "#ECFDF5", border: "#6EE7B7", accent: "#047857", pill: "#D1FAE5", pillText: "#065F46" },
  { id: "c_slate",   label: "Cinza",     bg: "#F8FAFC", border: "#CBD5E1", accent: "#475569", pill: "#E2E8F0", pillText: "#334155" },
];

export function resolveStyle(effectiveType, customColor) {
  if (customColor) {
    const cc = CUSTOM_COLORS.find(c => c.id === customColor);
    if (cc) return { bg: cc.bg, border: cc.border, accent: cc.accent, pill: cc.pill, pillText: cc.pillText, dark: false };
  }
  return TYPE_STYLE[effectiveType] || TYPE_STYLE.normal;
}

export function badge(bg, color) {
  return {fontSize:11, fontWeight:700, color, background:bg, padding:"3px 10px", borderRadius:99, display:"inline-block"};
}
