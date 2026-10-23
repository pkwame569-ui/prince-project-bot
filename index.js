// ======================================================
// PRINCE MBILAO PROJECT CONSULTANT WORLDWIDE
// WHATSAPP AI SALES & MARKETING AUTOMATION
// GOOGLE SHEETS + GEMINI AI
// ======================================================


// ======================================================
// GOOGLE SHEETS API
// ======================================================

const SHEET_API =
  "https://script.google.com/macros/s/AKfycbyX3Y3R3GdzNIR3hM1ZPTIiX_SX0jCSi6EWSmHaVdTpgJ4EkvpP11HhxQikhEa08sVc/exec";


// ======================================================
// IMPORTS
// ======================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const { GoogleGenerativeAI } =
  require('@google/generative-ai');

const express = require('express');
const qrcode = require('qrcode');
const pino = require('pino');


// ======================================================
// SERVER CONFIGURATION
// ======================================================

const app = express();

const PORT = process.env.PORT || 10000;


// ======================================================
// WHATSAPP STATE
// ======================================================

let sock = null;

let qrCodeData = null;

let isLinked = false;

let starting = false;


// ======================================================
// MESSAGE PROCESSING
// ======================================================

const processedMessages = new Set();


// ======================================================
// GEMINI AI CONFIGURATION
// ======================================================

if (!process.env.GEMINI_API_KEY) {
  console.error(
    'ERROR: GEMINI_API_KEY haijawekwa kwenye Render.'
  );
}

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ''
);

const MODEL_NAME = 'gemini-3.8-flash';


// ======================================================
// BUSINESS INFORMATION
// ======================================================

const BUSINESS_INFO = `
You are the official AI customer-service assistant for:

PRINCE MBILAO PROJECT CONSULTANT WORLDWIDE

Your task is to assist customers professionally,
accurately, honestly and helpfully.

BUSINESS SERVICES:

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
- Use clear, natural and professional language.
- Keep WhatsApp responses concise but useful.

IDENTITY:

The business name is:

Prince Mbilao Project Consultant Worldwide.

When asked about the business, explain its services accurately.

Do not invent qualifications, staff, clients, awards or testimonials.

OFFICIAL PRICING:

The business uses Google Sheets as its official service
and pricing database.

When Google Sheets information is provided in the customer
prompt, use those prices as the official business prices.

Never invent, modify or guess an official listed price.

Never confuse one service with another.

If a service is not listed in Google Sheets, explain that
the customer can request a quotation.

Prices in Google Sheets are in Tanzanian Shillings (TZS),
unless the business database specifies otherwise.

For international customers, explain the listed price
clearly. Do not invent currency conversion rates.

Do not confuse the consultant's service fee with a project's
implementation budget.

Do not guarantee grant approval, funding, profits or success.

CUSTOMER SERVICE:

- Understand the customer's needs before recommending a service.
- Explain how the service may help.
- Ask one or two relevant questions at a time.
- Offer to prepare a tailored quotation.
- Do not pressure the customer.
- Never ask for passwords, API keys or banking credentials.

REAL-TIME INFORMATION:

You do not have live internet browsing or live market-price
data in this WhatsApp integration.

Google Sheets is the official source for the business's
listed service prices.

If asked for today's international market prices, current
grants, deadlines or trending market rates, be honest about
your limitations.

Do not fabricate current information.

SALES AND MARKETING:

Help customers understand the value of the business services.

Recommend relevant services based on customer needs.

When appropriate, explain how professional project planning,
business planning, automation and data analysis can help
customers improve their work.

Never make misleading promises.
`;


// ======================================================
// GOOGLE SHEETS CACHE
// ======================================================

let servicesCache = [];

let servicesCacheTime = 0;

const SHEET_CACHE_DURATION = 60 * 1000;


// ======================================================
// GENERAL UTILITIES
// ======================================================

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
    [408, 429, 500, 502, 503, 504].includes(
      Number(status)
    ) ||

    /UNAVAILABLE|overloaded|temporarily unavailable|timeout|ECONNRESET|ETIMEDOUT/i
      .test(message)
  );
}


// ======================================================
// GOOGLE SHEETS: FETCH SERVICES
// ======================================================

async function getGoogleSheetServices() {

  const now = Date.now();

  // ----------------------------------------------------
  // USE CACHE IF AVAILABLE
  // ----------------------------------------------------

  if (
    servicesCache.length > 0 &&
    now - servicesCacheTime < SHEET_CACHE_DURATION
  ) {

    console.log(
      'Using cached Google Sheets services.'
    );

    return servicesCache;
  }


  // ----------------------------------------------------
  // FETCH GOOGLE SHEETS API
  // ----------------------------------------------------

  try {

    console.log(
      'Fetching services from Google Sheets...'
    );

    const response = await fetch(SHEET_API, {

      method: 'GET',

      headers: {
        'Accept': 'application/json'
      },

      signal: AbortSignal.timeout(10000)

    });


    // --------------------------------------------------
    // CHECK HTTP RESPONSE
    // --------------------------------------------------

    if (!response.ok) {

      throw new Error(
        `Google Sheets HTTP error: ${response.status}`
      );

    }


    // --------------------------------------------------
    // READ JSON DATA
    // --------------------------------------------------

    const data = await response.json();


    // --------------------------------------------------
    // VALIDATE GOOGLE SHEETS DATA
    // --------------------------------------------------

    if (
      data.success !== true ||
      !Array.isArray(data.services)
    ) {

      throw new Error(
        'Google Sheets returned invalid service data.'
      );

    }


    // --------------------------------------------------
    // SAVE CACHE
    // --------------------------------------------------

    servicesCache = data.services;

    servicesCacheTime = Date.now();


    console.log(
      `Google Sheets loaded successfully: ${servicesCache.length} services`
    );


    return servicesCache;

  } catch (error) {

    console.error(
      'GOOGLE SHEETS ERROR:',
      error.message
    );


    // --------------------------------------------------
    // USE PREVIOUS CACHE IF AVAILABLE
    // --------------------------------------------------

    if (servicesCache.length > 0) {

      console.log(
        'Using previously cached Google Sheets data.'
      );

      return servicesCache;

    }


    // --------------------------------------------------
    // NO DATA AVAILABLE
    // --------------------------------------------------

    return [];

  }

}


// ======================================================
// GOOGLE SHEETS: CREATE AI CONTEXT
// ======================================================

async function getServicesContext() {

  const services = await getGoogleSheetServices();


  // ----------------------------------------------------
  // IF GOOGLE SHEETS IS UNAVAILABLE
  // ----------------------------------------------------

  if (!services.length) {

    return `
OFFICIAL GOOGLE SHEETS STATUS:

The official service database is temporarily unavailable.

Do not invent or guess service prices.

If a customer asks for an exact service price,
explain that the current quotation needs confirmation.

Continue helping the customer with general questions.
`;

  }


  // ----------------------------------------------------
  // CONVERT SERVICES INTO AI-READABLE TEXT
  // ----------------------------------------------------

  const servicesText = services.map(service => {

    const serviceId =
      service['service id'] || 'Not provided';

    const serviceName =
      service['service name'] || 'Not provided';

    const servicePrice =
      service.price || 'Not provided';

    const serviceDescription =
      service['service description'] || 'Not provided';


    return `
Service ID: ${serviceId}

Service Name: ${serviceName}

Official Price: TZS ${servicePrice}

Service Description: ${serviceDescription}

`;

  }).join('\n');


  // ----------------------------------------------------
  // RETURN GOOGLE SHEETS CONTEXT
  // ----------------------------------------------------

  return `
======================================================
OFFICIAL BUSINESS SERVICES AND PRICES
======================================================

SOURCE: Google Sheets

The following information comes directly from the
official business Google Sheets database.

Use this information when answering customer questions
about business services and prices.

${servicesText}

======================================================
PRICING INSTRUCTIONS
======================================================

1. Use the exact listed price for each service.

2. Never invent or modify an official price.

3. Do not confuse one service with another.

4. If a customer asks about a listed service,
   provide its official listed price.

5. If a customer asks about a service not listed,
   explain that a quotation can be prepared.

6. Explain that prices are in Tanzanian Shillings (TZS).

7. If the customer asks in Swahili, respond in Swahili.

8. If the customer asks in English, respond in English.

9. Do not invent international market prices.

10. Do not guarantee funding, grant approval,
    business profits or project success.

======================================================
`;

}


// ======================================================
// GEMINI AI
// ======================================================

async function askAI(message) {

  if (!process.env.GEMINI_API_KEY) {

    throw new Error(
      'GEMINI_API_KEY haipo kwenye Render Environment.'
    );

  }


  // ----------------------------------------------------
  // GET GOOGLE SHEETS DATA
  // ----------------------------------------------------

  const servicesContext = await getServicesContext();


  // ----------------------------------------------------
  // CREATE GEMINI MODEL
  // ----------------------------------------------------

  const model = genAI.getGenerativeModel({

    model: MODEL_NAME,

    systemInstruction: BUSINESS_INFO,

    generationConfig: {

      maxOutputTokens: 700

    }

  });


  // ----------------------------------------------------
  // CREATE CUSTOMER PROMPT
  // ----------------------------------------------------

  const customerPrompt = `

${servicesContext}


======================================================
CUSTOMER MESSAGE
======================================================

${message}


======================================================
RESPONSE INSTRUCTIONS
======================================================

Answer the customer in the same language they used.

If the customer asks about a business service or price,
use the official Google Sheets information above.

If the customer asks about a service price,
provide the exact listed price.

Do not invent prices.

If the customer asks about other subjects,
continue helping using your general knowledge
and the business information provided.

Keep the response professional and suitable for WhatsApp.

`;


  // ----------------------------------------------------
  // GEMINI RETRY SYSTEM
  // ----------------------------------------------------

  let lastError;


  for (let attempt = 1; attempt <= 4; attempt++) {

    try {

      console.log(
        `Gemini request: model=${MODEL_NAME}, attempt=${attempt}`
      );


      // ------------------------------------------------
      // SEND REQUEST TO GEMINI
      // ------------------------------------------------

      const result = await model.generateContent(
        customerPrompt
      );


      // ------------------------------------------------
      // READ GEMINI RESPONSE
      // ------------------------------------------------

      const answer = result.response.text();


      if (!answer || !answer.trim()) {

        throw new Error(
          'Gemini imerudisha jibu tupu.'
        );

      }


      console.log(
        'Gemini response received successfully.'
      );


      return answer.trim();


    } catch (error) {

      lastError = error;

      const status = getStatusCode(error);


      console.error(

        `GEMINI ERROR | Attempt ${attempt} | Status: ${status} |`,

        error.message

      );


      // ------------------------------------------------
      // STOP IF ERROR IS NOT RETRYABLE
      // ------------------------------------------------

      if (
        !isRetryable(error) ||
        attempt === 4
      ) {

        throw error;

      }


      // ------------------------------------------------
      // EXPONENTIAL BACKOFF
      // ------------------------------------------------

      const baseDelay =
        2000 * Math.pow(2, attempt - 1);

      const jitter =
        Math.floor(Math.random() * 1000);

      const delay =
        baseDelay + jitter;


      console.log(
        `Retrying Gemini in ${delay} ms.`
      );


      await sleep(delay);

    }

  }


  throw lastError ||
    new Error('Gemini haipatikani kwa sasa.');

}


// ======================================================
// WHATSAPP MESSAGE TEXT EXTRACTION
// ======================================================

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


// ======================================================
// WHATSAPP SAFE MESSAGE SENDING
// ======================================================

async function sendSafeMessage(jid, text) {

  if (!sock || !isLinked) {

    console.error(
      'Cannot send message: WhatsApp is not connected.'
    );

    return;

  }


  try {

    await sock.sendMessage(jid, {
      text
    });


  } catch (error) {

    console.error(
      'WHATSAPP SEND ERROR:',
      error.message
    );

  }

}


// ======================================================
// START WHATSAPP BOT
// ======================================================

async function startBot() {

  if (starting) return;

  starting = true;


  try {

    // --------------------------------------------------
    // WHATSAPP AUTHENTICATION
    // --------------------------------------------------

    const { state, saveCreds } =
      await useMultiFileAuthState('auth_final_v3');


    // --------------------------------------------------
    // CREATE WHATSAPP SOCKET
    // --------------------------------------------------

    sock = makeWASocket({

      auth: state,

      logger: pino({
        level: 'silent'
      }),

      browser: [
        'PRINCE MBILAO WORLDWIDE',
        'Chrome',
        '1.0.0'
      ]

    });


    // --------------------------------------------------
    // SAVE WHATSAPP CREDENTIALS
    // --------------------------------------------------

    sock.ev.on(
      'creds.update',
      saveCreds
    );


    // --------------------------------------------------
    // CONNECTION UPDATES
    // --------------------------------------------------

    sock.ev.on(
      'connection.update',

      async update => {

        const {
          connection,
          lastDisconnect,
          qr
        } = update;


        // ----------------------------------------------
        // QR CODE
        // ----------------------------------------------

        if (qr) {

          qrCodeData =
            await qrcode.toDataURL(qr);

          console.log(
            'WHATSAPP QR READY'
          );

        }


        // ----------------------------------------------
        // WHATSAPP CONNECTED
        // ----------------------------------------------

        if (connection === 'open') {

          isLinked = true;

          qrCodeData = null;

          console.log(
            'WHATSAPP CONNECTED SUCCESSFULLY'
          );

        }


        // ----------------------------------------------
        // CONNECTION CLOSED
        // ----------------------------------------------

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

      }

    );


    // ==================================================
    // INCOMING WHATSAPP MESSAGES
    // ==================================================

    sock.ev.on(

      'messages.upsert',

      async event => {

        if (event.type !== 'notify') return;


        for (const msg of event.messages) {


          // --------------------------------------------
          // IGNORE INVALID MESSAGES
          // --------------------------------------------

          if (
            !msg.message ||
            msg.key.fromMe
          ) {

            continue;

          }


          const jid =
            msg.key.remoteJid;


          // --------------------------------------------
          // IGNORE GROUPS AND STATUS
          // --------------------------------------------

          if (

            !jid ||

            jid === 'status@broadcast' ||

            jid.endsWith('@g.us') ||

            jid.endsWith('@newsletter')

          ) {

            continue;

          }


          // --------------------------------------------
          // DUPLICATE MESSAGE PROTECTION
          // --------------------------------------------

          const messageId =
            msg.key.id;


          if (

            !messageId ||

            processedMessages.has(messageId)

          ) {

            continue;

          }


          processedMessages.add(messageId);


          // --------------------------------------------
          // LIMIT MESSAGE MEMORY
          // --------------------------------------------

          if (
            processedMessages.size > 2000
          ) {

            const oldestId =
              processedMessages.values().next().value;

            processedMessages.delete(oldestId);

          }


          // --------------------------------------------
          // EXTRACT CUSTOMER MESSAGE
          // --------------------------------------------

          const text =
            getMessageText(msg.message).trim();


          if (!text) continue;


          console.log(
            'INCOMING MESSAGE:',
            text
          );


          // ==================================================
          // AI RESPONSE
          // ==================================================

          try {

            // --------------------------------------------
            // GOOGLE SHEETS + GEMINI
            // --------------------------------------------

            const reply =
              await askAI(text);


            // --------------------------------------------
            // SEND RESPONSE
            // --------------------------------------------

            await sendSafeMessage(
              jid,
              reply
            );


            console.log(
              'AI REPLY SENT'
            );


          } catch (error) {


            // --------------------------------------------
            // LOG AI ERROR
            // --------------------------------------------

            console.error(

              'FINAL AI ERROR:',

              error.message

            );


            const status =
              getStatusCode(error);


            // --------------------------------------------
            // CUSTOMER ERROR MESSAGE
            // --------------------------------------------

            let customerReply =

              'Samahani, huduma yetu ya AI inapata hitilafu ya muda. ' +

              'Tafadhali jaribu tena baada ya dakika chache.';


            if (

              [400, 401, 403].includes(
                Number(status)
              ) ||

              /API key not valid|API_KEY_INVALID|permission denied/i
                .test(error.message)

            ) {

              customerReply =

                'Samahani, huduma yetu inafanyiwa ukaguzi wa kiufundi. ' +

                'Tafadhali jaribu tena baadaye.';

            }


            await sendSafeMessage(
              jid,
              customerReply
            );


          }

        }

      }

    );


  } catch (error) {

    console.error(
      'BOT START ERROR:',
      error.message
    );


  } finally {

    starting = false;

  }

}


// ======================================================
// HOME PAGE
// ======================================================

app.get('/', (req, res) => {


  // ----------------------------------------------------
  // WHATSAPP CONNECTED PAGE
  // ----------------------------------------------------

  if (isLinked) {

    return res.send(`

      <!DOCTYPE html>

      <html>

      <head>

        <meta name="viewport"
              content="width=device-width, initial-scale=1">

        <title>
          Prince Mbilao Project Consultant Worldwide
        </title>

      </head>


      <body style="font-family:Arial;text-align:center;margin-top:70px">

        <h1 style="color:green">

          WhatsApp Connected Successfully

        </h1>


        <p>

          Prince Mbilao Project Consultant Worldwide

        </p>


        <p>

          Bot is online.

        </p>

      </body>

      </html>

    `);

  }


  // ----------------------------------------------------
  // QR CODE PAGE
  // ----------------------------------------------------

  if (qrCodeData) {

    return res.send(`

      <!DOCTYPE html>

      <html>

      <head>

        <meta name="viewport"
              content="width=device-width, initial-scale=1">

        <meta http-equiv="refresh"
              content="20">

      </head>


      <body style="font-family:Arial;text-align:center;margin-top:30px">

        <h2>
          Connect WhatsApp
        </h2>


        <img src="${qrCodeData}"
             style="width:280px;max-width:90%">


        <p>

          Scan this QR code using WhatsApp Linked Devices.

        </p>

      </body>

      </html>

    `);

  }


  // ----------------------------------------------------
  // STARTING PAGE
  // ----------------------------------------------------

  return res.send(`

    <!DOCTYPE html>

    <html>

    <head>

      <meta name="viewport"
            content="width=device-width, initial-scale=1">

      <meta http-equiv="refresh"
            content="5">

    </head>


    <body style="font-family:Arial;text-align:center;margin-top:70px">

      <h2>

        Prince Mbilao Project Consultant Worldwide

      </h2>


      <p>

        Bot is starting. Please wait.

      </p>

    </body>

    </html>

  `);

});


// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/health', (req, res) => {

  res.json({

    server: 'online',

    whatsappConnected: isLinked,

    model: MODEL_NAME,

    googleSheetsApi: SHEET_API,

    googleSheetsServicesCached:
      servicesCache.length,

    googleSheetsLastUpdated:
      servicesCacheTime
        ? new Date(servicesCacheTime).toISOString()
        : null

  });

});


// ======================================================
// GOOGLE SHEETS TEST ENDPOINT
// ======================================================

app.get('/test-sheets', async (req, res) => {

  try {

    const services =
      await getGoogleSheetServices();


    res.json({

      success: services.length > 0,

      serviceCount: services.length,

      services

    });


  } catch (error) {

    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});


// ======================================================
// START SERVER
// ======================================================

app.listen(

  PORT,

  '0.0.0.0',

  () => {

    console.log(
      'SERVER RUNNING ON PORT',
      PORT
    );


    console.log(
      'GOOGLE SHEETS INTEGRATION READY'
    );


    console.log(
      'GEMINI MODEL:',
      MODEL_NAME
    );


    startBot();

  }

);
