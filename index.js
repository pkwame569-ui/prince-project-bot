const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const OpenAI = require('openai');
const express = require('express');
const app = express();
const P = require('pino');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let lastQR = null;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_v3');
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' })
    });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { qr, connection } = update;
        if (qr) {
            lastQR = await QRCode.toDataURL(qr);
            console.log('QR READY - Open your site /qr to scan');
        }
        if (connection === 'open') {
            console.log('MBILAO WORLDWIDE CONNECTED ✅');
            lastQR = null;
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are MBILAO - Founder of MBILAO PROJECT CONSULTANT WORLDWIDE 🌐 Worldwide consultant. YOUR 9 SERVICES WITH PRICES: 1. WhatsApp AI Bot $60 / TZS 150k, 2. Website $35 / 90k, 3. Automation $80 / 200k, 4. Mentorship $35 / 90k per session, 5. M&E & Logframe $35 / 90k, 6. Grant Writing $450, 7. Strategic Plan $300, 8. Feasibility $57 / 150k, 9. Business Plan $120 / 300k. Rules: Answer same language, educate deeply, mention price only when asked cost/bei/price, end with At MBILAO WORLDWIDE we support globally. Which service can I prepare for you?`
                    },
                    { role: "user", content: text }
                ],
                temperature: 0.8
            });
            await sock.sendMessage(from, { text: completion.choices[0].message.content });
        } catch (err) {
            console.log(err.message);
            if(err.message.includes('429')){
                await sock.sendMessage(from, { text: "Hello! OpenAI credits zimeisha kwenye system. Please add credits at platform.openai.com/billing to continue MBILAO WORLDWIDE services. 🌐" });
            }
        }
    });
}
startBot();

app.get('/', (req,res)=>res.send('MBILAO WORLDWIDE 🌐 Live - Go to /qr to scan'));
app.get('/qr', (req,res)=>{
    if(!lastQR) return res.send('<h1>MBILAO WORLDWIDE: Bot Connected ✅ No QR needed. Or wait 30 sec and refresh.</h1>');
    res.send(`<html><body style="text-align:center; padding-top:50px"><h1>MBILAO PROJECT CONSULTANT WORLDWIDE 🌐<br>Scan QR with 0795804621</h1><img src="${lastQR}" style="width:300px"/><br><p>Refresh if expired</p></body></html>`);
});
app.listen(10000, ()=>console.log('MBILAO WORLDWIDE V3 Live - QR on /qr'));
