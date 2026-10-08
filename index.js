const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = null;
let isConnected = false;

const HUDUMA = {
"1": "1. PROJECT PLANNING - $30 (was $38)\n80% ya miradi hufeli kwa kukosa plan. Tunakutengenezea Workplan, Gantt Chart na Budget.",
"2": "2. M&E - $180 (was $220)\nDonor anataka matokeo. Tunatengeneza M&E Framework, Logframe na Indicators.",
"3": "3. PROPOSAL WRITING - $75 (was $99)\nMoyo wa kupata pesa. Tunaandika Problem Statement na Budget inayopitika.",
"4": "4. GRANT APPLICATION - $190 (was $220)\nTunatafuta grant USAID, EU, UNDP na kuandika application inayoshinda.",
"5": "5. AI AUTOMATION - $250 (was $300)\nInakuokoa masaa 15+ kwa wiki. Auto-reply na auto-report.",
"6": "6. CLIMATE-SMART AI - $40 (was $50)\nSuluhisho la kilimo na mazingira kwa AI."
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (qr) {
            qrImage = await qrcode.toDataURL(qr);
        }
        if (connection === 'open') {
            isConnected = true; qrImage = null;
            console.log("IMEUNGANISHWA!");
        }
        if (connection === 'close') {
            isConnected = false;
            if (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();
        const from = msg.key.remoteJid;
        let reply = "";
        if (text.includes("habari") || text.includes("menu") || text.includes("hello")) {
            reply = `Karibu LM TZ PROJECT AI ENGINEER BOT! 🚀\n\n1. Project Planning $30\n2. M&E $180\n3. Proposal $75\n4. Grant $190\n5. AI Automation $250\n6. Climate $40\n\nAndika namba 1-6 au neno GRANT / M&E / PROPOSAL`;
        } else if (text.includes("1") || text.includes("planning")) { reply = HUDUMA["1"] + "\n\nAndika NUNUA 1"; }
        else if (text.includes("2") || text.includes("m&e")) { reply = HUDUMA["2"] + "\n\nAndika NUNUA 2"; }
        else if (text.includes("3") || text.includes("proposal")) { reply = HUDUMA["3"] + "\n\nAndika NUNUA 3"; }
        else if (text.includes("4") || text.includes("grant")) { reply = HUDUMA["4"] + "\n\nAndika NUNUA 4"; }
        else if (text.includes("5") || text.includes("automation")) { reply = HUDUMA["5"] + "\n\nAndika NUNUA 5"; }
        else if (text.includes("6") || text.includes("climate")) { reply = HUDUMA["6"] + "\n\nAndika NUNUA 6"; }
        else { reply = `Andika MENU kuona huduma 6 zetu.\nAu andika GRANT, M&E, PROPOSAL`; }
        await sock.sendMessage(from, { text: reply });
    });
}

app.get('/', (req, res) => {
    if (isConnected) return res.send('<h1>✅ LM TZ BOT IMEUNGANISHWA - Iko Tayari</h1>');
    if (qrImage) return res.send(`<div style="text-align:center"><h2>LM TZ PROJECT - SCAN QR</h2><img src="${qrImage}" style="width:320px;border:10px solid #000"><p>WhatsApp > Linked Devices > Link a Device</p><script>setTimeout(()=>location.reload(),20000)</script></div>`);
    res.send('<h2>Subiri QR inatengenezwa... refresh sec 5</h2><script>setTimeout(()=>location.reload(),5000)</script>');
});

app.get('/qr', (req, res) => res.redirect('/'));
app.listen(PORT, () => { console.log(`Server ${PORT}`); startBot(); });
