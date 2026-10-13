const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');
let lastQR = null;

const SERVICES = {
  evaluation: { name: "Project Evaluation", price: 99, disc: 15, final: 84, days: "7-10 siku", sw: "Tathmini ya kina kama mradi umefikia malengo, matokeo, na matumizi ya pesa. Tunafanya Baseline, Mid-term, Endline, Impact. Donors kama USAID wanaihitaji.", en: "Deep check if project achieved goals, results, fund usage. Baseline, Mid-term, Endline, Impact." },
  monitoring: { name: "Monitoring & M&E System", price: 99, disc: 15, final: 84, days: "5-7 siku", sw: "GPS ya mradi - kufuatilia kila siku. Tunatengeneza Logframe, indicators, data tools, dashboard.", en: "Daily GPS of project. Logframe, indicators, data tools, dashboard." },
  logframe: { name: "Logframe Design", price: 99, disc: 15, final: 84, days: "3-5 siku", sw: "Jedwali la Goal, Outcome, Output, Activities, Indicators, Verification, Assumptions. Moyo wa proposal zote.", en: "Table of Goal, Outcome, Output, Activities, Indicators. Heart of all proposals." },
  grant: { name: "Grant Proposal Writing", price: 450, disc: 10, final: 405, days: "10-14 siku", sw: "Nyaraka ya kuomba pesa USAID, EU, UN. Ina background, logframe, budget, methodology. Bila hii hutapata funding.", en: "Document to request funds USAID, EU, UN. Background, logframe, budget." },
  strategic: { name: "Strategic Plan", price: 300, disc: 15, final: 255, days: "14-21 siku", sw: "Ramani ya miaka 5 ya taasisi - Vision, Mission, SWOT, Goals. Bila hii taasisi inatembea bila dira.", en: "5-year roadmap - Vision, Mission, SWOT, Goals. Without it org has no direction." },
  feasibility: { name: "Feasibility Study", price: 149, disc: 20, final: 119, days: "10-14 siku", sw: "Utafiti kama mradi unawezekana kiuchumi, kiteknolojia, kisheria. Bank zinahitaji kabla ya loan.", en: "Checks if project viable economically, technically, legally. Banks need before loan." },
  business: { name: "Business Plan", price: 120, disc: 10, final: 108, days: "7-10 siku", sw: "Mpango kamili wa biashara - market analysis, financial projections, marketing strategy.", en: "Complete business plan - market analysis, financials, strategy." },
  policy: { name: "Policy Analysis", price: 150, disc: 15, final: 127, days: "7-10 siku", sw: "Kuchambua sera na kutoa mapendekezo ya kitaalamu kwa viwango vya kimataifa.", en: "Analyze policies with global standards recommendations." },
  agrarian: { name: "Agrarian & Climate Smart", price: 99, disc: 20, final: 79, days: "7-10 siku", sw: "Mbinu za kilimo smart kinachostahimili mabadiliko ya tabianchi, usimamizi wa mazingira UN-standard, ongeza mavuno 200%, msaada wa funding.", en: "Climate-smart farming, UN-standard environmental management, 200% yield increase, climate funding support." },
  project: { name: "Project Planning", price: 250, disc: 10, final: 225, days: "10-14 siku", sw: "Kupanga mradi kuanzia wazo mpaka utekelezaji - Gantt chart, budget, risk analysis.", en: "Planning from idea to execution - Gantt, budget, risk." },
  website: { name: "Professional Website", price: 99, disc: 15, final: 84, days: "3-5 siku", sw: "Website ya kisasa inayofanya kazi kwenye simu na computer, SEO, na payment.", en: "Modern responsive website, SEO, payments." },
  whatsapp: { name: "WhatsApp AI Bot", price: 150, disc: 10, final: 135, days: "2-3 siku", sw: "Bot kama huu unayeongea naye sasa - anajibu 24/7, anauza, anaelimisha.", en: "Bot like this one - replies 24/7, sells, educates." },
  aiengineer: { name: "AI Automation Engineer", price: 250, disc: 15, final: 212, days: "7-14 siku", sw: "Inaunganisha WhatsApp, Website, Email, M-Pesa/TigoPesa. Inafanya kazi masaa 24/7, inaokoa masaa 8 kila siku, mauzo 300%.", en: "Connects WhatsApp, Website, Email, M-Pesa. Works 24/7, saves 8hrs daily, 300% sales." },
  marketing: { name: "AI Digital Marketing Viral", price: 149, disc: 25, final: 111, days: "Kuanza siku 1", sw: "TRENDING! AI inatengeneza video/post viral kila siku, brand inajulikana WORLDWIDE, wateja wanakuja wenyewe, mauzo 500% kwa mwezi 1. Bila hii biashara inabaki nyuma.", en: "TRENDING! AI creates viral videos/posts daily, brand known WORLDWIDE, customers come automatically, 500% growth in 1 month." }
};

function getServiceKey(txt){
  if(txt.includes('evaluat')||txt.includes('tathmini')) return 'evaluation';
  if(txt.includes('monitor')) return 'monitoring';
  if(txt.includes('logframe')||txt.includes('logical')) return 'logframe';
  if(txt.includes('grant')||txt.includes('proposal')||txt.includes('kuomba pesa')) return 'grant';
  if(txt.includes('strategic')||txt.includes('mkakati')) return 'strategic';
  if(txt.includes('feasib')||txt.includes('upembuzi')) return 'feasibility';
  if(txt.includes('business')&&!txt.includes('ai')) return 'business';
  if(txt.includes('policy')||txt.includes('sera')) return 'policy';
  if(txt.includes('agri')||txt.includes('shamba')||txt.includes('mazingira')||txt.includes('climate')||txt.includes('kilimo')) return 'agrarian';
  if(txt.includes('project plan')) return 'project';
  if(txt.includes('website')||txt.includes('tovuti')) return 'website';
  if(txt.includes('whatsapp bot')||txt.includes('bot ya whatsapp')) return 'whatsapp';
  if(txt.includes('automation engineer')||txt.includes('engineer')) return 'aiengineer';
  if(txt.includes('market')||txt.includes('viral')||txt.includes('brand')||txt.includes('tangaza')) return 'marketing';
  if(txt.match(/^\s*1\s*$/)) return 'evaluation';
  if(txt.match(/^\s*2\s*$/)) return 'monitoring';
  if(txt.match(/^\s*14\s*$/)) return 'marketing';
  return null;
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_final14');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
        if(u.qr){ lastQR = await QRCode.toDataURL(u.qr); console.log('QR /qr'); }
        if(u.connection==='open'){ console.log('CONNECTED ✅'); lastQR=null; }
    });

    sock.ev.on('messages.upsert', async ({messages})=>{
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const raw=m.message.conversation||m.message.extendedTextMessage?.text||"";
        const txt=raw.toLowerCase(); const from=m.key.remoteJid;
        const isSW = /habari|bei|ni nini|maana|shamba|tathmini|muda|punguzo|tengeneza/.test(txt);

        let reply="";
        const key = getServiceKey(txt);

        if(txt.match(/^(hi|hello|habari|mambo|menu|start|huduma|services)/)){
            reply = `🌐 MBILAO WORLDWIDE - 14 HUDUMA

✅ Chagua huduma unayopenda
✅ FREE consultation ya kwanza
✅ Bei kuanzia $79 tu na punguzo

Niambie unahitaji msaada gani leo? Niko tayari kusikiliza!

Andika neno kama "marketing ni nini?", "bei ya evaluation?", "unatengeneza kwa siku ngapi?", au namba 1-14.`;
        } else if(key){
            const s = SERVICES[key];
            const asksPrice = txt.includes('bei')||txt.includes('price')||txt.includes('punguzo')||txt.includes('discount')||txt.includes('gharama');
            const asksTime = txt.includes('muda')||txt.includes('siku ngapi')||txt.includes('how long')||txt.includes('days')||txt.includes('utachukua');
            const asksHow = txt.includes('unatengenezaje')||txt.includes('jinsi')||txt.includes('how do you')||txt.includes('process');

            if(isSW){
                reply = `📚 ${s.name.toUpperCase()}

MAANA YAKE: ${s.sw}

JINSI TUNAVYOTENGENEZA: ${key==='marketing'?'Hatua 1: Tunachambua biashara yako. Hatua 2: AI inatengeneza content viral kila siku. Hatua 3: Tunapost na kutangaza WORLDWIDE. Hatua 4: Report ya mauzo.' : key==='agrarian'?'Hatua 1: Tathmini ya shamba/mazingira. Hatua 2: Mbinu smart za kilimo/mazingira. Hatua 3: Mpango wa kuongeza mavuno 200%. Hatua 4: Link na funding ya climate.' : 'Hatua 1: Mahojiano na wewe. Hatua 2: Kukusanya data. Hatua 3: Kuandika kwa viwango vya UN/USAID. Hatua 4: Review na delivery.'}

BEI: $${s.price} → Punguzo ${s.disc}% = $${s.final} TU! 🔥
MUDA: ${s.days}
UHAKIKISHO: At MBILAO WORLDWIDE tunakuhakikishia huduma 100% hadi uridhike, tunakusimamia hatua kwa hatua, msaada wa milele. Hakuna hasara! Karibu sana! 🙏

Uko tayari tuanze?`;
            } else {
                reply = `📚 ${s.name.toUpperCase()}

WHAT IT IS: ${s.en}

HOW WE MAKE IT: ${key==='marketing'?'Step1: Analyze business. Step2: AI creates viral content daily. Step3: Post & promote WORLDWIDE. Step4: Sales report.' : 'Step1: Interview you. Step2: Data collection. Step3: Write to UN/USAID standards. Step4: Review & delivery.'}

PRICE: $${s.price} → ${s.disc}% OFF = $${s.final} ONLY! 🔥
TIMELINE: ${s.days}
GUARANTEE: MBILAO WORLDWIDE guarantees 100% satisfaction, step-by-step support, lifetime assistance. Welcome! 🙏`;
            }
        } else if(txt.includes('bei')||txt.includes('price')||txt.includes('list')){
            reply = `🌐 14 SERVICES FROM $79:
1. Evaluation $99→$84
2. Monitoring $99→$84
3. Logframe $99→$84
4. Grant $450→$405
5. Strategic $300→$255
6. Feasibility $149→$119
7. Business $120→$108
8. Policy $150→$127
9. Agrarian/Climate $99→$79 MIN!
10. Project $250→$225
11. Website $99→$84 MIN!
12. WhatsApp Bot $150→$135
13. AI Engineer $250→$212
14. 🔥 Marketing Viral $149→$111 [TRENDING]

Uliza chochote kama "marketing unatengeneza vipi na muda gani?"`;
        } else {
            reply = isSW? `Nimekuelewa! Uliza kuhusu huduma yoyote - nitakueleza maana, jinsi tunavyotengeneza, bei, punguzo, muda na uhakikisho. Mfano "marketing bei na muda?" Karibu! 🙏` : `Got it! Ask about any service - I'll explain meaning, process, price, discount, timeline, guarantee. Eg "marketing price and timeline?" Welcome! 🙏`;
        }

        await sock.sendMessage(from,{text:reply});
    });
}
startBot();
app.get('/',(req,res)=>res.send('MBILAO 14 SMART LIVE'));
app.get('/qr',(req,res)=>{
    if(!lastQR) return res.send('<h1>MBILAO Connected ✅ - No need QR</h1>');
    res.send(`<h1>Scan MBILAO 14 SMART</h1><img src="${lastQR}" width="330"/>`);
});
app.listen(10000,()=>console.log('MBILAO 14 SMART LIVE'));
