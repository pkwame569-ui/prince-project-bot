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
let sock = null;
let starting = false;

const processedMessages = new Set();

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

const BUSINESS_INFO = `
Wewe ni AI assistant wa MBILAO PROJECT CONSULTANT WORLDWIDE.

Huduma zetu ni:

1. Project proposal writing.
2. Grant writing and funding application support.
3. Business plan preparation.
4. Feasibility studies.
5. Monitoring and Evaluation (M&E).
6. Data collection and documentation.
7. Project budgets and financial narratives.
8. Strategic plans, logframes and theory of change.
9. Project planning and management.
10. AI chatbots and business automation.

Wateja wetu ni NGOs, CBOs, founders, entrepreneurs,
small businesses na mashirika ya maendeleo.

Jibu kwa lugha aliyotumia mteja, hasa Kiswahili au Kiingereza.
Kuwa mtaalamu, mkarimu na mwenye kueleweka.
Uliza maswali ili kuelewa mahitaji ya mteja.
Usibuni bei, wafadhili, ahadi za kupata grant au taarifa zisizojulikana.
Bei itategemea ukubwa na mahitaji ya kazi.
Usiahidi kwamba mteja atapata funding kwa uhakika.
`;

async function askAI(message) {
const response = await openai.responses.create({
model: 'gpt-4.1-mini',
instructions: BUSINESS_INFO,
input: message,
max_output_tokens: 350
});

return response.output_text ||
    'Samahani, tafadhali jaribu tena baada ya muda mfupi.';

}

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
        browser: ['MBILAO PROJECT CONSULTANT WORLDWIDE', 'Chrome', '1.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                qrCodeData = await QRCode.toDataURL(qr);
                console.log('QR TAYARI - Fungua website kuscan.');
            } catch (err) {
                console.error('QR error:', err.message);
            }
        }

        if (connection === 'connecting') {
            console.log('WhatsApp inajaribu kuunganisha...');
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
                lastDisconnect?.error?.output?.statusCode;

            console.log('WhatsApp connection closed. Code:', statusCode);

            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => {
                    startBot().catch(err =>
                        console.error('Reconnect error:', err.message)
                    );
                }, 5000);
            } else {
                qrCodeData = null;
                console.log(
                    'WhatsApp imetoka. Session inahitaji kuunganishwa tena.'
                );
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            try {
                if (!msg.message || msg.key.fromMe) continue;

                const jid = msg.key.remoteJid;

                if (
                    !jid ||
                    jid === 'status@broadcast' ||
                    jid.endsWith('@g.us')
                ) continue;

                const messageId = msg.key.id;
                if (messageId && processedMessages.has(messageId)) continue;

                if (messageId) {
                    processedMessages.add(messageId);

                    if (processedMessages.size > 1000) {
                        processedMessages.clear();
                    }
                }

                const content = msg.message;
                const text =
                    content.conversation ||
                    content.extendedTextMessage?.text ||
                    content.imageMessage?.caption ||
                    content.videoMessage?.caption;

                if (!text || !text.trim()) continue;

                console.log('Ujumbe umepokelewa:', text);

                await sock.sendPresenceUpdate('composing', jid);

                let reply;

                try {
                    reply = await askAI(text.trim());
                } catch (err) {
                    console.error('OPENAI ERROR:', err.message);
                    reply =
                        'Samahani, nina tatizo la kujibu kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.';
                }

                await sock.sendMessage(jid, { text: reply });
                await sock.sendPresenceUpdate('paused', jid);

                console.log('Jibu limetumwa kwa mteja.');

            } catch (err) {
                console.error('MESSAGE ERROR:', err.message);
            }
        }
    });

} catch (err) {
    console.error('BOT STARTUP ERROR:', err.message);
    starting = false;

    setTimeout(() => {
        startBot().catch(console.error);
    }, 10000);
}

}

app.get('/', (req, res) => {
if (isLinked) {
return res.send("<html> <head><meta name="viewport" content="width=device-width, initial-scale=1"></head> <body style="font-family:Arial;text-align:center;padding:30px"> <h1>MBILAO PROJECT CONSULTANT WORLDWIDE</h1> <h2>WhatsApp Bot Connected ✅</h2> <p>Muunganisho wa WhatsApp umefanikiwa.</p> </body> </html>");
}

if (qrCodeData) {
    return res.send(`
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:Arial;text-align:center;padding:20px">
            <h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2>
            <h3>Scan QR Code kwa WhatsApp</h3>
            <img src="${qrCodeData}" style="width:300px;max-width:90%">
            <p>WhatsApp → Linked devices → Link a device</p>
            <p>QR ikikataa, refresh ukurasa ili kuangalia QR mpya.</p>
            <script>setTimeout(()=>location.reload(),25000)</script>
        </body>
        </html>
    `);
}

res.send(`
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family:Arial;text-align:center;padding:30px">
        <h2>MBILAO PROJECT CONSULTANT WORLDWIDE</h2>
        <h3>Inasubiri WhatsApp QR Code...</h3>
        <p>Subiri sekunde 10 kisha ukurasa utajisasisha.</p>
        <script>setTimeout(()=>location.reload(),10000)</script>
    </body>
    </html>
`);

});

app.get('/health', (req, res) => {
res.json({
service: 'running',
whatsappConnected: isLinked,
qrReady: Boolean(qrCodeData)
});
});

app.listen(PORT, '0.0.0.0', () => {
console.log('MBILAO BOT SERVER STARTED ON PORT', PORT);
startBot().catch(err => {
console.error('START ERROR:', err.message);
});
});
