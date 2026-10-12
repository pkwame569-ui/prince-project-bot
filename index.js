import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'

const app = express()
let lastQR = null

app.get('/', (req,res) => res.send('BOT IS LIVE - Nenda /qr ku-scan'))
app.get('/ping', (req,res) => res.send('pong'))

app.get('/qr', async (req,res) => {
    if(!lastQR) return res.send('<h1>Subiri QR... Refresh page baada ya 10 sec</h1><p>Au angalia kama bot imesha-connect</p><script>setTimeout(()=>location.reload(),5000)</script>')
    const qrImage = await QRCode.toDataURL(lastQR)
    res.send(`<h1>Scan QR Hapa</h1><img src="${qrImage}" width="300"/><p>WhatsApp > Linked Devices > Link Device</p><script>setTimeout(()=>location.reload(),15000)</script>`)
})

app.listen(3000)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({ auth: state, printQRInTerminal: false })
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr) {
            console.log('QR GENERATED - Fungua /qr')
            lastQR = qr
        }
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('✅ CONNECTED!')
            lastQR = null
        }
    })

    // Hapa chini weka code yako ile ile ya GROUP KIMYA + NIA YA MTEJA niliyokupa
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const jid = msg.key.remoteJid
        if (!jid || jid.endsWith('@g.us') || jid.endsWith('@broadcast') || msg.key.fromMe) return

        const textRaw = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const t = textRaw.toLowerCase()
        if(!t) return

        if(t.includes("habari") || t.includes("hello") || t.includes("hi") || t.includes("help")){
            await sock.sendMessage(jid, { text: `Karibu / Welcome to *THE MBILAO PROJECT CO.* 🌍\n\nWe help you start & grow your business.\nTunakusaidia kuanzisha biashara.\n\nServices: Business Plan, Company Registration, TIN, BRELA, License, Consultation.\n\nNiko hapa kukusaidia hatua kwa hatua. Niambie unahitaji nini?\nI'm here to guide you step by step.` })
        }
    })
}
startBot()
