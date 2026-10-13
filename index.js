const {default:makeWASocket,useMultiFileAuthState}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const express=require('express');
const P=require('pino');
const app=express();
let qr=null;
async function start(){
 const{state,saveCreds}=await useMultiFileAuthState('auth_final');
 const sock=makeWASocket({auth:state,logger:P({level:'silent'}),browser:["MBILAO","Chrome","120.0.0"],printQRInTerminal:false});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async u=>{
  if(u.qr)qr=await QRCode.toDataURL(u.qr);
  if(u.connection==='open'){qr=null;console.log('CONNECTED');}
 });
 sock.ev.on('messages.upsert',async m=>{
  try{
   const x=m.messages[0];if(!x.message||x.key.fromMe)return;
   const j=x.key.remoteJid;if(j.endsWith('@g.us'))return;
   const t=(x.message.conversation||"").toLowerCase();
   let r="Karibu MBILAO! Andika kilimo au grant";
   if(t.includes('kilimo'))r="MBILAO Kilimo +200% gunia 10->30 Andika nimeelewa";
   else if(t.includes('nimeelewa'))r="Faida x3 Bei $99->$79";
   await sock.sendMessage(j,{text:r});
  }catch{}
 });
}
start();
app.get('/',(a,b)=>b.send('QR MODE LIVE'));
app.get('/qr',(a,b)=>{
 if(!qr)return b.send('<h1>CONNECTED - Bot iko Live!</h1>');
 b.send(`<img src="${qr}" width="350"><p>Scan haraka - QR ina-expire 40sec</p><script>setTimeout(()=>location.reload(),15000)</script>`);
});
app.listen(10000);
