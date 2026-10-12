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
   Smart farming / Kilimo smart

5️⃣ GRANT WRITING $450-$1405
   Project funding worldwide

6️⃣ TATHMINI / EVALUATION $99
   Professional evaluation

7️⃣ AI AUTOMATION MENTORSHIP $199-$999
   Learn AI, Automate business, 1-on-1 coaching / Mafunzo ya AI

8️⃣ PROJECTS PLANNING & MANAGEMENT $149-$1299
   Proposal, Planning, Monitoring, Reporting / Usimamizi wa miradi

📞 0795804621 / WhatsApp: 255795804621
🌐 Worldwide Consultant
`;

const deep = {
  evaluation: {
    0: `${SERVICES}\n\n**EVALUATION / TATHMINI Level 1**
Uchunguzi wa kitaalamu - Je mradi umefikia malengo?
Professional check if project achieved goals.

Type "eleza zaidi / explain more"`,
    1: `**EVALUATION Level 2 - KINA / DEEP**
Hatua 4: Input-Process-Output-Impact. AI analysis haraka!
Type "zaidi / more" for Level 3`,
    2: `**EVALUATION Level 3 - EXPERT**
Full report + Recommendations $99 only!
Contact: 0795804621 - MBILAO WORLDWIDE🌐`
  },
  planning: {
    0: `${SERVICES}\n\n**PROJECTS PLANNING & MANAGEMENT Level 1**
Usimamizi wa miradi kitaalamu / Professional project management.
Proposal, Budget, Logframe, Monitoring!

Bila plan = kushindwa! No plan = fail!

Type "eleza zaidi / explain more"`,
    1: `**PLANNING Level 2 - KINA**
Tunafanya / We do:
- Project Proposal / Andiko la mradi
- Workplan & Budget / Mpango kazi na bajeti
- Monitoring & Evaluation / Ufuatiliaji
- Final Report / Ripoti ya mwisho

Type "zaidi / more"`,
    2: `**PLANNING Level 3 - OFFER / OFA**
Proposal kamili + Budget + Logframe = $149 only!
Grant-winning formula!

Contact: 0795804621 - MBILAO PROJECT CONSULTANT WORLDWIDE🌐`
  },
  mentorship: {
    0: `${SERVICES}\n\n**AI AUTOMATION MENTORSHIP Level 1**
Jifunze AI, automate biashara yako!
Learn AI, automate your business!

Mentorship 1-on-1, WhatsApp bot, AI tools, Viral marketing!

Type "eleza zaidi / explain more"`,
    1: `**MENTORSHIP Level 2 - KINA**
Utajifunza / You will learn:
- ChatGPT for business
- WhatsApp Automation / Auto-reply bot
- AI Video & Content creation
- Sales Funnel automation

Result: Work 2hrs instead of 10hrs! Kazi masaa 2 badala ya 10!

Type "zaidi / more"`,
    2: `**MENTORSHIP Level 3 - VIP OFFER**
1 Month Mentorship + Bot + Website = $299 only!
(Instead of $1299)

Nafasi 5 tu! Only 5 slots!
Contact: 0795804621 - WORLDWIDE🌐`
  },
  marketing: {
    0: `${SERVICES}\n\n**AI MARKETING VIRAL Level 1**
Bila AI biashara kama duka gizani! +500% sales!
Type "eleza zaidi / explain more"`,
    1: `**MARKETING Level 2**
ChatGPT + Bot + Viral Videos + Funnel auto. 10x customers in 7 days!
Type "zaidi / more"`,
    2: `**MARKETING Level 3 - OFA**
Website + Bot + Marketing = $199 only! 0795804621 WORLDWIDE🌐`
  },
  general: `${SERVICES}\n\nKaribu! Welcome! 👋\nMBILAO PROJECT CONSULTANT WORLDWIDE🌐\n\nUliza chochote / Ask anything:\n- tathmini / evaluation\n- planning / mpango wa mradi\n- mentorship / mafunzo ya AI\n- marketing / biashara\n- bei / price`
};

app.get('/', (req,res)=>{
  res.send(`
    <html><body style="font-family:Arial;padding:20px;text-align:center">
    <h1>🌐 MBILAO PROJECT CONSULTANT WORLDWIDE 🌐</h1>
    <h2 style="color:green">LIVE 24/7 - 8 SERVICES!</h2>
    <div style="text-align:left;max-width:600px;margin:auto;background:#f5f5f5;padding:20px;border-radius:12px">
    <p>1. Website $99-$484</p>
    <p>2. WhatsApp Bot $150-$350</p>
    <p>3. AI Marketing Viral $149-$1111</p>
    <p>4. Agrarium $99-$479</p>
    <p>5. Grant Writing $450-$1405</p>
    <p>6. Evaluation $99</p>
    <p><b style="color:blue">7. AI Automation Mentorship $199-$999 ⭐ NEW</b></p>
    <p><b style="color:blue">8. Projects Planning & Management $149-$1299 ⭐ NEW</b></p>
    <hr>
    <p><b>📞 0795804621 / 255795804621</b></p>
    <p><a href="/qr">QR CODE</a> | <a href="/pair">PAIR CODE</a></p>
    </div></body></html>
  `);
});

app.get('/qr', (req,res)=>{
  if(sockGlobal?.authState?.creds?.registered) return res.send('<h1>CONNECTED ✓ WORLDWIDE🌐 8 SERVICES LIVE</h1>');
  if(!lastQr) return res.send('<h1>Starting... 5s</h1><script>setTimeout(()=>location.reload(),5000)</script>');
  res.send(`<html><body style="text-align:center"><h1>MBILAO WORLDWIDE - SCAN QR</h1><img src="${lastQr}" style="width:90%;max-width:400px"><br><a href="/pair">Get Pair Code</a></body></html>`);
});

app.get('/pair', async (req,res)=>{
  try{
    if(!sockGlobal) return res.send('<h1>Bot Starting...
