const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
let latestQR = null;

app.get('/', async (req,res)=>{
  if(req.query.reset==='1'){ try{ fs.rmSync('auth_info',{recursive:true,force:true}); }catch{} latestQR=null; return res.send('<h1>Imefutwa! <a href="/">Rudi</a></h1>'); }
  if(!latestQR) return res.send('<h1>LM TZ 9 LIVE - 0795804621 - AI ON</h1>');
  res.send(`<h1>SCAN 0795804621</h1><img src="${latestQR}" style="width:320px"/><script>setTimeout(()=>location.reload(),25000)</script>`);
});
app.get('/ping', (req,res)=> res.send('pong'));
app.listen(PORT,()=>console.log('Server on '+PORT));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are Prince from LM TZ 0795804621. Bilingual Smart Bot. Reply same language as client.
Services: 1 Bot 24H 150k TZS, 2 Website 90k, 3 Automation 200k, 4 Mentorship 90k, 5 Monitoring 90k, 6 Grant $450, 7 Planning $300, 8 Feasibility $57, 9 Business Plan $120.
Answer any question intelligently, short 4-6 lines, end with We will help for your company.
`;

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P().child({level:"fatal"})) },
    logger: P({level:'silent'}),
    printQRInTerminal:false,
    browser:["LM TZ 9","Chrome","1.0.0"]
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const {connection,qr}=u;
    if(qr) latestQR=await QRCode.toDataURL(qr);
    if(connection==='open'){ console.log('CONNECTED'); latestQR=null; }
    if(connection==='close'){ const r=u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut; if(r) startBot(); }
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const msg=messages[0]; if(!msg.message||msg.key.fromMe||msg.key.remoteJid.endsWith('@g.us')) return;
    const from=msg.key.remoteJid;
    const body=(msg.message.conversation||msg.message.extendedTextMessage?.text||"").trim();
    if(!body) return;
    try{
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{role:"system",content:SYSTEM_PROMPT},{role:"user",content:body}]
      });
      await sock.sendMessage(from,{text:c.choices[0].message.content});
    }catch(e){
      await sock.sendMessage(from,{text:`Karibu LM TZ! HUDUMA 9:\n1 Bot 150k\n2 Website 90k\n3 Automation 200k\n4 Mentorship 90k\n5 Monitoring 90k\n6 Grant $450\n7 Planning $300\n8 Feasibility $57\n9 Business Plan $120\n\nNiambie unahitaji ipi?`});
    }
  });
}
startBot();
