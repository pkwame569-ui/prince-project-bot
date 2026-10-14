const {default:makeWASocket,useMultiFileAuthState,fetchLatestBaileysVersion,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const express=require('express');
const P=require('pino');
const fs=require('fs');
const OpenAI=require('openai');
const app=express();
let qr=null,sock=null;
if(fs.existsSync('auth_final')) fs.rmSync('auth_final',{recursive:true,force:true});

// Ikitumia API key ipo, ikikosa itatumia majibu ya akili ya ndani
const openai = process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;

const MBILAO_PROMPT=`You are MBILAO PROJECT CONSULTANT WORLDWIDE. Reply in SAME LANGUAGE customer uses. Services: AI Bot $79-199 2-3d, Planning $150-500 5-7d, M&E $200-600 7-10d, Business Plan $100-300 3-5d, Care Bot $79-150 2-3d, Feasibility $150-400 5-7d, Proposal $200-700 7-14d, Marketing $50-300/mo. RULES: Educate, tell cost+time+10% discount today, assure WORLDWIDE 24H, contact 255795804621, friendly short.`;

async function aiReply(msg){
 if(!openai){
  const lower=msg.toLowerCase();
  let service="Huduma zetu zote";
  if(lower.includes("bot")) service="AI WhatsApp Bot";
  else if(lower.includes("plan")) service="Business Plan";
  else if(lower.includes("proposal")||lower.includes("funding")) service="Proposal & Funding";
  else if(lower.includes("feasib")) service="Feasibility Study";
  else if(lower.includes("monitor")||lower.includes("m&e")) service="M&E";
  
  return `Karibu MBILAO CONSULTANT WORLDWIDE! 🌟

Umeulizia: *${service}*

✅ Gharama: $79-$700 kutegemea ukubwa
✅ Muda: Siku 2-14
✅ Punguzo: 10% ukilipia leo!

Tunakuelewa vizuri, tunaku-elimisha na tunakuhudumia WORLDWIDE 24 HOURS popote ulipo!

📞 255795804621
Andika lugha yako - tunajibu lugha zote!
Unataka kuanza lini?`;
 }
 try{
  const r=await openai.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:MBILAO_PROMPT},{role:"user",content:msg}],temperature:0.8,max_tokens:500});
  return r.choices[0].message.content;
 }catch(e){
  return `Karibu MBILAO! 🌟 Tunapatikana WORLDWIDE 24 HOURS! Huduma zetu 8 zipo, gharama $79-$700, muda 2-14 days, punguzo 10% leo! Andika unachotaka nikueleze. 📞 255795804621`;
 }
}

async function start(){
 const{state,saveCreds}=await useMultiFileAuthState('auth_final');
 const{version}=await fetchLatestBaileysVersion();
 sock=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},logger:P({level:'silent'}),browser:["Chrome","Windows","10"],syncFullHistory:false});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async u=>{
  if(u.qr) qr=await QRCode.toDataURL(u.qr);
  if(u.connection==='open'){qr=null;console.log('V31 CONNECTED');}
  if(u.connection==='close') setTimeout(start,5000);
 });
 sock.ev.on('messages.upsert',async m=>{
  try{
   const x=m.messages[0];if(!x.message||x.key.fromMe)return;
   const j=x.key.remoteJid;if(j.endsWith('@g.us'))return;
   const txt=x.message.conversation||x.message.extendedTextMessage?.text||"";if(!txt)return;
   const reply=await aiReply(txt);
   await sock.sendMessage(j,{text:reply});
  }catch{}
 });
}
start();
app.get('/',(a,b)=>b.send('MBILAO V31 LIVE - LUGHA ZOTE - NO GROUP'));
app.get('/qr',(a,b)=>{
 if(!qr) return b.send('<h1 style="text-align:center;margin-top:100px">✅ V31 CONNECTED - Bot ina akili!</h1>');
 b.send(`<div style="text-align:center;padding:30px;font-family:sans-serif"><h2>MBILAO V31 - SCAN QR</h2><img src="${qr}" width="330" style="border:3px solid #25D366;padding:10px;border-radius:12px"><p>Expires 20sec - Bot haitajibu Group</p><script>setTimeout(()=>location.reload(),20000)</script></div>`);
});
app.listen(10000,()=>console.log('LIVE 10000'));
