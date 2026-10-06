const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Prince Project Bot is Online!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // BOT LOGIC - PRINCE PROJECT CONSULTANCY
    let reply = "";

    const lower = text.toLowerCase();

    if (lower.includes("mambo") || lower.includes("habari") || lower.includes("hello") || lower.includes("hi")) {
      reply = `Habari! 👋 Karibu Prince Project Consultancy\n\nMimi ni msaidizi wako wa masaa 24.\n\nTunatoa huduma za:\n1. Ushauri wa miradi ya ujenzi\n2. Upimaji na ramani\n3. Usimamizi wa miradi\n4. Nyaraka za zabuni\n\nUnaweza kuniuliza chochote, niko hapa kukusaidia! 🏗️`;
    } else if (lower.includes("huduma") || lower.includes("service")) {
      reply = `📋 HUDUMA ZETU - PRINCE PROJECT CONSULTANCY*\n\n✅ Architectural Design\n✅ Structural Design\n✅ Quantity Surveying\n✅ Project Management\n✅ Land Surveying\n✅ NEMC & OSHA Certificates\n\nWasiliana nasi kwa maelezo zaidi!`;
    } else if (lower.includes("bei") || lower.includes("gharama") || lower.includes("price")) {
      reply = `Kuhusu gharama, inategemea na ukubwa wa mradi wako.\n\nTuma maelezo ya mradi wako na tutakupa makadirio haraka.\n\nAu piga: +255 xxx xxx xxx`;
    } else {
      // AI Response - simple
      reply = `Asante kwa ujumbe wako: "${text}"\n\nNimepokea. Timu ya Prince Project Consultancy itakujibu hivi karibuni.\n\nKwa haraka zaidi, andika *huduma* kuona huduma zetu.`;
    }

    await sock.sendMessage(from, { text: reply });
  });
}

startBot();
