
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

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
      const code = await sock.requestPairingCode("255764769939");
      console.log(`\n\n====== PAIRING CODE: ${code} ======\n`);
    }, 3000);
  }

  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'open') console.log('✅ BOT ONLINE - PRINCE PROJECT ACTIVE');
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });
  
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    if (!text) return;
    console.log("UJUMBE:", text);
    await sock.sendMessage(from, { text: `🏗️ *PRINCE PROJECT CONSULTANCY*\n\nAsante! Nimepokea: "${text}"\n\nTuma eneo + ukubwa wa jengo nikupe gharama ya ramani sasa hivi.\n\nBot 24Hrs Active ✅` });
  });
}
startBot();
