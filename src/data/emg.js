// Urgência e Emergência — 10 semanas, 6 grupos (A1–A3 HUV, B1–B3 Hosp. Municipal)
// Fonte: "Cronograma Emergência 2026 1.pdf"
// Mapeamento: 1=A1, 2=A2, 3=A3, 4=B1, 5=B2, 6=B3

const WD = {
  1:"23/2 – 28/2", 2:"02/3 – 07/3", 3:"09/3 – 14/3", 4:"16/3 – 21/3", 5:"23/3 – 28/3",
  6:"30/3 – 04/4", 7:"06/4 – 11/4", 8:"13/4 – 18/4", 9:"20/4 – 25/4", 10:"27/4 – 02/5",
  11:"04/5",
};

function buildEmg() {
  /*
   * Groups:
   *   1 (A1): HUV on 2ª & 5ª — Luciano simulation on 3ª
   *   2 (A2): HUV on 3ª & 6ª — Gefson simulation on 2ª
   *   3 (A3): HUV on 4ª & Sáb — Gefson simulation on 2ª
   *   4 (B1): Hosp. Municipal on 2ª & 5ª — Luciano simulation on 3ª
   *   5 (B2): Hosp. Municipal on 3ª & 6ª — Gefson simulation on 2ª
   *   6 (B3): Hosp. Municipal on 4ª & Sáb — Luciano simulation on 3ª
   *
   * Luciano sessions (3ª): 10:00-12:00 A1 | 13:00-15:00 B1+B3 | 15:30-17:30 A1+B1+B3
   * Gefson sessions (2ª):  10:00-12:00 B2+A3 | 13:00-15:00 A2+A3 | 15:30-17:30 A2+B2+A3
   *
   * Exceptions:
   *   Week 1: No Gefson (2ª) — only Luciano (3ª)
   *   Week 1 Sáb: Simulado Nacional MEDCOF
   *   Week 8 Sáb: Simulado Geral do Módulo
   *   Week 9 3ª: FERIADO (21/04 Tiradentes) — no Luciano session
   *   Week 10 3ª (28/04): Luciano teaches B2+A3+A2 instead of A1+B1+B3
   */

  const GROUPS = {
    1: { hospital:"HUV",             shiftDays:["2ª","5ª"] },
    2: { hospital:"HUV",             shiftDays:["3ª","6ª"] },
    3: { hospital:"HUV",             shiftDays:["4ª","Sáb"] },
    4: { hospital:"Hosp. Municipal", shiftDays:["2ª","5ª"] },
    5: { hospital:"Hosp. Municipal", shiftDays:["3ª","6ª"] },
    6: { hospital:"Hosp. Municipal", shiftDays:["4ª","Sáb"] },
  };

  // Which weeks each group has simulation with Luciano (3ª)
  // A1(1), B1(4), B3(6): weeks 1-8 (not 9=feriado, not 10=different groups)
  const lucianoWeeks = new Set([1,2,3,4,5,6,7,8]);

  // Which weeks each group has simulation with Gefson (2ª)
  // A2(2), A3(3), B2(5): weeks 2-10 (not week 1)
  const gefsonWeeks = new Set([2,3,4,5,6,7,8,9,10]);

  // Week 10 special: Luciano on 3ª teaches A2(2), A3(3), B2(5) instead
  const week10LucianoGroups = new Set([2, 3, 5]);

  const result = {};

  for (const [gStr, cfg] of Object.entries(GROUPS)) {
    const g = Number(gStr);
    const weeks = [];

    for (let w = 1; w <= 11; w++) {
      const acts = [];
      let n = 1;

      // ── Week 11: only PROVA ──
      if (w === 11) {
        acts.push({id:"11-1",day:"2ª",turno:"Tarde",title:"Prova do Módulo",sub:"",time:"14:00–18:00",type:"prova",loc:"Campus"});
        weeks.push({ num: 11, dates: WD[11], activities: acts });
        continue;
      }

      // ── Hospital shifts ──
      for (const day of cfg.shiftDays) {
        // Week 9, 3ª = Feriado (Tiradentes 21/04)
        if (w === 9 && day === "3ª") {
          acts.push({id:`${w}-${n++}`,day,turno:"Manhã",title:"Feriado",sub:"Tiradentes",time:"",type:"feriado"});
          continue;
        }
        // Week 1 & 8 Sáb: Simulado replaces plantão for Sáb groups
        if ((w === 1 || w === 8) && day === "Sáb") continue;

        // Week 10 3ª special: A2(2) and B2(5) have simulation instead of plantão
        if (w === 10 && day === "3ª" && week10LucianoGroups.has(g)) continue;

        acts.push({
          id:`${w}-${n++}`, day, turno:"Manhã",
          title:`Plantão ${cfg.hospital}`, sub:"Emergência",
          time:"07:00–19:00", type:"plantao",
        });
      }

      // ── Luciano simulation sessions (3ª) ──
      // Regular: groups 1(A1), 4(B1), 6(B3)
      const isLucianoRegular = [1,4,6].includes(g);
      if (isLucianoRegular && lucianoWeeks.has(w)) {
        if (g === 1) {
          // A1: 10:00-12:00 solo + 15:30-17:30 combined
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Manhã",title:"Simulação Emergência",sub:"Prof. Luciano",time:"10:00–12:00",type:"simulacao",loc:"Sala 7205 – Campus"});
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"15:30–17:30",type:"simulacao",loc:"Sala 7205 – Campus"});
        } else {
          // B1(4) & B3(6): 13:00-15:00 + 15:30-17:30
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"13:00–15:00",type:"simulacao",loc:"Sala 7205 – Campus"});
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"15:30–17:30",type:"simulacao",loc:"Sala 7205 – Campus"});
        }
      }

      // ── Gefson simulation sessions (2ª) ──
      // Regular: groups 2(A2), 3(A3), 5(B2)
      const isGefsonRegular = [2,3,5].includes(g);
      if (isGefsonRegular && gefsonWeeks.has(w)) {
        if (g === 5) {
          // B2: 10:00-12:00 + 15:30-17:30
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Manhã",title:"Simulação Emergência",sub:"Prof. Gefson",time:"10:00–12:00",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Gefson",time:"15:30–17:30",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
        } else if (g === 2) {
          // A2: 13:00-15:00 + 15:30-17:30
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Gefson",time:"13:00–15:00",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Gefson",time:"15:30–17:30",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
        } else {
          // A3: all three slots (10:00 partial + 13:00 partial + 15:30 combined)
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Manhã",title:"Simulação Emergência",sub:"Prof. Gefson",time:"10:00–12:00",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Gefson",time:"13:00–15:00",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
          acts.push({id:`${w}-${n++}`,day:"2ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Gefson",time:"15:30–17:30",type:"simulacao",loc:"Centro de Simulação – Sala Multi uso 1"});
        }
      }

      // ── Week 10 special Luciano session (3ª 28/04) for A2, A3, B2 ──
      if (w === 10 && week10LucianoGroups.has(g)) {
        if (g === 5) {
          // B2: 10:00-12:00 + 15:30-17:30
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Manhã",title:"Simulação Emergência",sub:"Prof. Luciano",time:"10:00–12:00",type:"simulacao",loc:"Sala 7205 – Campus"});
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"15:30–17:30",type:"simulacao",loc:"Sala 7205 – Campus"});
        } else if (g === 2) {
          // A2: 13:00-15:00 + 15:30-17:30
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"13:00–15:00",type:"simulacao",loc:"Sala 7205 – Campus"});
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"15:30–17:30",type:"simulacao",loc:"Sala 7205 – Campus"});
        } else {
          // A3: all three
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Manhã",title:"Simulação Emergência",sub:"Prof. Luciano",time:"10:00–12:00",type:"simulacao",loc:"Sala 7205 – Campus"});
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"13:00–15:00",type:"simulacao",loc:"Sala 7205 – Campus"});
          acts.push({id:`${w}-${n++}`,day:"3ª",turno:"Tarde",title:"Simulação Emergência",sub:"Prof. Luciano",time:"15:30–17:30",type:"simulacao",loc:"Sala 7205 – Campus"});
        }
      }

      // ── Special events ──
      if (w === 1) {
        acts.push({id:`${w}-${n++}`,day:"Sáb",turno:"Tarde",title:"Simulado Nacional MEDCOF",sub:"Campus Universitário",time:"13:00–18:00",type:"destaque"});
      }
      if (w === 8) {
        acts.push({id:`${w}-${n++}`,day:"Sáb",turno:"Tarde",title:"Simulado Geral",sub:"Campus Universitário",time:"13:00–18:00",type:"destaque"});
      }

      // Sort: day order then turno
      const dayOrd = {"2ª":0,"3ª":1,"4ª":2,"5ª":3,"6ª":4,"Sáb":5};
      const turOrd = {"Manhã":0,"Tarde":1};
      acts.sort((a,b) => (dayOrd[a.day]??9) - (dayOrd[b.day]??9) || (turOrd[a.turno]??9) - (turOrd[b.turno]??9));
      // Re-number IDs after sort
      acts.forEach((a,i) => { a.id = `${w}-${i+1}`; });

      weeks.push({ num: w, dates: WD[w], activities: acts });
    }

    result[g] = weeks;
  }

  return result;
}

export const EMG_BY_GROUP = buildEmg();
