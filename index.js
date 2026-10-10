
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ====== EXPRESS SERVER KWA RENDER - HII NDIO ILIKUWA INAKOSekana ======
app.get('/', (req, res) => {
  res.send(`
    <h1>LM TZ PROJECT 9 - LIVE 🔥</h1>
    <p>Bot Number: 0795804621</p>
    <p>Status: Running</p>
    <p>Punguzo: 5% ACTIVE</p>
    <p>Group Protection: ON (Hajibu Group)</p>
    <p>Refresh kama QR inahitajika kwenye Logs</p>
  `);
});
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

// ====== PROJECT 9 LOGIC ======
const PROJECTS = {
  9: { name: "PROJECT 9", price: 10000, discount: 5 }
};

function getPrice(projectId){
  const proj = PROJECTS[projectId];
  if(!proj) return null;
  const discountAmount = (proj.price * proj.discount) / 100;
  const finalPrice = proj.price - discountAmount;
  return {...proj, finalPrice, discountAmount };
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P().child({ level: "fatal" }))
    },
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ["LM TZ PROJECT 9", "Chrome", "1.0.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if(qr){
      console.log("=== SCAN QR HAPA KWA 0795804621 ===");
      console.log(qr);
    }

    if(connection === 'close'){
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut);
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if(shouldReconnect) startBot();
    } else if(connection === 'open'){
      console.log('✅ BOT IMEUNGWA! 0795804621 LIVE - PROJECT 9 READY');
    }
  });

  sock.ev.on('messages.upsert', async ({
