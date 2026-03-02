import { DAYS_ORDER, DAY_LABELS, resolveStyle } from "../constants";

/**
 * Converte hex #RRGGBB para [r, g, b]
 */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Formata as atividades de um dia+turno em texto compacto para célula do PDF
 */
function formatCell(activities) {
  if (!activities.length) return "";
  return activities.map(a => {
    const parts = [a.title];
    if (a.time) parts.push(a.time);
    if (a.loc) parts.push(a.loc);
    if (a.sub) parts.push(a.sub);
    return parts.join("\n");
  }).join("\n---\n");
}

function cellColor(activities) {
  if (!activities.length) return null;
  const a = activities[0];
  const s = resolveStyle(a.effectiveType, a.customColor);
  return hexToRgb(s.bg);
}

function cellTextColor(activities) {
  if (!activities.length) return [0, 0, 0];
  const a = activities[0];
  const s = resolveStyle(a.effectiveType, a.customColor);
  return hexToRgb(s.accent);
}

/**
 * Carrega jsPDF + autotable via dynamic import (lazy loading)
 */
async function loadJsPDF() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable: autoTableModule.default };
}

/**
 * Renderiza uma semana como tabela no PDF
 */
function renderWeek(doc, autoTable, week, materiaLabel, grupo, isFirst) {
  if (!isFirst) doc.addPage();

  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`${materiaLabel} — Grupo ${grupo}`, 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Semana ${week.num}  ·  ${week.dates}`, 14, 26);

  const activeDays = DAYS_ORDER.filter(d =>
    week.dayMap[d]["Manhã"].length > 0 || week.dayMap[d].Tarde.length > 0
  );
  if (!activeDays.length) {
    doc.setFontSize(11);
    doc.text("Sem atividades nesta semana.", 14, 40);
    return;
  }

  const headers = [["", ...activeDays.map(d => `${d}\n${DAY_LABELS[d]}`)]];

  const manhaRow = ["Manhã"];
  const manhaCells = [];
  activeDays.forEach(d => {
    const acts = week.dayMap[d]["Manhã"];
    manhaRow.push(formatCell(acts));
    manhaCells.push(acts);
  });

  const tardeRow = ["Tarde"];
  const tardeCells = [];
  activeDays.forEach(d => {
    const acts = week.dayMap[d].Tarde;
    tardeRow.push(formatCell(acts));
    tardeCells.push(acts);
  });

  autoTable(doc, {
    startY: 32,
    head: headers,
    body: [manhaRow, tardeRow],
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineWidth: 0.3,
      lineColor: [203, 213, 225],
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold", halign: "center", valign: "middle", fontSize: 8 },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index > 0) {
        const cellIdx = data.column.index - 1;
        const acts = data.row.index === 0 ? manhaCells[cellIdx] : tardeCells[cellIdx];
        if (acts && acts.length > 0) {
          const bg = cellColor(acts);
          if (bg) data.cell.styles.fillColor = bg;
          const tc = cellTextColor(acts);
          if (tc) data.cell.styles.textColor = tc;
        }
      }
    },
    margin: { left: 14, right: 14 },
    tableWidth: pageW - 28,
  });

  const finalY = doc.lastAutoTable.finalY || 100;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("CronoPed — Cronograma Internato", 14, finalY + 10);
}

/**
 * Exporta uma semana como PDF (lazy loads jsPDF)
 */
export async function exportWeekPDF(week, weekDates, materiaLabel, grupo) {
  const { jsPDF, autoTable } = await loadJsPDF();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  renderWeek(doc, autoTable, week, materiaLabel, grupo, true);
  doc.save(`${materiaLabel.replace(/\s+/g, "_")}-Semana${week.num}-G${grupo}.pdf`);
}

/**
 * Exporta todas as semanas como PDF (lazy loads jsPDF)
 */
export async function exportAllWeeksPDF(mergedWeeks, weekDates, materiaLabel, grupo) {
  const { jsPDF, autoTable } = await loadJsPDF();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  mergedWeeks.forEach((week, i) => {
    renderWeek(doc, autoTable, week, materiaLabel, grupo, i === 0);
  });
  doc.save(`${materiaLabel.replace(/\s+/g, "_")}-Completo-G${grupo}.pdf`);
}
