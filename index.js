const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

let sockGlobal = null;
let lastQr = null;
const userMemory = new Map();

const SERVICES = `
🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐

1️⃣ WEBSITE DESIGN $99-$484
2️⃣ WHATSAPP BOT $150-$350
3️⃣ AI MARKETING VIRAL $149-$1111
4️⃣ AGRARIUM SYSTEM $99-$479
5️⃣ GRANT WRITING $450-$1405
6️⃣ TATHMINI / EVALUATION $99

📞 0795804621 / 255795804621
`;

const deep = {
  evaluation: {
    0: `${SERVICES}\n\n**EVALUATION Level 1** - Uchunguzi wa kitaalamu. Type "eleza zaidi"`,
    1: `**EVALUATION Level 2** - Input, Process, Output, Impact. AI analysis! Type "zaidi"`,
    2: `**EVALUATION Level 3** - Full report $99! 0795804621 - WORLDWIDE🌐`
  },
  marketing: {
    0: `${SERVICES}\n\n**MARKETING Level 1** +500% sales! Type "eleza zaidi"`,
    1: `**MARKETING Level 2** AI + Bot + Viral. 10x customers! Type "zaidi"`,
    2: `**MARKETING Level 3** OFFER $199! 0795804621 WORLDWIDE🌐`
  },
  general: `${SERVICES}\n\nKaribu! Welcome! MBILAO PROJECT CONSULTANT WORLDWIDE🌐\nUliza: TATHMINI / EVALUATION / MARKETING / PRICE / BEI`
};

app.get('/', (req,res)=>{
  res.send(`<html><body style="text-align:center;font-family:Arial;padding:20px">
  <h1>🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐</h1>
  <h2 style="color:green">LIVE 24/7</h2>
  <p><a href="/qr" style="background:green;color:white;padding:15px 30px;text-decoration:none;border-radius:10px">QR CODE</a></p>
  <p><a href="/pair" style="background:blue;color:white;padding:15px 30px;text-decoration:none;border-radius:10px">PAIR CODE</a></p>
  <p>📞 0795804621</p>
  </body></html>`);
});

app.get('/qr', (req,res)=>{
  if(sockGlobal?.authState?.creds?.registered) return res.send('<h1>CONNECTED ✓ WORLDWIDE🌐</h1>');
  if(!lastQr) return res.send('<h1>Starting... 5s</h1><script>setTimeout(()=>location.reload(),5000)</script>');
  res.send(`<html><body style="text-align:center"><h1>SCAN QR</h1><img src="${lastQr}" style="width:90%;max-width:400px"><br><a href="/pair">Get Pair Code Instead</a></body></html>`);
});

// *** FIX YA ERROR CONNECTION CLOSED ***
app.get('/pair', async (req,res)=>{
  try{
    if(!sockGlobal){
      return res.send('<h1>Bot Starting... Wait 10s</h1><p>Error Connection Closed - Retry 10s</p><script>setTimeout(()=>location.reload(),10000)</script>');
    }
    if(sockGlobal.authState.creds.registered){
      return res.send('<h1>ALREADY CONNECTED ✓</h1><p>MBILAO WORLDWIDE🌐</p>');
    }
    // FIX: Subiri sock iwe tayari
    await new Promise(r=>setTimeout(r,2000));
    const phone = "255795804621";
    const code = await sockGlobal.requestPairingCode(phone);
    console.log('PAIR CODE:',code);
    res.send(`<html><body style="text-align:center;font-family:Arial">
    <h1>YOUR PAIR CODE</h1>
    <h1 style="font-size:50px;background:black;color:#0f0;padding:20px;letter-spacing:8px">${code}</h1>
    <p>Go to WhatsApp > Linked Devices > Link with phone number > Enter code</p>
    <p><b>MBILAO PROJECT CONSULTANT WORLDWIDE🌐</b><br>0795804621</p>
    <p><a href="/qr">Back to QR</a></p>
    </body></html>`);
  }catch(e){
    console.log('Pair error:',e.message);
    res.send(`<h2>Error: ${e.message}</h2><p>Retry in 10s...</p><p>Make sure bot is not already connected</p><script>setTimeout(()=>location.reload(),10000)</script>`);
  }
});

async function startBot(){
  const {state, saveCreds} = await useMultiFileAuthState('./session');
  const sock = makeWASocket({auth: state, logger: pino({level:'silent'}), printQRInTerminal:false, browser:["MBILAO WORLDWIDE","Chrome","1.0"]});
  sockGlobal = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const {connection, lastDisconnect, qr} = u;
    if(qr){ lastQr = await QRCode.toDataURL(qr); console.log('QR READY'); }
    if(connection==='open'){ console.log('WORLDWIDE CONNECTED ✓'); lastQr=null; }
    if(connection==='close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) setTimeout(startBot,5000);
    }
  });
  sock.ev.on('messages.upsert', async (m)=>{
    const msg = m.messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const raw = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const txt = raw.toLowerCase();
    const from = msg.key.remoteJid;
    if(!userMemory.has(from)) userMemory.set(from,{topic:null,depth:0});
    const mem = userMemory.get(from);
    let topic = mem.topic;
    if(txt.includes('tathmini')||txt.includes('evaluation')||txt.includes('evaluate')) topic='evaluation';
    else if(txt.includes('market')||txt.includes('biashara')||txt.includes('website')||txt.includes('bot')||txt.includes('mauzo')) topic='marketing';
    else if(txt.includes('bei')||txt.includes('price')||txt.includes('huduma')||txt.includes('hello')||txt.includes('hi')||txt.includes('habari')) topic='general';
    const wantsMore = txt.includes('eleza')||txt.includes('zaidi')||txt.includes('more')||txt.includes('explain');
    let reply='';
    if(topic==='general') reply=deep.general;
    else if(deep[topic]){
      if(wantsMore){ mem.depth=Math.min(mem.depth+1,2); reply=deep[topic][mem.depth]; }
      else{ if(topic!==mem.topic){mem.topic=topic;mem.depth=0;} reply=deep[topic][mem.depth]; }
    }else{ reply=`"${raw}"\n\n${deep.general}`; }
    mem.topic=topic; userMemory.set(from,mem);
    await sock.sendMessage(from,{text:reply});
  });
}

app.listen(PORT,()=>{ console.log('WORLDWIDE LIVE on '+PORT); startBot(); });
