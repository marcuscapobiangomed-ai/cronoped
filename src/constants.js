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


export function badge(bg, color) {
  return {fontSize:11, fontWeight:700, color, background:bg, padding:"3px 10px", borderRadius:99, display:"inline-block"};
}
