import { TYPE_STYLE, TYPE_ICON, CUSTOM_COLORS } from "../constants";

const TYPES = [
  { value: "normal",        label: "Normal",       icon: TYPE_ICON.normal },
  { value: "ambulatorio",   label: "Ambulatório",  icon: TYPE_ICON.ambulatorio },
  { value: "enfermaria",    label: "Enfermaria",    icon: TYPE_ICON.enfermaria },
  { value: "alojamento",    label: "Alojamento",    icon: TYPE_ICON.alojamento },
  { value: "saude_mental",  label: "Saúde Mental",  icon: TYPE_ICON.saude_mental },
  { value: "simulacao",     label: "Simulação",     icon: TYPE_ICON.simulacao },
  { value: "plantao",       label: "Plantão",       icon: TYPE_ICON.plantao },
  { value: "casa",          label: "Estudo em Casa", icon: TYPE_ICON.casa },
  { value: "horario_verde", label: "Horário Verde", icon: TYPE_ICON.horario_verde },
];

const swatch = {
  width: 36, height: 36, borderRadius: 8, border: "2px solid transparent",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 15, transition: "all 0.12s", flexShrink: 0, position: "relative",
};

const ring = "0 0 0 2px var(--bg-header)";

export default function ColorPalette({ selected, onChange }) {
  const selType = selected?.type || "normal";
  const selColor = selected?.customColor || null;

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>Tipos</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {TYPES.map(t => {
          const s = TYPE_STYLE[t.value];
          const active = selType === t.value && !selColor;
          return (
            <button key={t.value} type="button" title={t.label}
              onClick={() => onChange({ type: t.value, customColor: null })}
              style={{
                ...swatch,
                background: s.bg,
                borderColor: active ? s.accent : s.border,
                boxShadow: active ? ring : "none",
              }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>Cores</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CUSTOM_COLORS.map(c => {
          const active = selColor === c.id;
          return (
            <button key={c.id} type="button" title={c.label}
              onClick={() => onChange({ type: "normal", customColor: c.id })}
              style={{
                ...swatch,
                background: c.bg,
                borderColor: active ? c.accent : c.border,
                boxShadow: active ? `0 0 0 2px ${c.accent}` : "none",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: 99,
                background: c.accent,
              }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
