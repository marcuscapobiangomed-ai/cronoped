import { useState, useEffect, useCallback } from "react";
import { ToastContext } from "../contexts/ToastContext";

const STYLES = {
  success: { bg: "#F0FDF4", border: "#86EFAC", color: "#166534", icon: "\u2713" },
  error:   { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B", icon: "\u2717" },
  warning: { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E", icon: "\u26A0" },
  info:    { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E40AF", icon: "\u2139" },
};

function ToastItem({ id, message, type, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const s = STYLES[type] || STYLES.info;
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 10, border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-10px)",
      transition: "all 0.3s ease", pointerEvents: "auto",
    }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
      {message}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 99999, display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none", maxWidth: 360, width: "90%",
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
