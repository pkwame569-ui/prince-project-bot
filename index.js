const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');

let lastQR = null;
let pairingCode = null;
let sockGlobal = null;
const userMemory = new Map();

async function startBot() {
    // JINA JIPYA KABISA - Itaunda credentials mpya safi!
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_FRESH_OCT11_FINAL');
    const sock = makeWASocket({ 
        auth: state, 
        logger: P({ level: 'silent' }), 
        browser: ["MBILAO WORLDWIDE", "Chrome", "122.0"],
        printQRInTerminal: false
    });
    sockGlobal = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
        const { connection, lastDisconnect, qr } = u;
        if(qr){ 
            lastQR = await QRCode.toDataURL(qr); 
            pairingCode = null;
            console.log('QR READY - Fungua /qr'); 
        }
        if(connection==='open'){ 
            console.log('MBILAO CONNECTED ✅ SUCCESS!'); 
            lastQR=null; 
            pairingCode=null; 
        }
        if(connection==='close'){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reason:', lastDisconnect?.error?.message);
            if(shouldReconnect){
                console.log('Restarting in 5s...');
                setTimeout(startBot, 5000);
            } else {
                console.log('Logged out - not reconnecting');
            }
        }
    });

    const deep = {
        evaluation: [`📚 **EVALUATION / TATHMINI - Level 1** [SW] Uchunguzi wa kitaalamu - Je mradi umefikia malengo? Bila hii USAID/EU/UN hawatakupa tena. [EN] Professional examination. MBILAO world-class $99→$84 Nifafanue?`, `📚 **Level 2** Aina 4: Baseline, Mid-term, Endline, Impact. Mfano Dodoma 70% visima not working, donor $200k after our report!`, `📚 **Level 3** Hatua 5: Siku 1-2 kikao, 3-7 data field, 8-12 analysis, 13 draft, 14 final. $84 only!`],
        marketing: [`🔥 **AI MARKETING VIRAL - Level 1 TRENDING** [SW] Bila AI biashara kama duka gizani. AI viral +500% sales WORLDWIDE! $149→$111 Nifafanue?`, `🔥 **Level 2** Daily AI videos TikTok IG FB viral. Example Dar nguo 20→150/day!`, `🔥 **Level 3** Day 1-2 analyze, 3 create 10 videos, 4-7 post boost. $111 only!`]
    };

    sock.ev.on('messages.upsert', async ({messages})=>{
        
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const raw=m.message.conversation||m.message.extendedTextMessage?.text||"";
        const txt=raw.toLowerCase().trim(); const from=m.key.remoteJid;
        if(!userMemory.has(from)) userMemory.set(from,{topic:null, depth:0, lastReply:''});
        const mem=userMemory.get(from);
        let topic=null;
        if(txt.includes('evaluation')||txt.includes('tathmini')) topic='evaluation';
        else if(txt.includes('market')||txt.includes('brand')||txt.includes('viral')||txt.includes('biashara')) topic='marketing';
        else topic='evaluation';
        const wantsMore=txt.includes('eleza')||txt.includes('zaidi')||txt.includes('more')||txt.includes('explain');
        let reply="";
        if(topic && deep[topic]){
            if(mem.topic!==topic){mem.topic=topic; mem.depth=0;} else if(wantsMore){mem.depth=Math.min(mem.depth+1,2);}
            reply=deep[topic][mem.depth];
        } else {
            reply=`🌐 **MBILAO WORLDWIDE - MIN $99 + PUNGUZO**
1. Website $99→$84 MIN! 2. Bot $150→$135 3. AI Marketing $149→$111 TRENDING! 4. Agrarian $99→$79 5. Grant $450→$405 Tunakusimamia hatua kwa hatua! Unahitaji gani?`;
        }
        mem.lastReply=reply; userMemory.set(from,mem);
        await sock.sendMessage(from,{text:reply});
    });
}
startBot();
app.get('/',(req,res)=>res.send('MBILAO LIVE - /qr /pair'));
app.get('/qr',(req,res)=>{
    if(!lastQR) return res.send(`<html><body style="text-align:center;padding-top:50px"><h1>${sockGlobal?.authState?.creds?.registered ? 'CONNECTED ✅' : 'Generating QR... Refresh 5s'}</h1><script>setTimeout(()=>location.reload(),3000)</script></body></html>`);
    res.send(`<html><body style="text-align:center"><h1>MBILAO QR - SCAN HARAKA</h1><img src="${lastQR}" style="width:90%;max-width:350px;border:5px solid #000"/><br><br><a href="/pair">Pairing Code →</a></body></html>`);
});
app.get('/pair', async (req,res)=>{
    try{
        if(!sockGlobal) return res.send(`<html><body style="text-align:center"><h1>Starting... Refresh 5s</h1><script>setTimeout(()=>location.reload(),3000)</script></body></html>`);
        if(sockGlobal.authState.creds.registered) return res.send(`<html><body style="text-align:center"><h1>CONNECTED ✅</h1></body></html>`);
        if(!pairingCode){
            const phone = "255795804621";
            pairingCode = await sockGlobal.requestPairingCode(phone);
            console.log('PAIRING CODE:', pairingCode);
        }
        res.send(`<html><body style="text-align:center"><h1>PAIRING CODE</h1><h1 style="font-size:60px;background:#000;color:#0f0;padding:20px">${pairingCode}</h1><p>WhatsApp > Link with phone number > Enter ${pairingCode}</p></body></html>`);
    }catch(e){ res.send(`<html><body><h1>Error ${e.message} - Retry 10s</h1><script>setTimeout(()=>location.reload(),5000)</script></body></html>`); }
});
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log('MBILAO FRESH Live on '+PORT));
const app = express();
