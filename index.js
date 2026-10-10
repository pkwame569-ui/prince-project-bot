
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req,res)=> res.send('<h1>LM TZ PROJECT 9 - LIVE</h1><p>Bot: 0795804621</p><p>Group Protection: ON</p>'));
app.listen(PORT, ()=> console.log(`Server on ${PORT}`));

const PROJECTS = { 9: { name: "PROJECT 9", price: 10000, discount: 5 } };
function getPrice(id){
  const proj = PROJECTS[id];
  const discountAmount = (proj.price * proj.discount)/100;
  return { ...proj, finalPrice: proj.price - discountAmount, discountAmount };
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: "fatal" })) },
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ["LM TZ PROJECT 9", "Chrome", "1.0.0"]
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update)=>{
    const { connection, lastDisconnect, qr } = update;
    if(qr) console.log("SCAN QR KWA 0795804621:", qr);
    if(connection === 'close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open') console.log('BOT IMEUNGWA 0795804621 LIVE');
  });

  sock.ev.on('messages.upsert', async ({ messages })=>{
    const msg = messages[0];
    if(!msg.message) return;
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    if(isGroup){ console.log('Group ignored'); return; }

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const text = body.toLowerCase();
    
    if(text.includes('9') || text.includes('project') || text.includes('menu')){
      const data = getPrice(9);
      await sock.sendMessage(from, { text: `🔥 *LM TZ PROJECT 9* 🔥\n\nBei: ${data.price}\nPunguzo 5%: -${data.discountAmount}\n*Bei ya Leo: ${data.finalPrice} TZS*\n\nNamba: 0795804621\nAndika LIPA` });
    } else if(text.includes('lipa')){
      await sock.sendMessage(from, { text: `Tuma 9500 kwa 0795804621 M-Pesa. Tuma screenshot.` });
    } else {
      await sock.sendMessage(from, { text: `Karibu! Andika 9 kuona PROJECT 9 na punguzo 5%` });
    }
  });
}
startBot();
