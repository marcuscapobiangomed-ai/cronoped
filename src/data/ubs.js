// Atenção Básica — Unidades de Saúde da Família (USF)
// Fonte: "Unidades Básicas de Saúde 2026 Vassouras 1º módulo.pdf"
// 11 USFs: 1–9, 11, 12 (numeração original do PDF)

const WEEK_DATES = [
  "23/2 – 28/2","02/3 – 07/3","09/3 – 14/3","16/3 – 21/3","23/3 – 28/3",
  "30/3 – 04/4","06/4 – 11/4","13/4 – 18/4","20/4 – 25/4","27/4 – 02/5",
];

// ── Definição de cada USF ───────────────────────────────────────────────────
const USF_DEFS = [
  {
    grupo:1, name:"USF Madruga",
    preceptor:"Dr. Lucas Alves Dantas",
    dias:["2ª","3ª","4ª","5ª"], folga:"6ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Rua Dep. José Carlos Vaz de Miranda, 56",
  },
  {
    grupo:2, name:"USF Centro (Clínica da Família)",
    preceptor:"Dra. Daniele da Silveira Calixto",
    dias:["2ª","3ª","4ª","5ª"], folga:"6ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Av. Marechal Paulo Torres, 477",
  },
  {
    grupo:3, name:"USF Carvalheira (Clínica da Família)",
    preceptor:"Dra. Marianna da Cunha Corrêa",
    dias:["2ª","4ª","5ª","6ª"], folga:"3ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Av. Marechal Paulo Torres, 477",
  },
  {
    grupo:4, name:"USF Melo Afonso",
    preceptor:"Dr. Renato Franco Borges",
    dias:["2ª","3ª","4ª","5ª"], folga:"6ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Rua Dr. Fernandes, 69",
  },
  {
    grupo:5, name:"USF Santa Amália",
    preceptor:"Dra. Maria dos Santos Vergílio",
    dias:["2ª","3ª","4ª","5ª"], folga:"6ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Rua B, 2",
  },
  {
    grupo:6, name:"USF Residência",
    preceptor:"Dra. Ismaila de Oliveira Drillard",
    dias:["2ª","3ª","4ª","5ª"], folga:"6ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Rua Pio XII, 100",
  },
  {
    grupo:7, name:"USF Mancusi",
    preceptor:"Dra. Victoria E. T. Bragança Capute",
    dias:["3ª","4ª","5ª","6ª"], folga:"2ª",
    manha:"08:00–12:00", tarde:"13:00–17:00",
    loc:"Rua Prof. Jesse Montelo, 132, Mancusi",
  },
  {
    grupo:8, name:"USF Pocinhos",
    preceptor:"Dra. Wanessa Rebello Zacarias",
    dias:["3ª","4ª","5ª","6ª"], folga:"2ª",
    manha:"08:00–12:00", tarde:"13:00–16:00",
    loc:"RJ 127, km 35",
  },
  {
    // Folga muda: semana 1 (fev) = quinta, semanas 2+ (mar) = segunda
    grupo:9, name:"USF Conjunto Habitacional",
    preceptor:"Marina da Silva Teixeira Rodrigues",
    diasFev:["2ª","3ª","4ª","6ª"], folgaFev:"5ª",
    diasMar:["3ª","4ª","5ª","6ª"], folgaMar:"2ª",
    manha:"08:00–12:00", tarde:"13:00–16:00",
    loc:"Rua B, 36, Pocinhos",
  },
  {
    grupo:11, name:"USF Itakamosi",
    preceptor:"Dra. Isa Carla",
    dias:["2ª","4ª","5ª","6ª"], folga:"3ª",
    manha:"08:00–12:00", tarde:"13:00–16:00",
    loc:"Rua Antônio Francisco Barbosa, s/n",
  },
  {
    grupo:12, name:"USF Ipiranga",
    preceptor:"Dra. Fernanda Cytrangulo F. Mangaravite",
    dias:["2ª","3ª","4ª","6ª"], folga:"5ª",
    manha:"08:00–12:00", tarde:"13:00–16:00",
    loc:"RJ 137, 6480, Ipiranga",
  },
];

// ── Geração automática das 10 semanas ───────────────────────────────────────
const ALL_DAYS = ["2ª","3ª","4ª","5ª","6ª"];

function buildWeeks(usf) {
  return WEEK_DATES.map((dates, i) => {
    const weekNum = i + 1;
    const activities = [];
    let n = 0;

    // USF 9 tem folga diferente em fevereiro vs março
    const dias = usf.diasFev
      ? (weekNum === 1 ? usf.diasFev : usf.diasMar)
      : usf.dias;

    ALL_DAYS.forEach(day => {
      if (dias.includes(day)) {
        n++;
        activities.push({
          id:`${weekNum}-${n}`, day, turno:"Manhã",
          title:"Atenção Básica",
          sub:usf.preceptor,
          time:usf.manha,
          type:"ambulatorio",
          loc:`${usf.name} — ${usf.loc}`,
        });
        n++;
        activities.push({
          id:`${weekNum}-${n}`, day, turno:"Tarde",
          title:"Atenção Básica",
          sub:usf.preceptor,
          time:usf.tarde,
          type:"ambulatorio",
          loc:`${usf.name} — ${usf.loc}`,
        });
      } else {
        n++;
        activities.push({
          id:`${weekNum}-${n}`, day, turno:"Manhã",
          title:"Folga", sub:"", time:"", type:"horario_verde",
        });
      }
    });

    return { num: weekNum, dates, activities };
  });
}

// ── Export ───────────────────────────────────────────────────────────────────
export const UBS_BY_GROUP = {};
USF_DEFS.forEach(usf => { UBS_BY_GROUP[usf.grupo] = buildWeeks(usf); });
