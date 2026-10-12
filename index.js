const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode');
const pino = require('pino');
const app = express();

const BOT_NAME = "MBILAO- PROJECT-CONSULTANT- 🌐";
let qrCodeData = null;
let isConnected = false;

app.get('/', (req, res) => res.send(`${BOT_NAME} is Live! Go to /qr`));
app.get('/qr', async (req, res) => {
    if (isConnected) return res.send(`<h1>${BOT_NAME} ✅ Connected!</h1>`);
    if (!qrCodeData) return res.send(`<h1>${BOT_NAME} - Generating QR... Refresh in 10s</h1>`);
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.send(`<h1>${BOT_NAME}</h1><img src="${qrImage}" /><p>Scan with WhatsApp</p>`);
});

// BOT INTELLIGENCE - BILINGUAL & CUSTOMER FREEDOM
async function getSmartReply(userText) {
    const text = userText.toLowerCase();
    const isSwahili = /habari|bei|shikamoo|mambo|sawa|asante|karibu|naomba|nataka|mteja|huduma/.test(text);
    const GROQ_KEY = process.env.GROQ_API_KEY;

    if (GROQ_KEY) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: `You are ${BOT_NAME}. You are a warm, welcoming consultant. RULES: 1. Customer is KING - give freedom to ask anything, never say "I didn't understand" or "choose number". 2. Be bilingual: If user speaks Swahili reply in Swahili, if English reply in English. 3. Always educate, welcome, assure cheap price $111 with discount and FREE initial consultation. 4. You have 14 services: Project Evaluation, Monitoring, Logframe, Theory of Change, Research, Grant Writing, Project Planning, Agrarian Support, Marketing, Website Development, WhatsApp Bot, AI Engineer, and more. 5. If user says 6, 14, market, makerting, tangaza - explain MARKETING fully. 6. Keep conversation going, ask follow-up questions, make customer satisfied and feel free. 7. No rigid code answers - talk like human.` },
                        { role: 'user', content: userText }
                    ],
                    temperature: 0.8, max_tokens: 400
                })
            });
            const data = await res.json();
            if (data.choices) return data.choices[0].message.content;
        } catch (e) { console.log('AI fallback'); }
    }

    // PERFECT FALLBACK - NO ERRORS, BILINGUAL, FREE CUSTOMER
    if (text.includes('6') || text.includes('14') || text.includes('market') || text.includes('makert') || text.includes('soko') || text.includes('tangaza') || text.includes('advert')) {
        if (isSwahili) {
            return `Karibu sana ${BOT_NAME}! 🌐🔥\n\nMkuu umechagua vyema - MARKETING!\n\nSisi tunakusaidia biashara yako ionekane na kuleta wateja wa kweli - Facebook, Instagram, WhatsApp, TikTok.\n\n**Kwa $111 tu unapata:**\n✅ Matangazo yanayovutia na kuuza\n✅ Kusimamia kurasa zako kila siku\n✅ Wateja wengi kwa gharama nafuu\n✅ Ushauri wa BURE wa kukuza mauzo\n\nBei ni nafuu sana, tuna punguzo maalum kwa mteja mpya kama wewe, na unaweza kulipa kidogo kidogo.\n\nMteja wetu ni mfalme - uko huru kuuliza chochote! Biashara yako ni gani nikupe wazo la bure leo?`;
        } else {
            return `Welcome to ${BOT_NAME}! 🌐🔥\n\nGreat choice - MARKETING!\n\nWe help your business get seen and get REAL customers - Facebook, Instagram, WhatsApp, TikTok.\n\n**For only $111 you get:**\n✅ Attractive ads that sell\n✅ Daily page management\n✅ Many customers at low cost\n✅ FREE consultation to grow sales\n\nPrice is very affordable, we have special discount for new customers like you, and you can pay in installments.\n\nYou are free to ask anything! What is your business? Let me give you a FREE idea today!`;
        }
    }

    // GENERAL WELCOME - FREEDOM TO CHOOSE
    if (isSwahili) {
        return `Karibu sana ${BOT_NAME}! 🌐🙏\n\nMkuu, uko mahali sahihi kabisa! Sisi ni wataalamu wa miradi na biashara.\n\nTunakupa huduma 14 kamili: Evaluation, Monitoring, Marketing, Website, WhatsApp Bot, AI Engineer, Grant Writing, Planning na nyingi zaidi.\n\n**Wewe ni huru 100% mkuu!**\n✅ Uliza chochote unachotaka\n✅ Chagua huduma yoyote unayopenda\n✅ Pata ushauri wa BURE kabisa\n✅ Bei nafuu kuanzia $111 tu na punguzo\n\nSisi tupo kukuelimisha, kukukaribisha na kukuhudumia kwa upendo mpaka uridhike. Hatuwezi kukulazimisha.\n\nNiambie mkuu, unahitaji msaada gani leo? Niko tayari kukusikiliza!`;
    } else {
        return `Welcome to ${BOT_NAME}! 🌐🙏\n\nYou are in the right place! We are experts in projects and business.\n\nWe offer 14 complete services: Evaluation, Monitoring, Marketing, Website, WhatsApp Bot, AI Engineer, Grant Writing, Planning and more.\n\n**You are 100% FREE!**\n✅ Ask anything you want\n✅ Choose any service you like\n✅ Get FREE initial consultation\n✅ Affordable price from $111 only with discount\n\nWe are here to educate you, welcome you and serve you with love until you are satisfied. No pressure at all.\n\nTell me, what help do you need today? I am ready to listen!`;
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['MBILAO', 'Chrome', '1.0'] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        const { connection, qr, lastDisconnect } = u;
        if (qr) qrCodeData = qr;
        if (connection === 'close') {
            isConnected = false;
            if (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') { isConnected = true; qrCodeData = null; }
    });
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const txt = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (!txt) return;
        const reply = await getSmartReply(txt);
        await sock.sendMessage(m.key.remoteJid, { text: reply });
    });
}
app.listen(process.env.PORT || 10000, () => console.log('Live'));
startBot();
