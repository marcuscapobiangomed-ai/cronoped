import { DAYS_ORDER } from "../constants";

/** Extrai minutos do início de um horário "08:00–12:00" para ordenação */
function parseTime(timeStr) {
  if (!timeStr) return 9999;
  const m = timeStr.match(/(\d{2}):(\d{2})/);
  if (!m) return 9999;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

/** Gera ID único para atividades customizadas (nunca colide com IDs estáticos tipo "1-1") */
export function generateCustomId() {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Aplica customizações do usuário sobre os dados estáticos do cronograma.
 * Retorna um array de weeks modificado (deep clone — não muta o cache).
 *
 * @param {Array} weeks - Array de semanas processadas (com dayMap)
 * @param {Object} cust - { edits: [...], deletes: [...], adds: [...] }
 * @returns {Array} weeks com customizações aplicadas
 */
export function applyCustomizations(weeks, cust) {
  if (!cust || (!cust.edits?.length && !cust.deletes?.length && !cust.adds?.length)) {
    return weeks;
  }

  const cloned = JSON.parse(JSON.stringify(weeks));

  const editMap = {};
  (cust.edits || []).forEach(e => { editMap[e.id] = e; });
  const deleteSet = new Set(cust.deletes || []);

  cloned.forEach(week => {
    // 1. Aplicar edições
    week.activities = week.activities.map(a => {
      if (editMap[a.id]) {
        const e = editMap[a.id];
        return {
          ...a,
          title: e.title ?? a.title,
          time: e.time ?? a.time,
          loc: e.loc !== undefined ? e.loc : a.loc,
          sub: e.sub !== undefined ? e.sub : a.sub,
          _edited: true,
        };
      }
      return a;
    });

    // 2. Aplicar exclusões
    week.activities = week.activities.filter(a => !deleteSet.has(a.id));

    // 3. Inserir atividades adicionadas nesta semana
    const weekAdds = (cust.adds || []).filter(a => a.weekNum === week.num);
    weekAdds.forEach(add => {
      week.activities.push({
        id: add.id,
        day: add.day,
        turno: add.turno,
        title: add.title,
        sub: add.sub || "",
        time: add.time || "",
        type: add.type || "normal",
        loc: add.loc || "",
        effectiveType: add.type || "normal",
        _custom: true,
      });
    });

    // 4. Reconstruir dayMap e ordenar por horário
    const dayMap = {};
    DAYS_ORDER.forEach(d => { dayMap[d] = { "Manhã": [], Tarde: [] }; });
    week.activities.forEach(a => {
      if (dayMap[a.day] && dayMap[a.day][a.turno]) {
        dayMap[a.day][a.turno].push(a);
      }
    });
    Object.values(dayMap).forEach(turnos => {
      Object.values(turnos).forEach(arr => {
        arr.sort((a, b) => parseTime(a.time) - parseTime(b.time));
      });
    });

    week.dayMap = dayMap;
  });

  return cloned;
}
