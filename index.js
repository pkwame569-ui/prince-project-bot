const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const pino = require("pino");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const BUSINESS_NAME = "MBILAO LCO PROJECT CONSULTANT WORLDWIDE";
const PACKAGE_PRICE = 95000;
const MAX_DISCOUNT = 0.10;

const SHEET_API =
  process.env.SHEET_API ||
  "https://script.google.com/macros/s/AKfycbyX3Y3R3GdzNIR3hM1ZPTIiX_SX0jCSi6EWSmHaVdTpgJ4EkvpP11HhxQikhEa08sVc/exec";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SERVICES = [
  "Project Proposal Writing",
  "Grant Research and Application Support",
  "Business Plan Development",
  "Feasibility Studies and Market Research",
  "Monitoring, Evaluation and Learning",
  "Project Budgeting and Financial Narratives",
  "Strategic Planning, Logframes and Theory of Change",
  "Data Collection, Data Analysis and Reporting",
  "AI Chatbots and Business Process Automation",
  "Data Analytics and Business Intelligence Dashboards",
  "AI Documents and Report Generation",
  "Business Sales and Financial Analysis"
];

let sock;
let latestQR = null;
let connected = false;
let reconnecting = false;
let geminiModel = null;
let lastSheetData = [];
let lastSheetFetch = 0;

const processedMessages = new Set();
const replyCooldown = new Map();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getGeminiModel() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  if (!geminiModel) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    geminiModel = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1800
      }
    });
  }

  return geminiModel;
}

async function loadSheetServices() {
  const now = Date.now();

  if (lastSheetData.length && now - lastSheetFetch < 5 * 60 * 1000) {
    return lastSheetData;
  }

  try {
    const response = await fetch(SHEET_API, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error(`Google Sheets HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.success !== true || !Array.isArray(data.services)) {
      throw new Error("Google Sheets returned an unexpected response");
    }

    lastSheetData = data.services;
    lastSheetFetch = now;

    console.log(`Google Sheets loaded: ${lastSheetData.length} services`);

    return lastSheetData;
  } catch (error) {
    console.error("SHEET ERROR:", error.message);

    // Tumia data iliyohifadhiwa ikiwa Google Sheets haipatikani.
    return lastSheetData;
  }
}

function formatSheetServices(services) {
  if (!services.length) {
    return "Google Sheets haijapatikana. Usibuni bei za huduma binafsi.";
  }

  return services.map(service => {
    return [
      `Huduma: ${service["service name"] || service.service_name || "Haijatajwa"}`,
      `Bei: ${service.price || "Thibitisha bei"}`,
      `Maelezo: ${service["service description"] || service.service_description || "Hakuna maelezo"}`
    ].join("\n");
  }).join("\n\n");
}

function buildSystemPrompt(sheetContext) {
  return `
Wewe ni msaidizi rasmi wa biashara hii:

${BUSINESS_NAME}

MAJUKUMU:
- Jibu wateja kwa lugha waliyoitumia. Unaweza kutumia Kiswahili, Kiingereza na lugha nyingine unazoweza.
- Saidia huduma za miradi na zisizo za miradi.
- Eleza huduma kwa lugha rahisi, kitaalamu na kwa heshima.
- Usijifanye kuwa binadamu. Wewe ni AI assistant wa biashara.
- Usibuni taarifa, bei, mafanikio, ahadi za ufadhili au taarifa za wateja.
- Uliza maswali mafupi ya ufafanuzi pale taarifa muhimu zinapokosekana.
- Usidai kuwa grant imepatikana au imeidhinishwa bila ushahidi.
- Usidai kuwa umetuma faili, umefanya malipo au umekamilisha kazi kama hujafanya hivyo.

HUDUMA:
${SERVICES.map((s, i) => `${i + 1}. ${s}`).join("\n")}

BEI YA KIFURUSHI:
- Kifurushi cha huduma zote: TZS ${PACKAGE_PRICE.toLocaleString("en-US")}.
- Punguzo la juu kabisa ni 10%.
- Bei baada ya punguzo la 10% ni TZS ${(PACKAGE_PRICE * (1 - MAX_DISCOUNT)).toLocaleString("en-US")}.
- Toa punguzo hili tu mteja anapoliomba.
- Usichanganye bei ya kifurushi na bei ya huduma moja.
- Kwa bei za huduma binafsi, tumia taarifa za Google Sheets hapa chini.
- Ikiwa bei ya Google Sheets haieleweki au inaonekana imeandikwa vibaya, mwambie mteja bei inahitaji kuthibitishwa. Usikisie.
- Usiahidi kwamba kila huduma inajumuishwa kwenye kifurushi bila kuthibitisha wigo wa kazi na masharti.

TAARIFA ZA HUDUMA KUTOKA GOOGLE SHEETS:
${sheetContext}

MAMBO UNAYOWEZA KUSAIDIA:
- Kuandaa mawazo ya miradi na concept notes.
- Kuandaa muundo wa project proposal na business plan.
- Kueleza grant application na mahitaji ya wafadhili.
- Kusaidia bajeti, indicators, logframe na monitoring and evaluation.
- Kueleza uchambuzi wa data, biashara, mauzo na fedha.
- Kushauri kuhusu dashboards, AI chatbots na business automation.
- Kuandaa rasimu za ripoti na nyaraka kwa ajili ya kupitiwa na mteja.

JINSI YA KUJIBU:
- Jibu swali lililoulizwa moja kwa moja.
- Usiorodheshe huduma zote kila mara.
- Usitoe majibu marefu yasiyoombwa.
- Kwa kazi kubwa, eleza taarifa unazohitaji kabla ya kuanza.
- Kuwa mtaalamu, mkweli na mwenye msaada.
`;
}

function extractErrorStatus(error) {
  return (
    error?.status ||
    error?.statusCode ||
    error?.response?.status ||
    error?.errorDetails?.status ||
    0
  );
}

function isQuotaError(error) {
  const status = extractErrorStatus(error);
  const message = String(error?.message || "").toLowerCase();

  return (
    status === 429 ||
    message.includes("quota exceeded") ||
    message.includes("resource_exhausted") ||
    message.includes("requests per day")
  );
}

function isTemporaryError(error) {
  const status = extractErrorStatus(error);
  const message = String(error?.message || "").toLowerCase();

  return (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("fetch failed") ||
    message.includes("timeout")
  );
}

async function askAI(userMessage) {
  const model = getGeminiModel();
  const services = await loadSheetServices();
  const sheetContext = formatSheetServices(services);

  const prompt = `
${buildSystemPrompt(sheetContext)}

UJUMBE WA MTEJA:
${userMessage}

Jibu ujumbe wa mteja sasa.
`;

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const answer = result?.response?.text?.();

      if (answer && answer.trim()) {
        return answer.trim();
      }

      throw new Error("Gemini imerudisha jibu tupu.");
    } catch (error) {
      lastError = error;

      const status = extractErrorStatus(error);

      console.error(
        `GEMINI ERROR | Attempt ${attempt} | Status: ${status} | ${error.message}`
      );

      // Quota haitatatuliwa kwa kurudia maombi mfululizo.
      if (isQuotaError(error)) {
        throw new Error("AI_QUOTA_LIMIT");
      }

      if (!isTemporaryError(error) || attempt === 3) {
        break;
      }

      await sleep(attempt * 2000);
    }
  }

  throw lastError || new Error("AI_REQUEST_FAILED");
}

function customerErrorMessage(error) {
  if (error.message === "GEMINI_API_KEY_MISSING") {
    return "Samahani, huduma ya AI haijasanidiwa kikamilifu kwa sasa. Tafadhali wasiliana na timu yetu.";
  }

  if (error.message === "AI_QUOTA_LIMIT") {
    return "Samahani, mfumo wa AI umefikia kikomo cha matumizi kwa sasa. Tafadhali jaribu tena baadaye au wasiliana na timu yetu kwa msaada.";
  }

  if (isTemporaryError(error)) {
    return "Samahani, huduma ya AI ina msongamano wa muda. Tafadhali jaribu tena baada ya dakika chache.";
  }

  return "Samahani, hatukuweza kuchakata ujumbe wako kwa sasa. Tafadhali jaribu tena baadaye.";
}

async function sendSafeMessage(jid, text) {
  if (!sock || !connected) {
    console.error("WhatsApp haijaunganishwa. Ujumbe haukutumwa.");
    return;
  }

  try {
    await sock.sendMessage(jid, { text });
  } catch (error) {
    console.error("WHATSAPP SEND ERROR:", error.message);
  }
}

async function handleIncomingMessage(message) {
  if (!message || message.key?.fromMe) return;

  const jid = message.key?.remoteJid;

  if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) {
    return;
  }

  const messageId = message.key?.id;

  if (!messageId || processedMessages.has(messageId)) {
    return;
  }

  processedMessages.add(messageId);

  if (processedMessages.size > 2000) {
    const first = processedMessages.values().next().value;
    processedMessages.delete(first);
  }

  const now = Date.now();
  const lastReply = replyCooldown.get(jid) || 0;

  if (now - lastReply < 1500) {
    return;
  }

  replyCooldown.set(jid, now);

  const content = message.message || {};
  const text =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    "";

  if (!text.trim()) {
    await sendSafeMessage(
      jid,
      "Karibu MBILAO LCO PROJECT CONSULTANT WORLDWIDE. Kwa sasa tafadhali tuma swali lako kwa maandishi ili nikusaidie."
    );
    return;
  }

  console.log(`Incoming message from ${jid}: ${text.slice(0, 100)}`);

  try {
    const answer = await askAI(text);
    await sendSafeMessage(jid, answer);
  } catch (error) {
    console.error("MESSAGE PROCESSING ERROR:", error.message);
    await sendSafeMessage(jid, customerErrorMessage(error));
  }
}

async function startWhatsApp() {
  if (reconnecting) return;
  reconnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_final_v3");

    let version;

    try {
      const versionInfo = await fetchLatestBaileysVersion();
      version = versionInfo.version;
      console.log("Baileys version:", version.join("."));
    } catch (error) {
      console.error("Could not fetch latest WhatsApp version:", error.message);
    }

    sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      logger: pino({ level: "silent" }),
      browser: ["MBILAO LCO PROJECT CONSULTANT WORLDWIDE", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQR = qr;
        connected = false;
        console.log("WhatsApp QR imezalishwa. Fungua ukurasa wa /qr.");
      }

      if (connection === "open") {
        connected = true;
        latestQR = null;
        console.log(`${BUSINESS_NAME} imeunganishwa WhatsApp.`);
      }

      if (connection === "close") {
        connected = false;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.error("WhatsApp connection closed:", statusCode);

        if (statusCode !== DisconnectReason.loggedOut) {
          console.log("Inajaribu kuunganisha WhatsApp tena...");
          await sleep(4000);
          reconnecting = false;
          startWhatsApp().catch(err =>
            console.error("Reconnect error:", err.message)
          );
          return;
        }

        console.error(
          "WhatsApp imetoka kwenye akaunti. Futa auth_final_v3 tu ikiwa unajua unahitaji kuunganisha upya."
        );
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const message of messages || []) {
        await handleIncomingMessage(message);
      }
    });
  } catch (error) {
    connected = false;
    console.error("WHATSAPP START ERROR:", error.message);

    setTimeout(() => {
      reconnecting = false;
      startWhatsApp().catch(err =>
        console.error("Restart error:", err.message)
      );
    }, 5000);

    return;
  }

  reconnecting = false;
}

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${BUSINESS_NAME}</title>
      </head>
      <body style="font-family:Arial,sans-serif;padding:24px">
        <h2>${BUSINESS_NAME}</h2>
        <p>WhatsApp status: <strong>${connected ? "CONNECTED" : "CONNECTING"}</strong></p>
        <p>AI model configured: <strong>${MODEL_NAME}</strong></p>
        <p><a href="/health">System health</a></p>
        <p><a href="/qr">WhatsApp QR</a></p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    business: BUSINESS_NAME,
    whatsappConnected: connected,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    model: MODEL_NAME,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get("/qr", async (req, res) => {
  if (connected) {
    return res.send("<h2>WhatsApp imeunganishwa tayari.</h2>");
  }

  if (!latestQR) {
    return res.status(503).send(
      "<h2>QR bado haijapatikana. Subiri kidogo kisha refresh ukurasa.</h2>"
    );
  }

  try {
    const qrImage = await QRCode.toDataURL(latestQR);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="20">
          <title>WhatsApp QR</title>
        </head>
        <body style="font-family:Arial;text-align:center;padding:20px">
          <h2>${BUSINESS_NAME}</h2>
          <p>Scan QR kwa WhatsApp Linked Devices.</p>
          <img src="${qrImage}" style="width:280px;max-width:90%">
          <p>Ukurasa utajirefresh baada ya sekunde 20.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("QR ERROR:", error.message);
    res.status(500).send("QR haikuweza kutengenezwa.");
  }
});

app.get("/test-sheets", async (req, res) => {
  const services = await loadSheetServices();

  res.json({
    success: services.length > 0,
    count: services.length,
    services
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`${BUSINESS_NAME} server running on port ${PORT}`);
  startWhatsApp().catch(error => {
    reconnecting = false;
    console.error("Initial WhatsApp error:", error.message);
  });
});
