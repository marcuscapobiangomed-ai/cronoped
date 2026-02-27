// APS Simulação — Semanas 1–5, Grupos 1 e 2
// Fonte: "Cronograma APS Simulação 2026 (1).pdf"
// Nota: Apenas 2 grupos disponíveis (1 e 2). Selecionar outro grupo mostrará cronograma vazio.

export const SIM_BY_GROUP = {
  1: [
    // ── Semana 1 (23/02 – 27/02) ─────────────────
    {num:1,dates:"23/2 – 27/2",activities:[
      {id:"1-1", day:"2ª",turno:"Manhã",title:"Oficina do Internato",sub:"Grupos 1 e 2",time:"09:00–12:00",type:"normal"},
      {id:"1-2", day:"2ª",turno:"Tarde",title:"Oficina do Internato",sub:"Grupos 1 e 2",time:"14:00–17:00",type:"normal"},
      {id:"1-3", day:"3ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Mariana",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"1-4", day:"3ª",turno:"Tarde",title:"Aula PSM",sub:"Profa. Ana Claudia",time:"14:00–17:00",type:"normal",loc:"Sala 08 PSM"},
      {id:"1-5", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"13:00–16:00",type:"normal",loc:"Sala 2210"},
      {id:"1-6", day:"5ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"1-7", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Ester",time:"14:00–17:00",type:"normal",loc:"Sala 2206"},
      {id:"1-8", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 1"},
      {id:"1-9", day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Profa. Camila",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 2"},
    ]},
    // ── Semana 2 (02/03 – 06/03) ─────────────────
    {num:2,dates:"02/3 – 06/3",activities:[
      {id:"2-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Manuela",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"2-2", day:"3ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"2-3", day:"3ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"2-4", day:"4ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Mário",time:"09:00–12:00",type:"simulacao",loc:"Sala 2"},
      {id:"2-5", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Gabriel",time:"13:00–16:00",type:"normal",loc:"Sala 2204"},
      {id:"2-6", day:"5ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Ester",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"2-7", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Diego",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"2-8", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Profa. Mariana",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 2"},
    ]},
    // ── Semana 3 (09/03 – 13/03) ─────────────────
    {num:3,dates:"09/3 – 13/3",activities:[
      {id:"3-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Paola",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"3-2", day:"2ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Érica Pontes",time:"14:00–17:00",type:"normal",loc:"Sala 8303"},
      {id:"3-3", day:"3ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Mariana",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"3-4", day:"3ª",turno:"Tarde",title:"Aula PSM",sub:"Profa. Ana Claudia",time:"14:00–17:00",type:"normal",loc:"Sala 08 PSM"},
      {id:"3-5", day:"4ª",turno:"Manhã",title:"Aula APS",sub:"Prof. Gabriel",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"3-6", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"13:00–16:00",type:"normal",loc:"Sala 2210"},
      {id:"3-7", day:"5ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"3-8", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Ester",time:"14:00–17:00",type:"normal",loc:"Sala 2206"},
      {id:"3-9", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 1"},
      {id:"3-10",day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Profa. Camila",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 2"},
    ]},
    // ── Semana 4 (16/03 – 20/03) ─────────────────
    {num:4,dates:"16/3 – 20/3",activities:[
      {id:"4-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Manuela",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"4-2", day:"3ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"4-3", day:"3ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"4-4", day:"4ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Mário",time:"09:00–12:00",type:"simulacao",loc:"Sala 2"},
      {id:"4-5", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Gabriel",time:"13:00–16:00",type:"normal",loc:"Sala 2204"},
      {id:"4-6", day:"5ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Ester",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"4-7", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Diego",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"4-8", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Profa. Mariana",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 2"},
      {id:"4-9", day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 1"},
    ]},
    // ── Semana 5 (23/03 – 27/03) ─────────────────
    {num:5,dates:"23/3 – 27/3",activities:[
      {id:"5-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Paola",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"5-2", day:"2ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Érica Pontes",time:"14:00–17:00",type:"normal",loc:"Sala 8303"},
      {id:"5-3", day:"3ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Mariana",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"5-4", day:"3ª",turno:"Tarde",title:"Aula PSM",sub:"Profa. Ana Claudia",time:"14:00–17:00",type:"normal",loc:"Sala 08 PSM"},
      {id:"5-5", day:"4ª",turno:"Manhã",title:"Aula APS",sub:"Prof. Gabriel",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"5-6", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"13:00–16:00",type:"normal",loc:"Sala 2210"},
      {id:"5-7", day:"5ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"5-8", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Ester",time:"14:00–17:00",type:"normal",loc:"Sala 2206"},
      {id:"5-9", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 1"},
      {id:"5-10",day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Profa. Camila",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 2"},
    ]},
  ],
  2: [
    // ── Semana 1 (23/02 – 27/02) ─────────────────
    {num:1,dates:"23/2 – 27/2",activities:[
      {id:"1-1", day:"2ª",turno:"Manhã",title:"Oficina do Internato",sub:"Grupos 1 e 2",time:"09:00–12:00",type:"normal"},
      {id:"1-2", day:"2ª",turno:"Tarde",title:"Oficina do Internato",sub:"Grupos 1 e 2",time:"14:00–17:00",type:"normal"},
      {id:"1-3", day:"3ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"1-4", day:"3ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"1-5", day:"4ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Mário",time:"09:00–12:00",type:"simulacao",loc:"Sala 2"},
      {id:"1-6", day:"5ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Ester",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"1-7", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Diego",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"1-8", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Profa. Mariana",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 2"},
      {id:"1-9", day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 1"},
    ]},
    // ── Semana 2 (02/03 – 06/03) ─────────────────
    {num:2,dates:"02/3 – 06/3",activities:[
      {id:"2-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Paola",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"2-2", day:"2ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Érica Pontes",time:"14:00–17:00",type:"normal",loc:"Sala 8303"},
      {id:"2-3", day:"3ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Mariana",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"2-4", day:"3ª",turno:"Tarde",title:"Aula PSM",sub:"Profa. Ana Claudia",time:"14:00–17:00",type:"normal",loc:"Sala 08 PSM"},
      {id:"2-5", day:"4ª",turno:"Manhã",title:"Aula APS",sub:"Prof. Gabriel",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"2-6", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"13:00–16:00",type:"normal",loc:"Sala 2210"},
      {id:"2-7", day:"5ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"2-8", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Ester",time:"14:00–17:00",type:"normal",loc:"Sala 2206"},
      {id:"2-9", day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Profa. Camila",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 2"},
    ]},
    // ── Semana 3 (09/03 – 13/03) ─────────────────
    {num:3,dates:"09/3 – 13/3",activities:[
      {id:"3-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Manuela",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"3-2", day:"3ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"3-3", day:"3ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"3-4", day:"4ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Mário",time:"09:00–12:00",type:"simulacao",loc:"Sala 2"},
      {id:"3-5", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Gabriel",time:"13:00–16:00",type:"normal",loc:"Sala 2204"},
      {id:"3-6", day:"5ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Ester",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"3-7", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Diego",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"3-8", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Profa. Mariana",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 2"},
      {id:"3-9", day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 1"},
    ]},
    // ── Semana 4 (16/03 – 20/03) ─────────────────
    {num:4,dates:"16/3 – 20/3",activities:[
      {id:"4-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Paola",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"4-2", day:"2ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Érica Pontes",time:"14:00–17:00",type:"normal",loc:"Sala 8303"},
      {id:"4-3", day:"3ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Mariana",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"4-4", day:"3ª",turno:"Tarde",title:"Aula PSM",sub:"Profa. Ana Claudia",time:"14:00–17:00",type:"normal",loc:"Sala 08 PSM"},
      {id:"4-5", day:"4ª",turno:"Manhã",title:"Aula APS",sub:"Prof. Gabriel",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"4-6", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"13:00–16:00",type:"normal",loc:"Sala 2210"},
      {id:"4-7", day:"5ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"4-8", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Ester",time:"14:00–17:00",type:"normal",loc:"Sala 2206"},
      {id:"4-9", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 1"},
      {id:"4-10",day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Profa. Camila",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 2"},
    ]},
    // ── Semana 5 (23/03 – 27/03) ─────────────────
    {num:5,dates:"23/3 – 27/3",activities:[
      {id:"5-1", day:"2ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Manuela",time:"09:00–12:00",type:"normal",loc:"Sala 2204"},
      {id:"5-2", day:"3ª",turno:"Manhã",title:"Ambulatório HUV",sub:"Prof. Marcos M.",time:"08:00–12:00",type:"ambulatorio"},
      {id:"5-3", day:"3ª",turno:"Tarde",title:"Aula APS",sub:"Profa. Mariana",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"5-4", day:"4ª",turno:"Manhã",title:"Centro de Simulação",sub:"Prof. Mário",time:"09:00–12:00",type:"simulacao",loc:"Sala 2"},
      {id:"5-5", day:"4ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Gabriel",time:"13:00–16:00",type:"normal",loc:"Sala 2204"},
      {id:"5-6", day:"5ª",turno:"Manhã",title:"Aula APS",sub:"Profa. Ester",time:"09:00–12:00",type:"normal",loc:"Sala 2206"},
      {id:"5-7", day:"5ª",turno:"Tarde",title:"Aula APS",sub:"Prof. Diego",time:"14:00–17:00",type:"normal",loc:"Sala 2204"},
      {id:"5-8", day:"6ª",turno:"Manhã",title:"Centro de Simulação",sub:"Profa. Mariana",time:"09:00–12:00",type:"simulacao",loc:"Sala Multi 2"},
      {id:"5-9", day:"6ª",turno:"Tarde",title:"Centro de Simulação",sub:"Prof. Vinicius",time:"13:00–16:00",type:"simulacao",loc:"Sala Multi 1"},
    ]},
  ],
};
