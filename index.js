const express = require('express');
const app = express();
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const P = require('pino');

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('PRINCE PROJECT BOT IS LIVE 🔥'));
app.listen(PORT, () => console.log(`Server on ${PORT}`));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDummyKey_utaiweka_baadaye";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version, auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode("255764769939");
            console.log(`\n\n🔥 CODE YAKO: ${code} \n\n`);
        }, 4000);
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') console.log("✅ CONNECTED");
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (!text) return;
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(`Wewe ni PRINCE PROJECT BOT, jibu kwa kiswahili kwa ufupi na msaada. Swali: ${text}`);
            const reply = result.response.text();
            await sock.sendMessage(m.key.remoteJid, { text: reply });
        } catch (e) { console.log(e) }
    });
}
startBot();
