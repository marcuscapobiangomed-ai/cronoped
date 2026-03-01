
disc_g9 = []

# ==== G9 WEEK 1: 23 a 28/2 ====
# PDF Sab: SIMULADO NACIONAL MEDCOFF (double F)
# JS 1-11: Simulado Nacional MEDCOF (single F)
disc_g9.append(("W1","1-11","Sab","Manha","title",
    "SIMULADO NACIONAL MEDCOFF (double F)",
    "Simulado Nacional MEDCOF (single F)"))

# ==== G9 WEEKS 2,3,4: All match ====

# ==== G9 WEEK 5: 23 a 28/3 ====
# PDF MANHA: 2a=ConsolEmCasa 08-12 | 3a=ManuelaMarcati 08:30-12 | 4a=ConsolEmCasa 08-12 | 5a=ECG Emilo 08-12 Sala7211 | 6a=ConsolEmCasa 08-12
# PDF TARDE: 2a=CentroSim Fabio 14-18 | 3a=HORARIO VERDE | 4a=CentroSim Gilvando 14-18 | 5a=CentroSim AnaClaudia Zon 14-18 | 6a=CentroSim Gilvando 14-18

disc_g9.append(("W5","5-1","2a","Manha","time","08:00-12:00","empty string"))
disc_g9.append(("W5","5-2","2a","Tarde","ENTIRE CELL",
    "Centro de Simulacao / Prof. Fabio / 14:00-18:00 / type=simulacao",
    "Consolidacao e Performance / Em Casa / 08:00-12:00 / type=casa"))
disc_g9.append(("W5","5-3","3a","Manha","time","08:30-12:00","empty string"))
disc_g9.append(("W5","5-4","3a","Tarde","ENTIRE CELL",
    "Horario Verde / type=verde",
    "Saude Digital / Profa. Manuela Marcati / 08:30-12:00 / type=normal / loc=Campus"))
disc_g9.append(("W5","5-5","4a","Manha","time","08:00-12:00","empty string"))
disc_g9.append(("W5","5-6","4a","Tarde","ENTIRE CELL",
    "Centro de Simulacao / Prof. Gilvando / 14:00-18:00 / type=simulacao",
    "Consolidacao e Performance / Em Casa / 08:00-12:00 / type=casa"))
disc_g9.append(("W5","5-7","5a","Manha","sub+time",
    "Prof. Emilo / 08:00-12:00",
    "empty sub / empty time"))
disc_g9.append(("W5","5-8","5a","Tarde","ENTIRE CELL",
    "Centro de Simulacao / Profa. Ana Claudia Zon / 14:00-18:00 / type=simulacao",
    "ECG / Prof. Emilo / 08:00-12:00 / type=normal / loc=Sala 7211 - Campus"))
disc_g9.append(("W5","5-9","6a","Manha","time","08:00-12:00","empty string"))
disc_g9.append(("W5","5-10","6a","Tarde","ENTIRE CELL",
    "Centro de Simulacao / Prof. Gilvando / 14:00-18:00 / type=simulacao",
    "Consolidacao e Performance / Em Casa / 08:00-12:00 / type=casa"))

# ==== G9 WEEK 6: 30/3 a 4/4 ====
# PDF MANHA: 2a=HORARIO VERDE | 3a=ConsolEmCasa 08-12 | 4a=Ambulatorio Dra.Cleris 08-12 | 5a=ConsolEmCasa 08-12 | 6a=FERIADO
# PDF TARDE: 2a=CentroCirurgico 13-18 | 3a=CentroCirurgico 13-18 | 4a=CentroCirurgico 13-18 | 5a=CentroCirurgico 13-18 | 6a=(blank)

disc_g9.append(("W6","6-2","2a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Horario Verde / type=verde"))
disc_g9.append(("W6","6-6","4a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Consolidacao e Performance / Em Casa / 13:00-18:00 / type=casa"))
disc_g9.append(("W6","6-8","5a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Consolidacao e Performance / Em Casa / 13:00-18:00 / type=casa"))
disc_g9.append(("W6","6-10","6a","Tarde","presence",
    "(no entry - Feriado covers 6a all day)",
    "Horario Verde / type=verde (extra entry not in PDF)"))

# ==== G9 WEEK 7: 06 a 11/4 ====
# PDF MANHA: 2a=HORARIO VERDE | 3a=Ambulatorio Dr.Humberto 08-12 | 4a=ConsolEmCasa 08-12 | 5a=ConsolEmCasa 08-12 | 6a=HORARIO VERDE
# PDF TARDE: 2a=Ambulatorio Precep.Jodson 14-17 | 3a=ConsolEmCasa 14-18 | 4a=Ambulatorio Dr.LuizCapute 14-17 | 5a=Ambulatorio Prof.Gilvando 14-17 | 6a=Ambulatorio Precep.Jodson 14-17

disc_g9.append(("W7","7-2","2a","Tarde","ENTIRE CELL",
    "Ambulatorio / Precep. Jodson / 14:00-17:00 / type=ambulatorio",
    "Horario Verde / type=verde"))
disc_g9.append(("W7","7-3","3a","Manha","time","08:00-12:00","empty string"))
disc_g9.append(("W7","7-5","4a","Manha","time","08:00-12:00","empty string"))
disc_g9.append(("W7","7-6","4a","Tarde","ENTIRE CELL",
    "Ambulatorio / Dr. Luiz Capute / 14:00-17:00 / type=ambulatorio",
    "Consolidacao e Performance / Em Casa / 14:00-17:00 / type=casa"))
disc_g9.append(("W7","7-7","5a","Manha","time","08:00-12:00","empty string"))
disc_g9.append(("W7","7-8","5a","Tarde","ENTIRE CELL",
    "Ambulatorio / Prof. Gilvando / 14:00-17:00 / type=ambulatorio",
    "Consolidacao e Performance / Em Casa / 14:00-17:00 / type=casa"))
disc_g9.append(("W7","7-11","Sab","Tarde","presence+week",
    "(no Sab entry in PDF Week 7 - Simulado Geral belongs to Week 8 Sab for G9)",
    "Simulado Geral do Modulo / 13:00-18:00 / type=destaque (wrong week)"))

# ==== G9 WEEK 8: 13 a 18/4 ====
# PDF MANHA: 2a=HORARIO VERDE | 3a=ConsolEmCasa 08-12 | 4a=SessaoClinica Prof.Nilson 09-11:30 PSM | 5a=Ambulatorio Dr.Fabio 08-12 | 6a=Ambulatorio Profa.Aline 08-12 | Sab=SIMULADO GERAL 13-18 CAMPUS
# PDF TARDE: 2a=ConsolEmCasa 14-18 | 3a=VigEpidemiologia Prof.Sebastiao 14-17 | 4a=VigEpidemiologia Prof.Sebastiao 14-17 | 5a=Ambulatorio Dr.Sandro 14-17 CirurgiaoVascular | 6a=Hands on Profa.Aline 14-18

disc_g9.append(("W8","(missing)","2a","Tarde","presence",
    "Consolidacao e Performance - EM CASA / 14:00-18:00 / type=casa",
    "(no entry in JS)"))
disc_g9.append(("W8","(missing)","3a","Tarde","presence",
    "Vigilancia epidemiologia (RUA DO HOTEL MARA) / Prof. Sebastiao / 14:00-17:00",
    "(no entry in JS)"))
disc_g9.append(("W8","(missing)","4a","Tarde","presence",
    "Vigilancia epidemiologia (RUA DO HOTEL MARA) / Prof. Sebastiao / 14:00-17:00",
    "(no entry in JS)"))
disc_g9.append(("W8","8-5","5a","Tarde","time",
    "14:00-17:00",
    "empty string"))
disc_g9.append(("W8","(missing)","6a","Tarde","presence",
    "Hands on / Profa.Aline / 14:00-18:00 / type=normal",
    "(no entry in JS)"))

# ==== G9 WEEK 9: All match ====

# ==== G9 WEEK 10: 27/4 a 2/5 ====
# JS 10-6: sub=Dra.Rubia only, PDF also shows specialty "Cirurgia de Cabeca e pescoco"
disc_g9.append(("W10","10-6","4a","Tarde","sub specialty omitted",
    "Ambulatorio Dra. Rubia / Cirurgia de Cabeca e pescoco / 14:00-17:00",
    "sub=Dra. Rubia (specialty not included)"))

# ==== G9 WEEK 11 ====
disc_g9.append(("W11","(missing)","5a","Tarde","presence",
    "PROVA MODULO / 14:00-16:00 / CAMPUS",
    "(no Week 11 entry in JS for G9)"))

print("="*70)
print("G9 DISCREPANCY SUMMARY")
print("="*70)
for i, d in enumerate(disc_g9, 1):
    week, jid, day, turno, field, pdf_val, js_val = d
    print(f"\n[G9-{i:02d}] {week} | Day:{day} | Turno:{turno} | JS id:{jid} | Field:{field}")
    print(f"  PDF says: {pdf_val}")
    print(f"  JS says:  {js_val}")

print(f"\nTOTAL G9 DISCREPANCIES: {len(disc_g9)}")

# ============================================================
# G10 COMPARISON
# Column mapping (G10): x112=2a, x232=3a, x346=4a, x459=5a, x580=6a, x686=Sab
# ============================================================

disc_g10 = []

print()
print("="*70)
print("G10 - COMPLETE CELL-BY-CELL COMPARISON")
print("="*70)

# ==== G10 WEEK 1: 23 a 28/2 ====
# PDF MANHA: 2a=ConsolEmCasa 08-12 | 3a=ManuelaMarcati 08:30-12 | 4a=ConsolEmCasa 08-12 | 5a=ECG Emilo 08-12 Sala7211 | 6a=HORARIO VERDE | Sab=SIMULADO NACIONAL MEDCOFF 13-18 CAMPUS
# PDF TARDE: 2a=CentroSim Prof.Fabio 14-18 | 3a=HORARIO VERDE | 4a=CentroSim Prof.Gilvando 14-18 | 5a=CentroSim Profa.AnaCl 14-18 | 6a=CentroSim Prof.Gilvando 14-18
#
# JS G10 Week 1:
# 1-1: 2a Manha ConsolEmCasa 08-12 -> OK
# 1-2: 2a Tarde CentroSim Prof.Fabio 14-18 -> OK
# 1-3: 3a Manha SaudeDigital ManuelaMarcati 08:30-12 -> OK
# 1-4: 3a Tarde Horario Verde -> OK
# 1-5: 4a Manha ConsolEmCasa 08-12 -> OK
# 1-6: 4a Tarde CentroSim Prof.Gilvando 14-18 -> OK
# 1-7: 5a Manha ECG Prof.Emilo 08-12 Sala7211 -> OK
# 1-8: 5a Tarde CentroSim Profa.AnaCl 14-18
#      PDF says "Profa. Ana Claudia" (no last name Zon), JS says "Profa. Ana Claudia" -> OK (matches G10 PDF)
# 1-9: 6a Manha Horario Verde -> OK
# 1-10: 6a Tarde CentroSim Prof.Gilvando 14-18 -> OK
# 1-11: Sab SIMULADO NACIONAL MEDCOF(F) 13-18 CAMPUS -> same issue as G9
disc_g10.append(("W1","1-11","Sab","Manha","title",
    "SIMULADO NACIONAL MEDCOFF (double F)",
    "Simulado Nacional MEDCOF (single F)"))

# ==== G10 WEEK 2: 02 a 07/3 ====
# PDF MANHA: 2a=ConsolEmCasa 08-12 | 3a=ManuelaMarcati 08:30-12 | 4a=ConsolEmCasa 08-12 | 5a=ECG Emilo 08-12 Sala7211 | 6a=HORARIO VERDE
# PDF TARDE: 2a=CentroSim Prof.Fabio 14-18 | 3a=ConsolEmCasa 14-18 | 4a=CentroSim Gilvando 14-18 | 5a=CentroSim AnaCl 14-18 | 6a=CentroSim Gilvando 14-18
# JS:
# 2-4: 3a Tarde ConsolEmCasa 14-18 -> OK
# All others match -> Week 2 OK

# ==== G10 WEEK 3: 09 a 14/3 ====
# PDF MANHA: 2a=ConsolEmCasa 08-12 | 3a=ManuelaMarcati 08:30-12 | 4a=ConsolEmCasa 08-12 | 5a=ECG Emilo 08-12 Sala7211 | 6a=Trauma Prof.RossanoFiorelli Sala7209CAMPUS
# PDF TARDE: 2a=CentroSim Fabio 14-18 | 3a=ConsolEmCasa 08-12 (note: PDF says "08:00-12:00" in TARDE row!) | 4a=CentroSim Gilvando 14-18 | 5a=CentroSim AnaCl 14-18 | 6a=CentroSim Gilvando 14-18
#
# CRITICAL: The G10 PDF page1 tarde row for 3a (x=232 y=358) shows:
#   "Atividade de consolidacao / e Performance - EM CASA / 08:00 - 12:00"
# That time 08:00-12:00 appearing in the Tarde row is unusual - it seems like a PDF error
# or the time was written as-is even though it appears in the Tarde slot.
# JS 3-4: 3a Tarde ConsolEmCasa time="08:00-12:00" -> matches PDF text literally
# So JS is correct per PDF -> OK for 3-4

# ==== G10 WEEK 4: 16 a 21/3 ====
# PDF MANHA: 2a=ConsolEmCasa 08-12 | 3a=ManuelaMarcati 08:30-12 | 4a=ConsolEmCasa 08-12 | 5a=ECG Emilo 08-12 Sala7211 | 6a=ConsolEmCasa 08-12
# PDF TARDE: 2a=CentroSim Fabio 14-18 | 3a=ConsolEmCasa 08-12 (again 08:00-12:00 in tarde) | 4a=CentroSim Gilvando 14-18 | 5a=CentroSim AnaCl 14-18 | 6a=CentroSim Gilvando 14-18
#
# JS 4-4: 3a Tarde ConsolEmCasa time="08:00-12:00" -> matches PDF (same as above)
# All Week 4 OK

# ==== G10 WEEK 5: 23 a 28/3 ====
# PDF MANHA: 2a=ConsolEmCasa 08-12 | 3a=ManuelaMarcati 08:30-12 | 4a=ConsolEmCasa 08-12 | 5a=ECG Emilo 08-12 Sala7211 | 6a=ConsolEmCasa 08-12
# PDF TARDE: 2a=CentroSim Fabio 14-18 | 3a=Hands on Dr.FabioJorge 14-18 | 4a=CentroSim Gilvando 14-18 | 5a=CentroSim AnaCl 14-18 | 6a=CentroSim Gilvando 14-18
#
# JS Week 5 G10:
# 5-1: 2a Manha ConsolEmCasa 08-12 -> OK
# 5-2: 2a Tarde CentroSim Fabio 14-18 -> OK
# 5-3: 3a Manha SaudeDigital ManuelaMarcati 08:30-12 -> OK
# 5-4: 3a Tarde Hands on Dr.FabioJorge 14-18 -> OK
# 5-5: 4a Manha ConsolEmCasa 08-12 -> OK
# 5-6: 4a Tarde CentroSim Gilvando 14-18 -> OK
# 5-7: 5a Manha ECG Prof.Emilo 08-12 Sala7211 -> OK
# 5-8: 5a Tarde CentroSim AnaCl 14-18 -> OK
# 5-9: 6a Manha ConsolEmCasa 08-12 -> OK
# 5-10: 6a Tarde CentroSim Gilvando 14-18 -> OK
# Week 5 G10: All OK

# ==== G10 WEEK 6: 30/3 a 4/4 ====
# PDF MANHA: 2a=CentroCirurgico 08-13 | 3a=CentroCirurgico 08-13 | 4a=CentroCirurgico 08-13 | 5a=CentroCirurgico 08-13 | 6a=FERIADO
# PDF TARDE: 2a=HORARIO VERDE | 3a=ConsolEmCasa 14-18 | 4a=Ambulatorio Dra.Rubia CirCabecaPescoco 14-17 | 5a=ConsolEmCasa 14-18 | 6a=(blank)
#
# JS Week 6 G10:
# 6-1: 2a Manha CentroCirurgico 08-13 -> OK
# 6-2: 2a Tarde Horario Verde -> OK (PDF HORARIO VERDE at x=112 y=63)
# 6-3: 3a Manha CentroCirurgico 08-13 -> OK
# 6-4: 3a Tarde ConsolEmCasa 14-18 -> OK (PDF x=232 y=63)
# 6-5: 4a Manha CentroCirurgico 08-13 -> OK
# 6-6: 4a Tarde Ambulatorio Dra.Rubia 14-17 -> PDF also shows Dra.Rubia + specialty
disc_g10.append(("W6","6-6","4a","Tarde","sub specialty omitted",
    "Ambulatorio Dra. Rubia / Cirurgia de Cabeca e pescoco / 14:00-17:00",
    "sub=Dra. Rubia (specialty not included)"))
# 6-7: 5a Manha CentroCirurgico 08-13 -> OK
# 6-8: 5a Tarde ConsolEmCasa 14-18 -> OK (PDF x=459 y=63)
# 6-9: 6a Manha Feriado -> OK
# 6-10: 6a Tarde Horario Verde -> PDF shows nothing for 6a Tarde
disc_g10.append(("W6","6-10","6a","Tarde","presence",
    "(no entry - Feriado covers 6a all day)",
    "Horario Verde / type=verde (extra entry not in PDF)"))

# ==== G10 WEEK 7: 06 a 11/4 ====
# PDF MANHA: 2a=HORARIO VERDE | 3a=ConsolEmCasa 08-12 | 4a=Ambulatorio Dra.Cleris 08-12 | 5a=ConsolEmCasa 08-12 | 6a=HORARIO VERDE
# PDF TARDE: 2a=CentroCirurgico 13-18 | 3a=CentroCirurgico 13-18 | 4a=CentroCirurgico 13-18 | 5a=CentroCirurgico 13-18 | 6a=CentroCirurgico 13-18
#
# JS Week 7 G10:
# 7-1: 2a Manha Horario Verde -> OK
# 7-2: 2a Tarde Horario Verde -> WRONG (PDF=CentroCirurgico 13-18)
disc_g10.append(("W7","7-2","2a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Horario Verde / type=verde"))
# 7-3: 3a Manha ConsolEmCasa time="" -> PDF has 08:00-12:00
disc_g10.append(("W7","7-3","3a","Manha","time","08:00-12:00","empty string"))
# 7-4: 4a Manha Ambulatorio Dra.Cleris time="" -> PDF has 08:00-12:00
disc_g10.append(("W7","7-4","4a","Manha","time","08:00-12:00","empty string (but PDF shows 08:00-12:00)"))
# NOTE: The Ambulatorio Dra.Cleris cell: PDF says "08:00-12:00", JS has time=""
# 7-5: 4a Tarde ConsolEmCasa 08-12 -> WRONG (PDF=CentroCirurgico 13-18)
disc_g10.append(("W7","7-5","4a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Consolidacao e Performance / Em Casa / 08:00-12:00 / type=casa"))
# 7-6: 5a Manha ConsolEmCasa time="" -> PDF has 08:00-12:00
disc_g10.append(("W7","7-6","5a","Manha","time","08:00-12:00","empty string"))
# 7-7: 5a Tarde ConsolEmCasa 08-12 -> WRONG (PDF=CentroCirurgico 13-18)
disc_g10.append(("W7","7-7","5a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Consolidacao e Performance / Em Casa / 08:00-12:00 / type=casa"))
# 7-8: 6a Manha Horario Verde -> OK
# 7-9: 6a Tarde Horario Verde -> WRONG (PDF=CentroCirurgico 13-18)
disc_g10.append(("W7","7-9","6a","Tarde","ENTIRE CELL",
    "Centro Cirurgico / 13:00-18:00 / type=normal",
    "Horario Verde / type=verde"))
# 7-10: Sab Tarde SimuladoGeral 13-18 -> NOT IN PDF week 7 (G10 has no Sab entry for week 7)
# G10 Simulado Geral is in Week 8 Sab, not Week 7
disc_g10.append(("W7","7-10","Sab","Tarde","presence+week",
    "(no Sab entry in PDF Week 7 for G10 - Simulado Geral belongs to Week 8)",
    "Simulado Geral do Modulo / 13:00-18:00 / type=destaque (wrong week)"))

# ==== G10 WEEK 8: 13 a 18/4 ====
# PDF MANHA: 2a=HORARIO VERDE | 3a=Ambulatorio Dr.Humberto 08-12 | 4a=ConsolEmCasa 08-12 | 5a=ConsolEmCasa 08-12 | 6a=HORARIO VERDE | Sab=SIMULADO GERAL 13-18 CAMPUS
# PDF TARDE: 2a=Ambulatorio Precep.Jodson 14-17 | 3a=ConsolEmCasa 14-18 | 4a=Ambulatorio Dr.LuizCapute 14-17 | 5a=Ambulatorio Prof.Gilvando 14-17 | 6a=Ambulatorio Precep.Jodson 14-17
#
# JS Week 8 G10:
# 8-1: 2a Manha Horario Verde -> OK
# 8-2: 2a Tarde Ambulatorio Precep.Jodson 14-17 -> OK (PDF x=112 y=231)
# 8-3: 3a Manha Ambulatorio Dr.Humberto time="" -> PDF has 08:00-12:00
disc_g10.append(("W8","8-3","3a","Manha","time","08:00-12:00","empty string"))
# 8-4: 3a Tarde ConsolEmCasa 14-18 -> OK (PDF x=232 y=231)
# 8-5: 4a Manha ConsolEmCasa time="" -> PDF has 08:00-12:00
disc_g10.append(("W8","8-5","4a","Manha","time","08:00-12:00","empty string"))
# 8-6: 4a Tarde ConsolEmCasa 14-17 -> WRONG (PDF=Ambulatorio Dr.Luiz Capute 14-17)
disc_g10.append(("W8","8-6","4a","Tarde","ENTIRE CELL",
    "Ambulatorio / Dr. Luiz Capute / 14:00-17:00 / type=ambulatorio",
    "Consolidacao e Performance / Em Casa / 14:00-17:00 / type=casa"))
# 8-7: 5a Manha ConsolEmCasa time="" -> PDF has 08:00-12:00
disc_g10.append(("W8","8-7","5a","Manha","time","08:00-12:00","empty string"))
# 8-8: 5a Tarde ConsolEmCasa 14-17 -> WRONG (PDF=Ambulatorio Prof.Gilvando 14-17)
disc_g10.append(("W8","8-8","5a","Tarde","ENTIRE CELL",
    "Ambulatorio / Prof. Gilvando / 14:00-17:00 / type=ambulatorio",
    "Consolidacao e Performance / Em Casa / 14:00-17:00 / type=casa"))
# 8-9: 6a Manha Horario Verde -> OK
# 8-10: 6a Tarde Ambulatorio Precep.Jodson 14-17 -> OK (PDF x=580 y=231)
# 8-11: Sab Manha SimuladoGeral 13-18 -> OK (PDF x=686 y=197)

# ==== G10 WEEK 9: 20 a 25/4 ====
# PDF MANHA: 2a=HORARIO VERDE | 3a=FERIADO | 4a=SessaoClinica Prof.Nilson 09-11:30 PSM | 5a=FERIADO | 6a=Ambulatorio Profa.Aline 08-12
# PDF TARDE: 2a=ConsolEmCasa 14-18 | 3a=(nothing/Feriado) | 4a=VigEpidemiologia Prof.Sebastiao 14-17 | 5a=(nothing/Feriado) | 6a=Hands on Profa.Aline 14-18
#
# JS Week 9 G10:
# 9-1: 2a Manha Horario Verde -> OK
# 9-2: 2a Tarde ConsolEmCasa 14-18 -> OK (PDF x=112 y=311)
# 9-3: 3a Manha Feriado -> OK
# 9-4: 4a Manha SessaoClinica Prof.Nilson 09-11:30 -> OK
#      JS time="09:00-11:30", PDF shows "09:00 - 11:30 PSM" -> OK
# 9-5: 4a Tarde VigEpidemiologia Prof.Sebastiao 14-17 ->
#      PDF text: "Vigilancia epidemiologia (RUA DO HOTEL MARA) / Prof. Sebastiao / 14:00-17:00"
#      JS: title="Vigilancia Epidemiologica", sub="Prof. Sebastiao", time="14:00-17:00", type=normal -> OK
# 9-6: 5a Manha Feriado -> OK
# 9-7: 6a Manha Ambulatorio Profa.Aline 08-12 -> OK
# 9-8: 6a Tarde Hands on Profa.Aline 14-18 -> OK (PDF x=580 y=311)
# Week 9 G10 looks OK!

# ==== G10 WEEK 10: 27/4 a 2/5 ====
# PDF MANHA: 2a=ENFERMARIA 08-12 | 3a=ENFERMARIA 08-12 | 4a=ENFERMARIA 08-12 | 5a=ENFERMARIA 08-12 | 6a=FERIADO
# PDF TARDE: 2a=HORARIO VERDE | 3a=ConsolEmCasa 14-18 | 4a=ConsolEmCasa 14-18 | 5a=ConsolEmCasa 14-18 | 6a=(blank)
#
# JS Week 10 G10:
# 10-1: 2a Manha ENFERMARIA 08-12 -> OK
# 10-2: 2a Tarde Horario Verde -> OK (PDF HORARIO VERDE x=112 y=389)
# 10-3: 3a Manha ENFERMARIA 08-12 -> OK
# 10-4: 3a Tarde ConsolEmCasa 14-18 -> OK (PDF x=232 y=389)
# 10-5: 4a Manha ENFERMARIA 08-12 -> OK
# 10-6: 4a Tarde ConsolEmCasa 14-18 -> OK (PDF x=346 y=389)
# 10-7: 5a Manha ENFERMARIA 08-12 -> OK
# 10-8: 5a Tarde ConsolEmCasa 14-18 -> OK (PDF x=459 y=389)
# 10-9: 6a Manha Feriado -> OK
# Week 10 G10: All OK!

# ==== G10 WEEK 11 ====
# PDF: PROVA MODULO 14-16 CAMPUS at 5a column (x=459)
# JS has no Week 11 entry for G10
disc_g10.append(("W11","(missing)","5a","Tarde","presence",
    "PROVA MODULO / 14:00-16:00 / CAMPUS",
    "(no Week 11 entry in JS for G10)"))

print()
print("="*70)
print("G10 DISCREPANCY SUMMARY")
print("="*70)
for i, d in enumerate(disc_g10, 1):
    week, jid, day, turno, field, pdf_val, js_val = d
    print(f"\n[G10-{i:02d}] {week} | Day:{day} | Turno:{turno} | JS id:{jid} | Field:{field}")
    print(f"  PDF says: {pdf_val}")
    print(f"  JS says:  {js_val}")

print(f"\nTOTAL G10 DISCREPANCIES: {len(disc_g10)}")
print(f"\nGRAND TOTAL: G9={len(disc_g9)} + G10={len(disc_g10)} = {len(disc_g9)+len(disc_g10)} discrepancies")
