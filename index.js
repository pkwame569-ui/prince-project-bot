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
  if(req.query.reset==='1'){
    try{ fs.rmSync('./auth_info',{recursive:true,force:true}); }catch{}
    latestQR=null;
    return res.send('<h1>SAFI! Session Imefutwa. <a href="/">Rudi Nyuma</a></h1>');
  }
  if(!latestQR) return res.send('<h1>LM TZ 9 BOT - 0795804621 - READY FOR QR</h1><p>Subiri QR itatokea hapa...</p><script>setTimeout(()=>location.reload(),5000)</script>');
  res.send(`<center><h1>SCAN HAPA 0795804621</h1><img src="${latestQR}" style="width:300px;border:10px solid #000"/><p>Ina-refresh kila 25sec</p><script>setTimeout(()=>location.reload(),25000)</script></center>`);
});
app.get('/ping', (req,res)=> res.send('pong'));
app.listen(PORT,()=>console.log('Server on '+PORT));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are Prince, assistant for LM TZ 0795804621, Dar es Salaam. Bilingual: Reply in same language user uses (Swahili/English). You are expert in all topics, but always connect to services: 1 Bot 24H 150k TZS, 2 Website 90k, 3 Automation 200k, 4 Mentorship 90k, 5 Monitoring 90k, 6 Grant $450, 7 Planning $300, 8 Feasibility $57, 9 Business Plan $120. Keep answers short 4-6 lines, helpful, end with "We will help for your company."`;

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P().child({level:"fatal"})) },
    logger: P({level:'silent'}),
    printQRInTerminal:false,
    browser:["LM TZ 9","Chrome","1.0.0"],
    shouldIgnoreJid: jid => jid.endsWith('@g.us'),
    getMessage: async () => undefined
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const {connection,qr, lastDisconnect}=u;
    if(qr) latestQR=await QRCode.toDataURL(qr);
    if(connection==='open'){ console.log('CONNECTED OK'); latestQR=null; }
    if(connection==='close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Closed, reconnect:', shouldReconnect);
      if(shouldReconnect) setTimeout(startBot, 3000);
    }
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    try{
      const msg=messages[0];
      if(!msg.message || msg.key.fromMe) return;
      const from=msg.key.remoteJid;
      if(from.endsWith('@g.us') || from.endsWith('@broadcast')) return;
      const body=(msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||"").trim();
      if(!body) return;
      console.log('Msg:',body);
      let replyText;
      if(openai){
        try{
          const c = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{role:"system",content:SYSTEM_PROMPT},{role:"user",content:body}],
            max_tokens: 400
          });
          replyText = c.choices[0].message.content;
        }catch(e){ console.log('AI error',e.message); replyText=null; }
      }
      if(!replyText){
        replyText=`Karibu LM TZ! Tunatoa HUDUMA 9:\n1. Bot 24H - 150k TZS\n2. Website - 90k\n3. Automation - 200k\n4. Mentorship - 90k\n5. Monitoring - 90k\n6. Grant $450\n7. Strategic Planning $300\n8. Feasibility $57\n9. Business Plan $120\n\nNiambie unahitaji ipi? Tutakusaidia.`;
      }
      await sock.sendMessage(from,{text:replyText});
    }catch(e){ console.log('Handler error',e); }
  });
}
startBot();
