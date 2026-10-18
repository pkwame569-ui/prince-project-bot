
// fixed bad mac + auto clear + gemini 2.5 fix
const fs = require('fs');
try {
  ['auth_info_baileys','session','baileys_auth_info','auth','prince_session'].forEach(d=>{
    if(fs.existsSync('./'+d)) fs.rmSync('./'+d,{recursive:true,force:true});
  });
} catch {}

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const P = require('pino');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeData = null;
let isLinked = false;
let starting = false;
let sock = null;
let reconnectTimer = null;

const processedMessages = new Set();

// GEMINI AI - SAHIHI
const gemini = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY
});
const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
// TAARIFA ZA BIASHARA
const BUSINESS_INFO = `
You are the professional AI customer service assistant for
MBILAO PROJECT CONSULTANT WORLDWIDE.

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

TARGET CLIENTS:
NGOs, CBOs, entrepreneurs, small businesses,
community development organizations and institutions.

INSTRUCTIONS:
- Reply in the same language as the customer.
- Prioritize Swahili and English.
- Be professional, friendly and helpful.
- Understand the customer's question before answering.
- Give clear and useful answers.
- Ask follow-up questions when necessary.
- Explain our services accurately.
- Never invent prices, contact details or business policies.
- Never guarantee that a grant application will receive funding.
- If a customer asks for a price that is not provided,
  explain that the price depends on the requested service.
- Help potential customers understand how our services
  can solve their project or business problems.
- Keep answers concise and suitable for WhatsApp.
- Identify yourself as the AI assistant for
  MBILAO PROJECT CONSULTANT WORLDWIDE when appropriate.
`;

// GEMINI AI FUNCTION
async function askAI(message) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY haijawekwa kwenye Render.');
    }

    const response = await gemini.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: message,
        config: {
            systemInstruction: BUSINESS_INFO,
            maxOutputTokens: 350
        }
    });

    const answer = response.text;

    if (!answer || !answer.trim()) {
        throw new Error('Gemini haikurudisha jibu.');
    }

    return answer.trim();
}

// KUSOMA UJUMBE WA WHATSAPP
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

// KUANZISHA WHATSAPP BOT
async function startBot() {
    if (starting) return;

    starting = true;

    try {
        const { state, saveCreds } =
            await useMultiFileAuthState('auth');

        sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: [
                'MBILAO PROJECT CONSULTANT WORLDWIDE',
                'Chrome',
                '1.0'
            ]
        });

        sock.ev.on('creds.update', saveCreds);

        // CONNECTION STATUS
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    qrCodeData = await QRCode.toDataURL(qr);
                    console.log('QR TAYARI - Fungua website kuscan.');
                } catch (error) {
                    console.error('QR ERROR:', error.message);
                }
            }

            if (connection === 'open') {
                isLinked = true;
                qrCodeData = null;
                starting = false;

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }

                console.log('WHATSAPP CONNECTED SUCCESSFULLY');
            }

            if (connection === 'close') {
                isLinked = false;
                starting = false;
                sock = null;

                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                console.log('WhatsApp connection closed:', statusCode);

                if (statusCode === DisconnectReason.loggedOut) {
                    qrCodeData = null;
                    console.log(
                        'WHATSAPP LOGGED OUT. Reconnect by linking again.'
                    );
                    return;
                }

                if (!reconnectTimer) {
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        startBot();
                    }, 5000);
                }
            }
        });

        // KUPOKEA NA KUJIBU UJUMBE
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    if (!msg.message) continue;
                    if (msg.key.fromMe) continue;

                    const jid = msg.key.remoteJid;

                    // Epuka makundi na status za WhatsApp
                    if (!jid) continue;
                    if (jid.endsWith('@g.us')) continue;
                    if (jid === 'status@broadcast') continue;

                    const messageId = msg.key.id;

                    if (!messageId) continue;
                    if (processedMessages.has(messageId)) continue;

                    processedMessages.add(messageId);

                    // Zuia kumbukumbu isikue bila kikomo
                    if (processedMessages.size > 1000) {
                        const oldest =
                            processedMessages.values().next().value;

                        processedMessages.delete(oldest);
                    }

                    const text = getMessageText(msg.message);

                    if (!text.trim()) continue;

                    console.log('MESSAGE RECEIVED:', text);

                    let reply;

                    try {
                        reply = await askAI(text.trim());
                    } catch (error) {
                        console.error(
                            'GEMINI ERROR:',
                            error.status || '',
                            error.message
                        );

                        reply =
                            'Samahani, nimeshindwa kujibu kwa sasa. ' +
                            'Tafadhali jaribu tena baada ya muda mfupi.';
                    }

                    // Tuma jibu kwa mteja
                    await sock.sendMessage(jid, {
                        text: reply
                    });

                    console.log('REPLY SENT SUCCESSFULLY');

                } catch (error) {
                    console.error(
                        'MESSAGE PROCESSING ERROR:',
                        error.message
                    );
                }
            }
        });

    } catch (error) {
        starting = false;

        console.error('BOT START ERROR:', error.message);

        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                startBot();
            }, 10000);
        }
    }
}

// WEBSITE YA BOT NA QR CODE
app.get('/', (req, res) => {
    if (isLinked) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport"
                      content="width=device-width, initial-scale=1">
                <title>MBILAO AI BOT</title>
            </head>
            <body style="font-family:Arial;text-align:center;padding:30px">
                <h1>MBILAO PROJECT CONSULTANT WORLDWIDE</h1>
                <h2 style="color:green">
                    WHATSAPP CONNECTED SUCCESSFULLY
                </h2>
                <p>WhatsApp bot yako iko tayari kupokea ujumbe.</p>
            </body>
            </html>
        `);
    }

    if (qrCodeData) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport"
                      content="width=device-width, initial-scale=1">
                <title>Unganisha WhatsApp</title>
            </head>
            <body style="font-family:Arial;text-align:center;padding:20px">
                <h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2>
                <p>Scan QR code hii kupitia WhatsApp Linked Devices.</p>
                <img src="${qrCodeData}"
                     alt="WhatsApp QR Code"
                     style="width:280px;max-width:90%">
                <p>Baada ya kuunganisha, ukurasa huu utaonyesha hali ya bot.</p>
                <script>
                    setTimeout(() => location.reload(), 15000);
                </script>
            </body>
            </html>
        `);
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport"
                  content="width=device-width, initial-scale=1">
            <title>MBILAO AI BOT</title>
        </head>
        <body style="font-family:Arial;text-align:center;padding:30px">
            <h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2>
            <p>Bot inaanza au inasubiri QR code.</p>
            <p>Refresh ukurasa huu baada ya sekunde chache.</p>
            <script>
                setTimeout(() => location.reload(), 5000);
            </script>
        </body>
        </html>
    `);
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({
        service: 'MBILAO AI BOT',
        whatsappConnected: isLinked,
        aiProvider: 'Google Gemini',
        status: 'running'
    });
});

// KUWASHA SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log('MBILAO AI BOT SERVER RUNNING ON PORT', PORT);
    startBot();
});
