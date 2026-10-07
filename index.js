const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

// Hii ndio inazuia Render kusema Failed deploy
const app = express();
app.get('/', (req,res) => res.send('Prince Bot Active ✅'));
app.listen(process.env.PORT || 10000, () => console.log('Server on 10000'));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"silent"})) },
    logger: pino({level:"silent"}),
    printQRInTerminal: false,
    browser: ["Prince Bot","Chrome","1.0"]
  });
  sock.ev.on('creds.update', saveCreds);
  
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode("255764769939");
        console.log(`\n====== CODE YAKO: ${code} ======\n`);
      } catch(e){ 
        console.log("Subiri... bado inaunganisha", e.message);
        setTimeout(() => startBot(), 10000);
      }
    }, 8000);
  }

  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'open') console.log('✅ BOT ONLINE - PRINCE PROJECT ACTIVE');
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      console.log('Reconnect...');
      setTimeout(startBot, 3000);
    }
  });
  
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    if (!text) return;
    await sock.sendMessage(from, { text: `🏗️ *PRINCE PROJECT CONSULTANCY*\n\nAsante! Nimepokea: "${text}"\nTuma eneo + ukubwa nikupe gharama sasa hivi.\nBot Active ✅` });
  });
}
startBot();
