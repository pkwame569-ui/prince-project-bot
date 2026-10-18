const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const qrcode = require('qrcode');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

let sock = null;
let qrCodeData = null;
let isLinked = false;
let starting = false;
let reconnectTimer = null;
const processedMessages = new Set();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const BUSINESS_INFO = `You are the AI assistant for MBILAO PROJECT CONSULTANT WORLDWIDE. Services: Project proposals, Grant writing, Business plans, Feasibility studies, M&E, Data collection, Project budgeting, Strategic planning. Clients: NGOs, CBOs, entrepreneurs. Reply in same language as user (Swahili/English). Be professional and concise for WhatsApp.`;

async function askAI(message) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: BUSINESS_INFO }] },
    generationConfig: { maxOutputTokens: 500 }
  });
  return result.response.text().trim();
}

function getMessageText(message) {
  if (!message) return '';
  return message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || '';
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_final_no_samahani');
    sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['MBILAO AI BOT', 'Chrome', '1.0.0'] });
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) { qrCodeData = await qrcode.toDataURL(qr); console.log('QR TAYARI'); }
      if (connection === 'close') {
        isLinked = false;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) { if (reconnectTimer) clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => { reconnectTimer = null; startBot(); }, 5000); }
      } else if (connection === 'open') { isLinked = true; qrCodeData = null; console.log('WHATSAPP CONNECTED SUCCESSFULLY'); }
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (m) => {
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (jid === 'status@broadcast') continue;
        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) continue;
        processedMessages.add(msgId);
        const text = getMessageText(msg.message);
        if (!text.trim()) continue;
        console.log('MESSAGE RECEIVED:', text);

        // MOJA KWA MOJA GEMINI - HAKUNA SAMAHANI
        try {
          const reply = await askAI(text.trim());
          if (!reply) continue;
          await sock.sendMessage(jid, { text: reply });
          console.log('REPLY SENT:', reply);
        } catch (e) {
          console.log('GEMINI ERROR:', e.message);
          // Hapa tumefuta samahani, bot itanyamaza tu kama Gemini imeshindwa
        }
      }
    });
  } catch (e) { starting = false; console.error('BOT START ERROR:', e.message); return; }
  starting = false;
}

app.get('/', (req, res) => {
  if (isLinked) return res.send('<h1 style="text-align:center;color:green">WHATSAPP CONNECTED SUCCESSFULLY</h1><p style="text-align:center">Bot iko tayari, haina tena SAMAHANI</p>');
  if (qrCodeData) return res.send(`<div style="text-align:center"><h2>Scan QR Mpya</h2><img src="${qrCodeData}" style="width:300px"/><script>setTimeout(()=>location.reload(),15000)</script></div>`);
  res.send('<p style="text-align:center">Bot inaanza... <script>setTimeout(()=>location.reload(),5000)</script></p>');
});

app.listen(PORT, '0.0.0.0', () => { console.log('SERVER RUNNING ON', PORT); startBot(); });
