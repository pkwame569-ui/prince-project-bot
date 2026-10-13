const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');
let lastQR=null; const mem={};

const S={
evaluation:{n_sw:"Tathmini ya Mradi",n_en:"Project Evaluation",p:99,d:15,f:84,da_sw:"siku 7-10",da_en:"7-10 days", sw:"Tathmini ya kina kama mradi umefikia malengo, matokeo na pesa. Aina: Baseline, Mid-term, Endline, Impact.", en:"Deep assessment if project achieved goals, outcomes and spending. Baseline, Mid-term, Endline, Impact.", ex_sw:"NGO ya maji - tunapima wananchi 5000 wamepata maji kweli?", ex_en:"Water NGO - check if 5000 really got water?", fa_sw:"Faida: Unapata ripoti ya kimataifa inayokubaliwa na USAID kupata pesa tena.", fa_en:"Benefit: You get international report accepted by USAID for next funding."},
monitoring:{n_sw:"Ufuatiliaji wa Mradi",n_en:"Monitoring & M&E",p:99,d:15,f:84,da_sw:"siku 5-7",da_en:"5-7 days", sw:"GPS ya mradi - kufuatilia kila siku kazi zinaenda sawa.", en:"GPS of project - daily tracking if work goes well.", ex_sw:"Kila Ijumaa dashboard - ujenzi 60% au 20%.", ex_en:"Every Friday dashboard - 60% or 20%.", fa_sw:"Faida: Unajua mapema mradi ukichelewa unaweza kurekebisha haraka.", fa_en:"Benefit: You know early if project delays, you fix quickly."},
grant:{n_sw:"Kuandika Proposal ya Pesa",n_en:"Grant Proposal",p:450,d:10,f:405,da_sw:"siku 10-14",da_en:"10-14 days", sw:"Nyaraka ya kuomba pesa USAID, EU, UN. Background, logframe, budget.", en:"Document to request money USAID, EU, UN. Background, logframe, budget.", ex_sw:"Barua ya kuomba bilioni 1 kwa donor.", ex_en:"Letter requesting 1 billion from donor.", fa_sw:"Faida: Inaongeza nafasi ya kupata pesa kutoka 10% hadi 80%.", fa_en:"Benefit: Increases chance from 10% to 80% to get funding."},
agrarian:{n_sw:"Kilimo na Mazingira Smart",n_en:"Agrarian & Climate Smart",p:99,d:20,f:79,da_sw:"siku 7-10",da_en:"7-10 days", sw:"Kilimo smart tabianchi, UN-standard, mavuno +200%, funding ya climate.", en:"Climate smart farming, UN-standard, yield +200%, climate funding.", ex_sw:"Badala ya gunia 10, unavuna 30 bila kuharibu mazingira.", ex_en:"Instead 10 bags, harvest 30 without harming environment.", fa_sw:"Faida: Mavuno mengi, mazingira salama, na unapata pesa ya climate.", fa_en:"Benefit: More yield, safe environment, and you get climate money."},
marketing:{n_sw:"Masoko ya AI Viral",n_en:"AI Marketing Viral",p:149,d:25,f:111,da_sw:"Siku 1",da_en:"1 Day", sw:"TRENDING! AI video/post viral kila siku TikTok/IG/FB, brand WORLDWIDE, mauzo 500%.", en:"TRENDING! AI viral video daily TikTok/IG/FB, WORLDWIDE, sales 500%.", ex_sw:"Video 3 TikTok kila siku viral - watu 100 inbox bila ads.", ex_en:"3 TikTok daily viral - 100 inbox without ads.", fa_sw:"Faida: Wateja wanakuja wenyewe, hulipi ads kila siku.", fa_en:"Benefit: Customers come alone, no daily ads payment."},
business:{n_sw:"Mpango wa Biashara",n_en:"Business Plan",p:120,d:10,f:108,da_sw:"siku 7-10",da_en:"7-10 days", sw:"Mpango kamili - market analysis, financial projections.", en:"Full plan - market analysis, financial projections.", ex_sw:"Ramani ya biashara miaka 3.", ex_en:"Roadmap 3 years.", fa_sw:"Faida: Bank inakupa mkopo haraka kwa sababu inaona mpango.", fa_en:"Benefit: Bank gives loan fast because sees plan."},
website:{n_sw:"Tovuti ya Kisasa",n_en:"Professional Website",p:99,d:15,f:84,da_sw:"siku 3-5",da_en:"3-5 days", sw:"Website kisasa simu+computer, SEO Google, M-Pesa.", en:"Modern website mobile+PC, SEO, M-Pesa.", ex_sw:"Duka mtandaoni Google masaa 24.", ex_en:"Online shop Google 24hrs.", fa_sw:"Faida: Biashara inaonekana ya kitaalamu na inaaminika.", fa_en:"Benefit: Business looks professional and trusted."},
//... weka zote 14 kama ulivyo nazo, nimefupisha hapa kwa nafasi - tumia ile ya V23 iliyobaki
strategic:{n_sw:"Mpango Mkakati",n_en:"Strategic Plan",p:300,d:15,f:255,da_sw:"siku 14-21",da_en:"14-21 days", sw:"Ramani ya miaka 5 - Vision, Mission, SWOT.", en:"5 years roadmap - Vision, Mission, SWOT.", ex_sw:"Dira ya meli - bila dira inapotea.", ex_en:"Ship compass - without lost.", fa_sw:"Faida: Taasisi inajua inaenda wapi miaka 5.", fa_en:"Benefit: Org knows where going 5 years."},
feasibility:{n_sw:"Utafiti wa Uwezekano",n_en:"Feasibility Study",p:149,d:20,f:119,da_sw:"siku 10-14",da_en:"10-14 days", sw:"Utafiti kama mradi unawezekana.", en:"Study if viable.", ex_sw:"Kuna soko? Umeme?", ex_en:"Market? Power?", fa_sw:"Faida: Huepuki kupoteza milioni kwa mradi usiowezekana.", fa_en:"Benefit: Avoid losing millions on impossible project."},
policy:{n_sw:"Uchambuzi wa Sera",n_en:"Policy Analysis",p:150,d:15,f:127,da_sw:"siku 7-10",da_en:"7-10 days", sw:"Kuchambua sera na mapendekezo.", en:"Analyzing policy.", ex_sw:"Faida na hasara?", ex_en:"Benefits?", fa_sw:"Faida: Maamuzi sahihi ya serikali.", fa_en:"Benefit: Correct gov decision."},
project:{n_sw:"Upangaji wa Mradi",n_en:"Project Planning",p:250,d:10,f:225,da_sw:"siku 10-14",da_en:"10-14 days", sw:"Kupanga mradi wazo mpaka utekelezaji.", en:"Planning from idea to execution.", ex_sw:"Kalenda wiki kwa wiki.", ex_en:"Calendar week by week.", fa_sw:"Faida: Mradi unaisha kwa wakati na bajeti.", fa_en:"Benefit: Project finishes on time and budget."},
whatsapp:{n_sw:"Bot ya WhatsApp",n_en:"WhatsApp AI Bot",p:150,d:10,f:135,da_sw:"siku 2-3",da_en:"2-3 days", sw:"Bot kama huu 24/7 anauza.", en:"Bot like this 24/7 sells.", ex_sw:"Saa 2 usiku anajibiwa.", ex_en:"2am gets answer.", fa_sw:"Faida: Unaokoa masaa 8 kila siku.", fa_en:"Benefit: Save 8 hours daily."},
aiengineer:{n_sw:"Mhandisi wa AI",n_en:"AI Automation Engineer",p:250,d:15,f:212,da_sw:"siku 7-14",da_en:"7-14 days", sw:"Inaunganisha WhatsApp, Website, Email, M-Pesa automatic.", en:"Connects WhatsApp, Website, Email, M-Pesa automatic.", ex_sw:"Akilipa M-Pesa automatic email.", ex_en:"Pays M-Pesa automatic email.", fa_sw:"Faida: Mauzo 300% bila kuchoka.", fa_en:"Benefit: Sales 300% without tired."},
logframe:{n_sw:"Jedwali la Mradi",n_en:"Logframe Design",p:99,d:15,f:84,da_sw:"siku 3-5",da_en:"3-5 days", sw:"Jedwali la Goal, Outcome, Indicators.", en:"Table Goal, Outcome, Indicators.", ex_sw:"Ramani kwenye karatasi moja.", ex_en:"Map on one paper.", fa_sw:"Faida: Proposal inakubalika haraka.", fa_en:"Benefit: Proposal accepted fast."}
};

function detectLang(t){const sw=['habari','mambo','sijaelewa','nimeelewa','bei','shamba','kilimo','mkulima','punguzo','gharama','sawa','pole','mazingira','tovuti','tangaza','kuomba','pesa','tayari','nitumie','namba','asante','naomba','nahitaji','mimi','ni','kwa']; let s=0; t.toLowerCase().split(/\s+/).forEach(w=>{if(sw.includes(w))s++;}); return s>0?'sw':'en';}
function getK(t){t=t.toLowerCase(); if(t.includes('evaluat')||t.includes('tathmini'))return'evaluation'; if(t.includes('monitor'))return'monitoring'; if(t.includes('logframe'))return'logframe'; if(t.includes('grant')||t.includes('kuomba pesa')||t.includes('proposal'))return'grant'; if(t.includes('strategic')||t.includes('mkakati'))return'strategic'; if(t.includes('feasib'))return'feasibility'; if(t.includes('business'))return'business'; if(t.includes('policy')||t.includes('sera'))return'policy'; if(t.includes('agri')||t.includes('shamba')||t.includes('kilimo')||t.includes('mazingira'))return'agrarian'; if(t.includes('project plan'))return'project'; if(t.includes('website')||t.includes('tovuti'))return'website'; if(t.includes('whatsapp bot'))return'whatsapp'; if(t.includes('automation')||t.includes('engineer'))return'aiengineer'; if(t.includes('market')||t.includes('viral')||t.includes('tangaza'))return'marketing'; const m=t.match(/^\s*(1[0-4]|[1-9])\s*$/); if(m)return Object.keys(S)[parseInt(m[0])-1]; return null;}

async function startBot(){
const {state,saveCreds}=await useMultiFileAuthState('auth_final');
const sock=makeWASocket({auth:state,logger:P({level:'silent'}),browser:["MBILAO WORLDWIDE","Chrome","110"],keepAliveIntervalMs:25000});
sock.ev.on('creds.update',saveCreds);
sock.ev.on('connection.update',async u=>{if(u.qr)lastQR=await QRCode.toDataURL(u.qr); if(u.connection==='open'){lastQR=null; console.log('V24 LIVE - HAIKIMBILII MALIPO');}});
sock.ev.on('messages.upsert',async ({messages})=>{
try{
const m=messages[0]; if(!m.message||m.key.fromMe)return;
const from=m.key.remoteJid; if(from.endsWith('@g.us')||from.endsWith('@broadcast'))return;
const raw=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!raw.trim())return;
const lang=detectLang(raw); const txt=raw.toLowerCase().trim();
if(!mem[from])mem[from]={last:null,step:0,lang}; mem[from].lang=lang;
const k=getK(txt);
await sock.sendPresenceUpdate('composing',from); await new Promise(r=>setTimeout(r,800));
let reply="";

if(k){
  mem[from]={last:k,step:1,lang};
  const s=S[k];
  reply=lang==='sw'?
`🌐 MBILAO PROJECT CONSULTANT WORLDWIDE
📚 ${s.n_sw}

${s.sw}

Mfano: ${s.ex_sw}

Umeelewa hii maana?` :
`🌐 MBILAO PROJECT CONSULTANT WORLDWIDE
📚 ${s.n_en}

${s.en}

Example: ${s.ex_en}

Do you understand this meaning?`;
}
else if(txt.match(/sijaelewa|bado|sielevi|dont understand/)){
  if(mem[from].last){
    const s=S[mem[from].last];
    reply=mem[from].lang==='sw'?`🌐 MBILAO\nPole, kwa ufupi: ${s.ex_sw}\n\n${s.fa_sw}`:`🌐 MBILAO\nSorry, simpler: ${s.ex_en}\n\n${s.fa_en}`;
  }
}
else if(txt.match(/nimeelewa|ndio|sawa|understand|ok|yes/)){
  const cur=mem[from];
  if(cur.last && cur.step===1){
    const s=S[cur.last]; cur.step=2;
    reply=cur.lang==='sw'?
`Vizuri sana! 🙏

Sasa faida yake kwako:
${s.fa_sw}

Mfano wa faida: ${s.ex_sw}

Umeelewa faida yake kwako?` :
`Very good! 🙏

Now its benefit to you:
${s.fa_en}

Example: ${s.ex_en}

Do you understand its benefit?`;
  } else if(cur.last && cur.step===2){
    const s=S[cur.last]; cur.step=3;
    reply=cur.lang==='sw'?
`Poa!

Kuhusu gharama - nikueleze ukweli wote:
Bei ya kawaida ni $${s.p}
Lakini wiki hii kuna punguzo la ${s.d}% kwa wateja wapya.
Hivyo unalipa $${s.f} tu badala ya $${s.p}. Unaokoa $${s.p-s.f}.

Kwa nini punguzo? Tunataka kila mtu amudu huduma bora - si matajiri tu. Offer inaisha wiki hii.

Muda wa kazi: ${s.da_sw}

Una swali lolote kuhusu bei au punguzo?` :
`Nice!

About cost - let me be open:
Normal is $${s.p}
But this week discount ${s.d}% for new clients.
So you pay $${s.f} only instead of $${s.p}. You save $${s.p-s.f}.

Why discount? We want everyone afford quality - not only rich. Offer ends this week.

Time: ${s.da_en}

Any question about price or discount?`;
  } else if(cur.last && cur.step===3){
    cur.step=4;
    reply=cur.lang==='sw'?
`Sawa. Na uhakika wetu kwako:

✓ Kazi ni standard ya UN/USAID - inakubalika popote
✓ Marekebisho bure kabisa mpaka useme nimeridhika 100%
✓ Tunakusimamia hatua kwa hatua - hatukuachi
✓ Msaada wa milele hata baada ya kumaliza

Huna haraka ya kulipa - chukua muda wako kufikiri. Ukiwa na swali lolote niulize tu, niko hapa kukusaidia, sio kukulazimisha.

Una swali lingine?` :
`Ok. And our guarantee to you:

✓ UN/USAID standard - accepted everywhere
✓ Free revision till 100% satisfied
✓ Step by step support - we don't leave you
✓ Lifetime support even after finish

No hurry to pay - take your time to think. If you have any question ask me, I'm here to help, not to force you.

Any other question?`;
  } else if(cur.step===4){
    reply=cur.lang==='sw'?`Asante kwa kusikiliza. Niko hapa ukiwa tayari kuuliza chochote. Ukiridhika na maelezo ndio tutaongea hatua ya kuanza.`:`Thanks for listening. I'm here when ready to ask anything. When satisfied then we talk about starting steps.`;
  }
}
else if(txt.match(/bei|punguzo|price|discount/)){
  if(mem[from].last){const s=S[mem[from].last]; reply=mem[from].lang==='sw'?`🌐 MBILAO\nBei ya kawaida $${s.p}, leo $${s.f} tu - unaokoa $${s.p-s.f}. Punguzo ${s.d}% ni offer ya wiki hii.`:`🌐 MBILAO\nNormal $${s.p}, today $${s.f} only - save $${s.p-s.f}. ${s.d}% is this week offer.`;}
}
else if(txt.match(/nataka kuanza|nimeamua|nipo tayari kuanza|i want to start|im ready to start/)){
  // MALIPO TU MTEJA AKISEMA MWENYEWE ANATAKA KUANZA - HAKUNA KUKIMBILIA
  reply=mem[from].lang==='sw'?
`Hongera kwa uamuzi wako! 🙏

Hatua ya kuanza ni rahisi na haina presha
