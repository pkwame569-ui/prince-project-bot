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
   Business, Portfolio, E-commerce

2️⃣ WHATSAPP BOT $150-$350
   Auto-reply 24/7, Pair Code, QR

3️⃣ AI MARKETING VIRAL $149-$1111
   AI content, Viral video, +500% sales

4️⃣ AGRARIUM SYSTEM $99-$479
   Smart farming

5️⃣ GRANT WRITING $450-$1405
   Project funding worldwide

6️⃣ TATHMINI / EVALUATION $99
   Professional evaluation

📞 0795804621 / WhatsApp: 255795804621
🌐 Worldwide Consultant
`;

const deep = {
  evaluation: {
    0: `${SERVICES}\n\n**EVALUATION / TATHMINI Level 1**
Uchunguzi wa kitaalamu - Je mradi umefikia malengo? / Professional check if project achieved goals.

Bila tathmini = safari bila ramani.

Type "eleza zaidi / explain more"`,
    1: `**EVALUATION Level 2 - KINA**
Hatua 4: Input, Process, Output, Impact. Tunatumia AI kuchambua haraka / We use AI to analyze fast! Andika "zaidi / more"`,
    2: `**EVALUATION Level 3 - EXPERT**
Ripoti kamili na AI + Recommendations! Full report!

OFA $99 only! Contact 0795804621\nMBILAO PROJECT CONSULTANT WORLDWIDE🌐`
  },
  marketing: {
    0: `${SERVICES}\n\n**AI MARKETING VIRAL Level 1**
Bila AI biashara kama duka gizani! Without AI business is like shop in darkness! +500% sales! Type "eleza zaidi / explain more"`,
    1: `**MARKETING Level 2**
ChatGPT + Bot + Viral Videos + Sales Funnel automatic. 10x customers in 7 days! Type "zaidi / more"`,
    2: `**MARKETING Level 3 - OFA / OFFER**
Website + Bot + Marketing = $199 only! (Badala ya $999) 0795804621\nMBILAO PROJECT CONSULTANT WORLDWIDE🌐`
  },
  general: `${SERVICES}\n\nKaribu! Welcome! 👋\nMBILAO PROJECT CONSULTANT WORLDWIDE🌐\n\nUliza / Ask: TATHMINI / EVALUATION / MARKETING / WEBSITE / BOT / PRICE / BEI`
};

app.get('/', (req, res) => {
  res.send(`
    <html><body style="font-family:Arial;padding:20px;text-align:center">
    <h1>🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐</h1>
    <h2 style="color:green">LIVE 24/7 - Bot is Online!</h2>
    <div style="text-align:left;max-width:550px;margin:auto;background:#f5f5f5;padding:20px;border-radius:10px">
    <h3>SERVICES / HUDUMA WORLDWIDE:</h3>
    <p>1. Website $99-$484</p>
    <p>2. WhatsApp Bot $150-$350</p>
    <p>3. AI Marketing Viral $149-$1111</p>
    <p>4. Agrarium $99-$479</p>
    <p>5. Grant Writing $450-$1405</p>
    <p>6. Evaluation $99</p>
    <hr>
    <p><b>📞 0795804621 / 255795804621</b></p>
    <p><a href="/qr">QR CODE</a> | <a href="/pair">PAIR CODE</a></p>
    <p><small>🌐 Worldwide Consultant | English = Swahili</small></p>
    </div></body></html>
  `);
});

app.get('/qr', (req, res) => {
  if (sockGlobal?.authState?.creds?.registered) return res.send('<h1 style="text-align:center">CONNECTED ✓ WORLDWIDE🌐</h1>');
  if (!lastQr) return res.send('<h1 style="text-align:center">Starting... 5s</h1><script>setTimeout(()=>location.reload(),5000)</script>');
  res.send(`<html><body style="text-align:center"><h1>MBILAO WORLDWIDE - SCAN QR</h1><img src="${lastQr}" style="width:90%;max-width:400px"></body></html>`);
});

app.get('/pair', async (req, res) => {
  try {
    if (!sockGlobal) return res.send('<h1>Starting...</h1><script>setTimeout(()=>location.reload(),5000)</script>');
    if (sockGlobal.authState.creds.registered) return res.send('<h1>CONNECTED ✓</h1>');
    const phone = "255795804621";
    const code = await sockGlobal.requestPairingCode(phone);
    console.log('PAIR CODE:', code);
    res.send(`<html><body style="text-align:center"><h1>CODE: ${code}</h1><h1 style="font-size:60px;background:#000;color:#0f0;padding:20px;letter-spacing:10px">${code}</h1><p>MBILAO PROJECT CONSULTANT WORLDWIDE🌐</p><p>0795804621</p></body></html>`);
  } catch (e) {
    res.send(`Error ${e.message} <script>setTimeout(()=>location.reload(),5000)</script>`);
  }
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false, browser: ["MBILAO WORLDWIDE","Chrome","1.0"] });
  sockGlobal = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) { lastQr = await QRCode.toDataURL(qr); console.log('QR READY'); }
    if (connection === 'open') { console.log('WORLDWIDE CONNECTED ✓'); lastQr = null; }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(startBot, 5000);
    }
  });
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const raw = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const txt = raw.toLowerCase();
    const from = msg.key.remoteJid;
    if (!userMemory.has(from)) userMemory.set(from, { topic: null, depth: 0 });
    const mem = userMemory.get(from);
    let topic = mem.topic;
    if (txt.includes('tathmini') || txt.includes('evaluation') || txt.includes('evaluate')) topic = 'evaluation';
    else if (txt.includes('market') || txt.includes('biashara') || txt.includes('mauzo') || txt.includes('sales') || txt.includes('business') || txt.includes('viral')) topic = 'marketing';
    else if (txt.includes('website') || txt.includes('tovuti') || txt.includes('web') || txt.includes('bot') || txt.includes('whatsapp')) topic = 'marketing';
    else if (txt.includes('bei') || txt.includes('price') || txt.includes('cost') || txt.includes('how much') || txt.includes('huduma') || txt.includes('service') || txt.includes('habari') || txt.includes('hello') || txt.includes('hi')) topic = 'general';
    const wantsMore = txt.includes('eleza') || txt.includes('zaidi') || txt.includes('more') || txt.includes('explain') || txt.includes('details');
    let reply = '';
    if (topic === 'general') reply = deep.general;
    else if (deep[topic]) {
      if (wantsMore) { mem.depth = Math.min(mem.depth + 1, 2); reply = deep[topic][mem.depth]; }
      else { if (topic!== mem.topic) { mem.topic = topic; mem.depth = 0; } reply = deep[topic][mem.depth]; }
    } else { reply = `Swali / Q: "${raw}"\n\n${deep.general}`; }
    mem.topic = topic; userMemory.set(from, mem);
    await sock.sendMessage(from, { text: reply });
  });
}

app.listen(PORT, () => { console.log('MBILAO PROJECT CONSULTANT WORLDWIDE🌐 LIVE on ' + PORT); startBot(); });
