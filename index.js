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
const processedMessages = new Set();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// HII NDIYO MODEL YA UHAKIKA LEO - INAFANYA KAZI NA KEY MPYA
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

const BUSINESS_INFO = `You are MBILAO PROJECT CONSULTANT assistant. Services: Project proposals, Grant writing, Business plans, Feasibility studies, M&E. Reply same language as user, short and professional for WhatsApp.`;

async function askAI(message) {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: BUSINESS_INFO }] },
    generationConfig: { maxOutputTokens: 600 }
  });
  return result.response.text().trim();
}

function getMessageText(m) {
  if (!m) return '';
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || '';
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_final_v3');
    sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['MBILAO BOT', 'Chrome', '1.0.0'] });
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) { qrCodeData = await qrcode.toDataURL(qr); console.log('QR TAYARI'); }
      if (connection === 'close') {
        isLinked = false;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) setTimeout(startBot, 5000);
      } else if (connection === 'open') {
        isLinked = true; qrCodeData = null;
        console.log('WHATSAPP CONNECTED SUCCESSFULLY');
      }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async (m) => {
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (jid === 'status@broadcast') continue;
        if (processedMessages.has(msg.key.id)) continue;
        processedMessages.add(msg.key.id);
        const text = getMessageText(msg.message);
        if (!text.trim()) continue;
        console.log('MESSAGE:', text);
        try {
          const reply = await askAI(text.trim());
          await sock.sendMessage(jid, { text: reply });
          console.log('REPLY SENT');
        } catch (e) {
          console.log('GEMINI ERROR:', e.message);
        }
      }
    });
  } catch (e) { console.error('START ERROR:', e.message); }
  starting = false;
}

app.get('/', (req, res) => {
  if (isLinked) return res.send('<h1 style="text-align:center;color:green;margin-top:100px">WHATSAPP CONNECTED SUCCESSFULLY - Bot Iko Sawa!</h1>');
  if (qrCodeData) return res.send(`<div style="text-align:center;margin-top:50px"><h2>Scan QR Mpya</h2><img src="${qrCodeData}" style="width:300px"/><p>Ina-refresh kila 15 sec</p><script>setTimeout(()=>location.reload(),15000)</script></div>`);
  res.send('<p style="text-align:center;margin-top:100px">Bot inaanza...<script>setTimeout(()=>location.reload(),3000)</script></p>');
});

app.listen(PORT, '0.0.0.0', () => { console.log('SERVER RUNNING ON', PORT); startBot(); });
