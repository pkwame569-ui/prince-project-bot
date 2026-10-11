const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const OpenAI = require('openai');
const express = require('express');
const app = express();
const P = require('pino');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_worldwide_v1');
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
                        content: `You are MBILAO - Founder of MBILAO PROJECT CONSULTANT WORLDWIDE 🌐

You are international consultant working WORLDWIDE.

YOUR 9 GLOBAL SERVICES WITH PRICES:
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
- Answer in SAME language customer used
- EDUCATE deeply with global standards, examples, steps
- Never say you don't know - you know everything
- Mention price only when customer asks about cost/bei/price
- End with: "At MBILAO PROJECT CONSULTANT WORLDWIDE 🌐 we support clients globally. Which service can I prepare for you today?"
- You are MBILAO himself, worldwide brand.`
                    },
                    { role: "user", content: text }
                ],
                temperature: 0.8
            });
            const reply = completion.choices[0].message.content;
            await sock.sendMessage(from, { text: reply });
        } catch (err) {
            console.log(err.message);
            await sock.sendMessage(from, { text: "Hello from MBILAO PROJECT CONSULTANT WORLDWIDE 🌐! Please ask again." });
        }
    });
}
startBot();
app.get('/', (req,res)=>res.send('MBILAO PROJECT CONSULTANT WORLDWIDE 🌐 - Live - 9 Services with Prices'));
app.listen(10000, ()=>console.log('MBILAO WORLDWIDE Live'));
