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

// GEMINI SETUP SAHIHI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const BUSINESS_INFO = `
You are the professional AI customer service assistant for MBILAO PROJECT CONSULTANT WORLDWIDE.

BUSINESS SERVICES:
1. Project proposal writing.
2. Grant writing and grant application support.
3. Business plan preparation.
4. Feasibility studies.
5. Monitoring and evaluation (M&E).
6. Data collection and documentation.
7. Project budgeting and financial narratives.
8. Strategic planning.
9. Logframes and theory of change.
10. Project management and implementation plans.
11. AI chatbots and business automation.

TARGET CLIENTS: NGOs, CBOs, entrepreneurs, small businesses, community development organizations.

INSTRUCTIONS:
- Reply in the same language as the customer. Prioritize Swahili and English.
- Be professional, friendly and helpful.
- Keep answers concise and suitable for WhatsApp.
- Identify yourself as the AI assistant for MBILAO PROJECT CONSULTANT WORLDWIDE when appropriate.
`;

async function askAI(message) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY haijawekwa kwenye Render.');
  }
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: BUSINESS_INFO }] },
    generationConfig: { maxOutputTokens: 350 }
  });
  const response = result.response;
  const answer = response.text();
  if (!answer || !answer.trim()) {
    throw new Error('Gemini haikurudisha jibu.');
  }
  return answer.trim();
}

function getMessageText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    ''
  );
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['MBILAO AI BOT', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        qrCodeData = await qrcode.toDataURL(qr);
        console.log('QR TAYARI - Fungua website kuscan.');
      }
      if (connection === 'close') {
        isLinked = false;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('WhatsApp connection closed:', lastDisconnect?.error?.output?.statusCode);
        if (shouldReconnect) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => { reconnectTimer = null; startBot(); }, 5000);
        }
      } else if (connection === 'open') {
        isLinked = true;
        qrCodeData = null;
        console.log('WHATSAPP CONNECTED SUCCESSFULLY');
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
      try {
        for (const msg of m.messages) {
          if (!msg.message || msg.key.fromMe) continue;
          const jid = msg.key.remoteJid;
          if (jid === 'status@broadcast') continue;
          const msgId = msg.key.id;
          if (processedMessages.has(msgId)) continue;
          processedMessages.add(msgId);
          if (processedMessages.size > 1000) {
            const oldest = processedMessages.values().next().value;
            processedMessages.delete(oldest);
          }
          const text = getMessageText(msg.message);
          if (!text.trim()) continue;
          console.log('MESSAGE RECEIVED:', text);
          let reply;
          try {
            reply = await askAI(text.trim());
          } catch (error) {
            console.log('GEMINI ERROR:', error.message);
            reply = 'Samahani, nimeshindwa kujibu kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.';
          }
          await sock.sendMessage(jid, { text: reply });
          console.log('REPLY SENT SUCCESSFULLY');
        }
      } catch (error) {
        console.log('MESSAGE PROCESSING ERROR:', error.message);
      }
    });
  } catch (error) {
    starting = false;
    console.error('BOT START ERROR:', error.message);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => { reconnectTimer = null; startBot(); }, 10000);
    return;
  }
  starting = false;
}

app.get('/', (req, res) => {
  if (isLinked) {
    return res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>MBILAO AI BOT</title></head><body style="font-family:Arial;text-align:center;padding:30px"><h1>MBILAO PROJECT CONSULTANT WORLDWIDE</h1><h2 style="color:green">WHATSAPP CONNECTED SUCCESSFULLY</h2><p>WhatsApp bot yako iko tayari kupokea ujumbe.</p></body></html>`);
  }
  if (qrCodeData) {
    return res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unganisha WhatsApp</title></head><body style="font-family:Arial;text-align:center;padding:20px"><h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2><p>Scan QR code hii kupitia WhatsApp Linked Devices.</p><img src="${qrCodeData}" alt="WhatsApp QR Code" style="width:280px;max-width:90%;border:1px solid #ccc;padding:10px"/><p>Baada ya kuunganisha, ukurasa huu utaonyesha hali ya bot.</p><script>setTimeout(()=> location.reload(), 15000);</script></body></html>`);
  }
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>MBILAO AI BOT</title></head><body style="font-family:Arial;text-align:center;padding:30px"><h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2><p>Bot inaanza au inasubiri QR code...</p><script>setTimeout(()=> location.reload(), 5000);</script></body></html>`);
});

app.get('/health', (req, res) => {
  res.json({ service: 'MBILAO AI BOT', whatsappConnected: isLinked, aiProvider: 'Google Gemini', status: 'running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('MBILAO AI BOT SERVER RUNNING ON PORT', PORT);
  startBot();
});
