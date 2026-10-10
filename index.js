const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

let latestQR = null;

app.get('/', async (req,res)=>{
  if(req.query.reset === '1'){
    try{ fs.rmSync('auth_info',{recursive:true, force:true}); }catch{}
    latestQR = null;
    return res.send('<h1>Imefutwa! Tafadhali subiri 10sec kisha <a href="/">bonyeza hapa</a> kwa QR mpya</h1><script>setTimeout(()=>location.href="/", 10000)</script>');
  }
  if(!latestQR) return res.send('<h1>LM TZ PROJECT 9 - Inatengeneza QR...</h1><p>Refresh baada ya sec 5</p><p>Au kama haionekani, fungua <a href="/?reset=1">/?reset=1</a> kufuta session ya zamani</p><script>setTimeout(()=>location.reload(), 5000)</script>');
  res.send(`
    <h1>SCAN HAPA - 0795804621</h1>
    <img src="${latestQR}" style="width:300px;border:1px solid black"/>
    <p>Group Protection: ON - Haijibu Group</p>
    <p><a href="/?reset=1">QR haifanyi kazi? Bonyeza hapa kufuta na kutengeneza mpya</a></p>
    <script>setTimeout(()=>location.reload(), 25000)</script>
  `);
});

app.listen(PORT, ()=> console.log(`Server on ${PORT}`));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: "fatal" })) },
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ["LM TZ PROJECT 9", "Chrome", "1.0.0"]
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update)=>{
    const { connection, qr } = update;
    if(qr){ latestQR = await QRCode.toDataURL(qr); console.log('QR mpya'); }
    if(connection === 'open'){ console.log('IMEUNGWA!'); latestQR = null; }
    if(connection === 'close'){ const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut; if(shouldReconnect) startBot(); }
  });
  sock.ev.on('messages.upsert', async ({ messages })=>{
    const msg = messages[0]; if(!msg.message) return;
    const from = msg.key.remoteJid;
    if(from.endsWith('@g.us')) return; // GROUP PROTECTION ON
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if(body.toLowerCase().includes('9')) await sock.sendMessage(from, { text: `🔥 PROJECT 9 - Bei 9500 TZS (punguzo 5%) - Lipa 0795804621` });
    else await sock.sendMessage(from, { text: `Karibu! Andika 9` });
  });
}
startBot();
