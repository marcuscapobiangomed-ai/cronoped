import { DAY_JS } from "../constants";

export function validaCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}

export function formatCPF(v) {
  return v.replace(/\D/g,"").slice(0,11)
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d{1,2})$/,"$1-$2");
}

export function cleanCPF(v)   { return v.replace(/\D/g,""); }
export function fakeMail(cpf) { return `${cleanCPF(cpf)}@internato.app`; }

export function getTodayInfo(weekDates) {
  if (!weekDates) return {weekNum:null, dayKey:null};
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wd    = now.getDay();
  const weekNum = weekDates.find(w => today >= w.start && today <= w.end)?.num ?? null;
  const dayKey  = Object.entries(DAY_JS).find(([,v]) => v === wd)?.[0] ?? null;
  return {weekNum, dayKey};
}

export function getUpcomingAlerts(keyEvents) {
  if (!keyEvents) return [];
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return keyEvents
    .filter(e => { const d = Math.ceil((e.date - today) / 86400000); return d >= 0 && d <= 5; })
    .map(e    => ({...e, diff: Math.ceil((e.date - today) / 86400000)}));
}

export function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx    = canvas.getContext("2d");
  const colors = ["#22C55E","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899"];
  const parts  = Array.from({length:150}, () => ({
    x:Math.random()*canvas.width, y:-10-Math.random()*100,
    r:4+Math.random()*6, d:2+Math.random()*3,
    color:colors[Math.floor(Math.random()*colors.length)],
    tilt:0, tiltAngle:0, tiltSpeed:0.05+Math.random()*0.1,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      const opacity = frame < 126 ? 1 : 1-(frame-126)/54;
      ctx.beginPath(); ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color + Math.round(opacity*255).toString(16).padStart(2,"0");
      ctx.moveTo(p.x+p.tilt+p.r/4, p.y); ctx.lineTo(p.x+p.tilt, p.y+p.tilt+p.r/4);
      ctx.stroke();
      p.y += p.d+(frame*0.02); p.tiltAngle += p.tiltSpeed; p.tilt = Math.sin(p.tiltAngle)*12;
    });
    frame++; if (frame < 180) requestAnimationFrame(draw); else canvas.remove();
  }
  draw();
}
