const {default:makeWASocket,useMultiFileAuthState,fetchLatestBaileysVersion,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const express=require('express');
const P=require('pino');
const fs=require('fs');
const app=express();
let qr=null,sock=null;
if(fs.existsSync('auth_final')) fs.rmSync('auth_final',{recursive:true,force:true});

const NAME = "The Mbilao Project Consultant Worldwide";

const ALL_SW=`🌟 *${NAME}* 🌟

Huduma zetu:
1️⃣ Monitoring & Evaluation
2️⃣ Business Plan
3️⃣ Proposal & Funding
4️⃣ Feasibility Study
5️⃣ Project Planning
6️⃣ AI WhatsApp Bot
7️⃣ AI Digital Marketing

*Utasaidiwa nini?*
- Utaelewa mradi wako
- Utapata mwelekeo
- Utaokoa muda

Andika moja: *Monitoring* au *Business Plan*`;

const ALL_EN=`🌟 *${NAME}* 🌟

Our Services:
1️⃣ Monitoring & Evaluation
2️⃣ Business Plan
3️⃣ Proposal & Funding
4️⃣ Feasibility Study
5️⃣ Project Planning
6️⃣ AI WhatsApp Bot
7️⃣ AI Digital Marketing

*How you will be helped?*
- You will understand your project
- You will get direction
- You will save time

Type one: *Monitoring* or *Business Plan*`;

function isEnglish(t){return /hello|hi|business|monitoring|proposal|help|what|how|price/i.test(t);}

function replyLogic(txt){
 const l=txt.toLowerCase();
 const en=isEnglish(txt);
 if(l.length<6 || l.includes("habari") || l.includes("hello") || l.includes("hi") || l.includes("mambo")) return en? ALL_EN : ALL_SW;

 if(l.includes("monitor")||l.includes("m&e")||l.includes("fuatilia")){
  return en? `📊 *Monitoring & Evaluation - ${NAME}*\n\nCompass for your project.\n\n*You will be helped:*\n1. Know if project is on track\n2. Detect problems early\n3. Get clear reports\n\nWhat is your project?`
            : `📊 *Monitoring & Evaluation - ${NAME}*\n\nNi dira ya mradi wako.\n\n*Utasaidiwa nini?*\n1. Utajua mradi unaenda sawa\n2. Utagundua shida mapema\n3. Utapata ripoti\n\nMradi wako ni wa nini?`;
 }
 if(l.includes("business")||l.includes("biashara")){
  return en? `📑 *Business Plan - ${NAME}*\n\nMap for your business.\n\n*You will be helped:*\n1. Understand business\n2. Know customers\n3. Explain easily`
            : `📑 *Business Plan - ${NAME}*\n\nRamani ya biashara.\n\n*Utasaidiwa nini?*\n1. Utaelewa biashara\n2. Utajua wateja\n3. Utaieleza vizuri`;
 }
 if(l.includes("proposal")||l.includes("funding")||l.includes("pesa")){
  return en? `💰 *Proposal - ${NAME}*\n\nTo request money.\n\n*You will be helped:*\n1. Write clearly\n2. Understand fast\n3. Look prepared`
            : `💰 *Proposal - ${NAME}*\n\nBarua ya kuomba pesa.\n\n*Utasaidiwa nini?*\n1. Utaandika vizuri\n2. Wataelewa\n3. Utaonekana umejiandaa`;
 }
 if(l.includes("bot")||l.includes("whatsapp")){
  return en? `🤖 *AI Bot - ${NAME}*\n\nAssistant 24/7\n\n*You will be helped:*\n1. No manual replies\n2. Fast response\n3. Save time`
            : `🤖 *AI Bot - ${NAME}*\n\nMsaidizi 24/7\n\n*Utasaidiwa nini?*\n1. Hujibu mwenyewe\n2. Haraka\n3. Una muda`;
 }
 return en? ALL_EN : ALL_SW;
}

async function start(){
 const{state,saveCreds}=await useMultiFileAuthState('auth_final');
 const{version}=await fetchLatestBaileysVersion();
 sock=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},logger:P({level:'silent'}),browser:[NAME,"Chrome","1.0"],syncFullHistory:false});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async u=>{
  if(u.qr) qr=await QRCode.toDataURL(u.qr);
  if(u.connection==='open'){qr=null;console.log(NAME+' CONNECTED');}
  if(u.connection==='close') setTimeout(start,5000);
 });
 sock.ev.on('messages.upsert',async m=>{
  const x=m.messages[0];if(!x.message||x.key.fromMe)return;
  const j=x.key.remoteJid;
  if(j.endsWith('@g.us')) return;
  if(j.includes('status@broadcast')) return;
  const txt=x.message.conversation||x.message.extendedTextMessage?.text||"";if(!txt)return;
  await sock.sendMessage(j,{text:replyLogic(txt)});
 });
}
start();
app.get('/',(a,b)=>b.send(NAME+' EN/SW'));
app.get('/qr',(a,b)=>{
 if(!qr) return b.send(`<h1 style="text-align:center;margin-top:100px">✅ ${NAME} CONNECTED</h1>`);
 b.send(`<div style="text-align:center;padding:30px"><h2>${NAME}</h2><p>EN/SW | All Services | No Group</p><img src="${qr}" width="330"><script>setTimeout(()=>location.reload(),20000)</script></div>`);
});
app.listen(10000);
