const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:"silent"})) },
    logger: pino({level:"silent"})
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ BOT IKO ONLINE!');
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (!text) return;
    console.log(`UJUMBE MPYA: ${text} kutoka ${from}`);

    // JIBU KILA MTU
    await sock.sendMessage(from, { text: `🏗️ *PRINCE PROJECT CONSULTANCY* \n\nHabari! Nimepokea ujumbe wako: "${text}"\n\nTimu yetu ya ujenzi iko tayari kukusaidia. Tuma eneo na aina ya jengo unalotaka.\n\n---\nBot iko Active 24Hrs ✅` });
  });
}
startBot();
