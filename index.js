const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const OpenAI = require('openai');
const express = require('express');
const app = express();
const P = require('pino');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true
    });
    sock.ev.on('creds.update', saveCreds);

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
                        content: `You are Prince - Founder of PRINCE PROJECT CONSULTANT WORLDWIDE 🌐

You are worldwide consultant. Answer in SAME language as customer.

YOUR 9 GLOBAL SERVICES WITH PRICES (mention price only when customer asks about service/price/cost/gharama):

1. WhatsApp AI Bot (24/7) - TZS 150,000 / $60
2. Professional Website - TZS 90,000 / $35
3. Business Automation System - TZS 200,000 / $80
4. 1-on-1 Project Mentorship - TZS 90,000 / $35 per session
5. M&E System & Logframe Design - TZS 90,000 / $35
6. International Grant Proposal Writing (USAID, EU, UN) - $450
7. Strategic Plan Development - $300
8. Feasibility Study - $57 / TZS 150k
9. Bankable Business Plan - $120 / TZS 300k

RULES:
- First EDUCATE on any question (logframe, farming, health, business, etc) with deep knowledge and global standards
- If question is about your services/prices, list the relevant service with price clearly
- At end of every answer, add: "At Prince Project Consultant Worldwide 🌐 we deliver globally. Which service can I prepare for you today?"
- Never say you don't know. You are intelligent like Prince himself.
- Be worldwide, professional, not mtaani.`
                    },
                    { role: "user", content: text }
                ],
                temperature: 0.8
            });
            const reply = completion.choices[0].message.content;
            await sock.sendMessage(from, { text: reply });
        } catch (err) {
            console.log(err.message);
            await sock.sendMessage(from, { text: "Hello from Prince Project Consultant Worldwide 🌐! System reconnecting, please ask again." });
        }
    });
}
startBot();
app.get('/', (req,res)=>res.send('PRINCE WORLDWIDE 🌐 - Live - 9 Services with Prices'));
app.listen(10000, ()=>console.log('Worldwide with Prices Live'));
