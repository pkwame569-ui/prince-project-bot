const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const express = require('express');
const QRCode = require('qrcode');
const P = require('pino');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeData = null;
let isLinked = false;
let starting = false;
let sock = null;

const processedMessages = new Set();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const BUSINESS_INFO = [
    'You are the AI assistant for MBILAO PROJECT CONSULTANT WORLDWIDE.',
    'Our services include:',
    'Project proposal writing, grant writing, business plans,',
    'feasibility studies, monitoring and evaluation, data collection,',
    'project budgeting, strategic planning, logframes,',
    'project management, AI chatbots and business automation.',
    'Our clients include NGOs, CBOs, entrepreneurs and businesses.',
    'Reply in the same language as the customer, especially',
    'Swahili or English. Be professional, friendly and helpful.',
    'Never invent prices or guarantee grant funding.',
    'Ask questions when you need more information.'
].join(' ');

async function askAI(message) {
    const response = await openai.responses.create({
        model: 'gpt-4.1-mini',
        instructions: BUSINESS_INFO,
        input: message,
        max_output_tokens: 350
    });

    return response.output_text ||
        'Samahani, tafadhali jaribu tena baadaye.';
}

async function startBot() {
    if (starting) return;
    starting = true;

    try {
        const auth = await useMultiFileAuthState('auth');

        const state = auth.state;
        const saveCreds = auth.saveCreds;

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

        sock.ev.on('connection.update', async (update) => {
            const connection = update.connection;
            const lastDisconnect = update.lastDisconnect;
            const qr = update.qr;

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
                console.log('WHATSAPP CONNECTED SUCCESSFULLY');
            }

            if (connection === 'close') {
                isLinked = false;
                starting = false;

                const statusCode =
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output &&
                    lastDisconnect.error.output.statusCode;

                console.log('WhatsApp connection closed:', statusCode);

                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(function () {
                        startBot().catch(console.error);
                    }, 5000);
                } else {
                    qrCodeData = null;
                    console.log('WhatsApp logged out. Check authentication.');
                }
            }
        });

        sock.ev.on('messages.upsert', async function (event) {
            if (event.type !== 'notify') return;

            for (const msg of event.messages) {
                try {
                    if (!msg.message || msg.key.fromMe) continue;

                    const jid = msg.key.remoteJid;

                    if (!jid) continue;
                    if (jid === 'status@broadcast') continue;
                    if (jid.endsWith('@g.us')) continue;

                    const messageId = msg.key.id;

                    if (
                        messageId &&
                        processedMessages.has(messageId)
                    ) {
                        continue;
                    }

                    if (messageId) {
                        processedMessages.add(messageId);

                        if (processedMessages.size > 1000) {
                            processedMessages.clear();
                        }
                    }

                    const content = msg.message;

                    const text =
                        content.conversation ||
                        (content.extendedTextMessage &&
                            content.extendedTextMessage.text) ||
                        (content.imageMessage &&
                            content.imageMessage.caption) ||
                        (content.videoMessage &&
                            content.videoMessage.caption);

                    if (!text || !text.trim()) continue;

                    console.log('MESSAGE RECEIVED:', text);

                    await sock.sendPresenceUpdate('composing', jid);

                    let reply;

                    try {
                        reply = await askAI(text.trim());
                    } catch (error) {
                        console.error('OPENAI ERROR:', error.message);

                        reply =
                            'Samahani, nina tatizo la kujibu sasa. Tafadhali jaribu tena baadaye.';
                    }

                    await sock.sendMessage(jid, {
                        text: reply
                    });

                    await sock.sendPresenceUpdate('paused', jid);

                    console.log('REPLY SENT SUCCESSFULLY');

                } catch (error) {
                    console.error('MESSAGE ERROR:', error.message);
                }
            }
        });

    } catch (error) {
        console.error('BOT STARTUP ERROR:', error.message);
        starting = false;

        setTimeout(function () {
            startBot().catch(console.error);
        }, 10000);
    }
}

app.get('/', function (req, res) {
    if (isLinked) {
        return res.send(
            '<html><body style="text-align:center;font-family:Arial">' +
            '<h1>MBILAO PROJECT CONSULTANT WORLDWIDE</h1>' +
            '<h2>WhatsApp Bot Connected</h2>' +
            '<p>Bot imeunganishwa. Unaweza kuijaribu.</p>' +
            '</body></html>'
        );
    }

    if (qrCodeData) {
        return res.send(
            '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '</head><body style="text-align:center;font-family:Arial;padding:20px">' +
            '<h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2>' +
            '<h3>Scan QR Code</h3>' +
            '<img src="' + qrCodeData + '" style="width:300px;max-width:90%">' +
            '<p>WhatsApp &gt; Linked devices &gt; Link a device</p>' +
            '<p>Refresh ukurasa ikiwa QR imeisha muda wake.</p>' +
            '<script>setTimeout(function(){location.reload()},25000)</script>' +
            '</body></html>'
        );
    }

    return res.send(
        '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '</head><body style="text-align:center;font-family:Arial;padding:30px">' +
        '<h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2>' +
        '<p>Inasubiri WhatsApp QR Code...</p>' +
        '<p>Subiri sekunde 10.</p>' +
        '<script>setTimeout(function(){location.reload()},10000)</script>' +
        '</body></html>'
    );
});

app.get('/health', function (req, res) {
    res.json({
        service: 'running',
        whatsappConnected: isLinked,
        qrReady: Boolean(qrCodeData)
    });
});

app.listen(PORT, '0.0.0.0', function () {
    console.log('MBILAO SERVER RUNNING ON PORT ' + PORT);
    startBot().catch(console.error);
});
