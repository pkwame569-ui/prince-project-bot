import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

const app = express()
const PORT = 3000

// ISILALE - Keep alive
app.get('/', (req,res) => res.send('THE MBILAO PROJECT BOT IS LIVE'))
app.get('/ping', (req,res) => res.send('pong'))
app.listen(PORT, () => console.log('Server live'))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({ auth: state, printQRInTerminal: true })
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('✅ BOT CONNECTED')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return

        // === 1. GROUP KIMYA ===
        const jid = msg.key.remoteJid
        if (!jid) return
        if (jid.endsWith('@g.us')) return
        if (jid.endsWith('@broadcast')) return
        if (jid === 'status@broadcast') return
        if (msg.key.fromMe) return

        const textRaw = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const t = textRaw.toLowerCase().trim()
        if (!t) return

        // === 2. ELEWA NIA ===
        let intent = ""
        if (t.includes("business plan") || t.includes("mpango")) intent = "business_plan"
        else if (t.includes("company") || t.includes("kampuni") || t.includes("brela") || t.includes("usajili")) intent = "company"
        else if (t.includes("tin") || t.includes("tax") || t.includes("kodi")) intent = "tax"
        else if (t.includes("leseni") || t.includes("license")) intent = "license"
        else if (t.includes("habari") || t.includes("hello") || t.includes("hi") || t.includes("help") || t.includes("msaada")) intent = "welcome"
        else intent = "unknown"

        // === 3. MAJIBU - BILINGUAL NA HAKIKISHIA ===
        if (intent === "welcome") {
            await sock.sendMessage(jid, { text: `Karibu / Welcome to *THE MBILAO PROJECT CO.* 🌍

Tunakusaidia kuanzisha na kukuza biashara yako kisheria na kitaalamu.
We help you start and grow your business legally & professionally.

📌 *Our Services / Huduma:*
1. Business Plan
2. Feasibility Study
3. Company Registration
4. TIN & Tax
5. BRELA
6. License & Permits
7. Business Proposal
8. Strategic Plan
9. Investment Plan
10. Market Research
11. Financial Projection
12. Consultation

Niko hapa kukusaidia hatua kwa hatua.
I'm here to guide you step by step. What do you need?

Mfano: "Nahitaji usajili wa kampuni" / "I need a business plan"` })
            return
        }

        if (intent === "business_plan") {
            await sock.sendMessage(jid, { text: `Asante! / Thank you! 🙏\nNimeelewa unahitaji *Business Plan*.\n\nNiambie biashara ni ya nini na mahali ilipo, tutaitengeneza pamoja hadi iwe tayari kwa benki.\nTell me what business and location, we'll create it together for banks & investors.` })
            return
        }

        if (intent === "company") {
            await sock.sendMessage(jid, { text: `Sawa kabisa! ✅\nNimeelewa unahitaji *Usajili wa Kampuni / Company Registration*.\nTutakusimamia kila hatua BRELA hadi upate cheti.\nWe'll handle everything at BRELA.\n\nJina la kampuni ni gani?\nWhat name do you want?` })
            return
        }

        if (intent === "unknown") {
            await sock.sendMessage(jid, { text: `Asante kwa ujumbe wako / Thank you 🙏\nNimepokea: "${textRaw}"\n\nNiko hapa kukusaidia. Fafanua kidogo unahitaji nini?\nI'm here to help. Please tell me what you need?\n\nTunatoa: Business Plan, Usajili wa Kampuni, TIN, Leseni, Ushauri.` })
            return
        }
    })
}
startBot()
