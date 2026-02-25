/**
 * Validação completa de todos os cronogramas.
 * Simula exatamente o processamento de scheduleData.js (inferType + preProcess + buildWeeksByGroup)
 * e verifica integridade de cada grupo de cada matéria.
 *
 * Uso: node scripts/validate-schedules.mjs
 */

import { PED_BY_GROUP } from "../src/data/ped.js";
import { CM_BY_GROUP }  from "../src/data/cm.js";
import { GO_BY_GROUP }  from "../src/data/go.js";
import { CC_BY_GROUP }  from "../src/data/cc.js";
import { SIM_BY_GROUP } from "../src/data/sim.js";
import { EMG_BY_GROUP } from "../src/data/emg.js";

// ── Reprodução exata do processamento de scheduleData.js ──

const VALID_DAYS   = ["2ª","3ª","4ª","5ª","6ª","Sáb"];
const VALID_TURNOS = ["Manhã","Tarde"];

function inferType(a) {
  if (a.title === "Horário Verde") return "horario_verde";
  const t = a.title.toLowerCase();
  if (t.includes("ambulatório") || t.includes("ambulatorio") || t.includes("ambulat")) return "ambulatorio";
  if (t.includes("enfermaria"))                                return "enfermaria";
  if (t.includes("alojamento"))                                return "alojamento";
  if (t.includes("saúde mental") || t.includes("saude mental"))return "saude_mental";
  if (t.includes("simulações")   || t.includes("simulacoes")
   || t.includes("simulação"))                                  return "simulacao";
  if (t.includes("simulado"))                                   return "destaque";
  if (t.includes("prova"))                                      return "prova";
  if (t.includes("plantão")      || t.includes("plantao"))     return "plantao";
  if (t.includes("consolidação") || t.includes("consolidacao"))return "casa";
  return a.type;
}

function preProcess(weeks) {
  return weeks.map(w => {
    const dayMap = {};
    VALID_DAYS.forEach(d => { dayMap[d] = {Manhã:[], Tarde:[]}; });
    const activities = w.activities.map(a => ({ ...a, effectiveType: inferType(a) }));
    activities.forEach(a => { if (dayMap[a.day]) dayMap[a.day][a.turno].push(a); });
    return { ...w, activities, dayMap };
  });
}

function buildWeeksByGroup(byGroupRaw) {
  const result = {};
  for (const [g, weeks] of Object.entries(byGroupRaw)) {
    result[g] = preProcess(weeks);
  }
  return result;
}

// ── PED Grupo 6 (inline em scheduleData.js) ──
const PED_G6_RAW = [
  {num:1,dates:"23/2 – 28/2",activities:[
    {id:"1-1",day:"2ª",turno:"Manhã",title:"Horário Verde",sub:"",time:"",type:"verde"},
    {id:"1-2",day:"3ª",turno:"Manhã",title:"C. de Simulações",sub:"Dra. Thais",time:"08:00–11:00",type:"normal"},
    {id:"1-3",day:"4ª",turno:"Manhã",title:"Horário Verde",sub:"",time:"",type:"verde"},
    {id:"1-3b",day:"5ª",turno:"Manhã",title:"Saúde Mental",sub:"Dr. Gabriel",time:"08:00–12:00",type:"normal",loc:"Campus 8301"},
    {id:"1-3c",day:"6ª",turno:"Manhã",title:"Consolidação e Performance",sub:"Em Casa",time:"08:00–12:00",type:"casa"},
    {id:"1-4",day:"2ª",turno:"Tarde",title:"Ambulatório HUV",sub:"Dra. Ana Carolina",time:"14:00–17:00",type:"normal"},
    {id:"1-5",day:"3ª",turno:"Tarde",title:"Consolidação e Performance",sub:"Em Casa",time:"14:00–18:00",type:"casa"},
    {id:"1-6",day:"4ª",turno:"Tarde",title:"Ambulatório HUV",sub:"Dra. Victória",time:"14:00–17:00",type:"normal"},
    {id:"1-7",day:"5ª",turno:"Tarde",title:"Consolidação e Performance",sub:"Em Casa",time:"14:00–18:00",type:"casa"},
    {id:"1-8",day:"6ª",turno:"Tarde",title:"Horário Verde",sub:"",time:"",type:"verde"},
    {id:"1-9",day:"Sáb",turno:"Tarde",title:"Simulado Nacional MEDCOF",sub:"Campus Universitário",time:"13:00–18:00",type:"destaque"},
  ]},
];

// ── Definição das matérias com expectativas ──

const MATERIAS = [
  { id: "ped", label: "Pediatria",         raw: { ...PED_BY_GROUP, 6: PED_G6_RAW }, grupos: [1,2,3,4,5,6,7,8,9,10], expectedWeeks: 10 },
  { id: "cm",  label: "Clínica Médica",    raw: CM_BY_GROUP,  grupos: [1,2,3,4,5,6,7,8,9,10], expectedWeeks: 10 },
  { id: "go",  label: "GO",                raw: GO_BY_GROUP,  grupos: [1,2,3,4,5,6,7,8,9,10], expectedWeeks: 10 },
  { id: "cc",  label: "Clínica Cirúrgica", raw: CC_BY_GROUP,  grupos: [1,2,3,4,5,6,7,8,9,10], expectedWeeks: 1  },
  { id: "sim", label: "APS Simulação",     raw: SIM_BY_GROUP, grupos: [1,2],                   expectedWeeks: 5  },
  { id: "emg", label: "Emergência",        raw: EMG_BY_GROUP, grupos: [1,2,3,4,5,6],           expectedWeeks: 10 },
];

// ── Validação ──

let totalErrors = 0;
let totalWarnings = 0;

function error(materia, grupo, msg) {
  totalErrors++;
  console.log(`  ❌ [${materia} G${grupo}] ${msg}`);
}

function warn(materia, grupo, msg) {
  totalWarnings++;
  console.log(`  ⚠️  [${materia} G${grupo}] ${msg}`);
}

for (const m of MATERIAS) {
  console.log(`\n━━━ ${m.label} (${m.id}) ━━━`);

  // 1. Verificar que todos os grupos esperados existem
  const rawKeys = Object.keys(m.raw).map(Number).sort((a,b) => a-b);
  const missingGroups = m.grupos.filter(g => !rawKeys.includes(g));
  const extraGroups   = rawKeys.filter(g => !m.grupos.includes(g));

  if (missingGroups.length > 0) {
    error(m.id, "-", `Grupos faltando nos dados: ${missingGroups.join(", ")}`);
  }
  if (extraGroups.length > 0) {
    warn(m.id, "-", `Grupos extras nos dados (não listados): ${extraGroups.join(", ")}`);
  }

  // 2. Processar (simula loadMateriaData)
  const processed = buildWeeksByGroup(m.raw);

  let groupsOk = 0;

  for (const g of m.grupos) {
    const weeks = processed[g];
    if (!weeks) { error(m.id, g, "Grupo não encontrado nos dados processados"); continue; }

    let groupErrors = 0;

    // 3. Verificar número de semanas
    if (weeks.length !== m.expectedWeeks) {
      error(m.id, g, `Esperava ${m.expectedWeeks} semanas, encontrou ${weeks.length}`);
      groupErrors++;
    }

    // 4. Verificar sequência de números de semana
    const weekNums = weeks.map(w => w.num);
    for (let i = 0; i < weekNums.length; i++) {
      if (weekNums[i] !== i + 1) {
        error(m.id, g, `Semana ${i+1} tem num=${weekNums[i]} (esperava ${i+1})`);
        groupErrors++;
      }
    }

    // 5. Verificar cada semana
    const allIds = new Set();

    for (const week of weeks) {
      // 5a. Semana tem dates?
      if (!week.dates) {
        error(m.id, g, `Semana ${week.num}: campo 'dates' vazio`);
        groupErrors++;
      }

      // 5b. Semana tem atividades?
      if (!week.activities || week.activities.length === 0) {
        error(m.id, g, `Semana ${week.num}: sem atividades`);
        groupErrors++;
        continue;
      }

      // 5c. Verificar cada atividade
      let orphanedActivities = 0;

      for (const a of week.activities) {
        // Campos obrigatórios
        if (!a.id)    { error(m.id, g, `Sem ${week.num}: atividade sem 'id' (title: ${a.title})`); groupErrors++; }
        if (!a.day)   { error(m.id, g, `Sem ${week.num}: atividade ${a.id} sem 'day'`); groupErrors++; }
        if (!a.turno) { error(m.id, g, `Sem ${week.num}: atividade ${a.id} sem 'turno'`); groupErrors++; }
        if (!a.title) { error(m.id, g, `Sem ${week.num}: atividade ${a.id} sem 'title'`); groupErrors++; }
        if (!a.type && !a.effectiveType) { error(m.id, g, `Sem ${week.num}: atividade ${a.id} sem 'type'`); groupErrors++; }

        // Day válido?
        if (a.day && !VALID_DAYS.includes(a.day)) {
          error(m.id, g, `Sem ${week.num}: atividade ${a.id} day inválido '${a.day}'`);
          groupErrors++;
        }

        // Turno válido?
        if (a.turno && !VALID_TURNOS.includes(a.turno)) {
          error(m.id, g, `Sem ${week.num}: atividade ${a.id} turno inválido '${a.turno}'`);
          groupErrors++;
        }

        // ID duplicado no grupo?
        const globalId = `${g}-${a.id}`;
        if (allIds.has(globalId)) {
          error(m.id, g, `Sem ${week.num}: ID duplicado '${a.id}'`);
          groupErrors++;
        }
        allIds.add(globalId);
      }

      // 5d. Verificar dayMap — todas atividades foram alocadas?
      let dayMapCount = 0;
      for (const day of VALID_DAYS) {
        dayMapCount += week.dayMap[day].Manhã.length + week.dayMap[day].Tarde.length;
      }

      if (dayMapCount !== week.activities.length) {
        const orphaned = week.activities.length - dayMapCount;
        error(m.id, g, `Sem ${week.num}: ${orphaned} atividade(s) não alocada(s) no dayMap (day ou turno inválido)`);
        groupErrors++;

        // Identificar quais
        for (const a of week.activities) {
          if (!VALID_DAYS.includes(a.day) || !VALID_TURNOS.includes(a.turno)) {
            error(m.id, g, `  → ${a.id} '${a.title}' day='${a.day}' turno='${a.turno}'`);
          }
        }
      }

      // 5e. Verificar que o ScheduleView vai renderizar (activeDays filter)
      const activeDays = VALID_DAYS.filter(d => week.dayMap[d].Manhã.length > 0 || week.dayMap[d].Tarde.length > 0);
      if (activeDays.length === 0 && week.activities.length > 0) {
        error(m.id, g, `Sem ${week.num}: tem ${week.activities.length} atividades mas nenhum dia ativo no dayMap`);
        groupErrors++;
      }
    }

    if (groupErrors === 0) groupsOk++;
  }

  const total = m.grupos.length;
  if (groupsOk === total) {
    console.log(`  ✅ Todos os ${total} grupos validados com sucesso`);
  } else {
    console.log(`  📊 ${groupsOk}/${total} grupos sem erros`);
  }

  // 6. Estatísticas da matéria
  let totalActs = 0;
  for (const g of m.grupos) {
    const weeks = processed[g];
    if (weeks) {
      for (const w of weeks) totalActs += w.activities.length;
    }
  }
  console.log(`  📊 Total de atividades: ${totalActs} (${m.grupos.length} grupos × ${m.expectedWeeks} semanas)`);
}

// ── Resumo ──
console.log("\n" + "═".repeat(50));
if (totalErrors === 0 && totalWarnings === 0) {
  console.log("✅ TUDO PERFEITO — Nenhum erro ou aviso encontrado!");
} else {
  if (totalErrors > 0)   console.log(`❌ ${totalErrors} erro(s) encontrado(s)`);
  if (totalWarnings > 0)  console.log(`⚠️  ${totalWarnings} aviso(s) encontrado(s)`);
}
console.log("═".repeat(50));

process.exit(totalErrors > 0 ? 1 : 0);
