
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = '';
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});
client.on('qr', async (qr) => { qrCodeData = await qrcode.toDataURL(qr); });
client.on('ready', () => console.log('LM TZ BILINGUAL READY'));
client.on('message', async msg => {
    if (msg.fromMe) return;
    if (msg.from.endsWith('@g.us')) return;
    if (msg.isStatus) return;
    const body = msg.body.toLowerCase().trim();
    const chat = await msg.getChat();

    // GUNDUA LUGHA - kama kuna swahili words, jibu swahili. Vinginevyo English.
    const isSwahili = body.includes('habari') || body.includes('mambo') || body.includes('bei') || body.includes('huduma') || body.includes('nunua') || body.includes('lipa') || body.includes('shamba') || body.includes('kilimo');

    if (body.includes('menu') || body === 'hi' || body === 'hello' || body.includes('habari')) {
        if (isSwahili) {
            await chat.sendMessage(
`Habari! Mimi ni *LM TZ AI AUTOMATION ENGINEER* 🤖

*HUDUMA ZANGU 8:*
1️⃣ M&E - Worldwide
2️⃣ GRANT APPLICATION - $450
3️⃣ PLANNING & MANAGEMENT - $300
4️⃣ FEASIBILITY STUDY - $57-$300
5️⃣ BUSINESS PLAN - $120
6️⃣ PROPOSAL WRITING ✍🏻 - $250
7️⃣ CLIMATE-SMART AGRICULTURE 🌱 - $200
8️⃣ DIGITAL & AI AUTOMATION 💻 - $350

Andika namba 1-8`);
        } else {
            await chat.sendMessage(
`Hello! I am *LM TZ AI AUTOMATION ENGINEER* 🤖

*MY 8 GLOBAL SERVICES:*
1️⃣ PROJECT M&E - Worldwide
2️⃣ GRANT APPLICATION - $450
3️⃣ PLANNING & MANAGEMENT - $300
4️⃣ FEASIBILITY STUDY - $57-$300
5️⃣ BUSINESS PLAN - $120
6️⃣ PROPOSAL WRITING ✍🏻 - $250
7️⃣ CLIMATE-SMART AGRICULTURE 🌱 - $200
8️⃣ DIGITAL & AI AUTOMATION 💻 - $350

Type number 1-8 for details.`);
        }
        return;
    }

    if (body === '7' || body.includes('climate') || body.includes('kilimo')) {
        const reply = isSwahili 
        ? `🌱 *CLIMATE-SMART AGRICULTURE - $200*\nKilimo cha kisasa kinachohimili mabadiliko ya tabianchi. Smart Irrigation & FAO Reports. Andika *NUNUA 7*`
        : `🌱 *CLIMATE-SMART AGRICULTURE - $200*\nWe design climate-resilient farming projects. Smart Irrigation & FAO Reports. Type *BUY 7*`;
        await chat.sendMessage(reply); return;
    }

    if (body === '8' || body.includes('digital') || body.includes('automation') || body.includes('ai')) {
        const reply = isSwahili
        ? `💻 *AI AUTOMATION ENGINEER - $350*\nMimi LM TZ na-automate miradi: WhatsApp Bots, Systems, IoT. Andika *NUNUA 8*`
        : `💻 *AI AUTOMATION ENGINEER - $350*\nI automate your projects: WhatsApp Bots, Systems, IoT, Data Automation. Type *BUY 8*`;
        await chat.sendMessage(reply); return;
    }

    if (body.includes('nunua') || body.includes('buy') || body.includes('lipa') || body.includes('pay') || body.includes('price') || body.includes('bei')) {
        const reply = isSwahili
        ? `✅ Lipa hapa: *0764769939* (M-Pesa/Tigo)\nTuma screenshot baada ya kulipa.`
        : `✅ Pay here: *0764769939* (M-Pesa/Tigo Pesa)\nSend screenshot after payment.`;
        await chat.sendMessage(reply); return;
    }

    if (['1','2','3','4','5','6'].includes(body)) {
        await chat.sendMessage(isSwahili ? `Umechagua ${body}. Andika NUNUA ${body}` : `You selected ${body}. Type BUY ${body}`);
        return;
    }

    await chat.sendMessage(isSwahili ? `Mimi ni *LM TZ AI* 🤖. Andika *MENU* uone huduma.` : `I am *LM TZ AI* 🤖. Type *MENU* to see all services.`);
});
client.initialize();
app.get('/', (req,res)=>{ if(qrCodeData) res.send(`<img src="${qrCodeData}" width="300"/>`); else res.send('Loading...'); });
app.listen(PORT, ()=>console.log('Live'));
