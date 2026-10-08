const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = null;
let isConnected = false;

const MPESA = "0764769939 - LM TZ PROJECT";

const REPLIES = {
menu: `Habari! 👋 Karibu *LM TZ PROJECT AI ENGINEER BOT*

I am here to help you win. 🏆

Many great ideas fail not because they are bad, but because they lack a system. Mimi niko hapa kukupa system.

*Chagua unachohitaji leo:*

1️⃣ *Project Planning*
2️⃣ *Monitoring & Evaluation (M&E)*
3️⃣ *Proposal Writing*
4️⃣ *Grant Application*
5️⃣ *AI Automation for Business*
6️⃣ *Climate-Smart Agriculture*

👉 Andika namba *1-6* tu, nikueleze kwa kina.

_Ukiona ngumu, andika neno *MUSAADA*_
`,

"1": `*1. PROJECT PLANNING - Foundation ya Ushindi*

*Elimu Fupi:*
Unajua 80% of projects fail within 18 months sababu ya poor planning? Donors na banks hawaamini maneno, wanaamini document.

*Why you need this:*
Hii ni ramani ya mradi wako. Bila ramani, utapotea. We turn your idea into a professional *Workplan, Gantt Chart, na Realistic Budget*.

*Imagine:* Ukimpa donor plan safi, anasema YES haraka.

Investment: *$30 leo (was $38)*
Andika *NUNUA 1*`,

"2": `*2. M&E - Lugha ya Donor*

*Elimu Fupi:*
Donor hataki kusikia "tulijitahidi". Anataka kuona *numbers, impact, change*. M&E ndiyo dashboard ya gari lako.

*Why it matters:*
Bila M&E, mradi wako ni kipofu. Tunakutengenezea *Logframe, Indicators, na Tools* zinazomfanya donor akuongezee pesa.

Investment: *$180 (was $220)*
Andika *NUNUA 2*`,

"3": `*3. PROPOSAL WRITING - The Money Heart*

*Elimu Fupi:*
Proposal ni moyo wa maombi yote. A good proposal doesn't beg for money, it shows an opportunity.

*Our Secret:*
We use *Donor Psychology*. Tunaandika Problem Statement inayogusa na Budget inayojieleza. Our proposals have 70% higher success rate.

Investment: *$75 leo (was $99)*
Andika *NUNUA 3*`,

"4": `*4. GRANT APPLICATION - We Hunt Money For You*

*Elimu Fupi:*
Kuna $200B+ za grants kila mwaka kutoka USAID, EU, UNDP... but 90% hawajui wapi pa kuomba.

*What we do:*
We HUNT. Tunakutafutia grant inayofanana na kazi yako, then tunaandika application inayoshinda.

Investment: *$190 (was $220)*
Andika *NUNUA 4*`,

"5": `*5. AI AUTOMATION - Work Less, Earn More*

*Elimu Fupi:*
Unatumia masaa mangapi kujibu maswali yaleyale? AI ni mfanyakazi asiyelala.

*Benefit:*
Inajibu WhatsApp 24/7, inatengeneza reports. Wateja wetu wanaokoa *masaa 15+ kila wiki*.

Investment: *$250 (was $300)*
Andika *NUNUA 5*`,

"6": `*6. CLIMATE-SMART AI - Kilimo cha Kisasa*

*Elimu Fupi:*
Mavuno yanapungua kwa mabadiliko ya tabianchi. With AI, unajua mvua itanyesha lini, udongo unahitaji nini.

*Offer:*
App rahisi inayokupa *ushauri wa kilimo kwa data ya hali ya hewa*.

Investment: *$40 tu (was $50)*
Andika *NUNUA 6*`
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    sock.ev.on('connection.update', async (u) => {
        const { connection, qr, lastDisconnect } = u;
        if (qr) qrImage = await qrcode.toDataURL(qr);
        if (connection === 'open') { isConnected = true; qrImage = null; console.log("BOT LIVE"); }
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 2000);
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (let m of messages) {
            if (!m.message || m.key.fromMe) continue;
            let txt = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "").toLowerCase().trim();
            const from = m.key.remoteJid;
            let rep = "";
            if (["menu","habari","hello","hi","mambo","musaada","help"].some(k=>txt.includes(k))) rep = REPLIES.menu;
            else if (txt === "1" || txt.includes("planning")) rep = REPLIES["1"];
            else if (txt === "2" || txt.includes("m&e") || txt.includes("monitor")) rep = REPLIES["2"];
            else if (txt === "3" || txt.includes("proposal")) rep = REPLIES["3"];
            else if (txt === "4" || txt.includes("grant")) rep = REPLIES["4"];
            else if (txt === "5" || txt.includes("automat")) rep = REPLIES["5"];
            else if (txt === "6" || txt.includes("climate") || txt.includes("kilimo")) rep = REPLIES["6"];
            else if (txt.includes("nunua")) {
                rep = `✅ *Umefanya maamuzi sahihi!*\n\nIli kukuhudumia haraka:\n\n1. Tuma malipo kwenda:\n📱 *M-Pesa / Tigo Pesa: ${MPESA}*\n\n2. Baada ya kutuma, tuma hapa *screenshot + Idea yako kwa ufupi*\n\nMfano: "Nimetuma kwa NUNUA 3 - Proposal ya kilimo"\n\nNikishapata screenshot, kazi inaanza mara moja. 🚀`;
            }
            else rep = `Asante kwa ujumbe: "${txt}"\n\nAndika *MENU* uone jinsi ninavyoweza kukusaidia kushinda.`;
            await sock.sendMessage(from, { text: rep });
        }
    });
}

app.get('/', (req, res) => {
    if (isConnected) return res.send('<h1 style="color:green">✅ BOT LIVE - Namba: ${MPESA}</h1>');
    if (qrImage) return res.send(`<center><img src="${qrImage}" width=300><h2>Scan QR</h2></center>`);
    res.send('Starting...<script>setTimeout(()=>location.reload(),3000)</script>');
});
app.listen(PORT, () => startBot());
