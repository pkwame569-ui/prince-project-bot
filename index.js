const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

// === GEMINI API ===
const GEMINI_API_KEY = "AIzaSyDk5vP8f2_example_YourRealKeyHapa";

async function askGemini(question) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Wewe ni msaidizi wa Prince Project Consultancy, kampuni ya ujenzi na ushauri wa miradi Tanzania. Jibu kwa Kiswahili fasaha, kifupi na kusaidia. Swali la mteja: ${question}` }]
        }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Samahani, naomba uniulize tena.";
  } catch (e) {
    return "Asante kwa ujumbe. Timu yetu itakujibu hivi karibuni.";
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    logger: pino({ level: "silent" }),
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {8
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("SCAN HII QR KATIKA WHATSAPP:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ PRINCE PROJECT BOT IKO ONLINE 24HRS!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

    if (!text) return;

    console.log(`Ujumbe: ${text}`);

    // Auto-reply ya haraka
    if (text.toLowerCase().includes("bei") || text.toLowerCase().includes("gharama")) {
       await sock.sendMessage(from, { text: "🏗️ *PRINCE PROJECT CONSULTANCY*\n\nGharama inategemea na ukubwa wa mradi.\n\nTuma:\n- Eneo la ujenzi\n- Ukubwa\n- Aina ya jengo\n\nTutakupa makadirio ndani ya dakika 5!" });
       return;
    }

    // AI Jibu
    const aiReply = await askGemini(text);
    await sock.sendMessage(from, { text: aiReply + "\n\n---\n*Prince Project Consultancy* 🏗️\n24Hrs AI Assistant" });
  });
}

startBot();
