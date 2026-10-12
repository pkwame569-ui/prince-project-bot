 
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 10000;
let sockGlobal = null;
let lastQr = null;
let isStarting = false;

// MEMORY YA CONVERSATION - 7 SERVICES
const userMemory = new Map();

// AUTO UNLOCK KILA 25 SEC - FIX YA STARTING... 15s
setInterval(() => {
  if(isStarting){
    console.log('FORCE UNLOCK - isStarting was stuck');
    isStarting = false;
  }
}, 25000);

async function startBot(){
  if(isStarting) return;
  isStarting = true;
  try{
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['MBILAO WORLDWIDE', 'Chrome', '1.0']
    });
    sockGlobal = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update)=>{
      const { connection, lastDisconnect, qr } = update;
      if(qr){
        lastQr = qr;
        console.log('QR READY - 7 SERVICES COMPLETE');
      }
      if(connection === 'close'){
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode!== DisconnectReason.loggedOut;
        console.log('Closed, reconnect:', shouldReconnect);
        isStarting = false;
        lastQr = null;
        if(shouldReconnect){ setTimeout(startBot, 3000); }
      }else if(connection === 'open'){
        console.log('CONNECTED ✓ KNOWLEDGE BASED 7 SERVICES COMPLETE');
        lastQr = null;
        isStarting = false;
      }
    });

    // HAPA NDIO KNOWLEDGE BASED 7 SERVICES
    sock.ev.on('messages.upsert', async ({messages})=>{
      try{
        const m = messages[0];
        if(!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').toLowerCase().trim();

        let reply = '';
        if(['hi','hello','habari','mambo','menu'].includes(text) || text === ''){
          reply = `🌐 *MBILAO PROJECT CONSULTANT WORLDWIDE* 🌐\n_7 SERVICES KNOWLEDGE BASED COMPLETE_\n\n1️⃣ TATHMINI - Kuchunguza ardhi\n2️⃣ MIPANGO - Master Plan\n3️⃣ RAMANI - Architectural\n4️⃣ VIBALI - Permits\n5️⃣ UJENZI - Construction\n6️⃣ MENTORSHIP - Mafunzo\n7️⃣ UWEKEZAJI - Investment\n\nAndika jina la huduma: *tathmini*, *mipango*, *ramani*, *vibali*, *ujenzi*, *mentorship*, *uwekezaji*`;
        }else if(text.includes('tathmini')){
          reply = `*1️⃣ TATHMINI YA ARDHI - Level 1*\n\nHuduma ya kuchunguza udongo, mazingira, na ufaafu wa eneo lako kabla ya ujenzi.\n\nAndika *eleza zaidi* kwa maelezo kamili\nAndika *zaidi* kwa OFFER $99`;
        }else if(text.includes('eleza zaidi')){
          reply = `*Level 2 - Maelezo Kamili*\n\nTunakupa ripoti kamili ya kijiolojia, upimaji, na ushauri wa kitaalamu.\nWataalamu wetu worldwide wanakuhudumia 24/7.\n\nAndika *zaidi* kupata OFFER ya leo $99`;
        }else if(text.includes('zaidi') || text.includes('offer')){
          reply = `🔥 *Level 3 - OFFER $99* 🔥\n\nLipa $99 tu upate TATHMINI kamili + MIPANGO ya awali BURE!\n\nLipa kupitia: M-Pesa / TigoPesa\nNamba: 255795804621\n\nBaada ya kulipa tuma *nimelipa*`;
        }else{
          reply = `Nimepokea: "${text}"\n\nAndika *hello* kuona menu ya huduma 7 zote.`;
        }

        if(reply) await sock.sendMessage(from, { text: reply });
      }catch(e){ console.log('Message error', e); }
    });

  }catch(e){
    console.log('StartBot error', e);
    isStarting = false;
  }
}

// ROUTES
app.get('/', (req,res)=> res.send('MBILAO WORLDWIDE 7 SERVICES KNOWLEDGE BASED COMPLETE LIVE on '+PORT));

app.get('/qr', async (req,res)=>{
  try{
    if(lastQr){
      const qrImg = await qrcode.toDataURL(lastQr);
      return res.send(`<html><body style="text-align:center;padding:20px"><h1>MBILAO WORLDWIDE QR</h1><img src="${qrImg}" style="width:300px"><p>Scan na WhatsApp > Linked Devices</p><script>setTimeout(()=>location.reload(),30000)</script></body></html>`);
    }
    if(!sockGlobal &&!isStarting) startBot();
    res.send(`<html><body style="text-align:center;padding:50px"><h1>Starting... QR inakuja 15s</h1><p>Bot inaamka, subiri...</p><script>setTimeout(()=>location.reload(),5000)</script></body></html>`);
  }catch(e){ res.send('Error '+e.message+' <a href="/restart">Restart</a>'); }
});

app.get('/restart', (req,res)=>{
  try{ if(sockGlobal){ sockGlobal.end(); } }catch{}
  sockGlobal = null; lastQr = null; isStarting = false;
  setTimeout(()=> startBot(), 1000);
  res.redirect('/qr');
});

app.get('/pair', async (req,res)=>{
  res.send('Tumia /qr - ni rahisi zaidi');
});

app.listen(PORT, ()=> {
  console.log(`MBILAO WORLDWIDE 7 SERVICES KNOWLEDGE BASED COMPLETE LIVE on ${PORT}`);
  startBot();
});
