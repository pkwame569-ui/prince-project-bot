import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 10000;

let sockGlobal = null;
let lastQr = null;
let isStarting = false;
const userMemory = new Map();

// 7 SERVICES - KNOWLEDGE BASED
const SERVICES = `
🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐
1. Website $99-$484
2. WhatsApp Bot $150-$350
3. AI Marketing $149-$1111
4. Grant Writing $450-$1405
5. Evaluation $99
6. AI Mentorship $199-$999
7. Planning & Management $149-$1299
📞 0795804621 WORLDWIDE🌐
`;

const deep = {
  evaluation: {
    0: `${SERVICES}\n\n**EVALUATION / TATHMINI - Level 1 (Basic Knowledge)**\nUchunguzi wa kitaalamu - Je mradi umefikia malengo? Input, Process, Output?\nProfessional check if project achieved goals.\n\nType "eleza zaidi" au "more" for Level 2`,
    1: `${SERVICES}\n\n**EVALUATION Level 2 (Deep Knowledge)**\nHatua 4: Input (rasilimali), Process (utekelezaji), Output (matokeo), Impact (athari).\nTunatumia AI + OECD Criteria: Relevance, Effectiveness, Efficiency, Sustainability.\n\nType "zaidi" for Expert Level 3`,
    2: `**EVALUATION Level 3 (Expert - $99)**\nFull report: Data collection, Analysis, Recommendations, Logframe review!\nInafaa kwa NGOs, miradi ya kilimo, elimu, afya.\n\nContact: 0795804621 MBILAO WORLDWIDE🌐`
  },
  planning: {
    0: `${SERVICES}\n\n**PLANNING & MANAGEMENT - Level 1 (Knowledge)**\nUsimamizi wa miradi kitaalamu! Bila plan = kushindwa!\nProposal, Budget, Logframe, Monitoring!\n\nType "eleza zaidi" for Level 2`,
    1: `${SERVICES}\n\n**PLANNING Level 2 (Deep Knowledge)**\nTunafanya:\n- Project Proposal (Andiko la mradi)\n- Workplan & Budget (Mpango kazi & bajeti)\n- Logical Framework / Logframe\n- Monitoring & Evaluation Plan\n- Risk Management\n\nType "zaidi" for Offer Level 3`,
    2: `**PLANNING Level 3 (Expert Offer $149)**\nProposal kamili + Budget + Logframe + M&E Plan = $149 only!\nGrant-winning formula - 90% success rate!\n\nContact: 0795804621 WORLDWIDE🌐`
  },
  mentorship: {
    0: `${SERVICES}\n\n**AI MENTORSHIP - Level 1 (Basic Knowledge)**\nJifunze AI, automate biashara yako! Work 2hrs badala ya 10hrs!\nLearn ChatGPT, WhatsApp Bot, AI Video, Automation!\n\nType "eleza zaidi" for Level 2`,
    1: `${SERVICES}\n\n**MENTORSHIP Level 2 (Deep Knowledge)**\nUtajifunza:\n- ChatGPT for business / Biashara\n- WhatsApp Automation / Bot auto-reply 24/7\n- AI Video & Content (Reels, TikTok viral)\n- Sales Funnel automation\n- Lead generation AI\n\nResult: +500% sales, save time!\n\nType "zaidi" for VIP Offer`,
    2: `**MENTORSHIP Level 3 (VIP $299)**\n1 Month Mentorship 1-on-1 + Bot + Website = $299 (badala ya $1299)\nNafasi 5 tu! Only 5 slots per month!\nCertificate + Lifetime support!\n\nContact: 0795804621 WORLDWIDE🌐`
  },
  marketing: {
    0: `${SERVICES}\n\n**AI MARKETING VIRAL - Level 1 (Knowledge)**\nBila AI biashara kama duka gizani! Hakuna wateja!\nAI + Bot + Viral = +500% sales!\n\nType "eleza zaidi" for Level 2`,
    1: `${SERVICES}\n\n**MARKETING Level 2 (Deep)**\nSystem yetu:\n- AI Content creation (30 posts per day)\n- WhatsApp Bot auto-closing sales\n- Viral Video scripts (TikTok/Reels)\n- Funnel: Lead -> Nurture -> Sale auto\n10x customers in 7 days!\n\nType "zaidi" for Offer`,
    2: `**MARKETING Level 3 (Offer $199)**\nWebsite + Bot + 30 Viral Videos + Funnel = $199 only!\n(Original $1111)\nROI in 14 days guaranteed!\n\nContact: 0795804621 WORLDWIDE🌐`
  },
  website: {
    0: `${SERVICES}\n\n**WEBSITE DESIGN - Level 1**\nBusiness, Portfolio, E-commerce - Responsive, Fast, SEO!\n$99-$484 Worldwide!\n\nType "eleza zaidi" for Level 2`,
    1: `**WEBSITE Level 2**\nTunatengeneza:\n- Business Website $99\n- E-commerce $199\n- Portfolio $149\n- All with M-Pesa, PayPal, WhatsApp integration!\nMobile + SEO + Speed optimized!\n\nType "zaidi" for Offer`,
    2: `**WEBSITE Level 3 - OFFER**\nWebsite + Domain + Hosting + Bot = $149!\nLive in 48hrs! Worldwide🌐\n0795804621`
  },
  bot: {
    0: `${SERVICES}\n\n**WHATSAPP BOT - Level 1**\nAuto-reply 24/7, Pair Code, QR, Knowledge Based!\nNo need 2nd phone! $150-$350\n\nType "eleza zaidi"`,
    1: `**BOT Level 2**\nFeatures:\n- Auto-reply 24/7 with AI knowledge\n- Pair Code (no QR needed)\n- 7 Services memory (Level 0-2)\n- Works on Render 24/7\n- Multi-language Swahili/English\n\nType "zaidi"`,
    2: `**BOT Level 3 - OFFER $150**\nBot + Knowledge Base + Setup + Training = $150!\n0795804621 WORLDWIDE🌐`
  },
  grant: {
    0: `${SERVICES}\n\n**GRANT WRITING - Level 1**\nProject funding worldwide! $450-$1405\nProposal inashinda grants!\n\nType "eleza zaidi"`,
    1: `**GRANT Level 2**\nTunandika:\n- Concept Note\n- Full Proposal\n- Logframe & Budget\n- 90% success rate USAID, EU, UN\n\nType "zaidi"`,
    2: `**GRANT Level 3 - $450**\nFull package - Ready to submit!\n0795804621 WORLDWIDE🌐`
  },
  general: `${SERVICES}\n\nKaribu! Welcome! MBILAO WORLDWIDE🌐 - KNOWLEDGE BASED BOT!\n\nUliza chochote / Ask anything:\n- tathmini / evaluation\n- planning / mpango wa mradi\n- mentorship / mafunzo ya AI\n- marketing / biashara\n- website / tovuti\n- bot / whatsapp bot\n- grant / ufadhili\n- bei / price\n\nAndika "eleza zaidi" au "more" - bot itaongeza knowledge Level 2, 3!`
};

app.get('/', (req,res)=>{ res.send(`<html><body style="text-align:center;font-family:Arial;padding:20px"><h1>🌐 MBILAO WORLDWIDE 7 SERVICES - KNOWLEDGE BASED 🌐</h1><h2 style="color:green">LIVE 24/7 - DEEP LEVEL 0-2</h2><p><a href="/qr" style="background:green;color:white;padding:12px 25px;text-decoration:none;border-radius:8px">QR CODE</a> <a href="/pair" style="background:blue;color:white;padding:12px 25px;text-decoration:none;border-radius:8px">PAIR CODE</a></p><p>Knowledge Based: eleza zaidi => Level 2 => Level 3</p></body></html>`); });
app.get('/qr', async (req,res)=>{
  if(sockGlobal?.authState?.creds?.registered) return res.send('<h1>CONNECTED ✓ KNOWLEDGE BASED 7 SERVICES</h1>');
  if(!lastQr){ if(!isStarting) startBot(); return res.send('<h1>Starting... 15s</h1><script>setTimeout(()=>location.reload(),15000)</script>'); }
  res.send(`<html><body style="text-align:center"><h1>SCAN QR - KNOWLEDGE BASED</h1><img src="${lastQr}" style="width:90%;max-width:380px"><br><a href="/pair">Pair Code</a></body></html>`);
});
app.get('/pair', async (req,res)=>{
  try{
    if(!sockGlobal){ if(!isStarting) startBot(); return res.send('<h1>Booting 20s</h1><script>setTimeout(()=>location.reload(),20000)</script>'); }
    if(sockGlobal.authState.creds.registered) return res.send('<h1>ALREADY CONNECTED ✓</h1>');
    await new Promise(r=>setTimeout(r,3000));
    const code = await sockGlobal.requestPairingCode("255795804621");
    res.send(`<html><body style="text-align:center;font-family:Arial;padding:20px"><h1>CODE: ${code}</h1><h1 style="font-size:60px;background:black;color:#0f0;padding:20px;letter-spacing:10px">${code}</h1><p>WhatsApp > Linked Devices > Link with phone number</p><p>KNOWLEDGE BASED BOT 🌐</p></body></html>`);
  }catch(e){ lastQr=null; setTimeout(()=>{ try{ startBot() }catch{} },3000); res.send(`<h1>Error: ${e.message}</h1><p>15s</p><script>setTimeout(()=>location.reload(),15000)</script>`); }
});
app.get('/restart', (req,res)=>{ lastQr=null; sockGlobal=null; startBot(); res.send('<h1>Restarting 10s</h1><script>setTimeout(()=>location.href="/qr",10000)</script>'); });

async function startBot(){
  if(isStarting) return; isStarting=true;
  try{
    if(!fs.existsSync('./session')) fs.mkdirSync('./session');
    const {state, saveCreds} = await useMultiFileAuthState('./session');
    const sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), printQRInTerminal:false, browser:["MBILAO WORLDWIDE","Chrome","1.0"] });
    sockGlobal = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
      const {connection, lastDisconnect, qr} = u;
      if(qr){ lastQr = await QRCode.toDataURL(qr); isStarting=false; }
      if(connection==='open'){ console.log('CONNECTED ✓ KNOWLEDGE BASED 7 SERVICES'); lastQr=null; isStarting=false; }
      if(connection==='close'){ const c = lastDisconnect?.error?.output?.statusCode; isStarting=false; lastQr=null; if(c!==DisconnectReason.loggedOut) setTimeout(startBot,5000); }
    });
    sock.ev.on('messages.upsert', async (m)=>{
      const msg = m.messages[0]; if(!msg.message || msg.key.fromMe) return;
      const raw = msg.message.conversation || msg.message.extendedTextMessage?.text || ""; const txt = raw.toLowerCase(); const from = msg.key.remoteJid;
      if(!userMemory.has(from)) userMemory.set(from,{topic:null,depth:0});
      const mem = userMemory.get(from);
      let topic = mem.topic;
      if(txt.includes('tathmini')||txt.includes('evaluation')||txt.includes('evaluat')) topic='evaluation';
      else if(txt.includes('plan')||txt.includes('proposal')||txt.includes('mpango')||txt.includes('usimamizi')||txt.includes('management')) topic='planning';
      else if(txt.includes('mentor')||txt.includes('mafunzo')||txt.includes('automation')||txt.includes('fundisha')||txt.includes('coaching')) topic='mentorship';
      else if(txt.includes('market')||txt.includes('biashara')||txt.includes('mauzo')||txt.includes('sales')) topic='marketing';
      else if(txt.includes('website')||txt.includes('tovuti')||txt.includes('web ')) topic='website';
      else if(txt.includes('whatsapp')||txt.includes('bot')||txt.includes('auto-reply')) topic='bot';
      else if(txt.includes('grant')||txt.includes('ufadhili')||txt.includes('funding')) topic='grant';
      else if(txt.includes('bei')||txt.includes('price')||txt.includes('huduma')||txt.includes('service')||txt.includes('hello')||txt.includes('hi')||txt.includes('habari')||txt.includes('karibu')) topic='general';
      const wantsMore = txt.includes('eleza')||txt.includes('zaidi')||txt.includes('more')||txt.includes('explain')||txt.includes('details')||txt.includes('endelea');
      let reply='';
      if(topic==='general') reply=deep.general;
      else if(deep[topic]){
        if(wantsMore){ mem.depth=Math.min(mem.depth+1,2); reply=deep[topic][mem.depth]; }
        else{ if(topic!==mem.topic){mem.topic=topic;mem.depth=0;} reply=deep[topic][mem.depth]; }
      }else{ reply=`"${raw}"\n\n${deep.general}`; }
      mem.topic=topic; userMemory.set(from,mem);
      await sock.sendMessage(from,{text:reply});
    });
  }catch(e){ isStarting=false; setTimeout(startBot,10000); }
}
app.listen(PORT, ()=>{ console.log('MBILAO KNOWLEDGE BASED 7 SERVICES LIVE on '+PORT); startBot(); });
