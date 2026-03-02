import { DAY_JS } from "../constants";

/**
 * Resolve a data real de uma atividade a partir do weekDates e do dia da semana.
 * weekDates: [{num, start: Date, end: Date}, ...]
 * weekNum: número da semana
 * dayKey: "2ª", "3ª", etc.
 * Retorna um Date no dia correto.
 */
function resolveDate(weekDates, weekNum, dayKey) {
  const week = weekDates.find(w => w.num === weekNum);
  if (!week) return null;
  const jsDay = DAY_JS[dayKey]; // 1=Mon, 2=Tue, ...
  if (jsDay == null) return null;
  const base = new Date(week.start);
  const baseDay = base.getDay(); // 0=Sun, 1=Mon, ...
  const offset = jsDay - (baseDay === 0 ? 7 : baseDay);
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d;
}

/**
 * Parse time string like "08:00–12:00" or "08:00-12:00" into {startH, startM, endH, endM}.
 * Returns null if time is empty or unparseable.
 */
function parseTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(/[–\-]/);
  if (parts.length < 2) return null;
  const [sh, sm] = parts[0].trim().split(":").map(Number);
  const [eh, em] = parts[1].trim().split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  return { startH: sh, startM: sm, endH: eh, endM: em };
}

/**
 * Formata data+hora para o formato do Google Calendar: YYYYMMDDTHHmmss
 */
function formatGCalDate(date, h, m) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${y}${mo}${d}T${hh}${mm}00`;
}

/**
 * Formata data como evento all-day: YYYYMMDD
 */
function formatGCalAllDay(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${mo}${d}`;
}

/**
 * Gera a URL do Google Calendar para uma atividade individual.
 */
export function buildGCalUrl(activity, weekDates, weekNum, materiaLabel) {
  const date = resolveDate(weekDates, weekNum, activity.day);
  if (!date) return null;

  const title = `${activity.title}${activity.sub ? ` - ${activity.sub}` : ""}`;
  const details = [
    materiaLabel,
    activity.sub ? `Prof: ${activity.sub}` : "",
    activity.loc ? `Local: ${activity.loc}` : "",
  ].filter(Boolean).join("\n");

  const time = parseTime(activity.time);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
  });

  if (activity.loc) {
    params.set("location", activity.loc);
  }

  if (time) {
    const start = formatGCalDate(date, time.startH, time.startM);
    const end = formatGCalDate(date, time.endH, time.endM);
    params.set("dates", `${start}/${end}`);
    params.set("ctz", "America/Sao_Paulo");
  } else {
    // All-day event
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    params.set("dates", `${formatGCalAllDay(date)}/${formatGCalAllDay(nextDay)}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Gera um arquivo .ics (iCalendar) para toda a semana.
 * Compatível com Google Calendar, Apple Calendar, Outlook, etc.
 */
export function generateWeekICS(week, weekDates, materiaLabel, grupo) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CronoPed//Cronograma Internato//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${materiaLabel} - Semana ${week.num}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  for (const activity of week.activities) {
    if (activity.type === "feriado") continue;

    const date = resolveDate(weekDates, week.num, activity.day);
    if (!date) continue;

    const time = parseTime(activity.time);
    const uid = `cronoped-${week.num}-${activity.id}@plannerinternato`;
    const summary = escapeICS(activity.title);
    const description = escapeICS(
      [materiaLabel, `Grupo ${grupo}`, activity.sub, activity.loc].filter(Boolean).join(" | ")
    );

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICSNow()}`);

    if (time) {
      lines.push(`DTSTART;TZID=America/Sao_Paulo:${formatGCalDate(date, time.startH, time.startM)}`);
      lines.push(`DTEND;TZID=America/Sao_Paulo:${formatGCalDate(date, time.endH, time.endM)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatGCalAllDay(date)}`);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatGCalAllDay(nextDay)}`);
    }

    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    if (activity.loc) lines.push(`LOCATION:${escapeICS(activity.loc)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Faz download de um arquivo .ics
 */
export function downloadICS(icsContent, filename) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatICSNow() {
  const now = new Date();
  return formatGCalAllDay(now) + "T" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0") + "Z";
}

function escapeICS(str) {
  return (str || "").replace(/[\\;,]/g, c => `\\${c}`).replace(/\n/g, "\\n");
}
