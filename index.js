const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

let sockGlobal = null;
let lastQr = null;
let isStarting = false;
const userMemory = new Map();

// 7 SERVICES - BILA DONATION & AGRARIUM
const SERVICES = `
🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐

1️⃣ WEBSITE DESIGN $99-$484
   Business, Portfolio, E-commerce

2️⃣ WHATSAPP BOT $150-$350
   Auto-reply 24/7, QR & Pair Code

3️⃣ AI MARKETING VIRAL $149-$1111
   AI content, Viral video, +500% sales

4️⃣ GRANT WRITING $450-$1405
   Project funding worldwide

5️⃣ TATHMINI / EVALUATION $99
   Professional project evaluation

6️⃣ AI AUTOMATION MENTORSHIP $199-$999
   Learn AI, Automate business, 1-on-1 coaching

7️⃣ PROJECTS PLANNING & MANAGEMENT $149-$1299
   Proposal, Planning, Monitoring, Reporting

📞 0795804621 / WhatsApp: 255795804621
🌐 Worldwide Consultant
`;

const deep = {
  evaluation: {
    0: `${SERVICES}\n\n**EVALUATION / TATHMINI Level 1**\nUchunguzi wa kitaalamu wa mradi.\nType "eleza zaidi"`,
    1: `**EVALUATION Level 2 - KINA**\nInput-Process-Output-Impact. AI analysis!\nType "zaidi"`,
    2: `**EVALUATION Level 3 - EXPERT**\nFull report + Recommendations $99!\n0795804621 WORLDWIDE🌐`
  },
  planning: {
    0: `${SERVICES}\n\n**PLANNING & MANAGEMENT Level 1**\nUsimamizi wa miradi kitaalamu!\nProposal, Budget, Logframe!\nType "eleza zaidi"`,
    1: `**PLANNING Level 2**\nProposal, Workplan, Budget, Monitoring, Report!\nType "zaidi"`,
    2: `**PLANNING Level 3 - OFFER**\nProposal kamili + Budget + Logframe = $149!\n0795804621 WORLDWIDE🌐`
  },
  mentorship: {
    0: `${SERVICES}\n\n**AI MENTORSHIP Level 1**\nJifunze AI, automate biashara!\nType "eleza zaidi"`,
    1: `**MENTORSHIP Level 2**\nChatGPT, Bot, AI Video, Sales Funnel!\nKazi 2hrs badala ya 10hrs! Type "zaidi"`,
    2: `**MENTORSHIP Level 3 - VIP**\n1 Month + Bot + Website = $299! Nafasi 5 tu!\n0795804621 WORLDWIDE🌐`
  },
  marketing: {
    0: `${SERVICES}\n\n**MARKETING Level 1** +500% sales! Type "eleza zaidi"`,
    1: `**MARKETING Level 2** Bot + Viral Videos + Funnel! Type "zaidi"`,
    2: `**MARKETING Level 3** Website+Bot+Marketing $199! 0795804621`
  },
  general: `${SERVICES}\n\nKaribu! Welcome! MBILAO WORLDWIDE🌐\nUliza: tathmini / planning / mentorship / marketing / bei`
};

app.get('/', (req,res)=>{ res.send(`<html><body style="text-align:center;font-family:Arial;padding:20px"><h1>🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐</h1><h2 style="color:green">LIVE 24/7 - 7 SERVICES!</h2><p><a href="/qr" style="background:green;color:white;padding:12px 25px;text-decoration:none;border-radius:8px">QR CODE</a> <a href="/pair" style="background:blue;color:white;padding:12px 25px;text-decoration:none;border-radius:8px">PAIR CODE</a></p><p>📞 0795804621 - Bila Donation & Agrarium</p></body></html>`); });
app.get('/status', (req,res)=>{ res.json({bot:!!sockGlobal, qr:!!lastQr, connected: sockGlobal?.authState?.creds?.registered || false}); });
app.get('/qr', async (req,res)=>{
  if(sockGlobal?.authState?.creds?.registered) return res.send('<h1>CONNECTED ✓ 7 SERVICES WORLDWIDE🌐</h1>');
  if(!lastQr){ if(!isStarting) startBot(); return res.send('<h1>Starting Bot... 15s</h1><script>setTimeout(()=>location.reload(),15000)</script>'); }
  res.send(`<html><body style="text-align:center"><h1>SCAN QR - 7 SERVICES</h1><img src="${lastQr}" style="width:90%;max-width:380px"><br><br><a href="/pair">Use Pair Code</a></body></html>`);
});
app.get('/pair', async (req,res)=>{
  try{
    if(!sockGlobal){ if(!isStarting) startBot(); return res.send('<h1>Bot Inaamka... 20s</h1><p>Error Connection Closed - Fixing...</p><script>setTimeout(()=>location.reload(),20000)</script>'); }
    if(sockGlobal.authState.creds.registered) return res.send('<h1>ALREADY CONNECTED ✓ 7 SERVICES</h1>');
    await new Promise(r=>setTimeout(r,3000));
    const code = await sockGlobal.requestPairingCode("255795804621");
    res.send(`<html><body style="text-align:center;font-family:Arial;padding:20px"><h1>CODE: ${code}</h1><h1 style="font-size:60px;background:black;color:#0f0;padding:20px;letter-spacing:10px;border-radius:10px">${code}</h1><p>WhatsApp > Linked Devices > Link with phone number</p><p>MBILAO WORLDWIDE🌐 7 SERVICES</p></body></html>`);
  }catch(e){
    lastQr=null; setTimeout(()=>{ try{ startBot() }catch{} },3000);
    res.send(`<h1>Error: ${e.message}</h1><p>Restarting... 15s</p><script>setTimeout(()=>location.reload(),15000)</script>`);
  }
});
app.get('/restart', (req,res)=>{ lastQr=null; sockGlobal=null; startBot(); res.send('<h1>Restarting... 10s</h1><script>setTimeout(()=>location.href="/qr",10000)</script>'); });

async function startBot(){
  if(isStarting) return; isStarting=true;
  try{
    if(!fs.existsSync('./session')) fs.mkdirSync('./session');
    const {state, saveCreds} = await useMultiFileAuthState('./session');
    const sock = makeWASocket({auth: state, logger: pino({level:'silent'}), printQRInTerminal:false, browser:["MBILAO WORLDWIDE","Chrome","1.0"], connectTimeoutMs:60000});
    sockGlobal = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
      const {connection, lastDisconnect, qr} = u;
      if(qr){ lastQr = await QRCode.toDataURL(qr); isStarting=false; }
      if(connection==='open'){ console.log('CONNECTED ✓ 7 SERVICES'); lastQr=null; isStarting=false; }
      if(connection==='close'){ const code = lastDisconnect?.error?.output?.statusCode; isStarting=false; lastQr=null; if(code!==DisconnectReason.loggedOut) setTimeout(startBot,5000); }
    });
    sock.ev.on('messages.upsert', async (m)=>{
      const msg = m.messages[0]; if(!msg.message || msg.key.fromMe) return;
      const raw = msg.message.conversation || msg.message.extendedTextMessage?.text || ""; const txt = raw.toLowerCase(); const from = msg.key.remoteJid;
      if(!userMemory.has(from)) userMemory.set(from,{topic:null,depth:0}); const mem = userMemory.get(from);
      let topic = mem.topic;
      if(txt.includes('tathmini')||txt.includes('evaluation')) topic='evaluation';
      else if(txt.includes('plan')||txt.includes('proposal')||txt.includes('project')||txt.includes('mpango')) topic='planning';
      else if(txt.includes('mentor')||txt.includes('mafunzo')||txt.includes('automation')||txt.includes('fundisha')) topic='mentorship';
      else if(txt.includes('market')||txt.includes('biashara')||txt.includes('website')||txt.includes('bot')||txt.includes('grant')) topic='marketing';
      else if(txt.includes('bei')||txt.includes('price')||txt.includes('huduma')||txt.includes('hello')||txt.includes('hi')||txt.includes('habari')) topic='general';
      const wantsMore = txt.includes('eleza')||txt.includes('zaidi')||txt.includes('more');
      let reply=''; if(topic==='general') reply=deep.general; else if(deep[topic]){ if(wantsMore){ mem.depth=Math.min(mem.depth+1,2); reply=deep[topic][mem.depth]; } else{ if(topic!==mem.topic){mem.topic=topic;mem.depth=0;} reply=deep[topic][mem.depth]; } } else{ reply=`"${raw}"\n\n${deep.general}`; }
      mem.topic=topic; userMemory.set(from,mem); await sock.sendMessage(from,{text:reply});
    });
  }catch(e){ isStarting=false; setTimeout(startBot,10000); }
}
app.listen(PORT, ()=>{ console.log('MBILAO 7 SERVICES LIVE on '+PORT); startBot(); });
