const {default:makeWASocket,useMultiFileAuthState,fetchLatestBaileysVersion,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const express=require('express');
const P=require('pino');
const fs=require('fs');
const OpenAI=require('openai');
const app=express();
let qr=null,sock=null;
if(fs.existsSync('auth_final')) fs.rmSync('auth_final',{recursive:true,force:true});
const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const MBILAO_PROMPT=`You are MBILAO PROJECT CONSULTANT WORLDWIDE. You MUST reply in SAME LANGUAGE customer uses (Swahili, English, French, Arabic, any language auto-detect).

SERVICES & PRICE & TIME:
1. AI WhatsApp Bot $79-199 2-3 days
2. Project Planning $150-500 5-7 days
3. M&E $200-600 7-10 days
4. Business Plan $100-300 3-5 days
5. Customer Care Bot $79-150 2-3 days
6. Feasibility $150-400 5-7 days
7. Proposal & Funding $200-700 7-14 days
8. AI Digital Marketing $50-300/month 1 day

RULES: Educate simply, tell cost+time+10% discount today, assure MBILAO WORLDWIDE 24 HOURS support, contact 255795804621, friendly short reply, ask when to start.`;
async function aiReply(msg){
 try{
  const r=await openai.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"system",content:MBILAO_PROMPT},{role:"user",content:msg}],temperature:0.8,max_tokens:450});
  return r.choices[0].message.content;
 }catch(e){return `Karibu MBILAO! 🌟\nI speak ALL languages - Andika lugha yako!\nTell me service you need, I explain cost, time, 10% discount today.\nWORLDWIDE 24 HOURS 📞 255795804621`;}
}
async function start(){
 const{state,saveCreds}=await useMultiFileAuthState('auth_final');
 const{version}=await fetchLatestBaileysVersion();
 sock=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},logger:P({level:'silent'}),browser:["Chrome","Windows","10"],syncFullHistory:false});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async u=>{
  if(u.qr) qr=await QRCode.toDataURL(u.qr);
  if(u.connection==='open'){qr=null;console.log('V31 AI CONNECTED');}
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
app.get('/',(a,b)=>b.send('MBILAO V31 AI LIVE - LUGHA ZOTE'));
app.get('/qr',(a,b)=>{
 if(!qr) return b.send('<h1 style="text-align:center;margin-top:100px">✅ V31 CONNECTED - Bot ina akili lugha zote!</h1>');
 b.send(`<div style="text-align:center;padding:30px;font-family:sans-serif"><h2>MBILAO V31 - SCAN QR</h2><img src="${qr}" width="330" style="border:3px solid #25D366;padding:10px;border-radius:12px"><p>Expires 20sec</p><script>setTimeout(()=>location.reload(),20000)</script></div>`);
});
app.listen(10000);
