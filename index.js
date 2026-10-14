const {default:makeWASocket,DisconnectReason,useMultiFileAuthState}=require('@whiskeysockets/baileys');
const express=require('express');const fs=require('fs');const P=require('pino');
const app=express();let qr=null,sock=null;
const NAME="MBILAO CONSULTANT WORLDWIDE";const PHONE="255795804621";
const AUTH_DIR='auth_final';
const userLang={};

function detectLang(text,jid){
 const l=text.toLowerCase();
 const sw=["habari","mambo","poa","shikamoo","niaje","vipi","sawa","asante","karibu","bei","gharama","huduma","naomba","ninahitaji","nipo","mpo","wapi","lipa","malipo","andika","tuma","nani","kazi","elimu","tafadhali","ndio","hapana","sasa","hapa","kwa","ya","za","na","ni","shilingi","fedha"];
 const en=["hello","hi","business","monitor","proposal","feasibility","planning","bot","marketing","price","cost","how","much","need","want","where","payment","thanks","please","yes","no","money"];
 let swC=0,enC=0; sw.forEach(w=>{if(l.includes(w))swC++;}); en.forEach(w=>{if(l.includes(w))enC++;});
 if(userLang[jid]){
  if(swC>enC+1){userLang[jid]='sw';return false;}
  if(enC>swC+1){userLang[jid]='en';return true;}
  return userLang[jid]==='en';
 }
 if(swC>=enC){userLang[jid]='sw';return false;} else {userLang[jid]='en';return true;}
}

async function start(){
 const {state,saveCreds}=await useMultiFileAuthState(AUTH_DIR);
 sock=makeWASocket({auth:state,logger:P({level:'silent'}),browser:['MBILAO','Chrome','1.0']});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',u=>{
  const {connection,lastDisconnect,qr:q}=u;
  if(q) qr=q;
  if(connection==='open'){console.log('CONNECTED');qr=null;}
  if(connection==='close'){
   const c=lastDisconnect?.error?.output?.statusCode;
   if(c!==DisconnectReason.loggedOut) setTimeout(start,3000);
  }
 });
 sock.ev.on('messages.upsert',async({messages})=>{
  for(const m of messages){
   if(!m.message||m.key.fromMe||m.key.remoteJid.includes('@g.us')) continue;
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) continue;
   const reply=getReply(txt,m.key.remoteJid);
   await sock.sendMessage(m.key.remoteJid,{text:reply});
  }
 });
}

function getReply(input,jid){
 const l=input.toLowerCase().trim(); const en=detectLang(input,jid);

 if(l==="1"||l.includes("monitor")||l.includes("evaluat")||l.includes("m&e")) return en?MON_EN:MON_SW;
 if(l==="2"||l.includes("business")||l.includes("biashara")) return en?BUS_EN:BUS_SW;
 if(l==="3"||l.includes("proposal")||l.includes("funding")||l.includes("andiko")) return en?PRO_EN:PRO_SW;
 if(l==="4"||l.includes("feasib")||l.includes("upembuzi")||l.includes("study")) return en?FEA_EN:FEA_SW;
 if(l==="5"||(l.includes("plan")&&!l.includes("business"))||l.includes("panga")||l.includes("planning")) return en?PLA_EN:PLA_SW;
 if(l==="6"||l.includes("whatsap")||l.includes("whatapp")||l.includes("bot")&&!l.includes("market")) return en?BOT_EN:BOT_SW;
 if(l==="7"||l.includes("market")||l.includes("digital")||l.includes("masoko")||l.includes("tangaza")) return en?MAR_EN:MAR_SW;

 if(l.includes("nani")||l.includes("who are you")||l.includes("mbilao ni nini")) return en?`We are ${NAME}. 10+ years experience. We understand, educate, serve 24HRS. Type 1-7.`:`Sisi ni ${NAME}. Uzoefu 10+ miaka. Tunakuelewa, tunakuelimisha, tunakuhudumia 24HRS. Andika 1-7.`;
 if(l.includes("wapi")||l.includes("location")||l.includes("mpo wapi")||l.includes("office")) return `Tupo Dar, tunahudumia TZ nzima na Dunia ONLINE 24HRS. 📞 ${PHONE}`;
 if(l.includes("lipa")||l.includes("malipo")||l.includes("pay")) return en?`Pay ${PHONE} Tigo/M-Pesa. Easy $50 now $45, Hard $150 now $135.`:`Lipa ${PHONE} Tigo/M-Pesa. Laisi $50 sasa $45, Ngumu $150 sasa $135.`;
 if(l.includes("asante")||l.includes("thanks")) return en?`Welcome! Nipo 24HRS. Type 1-7.`:`Karibu sana! Nipo 24HRS. Andika 1-7.`;
 if(l.includes("habari")||l.includes("hello")||l.includes("hi")||l.includes("mambo")||l.includes("niaje")||l.length<4) return en?WEL_EN:WEL_SW;

 return en?`Good question! As ${NAME}, ${answerGeneral(l,en)}\n\nType 1-7 for services.`:`Swali zuri! Kama ${NAME}, ${answerGeneral(l,en)}\n\nAndika 1-7 kwa huduma.`;
}
function answerGeneral(l,en){
 if(l.includes("biashara gani")||l.includes("idea")) return en?"we help test any idea before invest.":"tunapima wazo lolote kabla hujawekeza.";
 if(l.includes("muda")||l.includes("how long")) return en?"2-7 days.":"siku 2-7.";
 if(l.includes("kwanini")||l.includes("why")) return en?"we understand you first, no copy-paste.":"tunakuelewa kwanza, hatukupi copy-paste.";
 return en?"I can help, tell me more.":"naweza kusaidia, niambie zaidi.";
}

const WEL_SW=`⭐ *${NAME}* ⭐\n\nKaribu! Tunakuelewa, tunakuelimisha, tunakuhudumia 24HRS!\n\n*Huduma 7:*\n1️⃣ Monitoring & Evaluation - $150 (sasa $135)\n2️⃣ Business Plan - $50 (sasa $45)\n3️⃣ Proposal & Funding - $150 (sasa $135)\n4️⃣ Feasibility Study - $150 (sasa $135)\n5️⃣ Project Planning - $50 (sasa $45)\n6️⃣ AI WhatsApp Bot - $50 (sasa $45)\n7️⃣ AI Digital Marketing - $50 (sasa $45)\n\nAndika namba au jina: Mf *1* au *Monitoring*\n📞 ${PHONE}`;
const WEL_EN=`⭐ *${NAME}* ⭐\n\nWelcome! We understand, educate, serve 24HRS!\n\n*7 Services:*\n1️⃣ M&E - $150 (now $135)\n2️⃣ Business Plan - $50 (now $45)\n3️⃣ Proposal & Funding - $150 (now $135)\n4️⃣ Feasibility Study - $150 (now $135)\n5️⃣ Project Planning - $50 (now $45)\n6️⃣ AI WhatsApp Bot - $50 (now $45)\n7️⃣ AI Digital Marketing - $50 (now $45)\n\nType number or name: Ex *1* or *Monitoring*\n📞 ${PHONE}`;

const MON_SW=`🌟 *Monitoring & Evaluation - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje kwa undani?*\n✅ Tunakaa nawe tunasikiliza changamoto - hatukupi template.\n✅ Tunakujengea mfumo: Kobo, Excel, Dashboard rahisi.\n✅ Tunafundisha timu yako kila siku.\n✅ Ripoti na chati, picha, ushauri wa next step.\n\n💰 *Ngumu:* $150\n🎁 *Punguzo leo:* $135 unaokoa $15\n⏱️ Siku 3-14\n📞 ${PHONE}`;
const MON_EN=`🌟 *Monitoring & Evaluation - MBILAO*\n\n*How we help you in detail:*\n✅ Sit with you, listen challenge - no template.\n✅ Build system: Kobo, Excel, simple Dashboard.\n✅ Train your team daily.\n✅ Report with charts, photos, next steps.\n\n💰 *Hard:* $150\n🎁 *Today:* $135 save $15\n⏱️ 3-14 Days\n📞 ${PHONE}`;

const BUS_SW=`📊 *Business Plan - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje?*\n✅ Tunachambua wazo na soko la Dar - tunaenda field.\n✅ Mpango unaokubalika benki CRDB/NMB - sio copy paste.\n✅ Hesabu halisi: Mtaji, faida, break-even.\n✅ Tunakufundisha kui-present.\n✅ Miezi 3 ushauri bure.\n\n💰 *Laisi:* $50\n🎁 *Leo:* $45\n📞 ${PHONE}`;
const BUS_EN=`📊 *Business Plan - MBILAO*\n\n*How we help:*\n✅ Analyze idea & market - field work.\n✅ Bankable plan - not copy paste.\n✅ Real numbers: Capital, profit, break-even.\n✅ Coach to present.\n✅ 3 months free mentorship.\n\n💰 *Easy:* $50\n🎁 *Today:* $45`;

const PRO_SW=`💰 *Proposal & Funding - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje?*\n✅ Tunatafuta donor: USAID, EU, UNDP.\n✅ Andiko lenye nguvu - problem, solution, budget.\n✅ 90% donor requirements.\n✅ Tunajaza portal na kutuma.\n✅ Ukikataliwa, tunaandika upya BURE.\n\n💰 *Ngumu:* $150\n🎁 *Leo:* $135\n📞 ${PHONE}`;
const PRO_EN=`💰 *Proposal & Funding - MBILAO*\n\n*How we help:*\n✅ Find donor: USAID, EU, UNDP.\n✅ Powerful proposal.\n✅ 90% requirements.\n✅ Fill portal & submit.\n✅ If rejected, rewrite FREE.\n\n💰 *Hard:* $150\n🎁 *Today:* $135`;

const FEA_SW=`🔍 *Feasibility Study - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje?*\n✅ Tunapima kama wazo linawezekana - kiuchumi, kisheria, kiteknolojia.\n✅ Tunaongea na wateja 20-50 wa kweli.\n✅ Tunakupa ukweli: ENDELEA au ACHA? Utaokoa milioni.\n✅ Ripoti kurasa 40.\n\n💰 *Ngumu:* $150\n🎁 *Leo:* $135\n📞 ${PHONE}`;
const FEA_EN=`🔍 *Feasibility Study - MBILAO*\n\n*How we help:*\n✅ Test viability - economic, legal, technical.\n✅ Talk to 20-50 real customers.\n✅ Truth: CONTINUE or STOP? Save millions.\n✅ 40 pages report.\n\n💰 *Hard:* $150\n🎁 *Today:* $135`;

const PLA_SW=`📅 *Project Planning - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje?*\n✅ Gantt Chart, Workplan ya kila siku.\n✅ Bajeti kila shilingi inajulikana.\n✅ Risk Matrix.\n✅ Mradi hautachelewa.\n\n💰 *Laisi:* $50\n🎁 *Leo:* $45\n📞 ${PHONE}`;
const PLA_EN=`📅 *Project Planning - MBILAO*\n\n*How we help:*\n✅ Gantt Chart, daily Workplan.\n✅ Budget tracked.\n✅ Risk Matrix.\n✅ No delays.\n\n💰 *Easy:* $50\n🎁 *Today:* $45`;

const BOT_SW=`🤖 *AI WhatsApp Bot - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje?*\n✅ Bot kama hii - 24HRS, inajua 1-7, hata "whatsap" inakuelewa.\n✅ Inauza, inapokea oda, inajibu 100/sec.\n✅ Hutalipa mfanyakazi tena.\n✅ Hosting + hutahitaji kuscan tena!\n\n💰 *Laisi:* $50\n🎁 *Leo:* $45\n📞 ${PHONE}`;
const BOT_EN=`🤖 *AI WhatsApp Bot - MBILAO*\n\n*How we help:*\n✅ Bot like this - 24HRS, knows 1-7, even "whatsap" typo.\n✅ Sells, takes orders, answers 100/sec.\n✅ No staff pay.\n✅ Hosting + no scan again!\n\n💰 *Easy:* $50\n🎁 *Today:* $45`;

const MAR_SW=`📢 *AI Digital Marketing - MBILAO*\n\n*Sisi kama MBILAO tunakusaidiaje?*\n✅ AI inatafuta wateja halisi FB, Insta, Google - sio bahati nasibu.\n✅ Video na poster zinazovuta.\n✅ Tunakufundisha kufunga mauzo.\n✅ Mauzo 3X siku 30.\n✅ Ripoti Jumapili.\n\n💰 *Laisi:* $50\n🎁 *Leo:* $45\n📞 ${PHONE}`;
const MAR_EN=`📢 *AI Digital Marketing - MBILAO*\n\n*How we help:*\n✅ AI finds real customers FB, Insta, Google.\n✅ Videos & posters that pull.\n✅ Teach closing sales.\n✅ Sales 3X in 30 days.\n✅ Weekly report.\n\n💰 *Easy:* $50\n🎁 *Today:* $45`;

app.get('/',(req,res)=>res.send('MBILAO LIVE - NO SCAN'));
app.get('/qr',(req,res)=>{if(!qr) return res.send('<h1>Bot imeshaconnect! Hakuna QR - Iko LIVE</h1>'); res.send(`<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}"/>`);});
app.listen(10000,()=>{start();});
