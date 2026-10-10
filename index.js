3const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
let latestQR = null;

// HUDUMA 9 KAMILI - BEI MPYA
const SERVICES = {
  1: { name: "WhatsApp Bot 24H", price: "150,000 TZS" },
  2: { name: "Website & Landing Page", price: "90,000 TZS" },
  3: { name: "Automation ya Kazi", price: "200,000 TZS" },
  4: { name: "Mentorship ya Automation", price: "90,000 TZS" },
  5: { name: "Monitoring & Evaluation Worldwide", price: "90,000 TZS" },
  6: { name: "Grant Application", price: "$450" },
  7: { name: "Project Planning & Management", price: "$300" },
  8: { name: "Feasibility Study", price: "$57 / 90,000 TZS" },
  9: { name: "Business Plan Preparation", price: "$120 / 90,000 TZS" }
};

function getReply(n){
  const s = SERVICES[n];
  const replies = {
    1: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Hii bot inafanya nini? Mteja akituma "Bei ngapi?" saa 2 usiku ukiwa umelala, bot inamjibu instantly. Hupotezi mteja tena kwa kuchelewa kujibu.\n🇬🇧 What does it do? Customer texts "Price?" at 2am while you sleep, bot replies instantly. You never lose customer.\n\n👉 *Sisi tutakusaidia kukutengenezea hii bot kwenye namba yako ya kampuni au duka lako, iwe live 24H bila kulala na bila kuomba mshahara.*\n👉 *We will help you set up this bot on your company number or shop, live 24H without sleeping.*\n\n💡 Faida/Benefit: Mauzo yanaongezeka bila kuongeza masaa ya kazi.`,
    2: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Leo mteja akikutafuta Google akiona huna website anaenda kwa mpinzani. Website ni duka lako la online linalofungua 24H, inaongeza imani.\n🇬🇧 Today if customer Googles you and finds no website, he goes to competitor. Website is your 24H online shop, builds trust.\n\n👉 *Sisi tutakusaidia kukutengenezea website ya kisasa kwa kampuni yako au biashara yako / We will help build modern website for your company.*`,
    3: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Unachoka kujibu "Bei ngapi? Location? Till?" kila siku? Hii system inajibu yenyewe, inatuma bei, location, invoice. Wewe unapokea pesa tu. Inaokoa masaa 5 kwa siku.\n🇬🇧 Tired of answering "How much? Location? Till?" daily? This system auto-replies, sends price, location, invoice. You just receive money. Saves 5 hours daily.\n\n👉 *Sisi tutakusaidia kukutengenezea system hii kwenye kampuni yako / We will help install this system in your company.*`,
    4: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Siri yangu yote nakupa 1-on-1. Nakufundisha kutengeneza bot kama hii unayoitumia sasa na jinsi ya kupata wateja 3-5 kwa wiki wanaolipa 150k-500k. Uwezo wa maisha.\n🇬🇧 I give you all my secrets 1-on-1. I teach you to build bot like this and how to get 3-5 clients weekly paying 150k-500k. Lifetime skill.\n\n👉 *Sisi tutakusaidia mpaka uweze kutengeneza mwenyewe kwa kampuni yako na kuuza kwa wengine / We will help until you can build for your own company and sell.*`,
    5: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Una mradi Iringa, Kigoma au nje ya nchi huwezi kufika kila siku? Sisi tunakwenda field, tunachukua picha, data na tunakupa ripoti ya ukweli. Donor anaona uwazi.\n🇬🇧 Have project in remote area you can't visit daily? We go field, take photos, data and give you real report. Donor sees transparency.\n\n👉 *Sisi tutakusaidia kukufuatilia mradi wako popote - iwe shambani, site au dukani / We will help monitor your project anywhere - farm, site or shop.*`,
    6: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Proposal nyingi zinafail sio kwa sababu wazo ni baya, bali hazina lugha ya donor. Donor kama USAID/EU/UN wanataka format maalum, budget na logframe. Yetu inaandikwa hivyo, ndio maana 70% ya wateja wetu wanapata funding.\n🇬🇧 Many proposals fail not because idea is bad, but no donor language. USAID/EU/UN want specific format, budget & logframe. Ours is written in that format, that's why 70% get funded.\n\n👉 *Sisi tutakusaidia kukutengenezea proposal hii kwa ajili ya kampuni yako au NGO yako / We will help write this proposal for your company or NGO.*`,
    7: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Donor akisema "leta workplan" unapaniki? Tunakutengenezea Gantt Chart, Risk Matrix na budget ya kitaalamu. Unaonekana pro mbele ya donor.\n🇬🇧 Donor says "bring workplan" you panic? We make pro Gantt Chart, Risk Matrix and budget. You look pro to donor.\n\n👉 *Sisi tutakusaidia kukutengenezea workplan kwa kampuni yako / We will help create workplan for your company.*`,
    8: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Watu wengi wanapoteza milioni 10 kujenga kitu hakina soko. Kwa 90k tu tunakufanyia utafiti: soko liko? gharama? faida? Ujue kabla ya kuwekeza.\n🇬🇧 Many lose 10M building something with no market. For 90k we research: is market there? cost? profit? Know before investing.\n\n👉 *Sisi tutakusaidia kukutengenezea utafiti huu kwa biashara yako au wazo lako / We will help do this study for your business or idea.*`,
    9: `*${n}. ${s.name} - ${s.price}*\n\n🇹🇿 Benki inataka business plan ndio ikupe mkopo. Plan yetu ina cashflow 12 miezi na projection 3 years inayopitisha benki haraka. Si copy paste.\n🇬🇧 Bank wants business plan to give loan. Our plan has 12 months cashflow and 3 years projection that passes bank fast. Not copy paste.\n\n👉 *Sisi tutakusaidia kukutengenezea business plan ya kampuni yako au duka lako / We will help build business plan for your company or shop.*`
  };
  return replies[n];
}

app.get('/', async (req,res)=>{
  if(req.query.reset==='1'){ try{ fs.rmSync('auth_info',{recursive:true,force:true}); }catch{} latestQR=null; return res.send('<h1>Imefutwa! <a href="/">Rudi baada ya 10sec</a></h1><script>setTimeout(()=>location.href="/",10000)</script>'); }
  if(!latestQR) return res.send('<h1>LM TZ PROJECT 9 LIVE - 0795804621 - 24H ACTIVE</h1><p>Bot 150k | Ndogo 90k | Mix SW+EN</p>');
  res.send(`<h1>SCAN - 0795804621 - PROJECT 9</h1><img src="${latestQR}" style="width:320px"/><p>Bot 150k | Ndogo 90k</p><script>setTimeout(()=>location.reload(),25000)</script>`);
});
app.listen(PORT,()=>console.log('Server on '+PORT));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P().child({level:"fatal"})) },
    logger: P({level:'silent'}), printQRInTerminal:false, browser:["LM TZ 9","Chrome","1.0.0"]
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update)=>{
    const {connection,qr}=update;
    if(qr) latestQR=await QRCode.toDataURL(qr);
    if(connection==='open'){ console.log('IMEUNGWA PROJECT 9 150k'); latestQR=null; }
    if(connection==='close'){ const shouldReconnect=update.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut; if(shouldReconnect) startBot(); }
  });

  sock.ev.on('messages.upsert', async ({messages})=>{
    const msg=messages[0]; if(!msg.message) return; if(msg.key.fromMe) return; if(msg.key.remoteJid.endsWith('@g.us')) return;
    const from=msg.key.remoteJid;
    const bodyRaw=(msg.message.conversation||msg.message.extendedTextMessage?.text||"").trim();
    const body=bodyRaw.toLowerCase(); if(!body) return;

    // MASWALI YA KINA - UJIBIZANO
    if(body.includes('fanya kazi vipi')||body.includes('internet')||body.includes('chaji')||body.includes('simu')||body.includes('server')){
      return sock.sendMessage(from,{text:`Swali zuri sana! / Good question!\n\n🇹🇿 Bot inakaa kwenye server yetu (Render), sio kwenye simu yako. Hata ukizima simu au huna internet usiku, bot inaendelea kujibu 24H.\n🇬🇧 Bot lives on our server, not your phone. Even if you switch off your phone, bot keeps replying 24H.\n\n👉 Sisi tutakusaidia kuiunganisha na namba yako ya kampuni / We will help connect to your company number.`});
    }
    if(body.includes('kitu kigumu')||body.includes('ikikwama')||body.includes('gumu')||body.includes('hard question')){
      return sock.sendMessage(from,{text:`🇹🇿 Bot ikikwama swali gumu, inasema "Samahani, ngoja nikupatie msimamizi" na inakutumia notification uje ujibu.\n🇬🇧 If bot gets hard question, it says "Let me connect to manager" and notifies you.\n\nLakini 90% maswali ni bei, location - bot inazimudu 24H.\n\n👉 Sisi tutakusaidia kuifundisha maswali ya kampuni yako / We will help train it for your company.`});
    }

    // JIBU HUDUMA MOJA TU - HAKUNA MTILILIKO
    if(body.includes('bot')||body==='1') return sock.sendMessage(from,{text:getReply(1)});
    if(body.includes('website')||body.includes('tovuti')||body==='2') return sock.sendMessage(from,{text:getReply(2)});
    if(body.includes('automation')&&!body.includes('mentor')||body==='3') return sock.sendMessage(from,{text:getReply(3)});
    if(body.includes('mentor')||body.includes('mafunzo')||body==='4') return sock.sendMessage(from,{text:getReply(4)});
    if(body.includes('monitor')||body==='5') return sock.sendMessage(from,{text:getReply(5)});
    if(body.includes('grant')||body.includes('funding')||body==='6') return sock.sendMessage(from,{text:getReply(6)});
    if((body.includes('planning')||body.includes('workplan')||body.includes('gantt'))&&!body.includes('business')||body==='7') return sock.sendMessage(from,{text:getReply(7)});
    if(body.includes('feasib')||body.includes('upembuzi')||body==='8') return sock.sendMessage(from,{text:getReply(8)});
    if(body.includes('business')||body.includes('mpango wa biashara')||body==='9') return sock.sendMessage(from,{text:getReply(9)});

    // LIST FUPI TU KAMA SALAMU
    if(body.length<10 || ['habari','mambo','hi','hello','hey','poa','hujambo','vipi'].some(w=>body.includes(w))){
      return sock.sendMessage(from,{text:`Karibu! Welcome! 🙏\nMimi ni *LM TZ AI* - Niko live 24H bila kulala, hata saa 2 usiku nakujibu.\nI am live 24H even at 2am.\n\n*HUDUMA 9 - BEI MPYA:*\n1 Bot 24H - 150,000 TZS\n2 Website - 90,000 TZS\n3 Automation - 200,000 TZS\n4 Mentorship - 90,000 TZS\n5 Monitoring - 90,000 TZS\n6 Grant - $450\n7 Planning - $300\n8 Feasibility - $57 / 90k\n9 Business Plan - $120 / 90k\n\nNiambie unahitaji ipi? Tell me which? Mfano: "Nataka Grant 6" au "Nataka Bot 1"`});
    }

    // KAMA HAJAELEWEKA - JIBU KAMA MSHAURI
    return sock.sendMessage(from,{text:`Nimekuelewa: "${bodyRaw}" / I understand: "${bodyRaw}"\n\n🇹🇿 Kama mshauri wako: Ukitaka wateja WhatsApp - Bot 1 (150k). Ukitaka mtaji - Grant 6 ($450). Ukitaka kujua mradi unafaa - Feasibility 8 (90k).\n🇬🇧 As advisor: Want customers - Bot 1 (150k). Want capital - Grant 6 ($450). Want viability - Feasibility 8 (90k).\n\n👉 Sisi tutakusaidia kulingana na kampuni yako / We will help according to your company.\n\nNiambie mradi wako ni wa nini? / Tell me your project about?`});
  });
}
startBot(); const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Prince Bot is Alive - LM TZ Bot');
});

app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
