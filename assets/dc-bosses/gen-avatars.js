#!/usr/bin/env node
/* Genera 25 SVG avatar per i villain del Dominio dei Draghi */
const fs = require('fs');
const path = require('path');
const OUT = __dirname;

const PAL = {
  comune:      { bg1:'#0c1e08',bg2:'#040a02',glow:'#3aad20',p1:'#2d6e15',p2:'#4a9a30',acc:'#6aee35',dark:'#142a08',eye:'#80ff40',text:'#5adf25', label:'COMUNE' },
  non_comune:  { bg1:'#1a1410',bg2:'#0a0804',glow:'#c0a870',p1:'#6a4e30',p2:'#9a7a50',acc:'#d0b880',dark:'#3a2010',eye:'#f0d0a0',text:'#d0b880', label:'NON COMUNE' },
  raro:        { bg1:'#080e20',bg2:'#030814',glow:'#3070d0',p1:'#1a3878',p2:'#2858a8',acc:'#50a0e8',dark:'#081530',eye:'#a0d8ff',text:'#60b8ff', label:'RARO' },
  epico:       { bg1:'#1c0808',bg2:'#0a0303',glow:'#d03018',p1:'#881a08',p2:'#c02818',acc:'#ff5828',dark:'#480a04',eye:'#ff9060',text:'#ff6030', label:'EPICO' },
  leggendario: { bg1:'#0e0820',bg2:'#060412',glow:'#9040d8',p1:'#4420a0',p2:'#6840c8',acc:'#c070ff',dark:'#200848',eye:'#e0a8ff',text:'#c070ff', label:'LEGGENDARIO' },
};

function svgWrap(name, tier, bodyFn, w=200, h=260) {
  const p = PAL[tier];
  const gid = `g${Math.random().toString(36).slice(2,7)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
  <radialGradient id="bg${gid}" cx="50%" cy="55%" r="65%">
    <stop offset="0%" stop-color="${p.bg1}"/>
    <stop offset="100%" stop-color="${p.bg2}"/>
  </radialGradient>
  <radialGradient id="gl${gid}" cx="50%" cy="40%" r="55%">
    <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
  </radialGradient>
  <filter id="gf${gid}"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
  <filter id="ey${gid}"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg${gid})" rx="10"/>
<ellipse cx="100" cy="120" rx="90" ry="90" fill="url(#gl${gid})"/>
${bodyFn(p, gid)}
<rect x="12" y="${h-22}" width="${w-24}" height="18" rx="4" fill="${p.dark}" opacity="0.9"/>
<text x="${w/2}" y="${h-9}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="${p.text}" font-weight="bold" letter-spacing="0.8">${name.toUpperCase()}</text>
<text x="${w/2}" y="${h-23}" text-anchor="middle" font-family="Georgia,serif" font-size="7" fill="${p.acc}" opacity="0.7">${p.label}</text>
</svg>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function eyes(p, gid, x1, y1, x2, y2, rx=8, ry=6) {
  return `
  <ellipse cx="${x1}" cy="${y1}" rx="${rx+2}" ry="${ry+2}" fill="${p.dark}" filter="url(#ey${gid})"/>
  <ellipse cx="${x2}" cy="${y2}" rx="${rx+2}" ry="${ry+2}" fill="${p.dark}" filter="url(#ey${gid})"/>
  <ellipse cx="${x1}" cy="${y1}" rx="${rx}" ry="${ry}" fill="${p.p2}"/>
  <ellipse cx="${x2}" cy="${y2}" rx="${rx}" ry="${ry}" fill="${p.p2}"/>
  <ellipse cx="${x1}" cy="${y1}" rx="${rx-3}" ry="${ry-2}" fill="${p.eye}"/>
  <ellipse cx="${x2}" cy="${y2}" rx="${rx-3}" ry="${ry-2}" fill="${p.eye}"/>
  <ellipse cx="${x1+1}" cy="${y1-1}" rx="2" ry="1.5" fill="white" opacity="0.6"/>
  <ellipse cx="${x2+1}" cy="${y2-1}" rx="2" ry="1.5" fill="white" opacity="0.6"/>`;
}

function singleEye(p, gid, x, y, rx=14, ry=10) {
  return `
  <ellipse cx="${x}" cy="${y}" rx="${rx+4}" ry="${ry+4}" fill="${p.dark}" filter="url(#ey${gid})"/>
  <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${p.p1}"/>
  <ellipse cx="${x}" cy="${y}" rx="${rx-3}" ry="${ry-3}" fill="${p.p2}"/>
  <ellipse cx="${x}" cy="${y}" rx="${rx-7}" ry="${ry-5}" fill="${p.eye}"/>
  <ellipse cx="${x}" cy="${y}" rx="${rx-10}" ry="${ry-7}" fill="${p.dark}"/>
  <ellipse cx="${x+2}" cy="${y-2}" rx="3" ry="2" fill="white" opacity="0.5"/>`;
}

function horns(p, topX, topY, spread=22, h=28) {
  return `
  <path d="M${topX-spread} ${topY} Q${topX-spread-8} ${topY-h} ${topX-spread+5} ${topY-h+8}" stroke="${p.p2}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M${topX+spread} ${topY} Q${topX+spread+8} ${topY-h} ${topX+spread-5} ${topY-h+8}" stroke="${p.p2}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
}

function crown(p, cx, cy, r=22) {
  return `
  <path d="M${cx-r} ${cy} L${cx-r+4} ${cy-12} L${cx-r/2} ${cy-6} L${cx} ${cy-18} L${cx+r/2} ${cy-6} L${cx+r-4} ${cy-12} L${cx+r} ${cy} Z" fill="${p.p2}" stroke="${p.acc}" stroke-width="1.2"/>
  <circle cx="${cx}" cy="${cy-18}" r="4" fill="${p.eye}"/>
  <circle cx="${cx-r+4}" cy="${cy-12}" r="3" fill="${p.acc}"/>
  <circle cx="${cx+r-4}" cy="${cy-12}" r="3" fill="${p.acc}"/>`;
}

function spikes(p, cx, topY, n=5, spread=40, h=24) {
  const step = spread*2/(n-1);
  let s='';
  for(let i=0;i<n;i++){
    const x=cx-spread+i*step;
    const hh=h-(Math.abs(i-(n-1)/2))*(h/(n));
    s+=`<polygon points="${x},${topY} ${x-6},${topY+hh} ${x+6},${topY+hh}" fill="${p.p2}"/>`;
  }
  return s;
}

function wings(p, cx, cy, spread=60, h=50) {
  return `
  <path d="M${cx} ${cy} Q${cx-spread} ${cy-h/2} ${cx-spread-10} ${cy-h} Q${cx-spread+10} ${cy-h/2} ${cx-spread/3} ${cy-10}" fill="${p.p1}" opacity="0.85"/>
  <path d="M${cx} ${cy} Q${cx+spread} ${cy-h/2} ${cx+spread+10} ${cy-h} Q${cx+spread-10} ${cy-h/2} ${cx+spread/3} ${cy-10}" fill="${p.p1}" opacity="0.85"/>
  <path d="M${cx} ${cy} Q${cx-spread*0.6} ${cy-h*0.4} ${cx-spread-10} ${cy-h}" stroke="${p.acc}" stroke-width="1.5" fill="none" opacity="0.7"/>
  <path d="M${cx} ${cy} Q${cx+spread*0.6} ${cy-h*0.4} ${cx+spread+10} ${cy-h}" stroke="${p.acc}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
}

function tentacles(p, cx, baseY, n=4) {
  let s='';
  const positions=[-45,-15,15,45].slice(0,n);
  positions.forEach((off,i)=>{
    const side=off<0?-1:1;
    const curl=side*(15+i*5);
    s+=`<path d="M${cx+off} ${baseY} Q${cx+off+curl} ${baseY+25} ${cx+off+curl*1.5} ${baseY+50}" stroke="${p.p2}" stroke-width="${6-i}" fill="none" stroke-linecap="round"/>`;
  });
  return s;
}

function flames(p, cx, topY, spread=35, n=5) {
  let s='';
  for(let i=0;i<n;i++){
    const x=cx-spread+i*(spread*2/(n-1));
    const h=20+Math.sin(i*1.3)*15;
    s+=`<path d="M${x} ${topY+5} Q${x-8} ${topY-h/2} ${x} ${topY-h} Q${x+8} ${topY-h/2} ${x+4} ${topY+5}" fill="${p.acc}" opacity="${0.6+i*0.08}"/>`;
  }
  return s;
}

function crystalHead(p, cx, cy, r=38) {
  return `
  <polygon points="${cx},${cy-r} ${cx+r*0.7},${cy-r*0.3} ${cx+r*0.8},${cy+r*0.4} ${cx},${cy+r*0.8} ${cx-r*0.8},${cy+r*0.4} ${cx-r*0.7},${cy-r*0.3}" fill="${p.p1}" stroke="${p.acc}" stroke-width="1.5"/>
  <polygon points="${cx},${cy-r} ${cx+r*0.35},${cy-r*0.5} ${cx},${cy-r*0.1}" fill="${p.p2}" opacity="0.6"/>
  <polygon points="${cx},${cy+r*0.8} ${cx+r*0.4},${cy+r*0.2} ${cx},${cy+r*0.4}" fill="${p.acc}" opacity="0.2"/>`;
}

function vortexBody(p, cx, cy, r=38) {
  let s='';
  for(let i=0;i<4;i++){
    const ri=r-(i*6);
    const ro=(i*25);
    s+=`<ellipse cx="${cx}" cy="${cy}" rx="${ri}" ry="${ri*0.45}" fill="none" stroke="${i%2?p.p2:p.acc}" stroke-width="${4-i}" transform="rotate(${ro} ${cx} ${cy})" opacity="${0.8-i*0.1}"/>`;
  }
  return s;
}

// ══════════════════════════════════════════════════════════════
// 25 VILLAIN BODIES
// ══════════════════════════════════════════════════════════════

const VILLAINS = [

// ── COMUNI ────────────────────────────────────────────────────
{ id:'dcb_bramble', name:'Bramble il Boscaiolo', tier:'comune',
  body:(p,g)=>`
  <!-- Body: moss-wrapped trunk -->
  <ellipse cx="100" cy="195" rx="36" ry="50" fill="${p.p1}"/>
  <ellipse cx="100" cy="175" rx="30" ry="32" fill="${p.p2}"/>
  <!-- Vine details -->
  <path d="M64 180 Q50 185 46 200" stroke="${p.acc}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M136 180 Q150 185 154 200" stroke="${p.acc}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="50" cy="198" rx="8" ry="5" fill="${p.acc}" opacity="0.7" transform="rotate(-20 50 198)"/>
  <ellipse cx="150" cy="196" rx="8" ry="5" fill="${p.acc}" opacity="0.7" transform="rotate(20 150 196)"/>
  <!-- Arms -->
  <path d="M64 180 Q42 175 32 192" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M136 180 Q158 175 168 192" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <!-- Head -->
  <ellipse cx="100" cy="125" rx="40" ry="38" fill="${p.p1}"/>
  <!-- Branch crown -->
  <path d="M70 108 Q62 90 74 78" stroke="${p.dark}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M130 108 Q138 90 126 78" stroke="${p.dark}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M100 90 Q100 72 100 64" stroke="${p.dark}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <ellipse cx="72" cy="76" rx="10" ry="6" fill="${p.acc}" transform="rotate(-30 72 76)"/>
  <ellipse cx="128" cy="76" rx="10" ry="6" fill="${p.acc}" transform="rotate(30 128 76)"/>
  <ellipse cx="100" cy="62" rx="11" ry="6" fill="${p.acc}" transform="rotate(5 100 62)"/>
  ${eyes(p,g, 87,122, 113,122, 8,6)}
  <path d="M86 138 Q100 147 114 138" stroke="${p.dark}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },

{ id:'dcb_groviglio', name:'Groviglio il Rampicante', tier:'comune',
  body:(p,g)=>`
  <!-- Spiky thorn body -->
  ${spikes(p, 100, 145, 7, 48, 30)}
  <ellipse cx="100" cy="190" rx="40" ry="48" fill="${p.p1}"/>
  <ellipse cx="100" cy="175" rx="32" ry="30" fill="${p.p2}"/>
  <!-- Thorn arms -->
  <path d="M60 178 Q38 172 28 188" stroke="${p.p1}" stroke-width="13" fill="none" stroke-linecap="round"/>
  <path d="M140 178 Q162 172 172 188" stroke="${p.p1}" stroke-width="13" fill="none" stroke-linecap="round"/>
  ${spikes(p, 32, 185, 3, 10, 15)}
  ${spikes(p, 168, 185, 3, 10, 15)}
  <!-- Head -->
  <ellipse cx="100" cy="122" rx="38" ry="36" fill="${p.p1}"/>
  ${spikes(p, 100, 92, 5, 34, 22)}
  ${eyes(p,g, 87,120, 113,120, 8,6)}
  <path d="M85 137 Q100 146 115 137" stroke="${p.dark}" stroke-width="2.5" fill="none"/>
  <path d="M88 138 L90 144 L93 138" stroke="${p.acc}" stroke-width="1.5" fill="none"/>
  <path d="M107 138 L110 144 L112 138" stroke="${p.acc}" stroke-width="1.5" fill="none"/>` },

{ id:'dcb_fanghiglia', name:'Fanghiglia la Paludosa', tier:'comune',
  body:(p,g)=>`
  <!-- Amorphous swamp blob body -->
  <path d="M55 240 Q40 200 48 170 Q58 148 100 145 Q142 148 152 170 Q160 200 145 240Z" fill="${p.p1}"/>
  <path d="M60 235 Q48 195 55 168 Q65 150 100 148 Q135 150 145 168 Q152 195 140 235" fill="${p.p2}" opacity="0.6"/>
  <!-- Bubbles -->
  <circle cx="75" cy="210" r="8" fill="${p.acc}" opacity="0.3"/>
  <circle cx="125" cy="205" r="6" fill="${p.acc}" opacity="0.3"/>
  <circle cx="90" cy="225" r="5" fill="${p.acc}" opacity="0.25"/>
  <!-- Drips -->
  <path d="M70 240 Q68 252 70 258" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M130 240 Q132 250 130 256" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- Head - blob -->
  <ellipse cx="100" cy="118" rx="44" ry="40" fill="${p.p1}"/>
  <ellipse cx="100" cy="114" rx="36" ry="32" fill="${p.p2}" opacity="0.5"/>
  <!-- Mushroom cap top -->
  <path d="M56 108 Q70 80 100 78 Q130 80 144 108Z" fill="${p.dark}"/>
  <path d="M62 106 Q75 84 100 82 Q125 84 138 106" fill="${p.p1}" opacity="0.7"/>
  <circle cx="78" cy="92" r="5" fill="${p.acc}" opacity="0.6"/>
  <circle cx="100" cy="88" r="4" fill="${p.acc}" opacity="0.6"/>
  <circle cx="122" cy="92" r="5" fill="${p.acc}" opacity="0.6"/>
  ${eyes(p,g, 88,118, 112,118, 9,7)}
  <path d="M84 134 Q100 144 116 134" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_brullo', name:'Brullo il Rinsecchito', tier:'comune',
  body:(p,g)=>`
  <!-- Dead tree skeleton body -->
  <rect x="88" y="158" width="24" height="80" rx="6" fill="${p.dark}"/>
  <!-- Gnarled branches as arms -->
  <path d="M88 175 Q65 168 50 178 Q38 185 42 195" stroke="${p.dark}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M112 175 Q135 168 150 178 Q162 185 158 195" stroke="${p.dark}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M42 195 Q35 202 30 195" stroke="${p.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M42 195 Q38 205 34 210" stroke="${p.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M158 195 Q165 202 170 195" stroke="${p.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M158 195 Q162 205 166 210" stroke="${p.dark}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- Few dead leaves -->
  <ellipse cx="36" cy="193" rx="8" ry="4" fill="${p.p1}" opacity="0.5" transform="rotate(-25 36 193)"/>
  <ellipse cx="164" cy="193" rx="8" ry="4" fill="${p.p1}" opacity="0.5" transform="rotate(25 164 193)"/>
  <!-- Head skull-like -->
  <ellipse cx="100" cy="122" rx="38" ry="36" fill="${p.p1}"/>
  <!-- Hollow eye sockets (skull) -->
  <ellipse cx="86" cy="120" rx="12" ry="10" fill="${p.dark}"/>
  <ellipse cx="114" cy="120" rx="12" ry="10" fill="${p.dark}"/>
  ${eyes(p,g, 86,120, 114,120, 7,5)}
  <!-- Cracked surface lines -->
  <path d="M100 95 Q104 108 100 120" stroke="${p.dark}" stroke-width="1.5" fill="none"/>
  <path d="M82 100 Q88 112 84 124" stroke="${p.dark}" stroke-width="1" fill="none"/>
  <!-- Rictus mouth -->
  <path d="M80 138 L85 142 L91 136 L97 142 L100 136 L103 142 L109 136 L115 142 L120 138" stroke="${p.acc}" stroke-width="2" fill="none" stroke-linecap="round"/>` },

{ id:'dcb_siepe', name:'Siepe la Campionessa', tier:'comune',
  body:(p,g)=>`
  <!-- Stout armored nature guardian -->
  <ellipse cx="100" cy="195" rx="44" ry="52" fill="${p.p1}"/>
  <!-- Bark plate chest -->
  <path d="M56 178 Q100 168 144 178 L146 215 Q100 228 54 215Z" fill="${p.p2}"/>
  <path d="M70 188 Q100 182 130 188" stroke="${p.dark}" stroke-width="2" fill="none"/>
  <path d="M68 200 Q100 194 132 200" stroke="${p.dark}" stroke-width="2" fill="none"/>
  <!-- Center emblem: leaf -->
  <path d="M100 185 Q114 192 100 202 Q86 192 100 185Z" fill="${p.acc}"/>
  <!-- Thick arms -->
  <path d="M56 182 Q36 185 28 202" stroke="${p.p1}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M144 182 Q164 185 172 202" stroke="${p.p1}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <!-- Vine wrap arms -->
  <path d="M48 188 Q40 196 34 204" stroke="${p.acc}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M152 188 Q160 196 166 204" stroke="${p.acc}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Head wider, authoritative -->
  <ellipse cx="100" cy="120" rx="42" ry="40" fill="${p.p1}"/>
  <!-- Leaf crown -->
  ${crown(p, 100, 97, 28)}
  <ellipse cx="78" cy="91" rx="12" ry="7" fill="${p.acc}" transform="rotate(-25 78 91)" opacity="0.85"/>
  <ellipse cx="122" cy="91" rx="12" ry="7" fill="${p.acc}" transform="rotate(25 122 91)" opacity="0.85"/>
  <ellipse cx="100" cy="85" rx="13" ry="7" fill="${p.acc}" transform="rotate(5 100 85)" opacity="0.85"/>
  ${eyes(p,g, 86,118, 114,118, 9,7)}
  <!-- Stern mouth -->
  <path d="M84 136 Q100 140 116 136" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

// ── NON COMUNI ────────────────────────────────────────────────
{ id:'dcb_crepaccio', name:"Crepaccio l'Eroso", tier:'non_comune',
  body:(p,g)=>`
  <!-- Cracked stone body -->
  <ellipse cx="100" cy="195" rx="42" ry="52" fill="${p.p1}"/>
  <!-- Crack patterns -->
  <path d="M100 150 L95 170 L88 185 L92 210 L85 235" stroke="${p.dark}" stroke-width="2.5" fill="none"/>
  <path d="M95 168 L80 175 L72 188" stroke="${p.dark}" stroke-width="2" fill="none"/>
  <path d="M90 200 L78 212 L70 228" stroke="${p.dark}" stroke-width="2" fill="none"/>
  <path d="M105 172 L118 180 L128 196" stroke="${p.dark}" stroke-width="2" fill="none"/>
  <!-- Rubble at feet -->
  <ellipse cx="72" cy="244" rx="14" ry="8" fill="${p.p1}" opacity="0.7"/>
  <ellipse cx="128" cy="248" rx="10" ry="6" fill="${p.p1}" opacity="0.7"/>
  <!-- Arms -->
  <path d="M58 182 Q36 178 28 196" stroke="${p.p1}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M142 182 Q164 178 172 196" stroke="${p.p1}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M36 190 L28 196 L22 205 L26 212" stroke="${p.p1}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M164 190 L172 196 L178 205 L174 212" stroke="${p.p1}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <!-- Head: angular cracked stone -->
  <rect x="62" y="90" width="76" height="72" rx="8" fill="${p.p1}"/>
  <path d="M78 90 L100 78 L122 90" fill="${p.p2}"/>
  <!-- Face cracks -->
  <path d="M100 90 L96 108 L88 120 L92 138" stroke="${p.dark}" stroke-width="2" fill="none"/>
  <path d="M96 115 L82 122" stroke="${p.dark}" stroke-width="1.5" fill="none"/>
  ${eyes(p,g, 85,118, 115,118, 9,7)}
  <path d="M82 138 Q100 148 118 138" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_ferrus', name:"Ferrus l'Incudine", tier:'non_comune',
  body:(p,g)=>`
  <!-- Iron knight body -->
  <rect x="58" y="158" width="84" height="82" rx="8" fill="${p.p1}"/>
  <!-- Chest plate -->
  <path d="M62 162 Q100 154 138 162 L140 198 Q100 208 60 198Z" fill="${p.p2}"/>
  <polygon points="100,178 110,190 100,202 90,190" fill="${p.p1}" stroke="${p.acc}" stroke-width="1.5"/>
  <circle cx="78" cy="170" r="4" fill="${p.acc}"/>
  <circle cx="78" cy="170" r="2" fill="${p.p1}"/>
  <circle cx="122" cy="170" r="4" fill="${p.acc}"/>
  <circle cx="122" cy="170" r="2" fill="${p.p1}"/>
  <!-- Pauldrons -->
  <ellipse cx="58" cy="165" rx="20" ry="15" fill="${p.p2}" transform="rotate(-12 58 165)"/>
  <ellipse cx="142" cy="165" rx="20" ry="15" fill="${p.p2}" transform="rotate(12 142 165)"/>
  <!-- Arms -->
  <path d="M58 168 Q36 175 26 194" stroke="${p.p1}" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M142 168 Q164 175 174 194" stroke="${p.p1}" stroke-width="18" fill="none" stroke-linecap="round"/>
  <!-- Fists with knuckles -->
  <rect x="18" y="190" width="22" height="18" rx="5" fill="${p.p2}"/>
  <polygon points="22,190 24,181 26,190" fill="${p.acc}"/>
  <polygon points="28,188 30,179 32,188" fill="${p.acc}"/>
  <polygon points="34,188 36,179 38,188" fill="${p.acc}"/>
  <rect x="160" y="190" width="22" height="18" rx="5" fill="${p.p2}"/>
  <polygon points="162,190 164,181 166,190" fill="${p.acc}"/>
  <polygon points="168,188 170,179 172,188" fill="${p.acc}"/>
  <polygon points="174,188 176,179 178,188" fill="${p.acc}"/>
  <!-- Head: full helm -->
  <ellipse cx="100" cy="120" rx="42" ry="40" fill="${p.p1}"/>
  <path d="M76 90 Q100 78 124 90" fill="${p.p2}" stroke="${p.acc}" stroke-width="1"/>
  <ellipse cx="100" cy="85" rx="8" ry="7" fill="${p.eye}"/>
  <!-- Visor slot -->
  <rect x="68" y="108" width="64" height="30" rx="6" fill="${p.dark}"/>
  <rect x="72" y="114" width="22" height="8" rx="4" fill="${p.p1}" opacity="0.4"/>
  <rect x="106" y="114" width="22" height="8" rx="4" fill="${p.p1}" opacity="0.4"/>
  ${eyes(p,g, 83,118, 117,118, 9,4)}
  <!-- Chin guard -->
  <rect x="80" y="136" width="40" height="10" rx="5" fill="${p.p2}"/>` },

{ id:'dcb_stalatto', name:'Stalatto il Pungente', tier:'non_comune',
  body:(p,g)=>`
  <!-- Stalactite creature - pointed downward shapes -->
  <ellipse cx="100" cy="188" rx="38" ry="44" fill="${p.p1}"/>
  <!-- Stalactite spikes hanging down from body -->
  <polygon points="80,230 75,258 85,230" fill="${p.p2}"/>
  <polygon points="100,235 95,262 105,262 100,235" fill="${p.p2}"/>
  <polygon points="120,230 115,258 125,230" fill="${p.p2}"/>
  <polygon points="65,220 60,242 70,220" fill="${p.acc}" opacity="0.7"/>
  <polygon points="135,222 130,244 140,222" fill="${p.acc}" opacity="0.7"/>
  <!-- Arms with spike formations -->
  <path d="M62 182 Q42 178 32 195" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M138 182 Q158 178 168 195" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <polygon points="28,195 24,215 32,195" fill="${p.p2}"/>
  <polygon points="168,195 164,215 172,195" fill="${p.p2}"/>
  <!-- Head: pointed crystal formation -->
  <ellipse cx="100" cy="122" rx="40" ry="38" fill="${p.p1}"/>
  <!-- Top stalactites pointing up -->
  <polygon points="100,84 95,60 105,60 100,84" fill="${p.p2}"/>
  <polygon points="82,88 77,68 87,68 82,88" fill="${p.p2}" opacity="0.85"/>
  <polygon points="118,88 113,68 123,68 118,88" fill="${p.p2}" opacity="0.85"/>
  <polygon points="65,100 62,84 68,84 65,100" fill="${p.acc}" opacity="0.7"/>
  <polygon points="135,100 132,84 138,84 135,100" fill="${p.acc}" opacity="0.7"/>
  ${eyes(p,g, 86,120, 114,120, 9,7)}
  <path d="M84 138 Q100 150 116 138" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_terracotta', name:'Terracotta la Guardia', tier:'non_comune',
  body:(p,g)=>`
  <!-- Clay golem - round, solid -->
  <ellipse cx="100" cy="198" rx="46" ry="50" fill="${p.p1}"/>
  <!-- Clay layer lines (formation marks) -->
  <path d="M58 185 Q100 180 142 185" stroke="${p.p2}" stroke-width="2" fill="none" opacity="0.7"/>
  <path d="M56 198 Q100 193 144 198" stroke="${p.p2}" stroke-width="2" fill="none" opacity="0.7"/>
  <path d="M58 212 Q100 207 142 212" stroke="${p.p2}" stroke-width="2" fill="none" opacity="0.7"/>
  <!-- Rune emblem on chest -->
  <circle cx="100" cy="192" r="18" fill="${p.dark}" opacity="0.5"/>
  <path d="M100 178 L100 206 M88 186 L112 186 M90 198 L110 198" stroke="${p.eye}" stroke-width="2" fill="none"/>
  <!-- Round arms -->
  <circle cx="50" cy="186" r="20" fill="${p.p1}"/>
  <circle cx="150" cy="186" r="20" fill="${p.p1}"/>
  <circle cx="34" cy="202" r="16" fill="${p.p2}"/>
  <circle cx="166" cy="202" r="16" fill="${p.p2}"/>
  <!-- Head: wide round golem -->
  <ellipse cx="100" cy="118" rx="46" ry="44" fill="${p.p1}"/>
  <ellipse cx="100" cy="115" rx="38" ry="35" fill="${p.p2}" opacity="0.4"/>
  <!-- Rune forehead -->
  <circle cx="100" cy="98" r="10" fill="${p.dark}" opacity="0.5"/>
  <path d="M100 92 L100 104 M94 98 L106 98" stroke="${p.eye}" stroke-width="2" fill="none"/>
  ${eyes(p,g, 85,118, 115,118, 10,8)}
  <path d="M82 138 Q100 148 118 138" stroke="${p.dark}" stroke-width="3" fill="none"/>` },

{ id:'dcb_granito', name:'Granito il Massiccio', tier:'non_comune',
  body:(p,g)=>`
  <!-- Massive granite giant - huge, wide -->
  <ellipse cx="100" cy="205" rx="55" ry="55" fill="${p.p1}"/>
  <ellipse cx="100" cy="190" rx="48" ry="42" fill="${p.p2}" opacity="0.6"/>
  <!-- Granite texture -->
  <path d="M60 195 Q80 188 100 192 Q120 188 140 195" stroke="${p.dark}" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M65 208 Q85 202 100 206 Q115 202 135 208" stroke="${p.dark}" stroke-width="2" fill="none" opacity="0.6"/>
  <!-- Enormous arms -->
  <path d="M45 188 Q22 182 14 202 Q10 220 20 230" stroke="${p.p1}" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M155 188 Q178 182 186 202 Q190 220 180 230" stroke="${p.p1}" stroke-width="22" fill="none" stroke-linecap="round"/>
  <!-- Boulder fists -->
  <circle cx="22" cy="228" r="18" fill="${p.p2}"/>
  <circle cx="178" cy="228" r="18" fill="${p.p2}"/>
  <!-- Head: wide, craggy -->
  <ellipse cx="100" cy="115" rx="50" ry="48" fill="${p.p1}"/>
  <!-- Rocky brow ridge -->
  <path d="M55 108 Q100 96 145 108" fill="${p.p2}" opacity="0.7"/>
  <path d="M58 108 L55 98 L70 104Z" fill="${p.p2}"/>
  <path d="M142 108 L145 98 L130 104Z" fill="${p.p2}"/>
  ${eyes(p,g, 84,116, 116,116, 11,8)}
  <!-- Wide grim mouth -->
  <path d="M72 140 Q100 152 128 140" stroke="${p.dark}" stroke-width="3.5" fill="none"/>
  <path d="M78 142 L80 150 L84 142" stroke="${p.eye}" stroke-width="2" fill="none"/>
  <path d="M114 142 L118 150 L120 142" stroke="${p.eye}" stroke-width="2" fill="none"/>` },

// ── RARI ──────────────────────────────────────────────────────
{ id:'dcb_glaciar', name:'Glaciar il Gelido', tier:'raro',
  body:(p,g)=>`
  <!-- Ice robed wizard -->
  <path d="M60 240 Q58 195 62 178 Q70 158 100 155 Q130 158 138 178 Q142 195 140 240Z" fill="${p.p1}"/>
  <!-- Robe patterns -->
  <path d="M68 200 Q100 194 132 200" stroke="${p.p2}" stroke-width="1.5" fill="none"/>
  <path d="M65 215 Q100 209 135 215" stroke="${p.p2}" stroke-width="1.5" fill="none"/>
  <path d="M63 230 Q100 224 137 230" stroke="${p.p2}" stroke-width="1.5" fill="none"/>
  <!-- Ice crystal emblem -->
  <polygon points="100,182 106,192 100,202 94,192" fill="${p.acc}" opacity="0.8"/>
  <polygon points="94,187 100,182 106,187 100,192" fill="${p.eye}" opacity="0.9"/>
  <!-- Robe arms with ice crystals -->
  <path d="M62 180 Q40 178 28 195" stroke="${p.p1}" stroke-width="15" fill="none" stroke-linecap="round"/>
  <path d="M138 180 Q160 178 172 195" stroke="${p.p1}" stroke-width="15" fill="none" stroke-linecap="round"/>
  <!-- Crystal clusters on hands -->
  ${crystalHead(p, 24, 200, 15)}
  ${crystalHead(p, 176, 200, 15)}
  <!-- Head -->
  <ellipse cx="100" cy="118" rx="40" ry="38" fill="${p.p1}"/>
  <!-- Ice crown -->
  <polygon points="70,96 76,78 82,90 88,74 94,88 100,70 106,88 112,74 118,90 124,78 130,96" fill="${p.p2}" stroke="${p.acc}" stroke-width="1"/>
  <circle cx="100" cy="70" r="5" fill="${p.eye}"/>
  ${eyes(p,g, 86,116, 114,116, 9,7)}
  <path d="M84 135 Q100 144 116 135" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_brina', name:'Brina la Cristallina', tier:'raro',
  body:(p,g)=>`
  <!-- Delicate ice crystal being -->
  ${crystalHead(p, 100, 185, 50)}
  <ellipse cx="100" cy="190" rx="30" ry="38" fill="${p.p1}" opacity="0.8"/>
  <!-- Crystal shards body -->
  <polygon points="72,165 65,185 72,205" fill="${p.p2}" opacity="0.7"/>
  <polygon points="128,165 135,185 128,205" fill="${p.p2}" opacity="0.7"/>
  <polygon points="80,148 74,168 86,168" fill="${p.acc}" opacity="0.6"/>
  <polygon points="120,148 114,168 126,168" fill="${p.acc}" opacity="0.6"/>
  <!-- Slim arms -->
  <path d="M70 175 Q48 170 36 185" stroke="${p.p2}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M130 175 Q152 170 164 185" stroke="${p.p2}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <!-- Crystal hands -->
  <polygon points="32,185 26,195 36,200 40,188" fill="${p.p2}" opacity="0.9"/>
  <polygon points="168,185 174,195 164,200 160,188" fill="${p.p2}" opacity="0.9"/>
  <!-- Head: crystalline facets -->
  ${crystalHead(p, 100, 118, 42)}
  <ellipse cx="100" cy="118" rx="32" ry="30" fill="${p.p1}" opacity="0.7"/>
  <!-- Top crystal spike -->
  <polygon points="100,80 94,64 106,64 100,80" fill="${p.p2}"/>
  <polygon points="88,86 82,72 92,72 88,86" fill="${p.acc}" opacity="0.8"/>
  <polygon points="112,86 106,72 118,72 112,86" fill="${p.acc}" opacity="0.8"/>
  ${eyes(p,g, 86,116, 114,116, 8,6)}` },

{ id:'dcb_maelstrom', name:'Maelstrom il Vorticoso', tier:'raro',
  body:(p,g)=>`
  <!-- Water vortex being -->
  ${vortexBody(p, 100, 195, 52)}
  <ellipse cx="100" cy="195" rx="30" ry="30" fill="${p.p1}" opacity="0.6"/>
  <!-- Spiral trails -->
  <path d="M50 210 Q55 190 70 185 Q85 182 100 188 Q115 194 120 210 Q125 226 110 232" stroke="${p.acc}" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round"/>
  <path d="M150 190 Q145 175 130 172 Q115 170 100 175 Q85 180 80 196" stroke="${p.p2}" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round"/>
  <!-- Arms: water streams -->
  <path d="M68 185 Q48 178 34 190" stroke="${p.p2}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M132 185 Q152 178 166 190" stroke="${p.p2}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M32 192 Q26 200 30 210" stroke="${p.acc}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M168 192 Q174 200 170 210" stroke="${p.acc}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.7"/>
  <!-- Head: vortex swirl -->
  <ellipse cx="100" cy="118" rx="42" ry="40" fill="${p.p1}" opacity="0.85"/>
  ${vortexBody(p, 100, 118, 36)}
  <ellipse cx="100" cy="118" rx="22" ry="22" fill="${p.p1}" opacity="0.9"/>
  ${singleEye(p,g, 100, 118, 14, 10)}
  <!-- Splash top -->
  <path d="M70 88 Q80 72 100 70 Q120 72 130 88" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M82 82 Q100 68 118 82" stroke="${p.acc}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_tempestosa', name:"Tempestosa l'Uragano", tier:'raro',
  body:(p,g)=>`
  <!-- Storm djinn — cloud body with lightning -->
  <path d="M40 230 Q35 200 48 178 Q58 158 100 155 Q142 158 152 178 Q165 200 160 230" fill="${p.p1}" opacity="0.75"/>
  <path d="M50 225 Q45 198 56 178 Q65 162 100 160 Q135 162 144 178 Q155 198 150 225" fill="${p.p2}" opacity="0.5"/>
  <!-- Lightning bolt body markings -->
  <path d="M100 162 L92 185 L104 185 L96 215" stroke="${p.eye}" stroke-width="3.5" fill="none"/>
  <!-- Cloud wisps arms -->
  <path d="M56 180 Q36 172 22 185" stroke="${p.p1}" stroke-width="18" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M144 180 Q164 172 178 185" stroke="${p.p1}" stroke-width="18" fill="none" stroke-linecap="round" opacity="0.8"/>
  <!-- Lightning from hands -->
  <path d="M22 185 L16 192 L24 196 L18 204" stroke="${p.eye}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M178 185 L184 192 L176 196 L182 204" stroke="${p.eye}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Head -->
  <ellipse cx="100" cy="116" rx="44" ry="42" fill="${p.p1}" opacity="0.9"/>
  <!-- Cloud wisps top -->
  <ellipse cx="78" cy="84" rx="18" ry="14" fill="${p.p2}" opacity="0.8"/>
  <ellipse cx="100" cy="78" rx="22" ry="16" fill="${p.p1}" opacity="0.9"/>
  <ellipse cx="122" cy="84" rx="18" ry="14" fill="${p.p2}" opacity="0.8"/>
  ${eyes(p,g, 86,114, 114,114, 10,8)}
  <!-- Lightning streak from eyes -->
  <path d="M76 118 L68 125" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M124 118 L132 125" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M84 132 Q100 144 116 132" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_pelagos', name:"Pelagos l'Abissale", tier:'raro',
  body:(p,g)=>`
  <!-- Deep sea horror with tentacles -->
  <ellipse cx="100" cy="185" rx="40" ry="46" fill="${p.p1}"/>
  ${tentacles(p, 100, 220, 4)}
  <!-- Extra tentacle pairs -->
  <path d="M60 218 Q44 234 38 252" stroke="${p.p2}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M140 218 Q156 234 162 252" stroke="${p.p2}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <!-- Suction cup details -->
  <circle cx="90" cy="242" r="3" fill="${p.acc}" opacity="0.7"/>
  <circle cx="80" cy="252" r="2.5" fill="${p.acc}" opacity="0.6"/>
  <circle cx="110" cy="244" r="3" fill="${p.acc}" opacity="0.7"/>
  <circle cx="120" cy="254" r="2.5" fill="${p.acc}" opacity="0.6"/>
  <!-- Bioluminescent spots -->
  <circle cx="75" cy="195" r="4" fill="${p.eye}" opacity="0.6"/>
  <circle cx="125" cy="200" r="4" fill="${p.eye}" opacity="0.6"/>
  <circle cx="88" cy="210" r="3" fill="${p.eye}" opacity="0.5"/>
  <!-- Arms: tentacle arms -->
  <path d="M60 178 Q40 172 28 185 Q22 198 26 210" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9"/>
  <path d="M140 178 Q160 172 172 185 Q178 198 174 210" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9"/>
  <!-- Head: alien, cephalopod -->
  <ellipse cx="100" cy="115" rx="44" ry="46" fill="${p.p1}"/>
  <ellipse cx="100" cy="108" rx="36" ry="32" fill="${p.p2}" opacity="0.5"/>
  <!-- Multiple eyes -->
  ${eyes(p,g, 84,108, 116,108, 10,8)}
  <ellipse cx="100" cy="124" rx="5" ry="4" fill="${p.p2}"/>
  <ellipse cx="100" cy="124" rx="3" ry="2.5" fill="${p.eye}"/>
  <!-- Beak-mouth -->
  <path d="M86 136 Q100 150 114 136 Q108 130 100 132 Q92 130 86 136Z" fill="${p.dark}"/>` },

// ── EPICI ────────────────────────────────────────────────────
{ id:'dcb_ignar', name:'Ignar il Sempiterno', tier:'epico',
  body:(p,g)=>`
  <!-- Fire demon, horned, imposing -->
  <ellipse cx="100" cy="192" rx="42" ry="52" fill="${p.p1}"/>
  ${flames(p, 100, 148, 38, 7)}
  <!-- Lava chest cracks -->
  <path d="M100 158 L96 175 L88 188 Q92 200 88 215" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.8"/>
  <path d="M96 175 L82 180 L75 192" stroke="${p.eye}" stroke-width="1.8" fill="none" opacity="0.7"/>
  <path d="M104 178 L118 185 L126 196" stroke="${p.eye}" stroke-width="1.8" fill="none" opacity="0.7"/>
  <!-- Arms: burning -->
  <path d="M58 182 Q38 176 26 194" stroke="${p.p1}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M142 182 Q162 176 174 194" stroke="${p.p1}" stroke-width="16" fill="none" stroke-linecap="round"/>
  ${flames(p, 25, 190, 14, 3)}
  ${flames(p, 175, 190, 14, 3)}
  <!-- Head -->
  <ellipse cx="100" cy="118" rx="42" ry="40" fill="${p.p1}"/>
  ${horns(p, 100, 100, 28, 38)}
  ${flames(p, 100, 82, 30, 5)}
  ${eyes(p,g, 86,116, 114,116, 10,8)}
  <!-- Fire aura eyes -->
  <ellipse cx="86" cy="116" rx="14" ry="12" fill="${p.eye}" opacity="0.2" filter="url(#gf${g})"/>
  <ellipse cx="114" cy="116" rx="14" ry="12" fill="${p.eye}" opacity="0.2" filter="url(#gf${g})"/>
  <path d="M82 135 Q100 147 118 135" stroke="${p.dark}" stroke-width="2.5" fill="none"/>
  ${flames(p, 100, 155, 15, 3)}` },

{ id:'dcb_pyra', name:'Pyra la Divoratrice', tier:'epico',
  body:(p,g)=>`
  <!-- Lava serpent: elongated, molten -->
  <path d="M80 240 Q75 210 78 188 Q80 165 100 158 Q120 165 122 188 Q125 210 120 240Z" fill="${p.p1}"/>
  <path d="M86 235 Q82 208 84 188 Q86 168 100 162 Q114 168 116 188 Q118 208 114 235" fill="${p.p2}" opacity="0.6"/>
  <!-- Lava cracks -->
  <path d="M100 165 L94 180 L100 195 L92 215" stroke="${p.eye}" stroke-width="3" fill="none"/>
  <path d="M94 182 L80 188 L74 200" stroke="${p.eye}" stroke-width="2" fill="none"/>
  <!-- Serpent scales -->
  <ellipse cx="100" cy="180" rx="18" ry="10" fill="${p.p2}" opacity="0.5"/>
  <ellipse cx="100" cy="198" rx="18" ry="10" fill="${p.p2}" opacity="0.5"/>
  <ellipse cx="100" cy="216" rx="18" ry="10" fill="${p.p2}" opacity="0.5"/>
  <!-- Wing-arms: lava wings -->
  ${wings(p, 100, 172, 65, 55)}
  ${flames(p, 50, 140, 20, 4)}
  ${flames(p, 150, 140, 20, 4)}
  <!-- Head: serpentine -->
  <ellipse cx="100" cy="118" rx="38" ry="40" fill="${p.p1}"/>
  ${horns(p, 100, 98, 22, 32)}
  <!-- Serpent tongue -->
  <path d="M100 142 Q100 152 95 158 M100 152 Q104 158 100 152" stroke="${p.acc}" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${eyes(p,g, 86,114, 114,114, 9,8)}
  ${flames(p, 100, 84, 25, 4)}` },

{ id:'dcb_cinere', name:"Cinere l'Oscuro", tier:'epico',
  body:(p,g)=>`
  <!-- Shadow wraith — cloaked, with smoke tendrils -->
  <path d="M50 245 Q48 200 56 178 Q65 158 100 155 Q135 158 144 178 Q152 200 150 245Z" fill="${p.p1}" opacity="0.9"/>
  <!-- Cloak shadow wisps -->
  <path d="M50 245 Q35 230 30 215 Q26 200 38 192" stroke="${p.p1}" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M150 245 Q165 230 170 215 Q174 200 162 192" stroke="${p.p1}" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M55 235 Q40 245 35 258" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
  <path d="M145 235 Q160 245 165 258" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
  <!-- Smoke wisps from cloak hem -->
  <path d="M72 240 Q68 252 65 260" stroke="${p.p2}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>
  <path d="M100 242 Q100 254 100 260" stroke="${p.p2}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"/>
  <path d="M128 240 Q132 252 135 260" stroke="${p.p2}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>
  <!-- Ghost arms -->
  <path d="M58 182 Q38 175 26 190" stroke="${p.p1}" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M142 182 Q162 175 174 190" stroke="${p.p1}" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.8"/>
  <!-- Bony fingers -->
  <path d="M24 192 L18 198 M24 192 L20 205 M24 192 L26 207" stroke="${p.p2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M176 192 L182 198 M176 192 L180 205 M176 192 L174 207" stroke="${p.p2}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Head: skull in shadow hood -->
  <ellipse cx="100" cy="118" rx="40" ry="38" fill="${p.p1}"/>
  <!-- Hood shadow -->
  <path d="M60 105 Q100 90 140 105 Q145 115 140 125 Q100 118 60 125 Q55 115 60 105Z" fill="${p.dark}" opacity="0.7"/>
  <!-- Skull face -->
  <ellipse cx="86" cy="118" rx="13" ry="11" fill="${p.dark}"/>
  <ellipse cx="114" cy="118" rx="13" ry="11" fill="${p.dark}"/>
  ${eyes(p,g, 86,118, 114,118, 8,6)}
  <!-- Teeth -->
  <path d="M82 138 L85 144 L88 138 L91 144 L94 138 L97 144 L100 138 L103 144 L106 138 L109 144 L112 138 L115 144 L118 138" stroke="${p.acc}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` },

{ id:'dcb_infernale', name:'Infernale il Vuoto', tier:'epico',
  body:(p,g)=>`
  <!-- Void entity: massive single eye, shadowy mass -->
  <path d="M35 245 Q30 205 42 178 Q55 155 100 150 Q145 155 158 178 Q170 205 165 245Z" fill="${p.p1}" opacity="0.95"/>
  <!-- Void tendrils from body -->
  <path d="M35 240 Q20 228 16 215" stroke="${p.dark}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M165 240 Q180 228 184 215" stroke="${p.dark}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M42 218 Q28 220 20 232" stroke="${p.p1}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M158 218 Q172 220 180 232" stroke="${p.p1}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- Void veins on body -->
  <path d="M100 158 Q90 175 85 195 Q80 215 85 240" stroke="${p.dark}" stroke-width="3" fill="none"/>
  <path d="M100 158 Q110 175 115 195 Q120 215 115 240" stroke="${p.dark}" stroke-width="3" fill="none"/>
  <!-- Small eyes scattered on body -->
  <ellipse cx="78" cy="195" rx="5" ry="4" fill="${p.eye}" opacity="0.6"/>
  <ellipse cx="122" cy="188" rx="5" ry="4" fill="${p.eye}" opacity="0.6"/>
  <ellipse cx="88" cy="218" rx="4" ry="3" fill="${p.eye}" opacity="0.5"/>
  <!-- Arms: shadow masses -->
  <path d="M42 182 Q22 175 14 194" stroke="${p.p1}" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M158 182 Q178 175 186 194" stroke="${p.p1}" stroke-width="18" fill="none" stroke-linecap="round"/>
  <!-- Head: dominated by single giant eye -->
  <ellipse cx="100" cy="112" rx="48" ry="46" fill="${p.p1}"/>
  ${singleEye(p,g, 100, 110, 22, 18)}
  <!-- Small flanking eyes -->
  <ellipse cx="68" cy="108" rx="7" ry="6" fill="${p.dark}"/>
  <ellipse cx="132" cy="108" rx="7" ry="6" fill="${p.dark}"/>
  <ellipse cx="68" cy="108" rx="4" ry="3.5" fill="${p.eye}" opacity="0.8"/>
  <ellipse cx="132" cy="108" rx="4" ry="3.5" fill="${p.eye}" opacity="0.8"/>
  <!-- Maw mouth -->
  <path d="M70 135 Q100 155 130 135" fill="${p.dark}"/>
  <path d="M76 136 L78 146 L82 136" stroke="${p.acc}" stroke-width="1.5" fill="none"/>
  <path d="M96 138 L100 148 L104 138" stroke="${p.acc}" stroke-width="1.5" fill="none"/>
  <path d="M116 136 L118 146 L122 136" stroke="${p.acc}" stroke-width="1.5" fill="none"/>` },

{ id:'dcb_scarlatto', name:'Scarlatto il Draconico', tier:'epico',
  body:(p,g)=>`
  <!-- Draconic fire lord — scaled, winged, imposing -->
  <ellipse cx="100" cy="195" rx="44" ry="52" fill="${p.p1}"/>
  <!-- Dragon scales on body -->
  <path d="M60 175 Q70 170 80 175 Q70 182 60 175Z" fill="${p.p2}"/>
  <path d="M78 175 Q88 170 98 175 Q88 182 78 175Z" fill="${p.p2}"/>
  <path d="M96 175 Q106 170 116 175 Q106 182 96 175Z" fill="${p.p2}"/>
  <path d="M114 175 Q124 170 134 175 Q124 182 114 175Z" fill="${p.p2}"/>
  <path d="M68 190 Q78 185 88 190 Q78 197 68 190Z" fill="${p.p2}"/>
  <path d="M86 190 Q96 185 106 190 Q96 197 86 190Z" fill="${p.p2}"/>
  <path d="M104 190 Q114 185 124 190 Q114 197 104 190Z" fill="${p.p2}"/>
  <path d="M72 205 Q82 200 92 205 Q82 212 72 205Z" fill="${p.p2}"/>
  <path d="M90 205 Q100 200 110 205 Q100 212 90 205Z" fill="${p.p2}"/>
  <path d="M108 205 Q118 200 128 205 Q118 212 108 205Z" fill="${p.p2}"/>
  <!-- Dragon wings -->
  ${wings(p, 100, 175, 72, 65)}
  <!-- Wing membrane details -->
  <path d="M100 175 Q60 158 30 128" stroke="${p.p2}" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M100 175 Q140 158 170 128" stroke="${p.p2}" stroke-width="1.5" fill="none" opacity="0.5"/>
  <!-- Arms -->
  <path d="M56 182 Q38 178 28 196" stroke="${p.p1}" stroke-width="15" fill="none" stroke-linecap="round"/>
  <path d="M144 182 Q162 178 172 196" stroke="${p.p1}" stroke-width="15" fill="none" stroke-linecap="round"/>
  <!-- Claws -->
  <path d="M28 198 Q22 206 18 212 M28 198 Q24 208 22 215 M28 198 Q28 210 26 218" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M172 198 Q178 206 182 212 M172 198 Q176 208 178 215 M172 198 Q172 210 174 218" stroke="${p.p2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- Head: dragon skull -->
  <ellipse cx="100" cy="116" rx="42" ry="40" fill="${p.p1}"/>
  <!-- Dragon horns -->
  ${horns(p, 100, 96, 30, 44)}
  <!-- Snout -->
  <path d="M80 134 Q100 148 120 134 Q114 128 100 130 Q86 128 80 134Z" fill="${p.p2}"/>
  <!-- Nostrils -->
  <circle cx="91" cy="136" r="3.5" fill="${p.dark}"/>
  <circle cx="109" cy="136" r="3.5" fill="${p.dark}"/>
  ${eyes(p,g, 85,112, 115,112, 10,8)}
  ${flames(p, 100, 90, 28, 4)}` },

// ── LEGGENDARI ────────────────────────────────────────────────
{ id:'dcb_voltex', name:'Voltex il Fulmineo', tier:'leggendario',
  body:(p,g)=>`
  <!-- Storm avatar — lightning wings, electric form -->
  <ellipse cx="100" cy="192" rx="40" ry="50" fill="${p.p1}"/>
  <!-- Body lightning veins -->
  <path d="M100 150 L94 168 L106 172 L96 198 L110 202 L98 230" stroke="${p.eye}" stroke-width="3" fill="none"/>
  <!-- Lightning wings -->
  <path d="M62 175 Q30 155 12 120 Q28 128 38 150 Q50 165 62 175Z" fill="${p.p1}" opacity="0.85"/>
  <path d="M138 175 Q170 155 188 120 Q172 128 162 150 Q150 165 138 175Z" fill="${p.p1}" opacity="0.85"/>
  <path d="M62 175 Q30 155 12 120" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.7"/>
  <path d="M138 175 Q170 155 188 120" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.7"/>
  <!-- Secondary wing feathers as lightning bolts -->
  <path d="M48 155 Q38 140 34 128" stroke="${p.acc}" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M152 155 Q162 140 166 128" stroke="${p.acc}" stroke-width="3" fill="none" opacity="0.6"/>
  <!-- Arms: crackling -->
  <path d="M60 178 Q40 172 26 188" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M140 178 Q160 172 174 188" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M26 188 L18 196 L26 200 L16 210" stroke="${p.eye}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M174 188 L182 196 L174 200 L184 210" stroke="${p.eye}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <!-- Head -->
  <ellipse cx="100" cy="115" rx="42" ry="40" fill="${p.p1}"/>
  <!-- Lightning crown -->
  <path d="M68 96 L78 74 L88 90 L100 68 L112 90 L122 74 L132 96" fill="${p.p2}" stroke="${p.eye}" stroke-width="1.5"/>
  <circle cx="100" cy="68" r="6" fill="${p.eye}"/>
  ${eyes(p,g, 86,112, 114,112, 10,8)}
  <!-- Electric pupils -->
  <path d="M80 116 L72 122" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.5"/>
  <path d="M120 116 L128 122" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.5"/>
  <path d="M82 132 Q100 144 118 132" stroke="${p.dark}" stroke-width="2.5" fill="none"/>` },

{ id:'dcb_folgore', name:"Folgore l'Eterno", tier:'leggendario',
  body:(p,g)=>`
  <!-- Thunder god — regal, staff-less but commanding posture -->
  <ellipse cx="100" cy="192" rx="42" ry="52" fill="${p.p1}"/>
  <!-- Robes with cosmic pattern -->
  <path d="M58 178 Q100 170 142 178 L144 240 Q100 250 56 240Z" fill="${p.p2}" opacity="0.5"/>
  <path d="M66 195 Q100 189 134 195" stroke="${p.acc}" stroke-width="1.5" fill="none"/>
  <path d="M64 210 Q100 204 136 210" stroke="${p.acc}" stroke-width="1.5" fill="none"/>
  <path d="M62 225 Q100 219 138 225" stroke="${p.acc}" stroke-width="1.5" fill="none"/>
  <!-- Cosmic sigil on chest -->
  <circle cx="100" cy="192" r="16" stroke="${p.eye}" stroke-width="1.5" fill="none"/>
  <path d="M100 178 L100 206 M88 184 L112 200 M88 200 L112 184" stroke="${p.eye}" stroke-width="1.5" fill="none"/>
  <!-- Arms: outstretched commanding -->
  <path d="M58 182 Q36 175 22 190" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M142 182 Q164 175 178 190" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <!-- Crackling palms -->
  <circle cx="20" cy="192" r="10" fill="${p.p2}" opacity="0.7"/>
  <path d="M12 188 L20 192 L14 198 M20 186 L20 192 L22 184 M28 190 L20 192 L28 196" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.8"/>
  <circle cx="180" cy="192" r="10" fill="${p.p2}" opacity="0.7"/>
  <path d="M188 188 L180 192 L186 198 M180 186 L180 192 L178 184 M172 190 L180 192 L172 196" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.8"/>
  <!-- Head: god-like with thundercrown -->
  <ellipse cx="100" cy="114" rx="42" ry="40" fill="${p.p1}"/>
  ${crown(p, 100, 92, 32)}
  <!-- Beard of lightning -->
  <path d="M80 140 Q82 150 78 158 M88 142 L86 154 M100 144 L100 156 M112 142 L114 154 M120 140 Q118 150 122 158" stroke="${p.acc}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${eyes(p,g, 85,112, 115,112, 10,8)}` },

{ id:'dcb_abisso', name:'Abisso il Cosmico', tier:'leggendario',
  body:(p,g)=>`
  <!-- Cosmic horror: star-filled void being -->
  <ellipse cx="100" cy="192" rx="46" ry="55" fill="${p.p1}"/>
  <!-- Star field inside body -->
  <circle cx="75" cy="180" r="1.5" fill="white" opacity="0.7"/>
  <circle cx="85" cy="195" r="1" fill="white" opacity="0.6"/>
  <circle cx="95" cy="175" r="2" fill="white" opacity="0.8"/>
  <circle cx="105" cy="210" r="1.5" fill="white" opacity="0.7"/>
  <circle cx="115" cy="185" r="1" fill="white" opacity="0.6"/>
  <circle cx="125" cy="200" r="2" fill="white" opacity="0.8"/>
  <circle cx="80" cy="215" r="1.5" fill="${p.eye}" opacity="0.7"/>
  <circle cx="110" cy="222" r="1" fill="${p.eye}" opacity="0.8"/>
  <circle cx="120" cy="168" r="1.5" fill="${p.eye}" opacity="0.7"/>
  <circle cx="72" cy="200" r="1" fill="${p.eye}" opacity="0.6"/>
  <!-- Nebula swirls inside body -->
  <path d="M70 195 Q85 188 100 192 Q115 196 125 188" stroke="${p.p2}" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M75 210 Q90 204 100 208 Q112 212 120 205" stroke="${p.acc}" stroke-width="1" fill="none" opacity="0.4"/>
  <!-- Void tentacles -->
  ${tentacles(p, 100, 235, 4)}
  <path d="M60 228 Q44 240 36 256" stroke="${p.p1}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M140 228 Q156 240 164 256" stroke="${p.p1}" stroke-width="8" fill="none" stroke-linecap="round"/>
  <!-- Arms: cosmic energy -->
  <path d="M54 180 Q32 172 18 188" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M146 180 Q168 172 182 188" stroke="${p.p1}" stroke-width="14" fill="none" stroke-linecap="round"/>
  <!-- Cosmic hands -->
  <circle cx="18" cy="190" r="12" fill="${p.p1}"/>
  <circle cx="16" cy="188" r="3" fill="white" opacity="0.5"/>
  <circle cx="21" cy="194" r="2" fill="${p.eye}" opacity="0.7"/>
  <circle cx="182" cy="190" r="12" fill="${p.p1}"/>
  <circle cx="184" cy="188" r="3" fill="white" opacity="0.5"/>
  <circle cx="179" cy="194" r="2" fill="${p.eye}" opacity="0.7"/>
  <!-- Head: void sphere with galaxy inside -->
  <ellipse cx="100" cy="112" rx="48" ry="46" fill="${p.p1}"/>
  <ellipse cx="100" cy="112" rx="38" ry="36" fill="${p.dark}" opacity="0.6"/>
  <!-- Galactic core -->
  <ellipse cx="100" cy="112" rx="18" ry="14" fill="${p.p2}" opacity="0.4" transform="rotate(20 100 112)"/>
  <!-- Star field in head -->
  <circle cx="82" cy="104" r="1.5" fill="white" opacity="0.8"/>
  <circle cx="92" cy="120" r="1" fill="white" opacity="0.7"/>
  <circle cx="108" cy="106" r="2" fill="white" opacity="0.9"/>
  <circle cx="118" cy="118" r="1.5" fill="white" opacity="0.8"/>
  <circle cx="96" cy="98" r="1" fill="${p.eye}" opacity="0.8"/>
  <circle cx="115" cy="128" r="1" fill="${p.eye}" opacity="0.7"/>
  <!-- Eyes: twin nebulae -->
  ${eyes(p,g, 84,110, 116,110, 11,9)}
  <ellipse cx="84" cy="110" rx="16" ry="14" fill="${p.eye}" opacity="0.1" filter="url(#gf${g})"/>
  <ellipse cx="116" cy="110" rx="16" ry="14" fill="${p.eye}" opacity="0.1" filter="url(#gf${g})"/>
  <!-- No conventional mouth — just void -->` },

{ id:'dcb_primordius', name:"Primordius l'Antico", tier:'leggendario',
  body:(p,g)=>`
  <!-- Ancient primordial: timeless, regal, immense -->
  <ellipse cx="100" cy="200" rx="50" ry="58" fill="${p.p1}"/>
  <!-- Ancient stone armor carvings -->
  <path d="M50 185 Q100 175 150 185 L152 225 Q100 238 48 225Z" fill="${p.p2}" opacity="0.6"/>
  <!-- Ancient runes on chest -->
  <path d="M82 196 L82 212 M82 204 L94 204" stroke="${p.eye}" stroke-width="2" fill="none"/>
  <path d="M104 196 L104 212 M104 196 L116 196 M104 204 L116 204" stroke="${p.eye}" stroke-width="2" fill="none"/>
  <path d="M120 196 L120 212 M120 204 L128 200" stroke="${p.eye}" stroke-width="2" fill="none"/>
  <circle cx="88" cy="218" r="4" fill="${p.eye}" opacity="0.6"/>
  <circle cx="100" cy="220" r="4" fill="${p.eye}" opacity="0.6"/>
  <circle cx="112" cy="218" r="4" fill="${p.eye}" opacity="0.6"/>
  <!-- Massive arms: ancient stone -->
  <path d="M50 188 Q26 182 14 202 Q8 222 18 238" stroke="${p.p1}" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M150 188 Q174 182 186 202 Q192 222 182 238" stroke="${p.p1}" stroke-width="22" fill="none" stroke-linecap="round"/>
  <!-- Open palms: ancient power -->
  <ellipse cx="18" cy="240" rx="20" ry="16" fill="${p.p2}" opacity="0.8"/>
  <path d="M10 236 L18 240 L12 246 M18 234 L18 240 L18 248 M26 236 L18 240 L24 246" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.7"/>
  <ellipse cx="182" cy="240" rx="20" ry="16" fill="${p.p2}" opacity="0.8"/>
  <path d="M190 236 L182 240 L188 246 M182 234 L182 240 L182 248 M174 236 L182 240 L176 246" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.7"/>
  <!-- Head: ancient, stone titan -->
  <ellipse cx="100" cy="112" rx="50" ry="48" fill="${p.p1}"/>
  <!-- Primordial crown: towering -->
  ${crown(p, 100, 82, 38)}
  <!-- Crown gems -->
  <circle cx="62" cy="70" r="5" fill="${p.eye}"/>
  <circle cx="138" cy="70" r="5" fill="${p.eye}"/>
  <circle cx="78" cy="62" r="4" fill="${p.acc}"/>
  <circle cx="122" cy="62" r="4" fill="${p.acc}"/>
  <!-- Ancient brow ridge -->
  <path d="M55 106 Q100 96 145 106" fill="${p.p2}" opacity="0.5"/>
  <!-- Eyes: ancient, tired, powerful -->
  ${eyes(p,g, 82,112, 118,112, 12,9)}
  <ellipse cx="82" cy="112" rx="18" ry="15" fill="${p.eye}" opacity="0.08" filter="url(#gf${g})"/>
  <ellipse cx="118" cy="112" rx="18" ry="15" fill="${p.eye}" opacity="0.08" filter="url(#gf${g})"/>
  <!-- Ancient weathered face lines -->
  <path d="M72 100 Q78 108 74 118" stroke="${p.p2}" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M128 100 Q122 108 126 118" stroke="${p.p2}" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M100 128 Q100 132 100 136" stroke="${p.p2}" stroke-width="2" fill="none" opacity="0.4"/>
  <!-- Grim royal mouth -->
  <path d="M76 138 Q100 148 124 138" stroke="${p.dark}" stroke-width="3" fill="none"/>` },

{ id:'dcb_aetherius', name:'Aetherius il Creatore', tier:'leggendario',
  body:(p,g)=>`
  <!-- The Creator: transcendent, radiant, final boss -->
  <!-- Radiant aura behind body -->
  <ellipse cx="100" cy="170" rx="80" ry="80" fill="${p.p1}" opacity="0.15"/>
  <ellipse cx="100" cy="170" rx="65" ry="65" fill="${p.p1}" opacity="0.15"/>
  <!-- Body: luminous form -->
  <ellipse cx="100" cy="192" rx="38" ry="50" fill="${p.p1}"/>
  <!-- Radiant light streaks from body -->
  <path d="M62 192 Q38 185 22 192" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.6"/>
  <path d="M138 192 Q162 185 178 192" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.6"/>
  <path d="M68 172 Q50 158 40 145" stroke="${p.acc}" stroke-width="2" fill="none" opacity="0.5"/>
  <path d="M132 172 Q150 158 160 145" stroke="${p.acc}" stroke-width="2" fill="none" opacity="0.5"/>
  <path d="M74 215 Q58 228 50 242" stroke="${p.p2}" stroke-width="2" fill="none" opacity="0.5"/>
  <path d="M126 215 Q142 228 150 242" stroke="${p.p2}" stroke-width="2" fill="none" opacity="0.5"/>
  <!-- Sacred geometry on chest -->
  <circle cx="100" cy="192" r="22" stroke="${p.eye}" stroke-width="1.5" fill="none" opacity="0.8"/>
  <polygon points="100,172 118,202 82,202" fill="none" stroke="${p.acc}" stroke-width="1.5" opacity="0.8"/>
  <polygon points="100,212 82,182 118,182" fill="none" stroke="${p.eye}" stroke-width="1.5" opacity="0.8"/>
  <circle cx="100" cy="192" r="6" fill="${p.eye}" opacity="0.9"/>
  <!-- Wings: vast ethereal -->
  <path d="M62 175 Q22 148 8 110 Q26 122 38 145 Q52 162 62 175Z" fill="${p.p1}" opacity="0.7"/>
  <path d="M138 175 Q178 148 192 110 Q174 122 162 145 Q148 162 138 175Z" fill="${p.p1}" opacity="0.7"/>
  <path d="M62 175 Q22 148 8 110" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.5"/>
  <path d="M138 175 Q178 148 192 110" stroke="${p.eye}" stroke-width="2" fill="none" opacity="0.5"/>
  <!-- Secondary smaller wings -->
  <path d="M70 168 Q48 155 38 138" stroke="${p.acc}" stroke-width="3" fill="none" opacity="0.6"/>
  <path d="M130 168 Q152 155 162 138" stroke="${p.acc}" stroke-width="3" fill="none" opacity="0.6"/>
  <!-- Arms -->
  <path d="M62 180 Q40 174 26 190" stroke="${p.p1}" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M138 180 Q160 174 174 190" stroke="${p.p1}" stroke-width="12" fill="none" stroke-linecap="round"/>
  <!-- Radiant hands: creation energy orbs -->
  <circle cx="24" cy="192" r="14" fill="${p.p2}" opacity="0.6"/>
  <circle cx="24" cy="192" r="9" fill="${p.eye}" opacity="0.5"/>
  <circle cx="24" cy="192" r="4" fill="white" opacity="0.8"/>
  <circle cx="176" cy="192" r="14" fill="${p.p2}" opacity="0.6"/>
  <circle cx="176" cy="192" r="9" fill="${p.eye}" opacity="0.5"/>
  <circle cx="176" cy="192" r="4" fill="white" opacity="0.8"/>
  <!-- Head: transcendent, halo -->
  <circle cx="100" cy="108" r="58" fill="${p.p1}" opacity="0.12"/>
  <circle cx="100" cy="108" r="48" stroke="${p.eye}" stroke-width="2.5" fill="none" opacity="0.4"/>
  <ellipse cx="100" cy="110" rx="40" ry="38" fill="${p.p1}"/>
  <!-- Crown of creation -->
  ${crown(p, 100, 84, 36)}
  <circle cx="100" cy="84" r="8" fill="${p.eye}"/>
  <circle cx="100" cy="84" r="4" fill="white" opacity="0.9"/>
  <circle cx="64" cy="72" r="5" fill="${p.eye}"/>
  <circle cx="136" cy="72" r="5" fill="${p.eye}"/>
  <!-- Halo ring -->
  <circle cx="100" cy="88" r="52" stroke="${p.acc}" stroke-width="3" fill="none" opacity="0.35"/>
  <!-- Sacred eyes -->
  ${eyes(p,g, 84,110, 116,110, 11,9)}
  <ellipse cx="84" cy="110" rx="20" ry="16" fill="${p.eye}" opacity="0.15" filter="url(#gf${g})"/>
  <ellipse cx="116" cy="110" rx="20" ry="16" fill="${p.eye}" opacity="0.15" filter="url(#gf${g})"/>
  <!-- Third eye - forehead -->
  ${singleEye(p,g, 100, 94, 7, 5)}
  <!-- Serene mouth -->
  <path d="M84 134 Q100 140 116 134" stroke="${p.p2}" stroke-width="2.5" fill="none"/>` },
];

// ── Generate all SVGs ─────────────────────────────────────────────────────
VILLAINS.forEach(v => {
  const svg = svgWrap(v.name, v.tier, v.body);
  const outPath = path.join(OUT, `${v.id}.svg`);
  fs.writeFileSync(outPath, svg);
  console.log(`✓ ${v.id}.svg`);
});

console.log(`\nDone: ${VILLAINS.length} villain avatars generated.`);
