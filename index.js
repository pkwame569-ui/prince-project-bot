const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

const GEMINI_API_KEY = "AIzaSyDk5vP8f2_example_YourRealKeyHapa";

async function askGemini(question) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Wewe ni msaidizi wa Prince Project Consultancy Tanzania. Jibu kwa Kiswahili fupi na msaada. Swali: ${question}` }] }] })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Samahani, uliza tena.";
  } catch (e) {
    return "Asante, timu yetu itakujibu hivi karibuni.";
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Prince Bot", "Chrome", "1.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  // OMBI LA PAIRING CODE KWA NAMBA YAKO
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode("255764769939");
      console.log(`\n\n🔑 CODE YAKO YA KU-UNGANISHA NI: ${code}\n\nNenda WhatsApp > Linked Devices > Link with phone number > Andika hii code\n\n`);
    }, 3000);
  }

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
    const aiReply = await askGemini(text);
    await sock.sendMessage(from, { text: aiReply + "\n\n---\n*Prince Project* 🏗️" });
  });
}
startBot();
