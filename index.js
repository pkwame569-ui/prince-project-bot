const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

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

if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY haijawekwa kwenye Render.');
}

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ''
);

const MODEL_NAME = 'gemini-3.8-flash';

const BUSINESS_INFO = `
You are the official AI customer-service assistant for:

PRINCE MBILAO PROJECT CONSULTANT WORLDWIDE

Your task is to assist customers professionally and honestly.

THE 10 SERVICES:

1. Project Proposal Writing
2. Grant Research and Grant Application Support
3. Business Plan Development
4. Feasibility Studies and Market Research
5. Monitoring, Evaluation and Learning (MEL)
6. Project Budgeting and Financial Narratives
7. Strategic Planning, Logframes and Theory of Change
8. Data Collection, Data Analysis and Reporting
9. AI Chatbots and Business Process Automation
10. Data Analytics and Business Intelligence Dashboards

LANGUAGE:
- Reply in the language used by the customer.
- Support Swahili, English and other languages you understand.
- Use clear, natural, professional language.
- Keep WhatsApp responses concise but useful.

IDENTITY:
The business name is:
Prince Mbilao Project Consultant Worldwide.

When asked about the business, explain its services accurately.
Do not invent qualifications, staff, clients, awards or testimonials.

PRICING:
- Never invent current international market prices.
- Never claim to have checked live or trending prices unless a
  live, reliable pricing source has actually been connected.
- Explain that professional fees depend on scope, complexity,
  country, deadline, deliverables and experience required.
- Provide a clearly labelled indicative estimate only when you
  have a reasonable basis for that estimate.
- Never present an estimate as a guaranteed or official market rate.
- If the customer requests an exact quotation, ask about the
  service, country, scope, deliverables and deadline.
- Distinguish the consultant's service fee from a project's
  implementation budget.
- Do not guarantee grant approval, funding, profits or success.

CUSTOMER SERVICE:
- Understand the customer's needs before recommending a service.
- Explain how the service may help.
- Ask one or two relevant questions at a time.
- Offer to prepare a tailored quotation.
- Do not pressure the customer.
- Never ask for passwords, API keys or banking credentials.

REAL-TIME INFORMATION:
You do not have live internet browsing or live price data in this
WhatsApp integration. If asked for today's prices, current grants,
deadlines or trending market rates, be honest about this limitation.
Do not fabricate current information.
`;

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function getStatusCode(error) {
  return (
    error?.status ||
    error?.statusCode ||
    error?.response?.status ||
    error?.error?.code ||
    null
  );
}

function isRetryable(error) {
  const status = getStatusCode(error);
  const message = String(error?.message || '');

  return (
    [408, 429, 500, 502, 503, 504].includes(Number(status)) ||
    /UNAVAILABLE|overloaded|temporarily unavailable|timeout|ECONNRESET|ETIMEDOUT/i
      .test(message)
  );
}

async function askAI(message) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY haipo kwenye Render Environment.');
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: BUSINESS_INFO,
    generationConfig: {
      maxOutputTokens: 700
    }
  });

  let lastError;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(
        `Gemini request: model=${MODEL_NAME}, attempt=${attempt}`
      );

      const result = await model.generateContent(message);
      const answer = result.response.text();

      if (!answer || !answer.trim()) {
        throw new Error('Gemini imerudisha jibu tupu.');
      }

      console.log('Gemini response received successfully.');

      return answer.trim();
    } catch (error) {
      lastError = error;

      const status = getStatusCode(error);

      console.error(
        `GEMINI ERROR | Attempt ${attempt} | Status: ${status} |`,
        error.message
      );

      if (!isRetryable(error) || attempt === 4) {
        throw error;
      }

      // Exponential backoff with jitter:
      // Approximately 2s, 4s, then 8s, with a random addition.
      const baseDelay = 2000 * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 1000);
      const delay = baseDelay + jitter;

      console.log(`Retrying Gemini in ${delay} ms.`);

      await sleep(delay);
    }
  }

  throw lastError || new Error('Gemini haipatikani kwa sasa.');
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

async function sendSafeMessage(jid, text) {
  if (!sock || !isLinked) {
    console.error('Cannot send message: WhatsApp is not connected.');
    return;
  }

  try {
    await sock.sendMessage(jid, { text });
  } catch (error) {
    console.error('WHATSAPP SEND ERROR:', error.message);
  }
}

async function startBot() {
  if (starting) return;

  starting = true;

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState('auth_final_v3');

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['PRINCE MBILAO WORLDWIDE', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeData = await qrcode.toDataURL(qr);
        console.log('WHATSAPP QR READY');
      }

      if (connection === 'open') {
        isLinked = true;
        qrCodeData = null;

        console.log('WHATSAPP CONNECTED SUCCESSFULLY');
      }

      if (connection === 'close') {
        isLinked = false;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut;

        console.log(
          'WHATSAPP CONNECTION CLOSED:',
          statusCode
        );

        if (shouldReconnect) {
          setTimeout(() => {
            starting = false;
            startBot();
          }, 5000);
        }
      }
    });

    sock.ev.on('messages.upsert', async event => {
      if (event.type !== 'notify') return;

      for (const msg of event.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;

        if (
          !jid ||
          jid === 'status@broadcast' ||
          jid.endsWith('@g.us') ||
          jid.endsWith('@newsletter')
        ) {
          continue;
        }

        const messageId = msg.key.id;

        if (!messageId || processedMessages.has(messageId)) {
          continue;
        }

        processedMessages.add(messageId);

        if (processedMessages.size > 2000) {
          const oldestId = processedMessages.values().next().value;
          processedMessages.delete(oldestId);
        }

        const text = getMessageText(msg.message).trim();

        if (!text) continue;

        console.log('INCOMING MESSAGE:', text);

        try {
          const reply = await askAI(text);

          await sendSafeMessage(jid, reply);

          console.log('AI REPLY SENT');
        } catch (error) {
          console.error(
            'FINAL AI ERROR:',
            error.message
          );

          const status = getStatusCode(error);

          let customerReply =
            'Samahani, huduma yetu ya AI inapata hitilafu ya muda. ' +
            'Tafadhali jaribu tena baada ya dakika chache.';

          if (
            [400, 401, 403].includes(Number(status)) ||
            /API key not valid|API_KEY_INVALID|permission denied/i
              .test(error.message)
          ) {
            customerReply =
              'Samahani, huduma yetu inafanyiwa ukaguzi wa kiufundi. ' +
              'Tafadhali jaribu tena baadaye.';
          }

          await sendSafeMessage(jid, customerReply);
        }
      }
    });
  } catch (error) {
    console.error('BOT START ERROR:', error.message);
  } finally {
    starting = false;
  }
}

app.get('/', (req, res) => {
  if (isLinked) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Prince Mbilao Project Consultant Worldwide</title>
      </head>
      <body style="font-family:Arial;text-align:center;margin-top:70px">
        <h1 style="color:green">WhatsApp Connected Successfully</h1>
        <p>Prince Mbilao Project Consultant Worldwide</p>
        <p>Bot is online.</p>
      </body>
      </html>
    `);
  }

  if (qrCodeData) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="20">
      </head>
      <body style="font-family:Arial;text-align:center;margin-top:30px">
        <h2>Connect WhatsApp</h2>
        <img src="${qrCodeData}" style="width:280px;max-width:90%">
        <p>Scan this QR code using WhatsApp Linked Devices.</p>
      </body>
      </html>
    `);
  }

  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="refresh" content="5">
    </head>
    <body style="font-family:Arial;text-align:center;margin-top:70px">
      <h2>Prince Mbilao Project Consultant Worldwide</h2>
      <p>Bot is starting. Please wait.</p>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    server: 'online',
    whatsappConnected: isLinked,
    model: MODEL_NAME
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('SERVER RUNNING ON PORT', PORT);
  startBot();
});
