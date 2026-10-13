const {default:makeWASocket,useMultiFileAuthState,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const express=require('express');
const P=require('pino');
const app=express();
let qr=null,sock=null;

async function start(){
 const{state,saveCreds}=await useMultiFileAuthState('auth_final');
 sock=makeWASocket({
  auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},
  logger:P({level:'silent'}),
  browser:["Ubuntu","Chrome","120.0.0"],
  printQRInTerminal:false
 });
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async u=>{
  if(u.qr)qr=await QRCode.toDataURL(u.qr);
  if(u.connection==='open'){qr=null;console.log('CONNECTED MBILAO LIVE');}
 });
 sock.ev.on('messages.upsert',async m=>{
  try{
   const x=m.messages[0];if(!x.message||x.key.fromMe)return;
   const j=x.key.remoteJid;if(j.endsWith('@g.us'))return;
   const t=(x.message.conversation||x.message.extendedTextMessage?.text||"").toLowerCase();
   let r="Karibu MBILAO! Andika *kilimo* au *grant*";
   if(t.includes('kilimo'))r="🌱 MBILAO Kilimo Smart +200%\nGunia 10->30\nAndika *nimeelewa*";
   else if(t.includes('grant'))r="💰 MBILAO Grant Proposal\nBarua bil 1\nAndika *nimeelewa*";
   else if(t.includes('nimeelewa'))r="💡 Faida x3\n💵 Bei $99->$79\nAndika *nataka*";
   else if(t.includes('nataka'))r="✅ Tuma NATAKA KILIMO\nTigoPesa 0655 XXXXXX";
   await sock.sendMessage(j,{text:r});
  }catch{}
 });
}
start();

app.get('/',(a,b)=>b.send('V26 QR+CODE LIVE'));

app.get('/qr',(a,b)=>{
 if(!qr){
  return b.send('<h1 style="text-align:center;margin-top:50px">✅ CONNECTED - Bot iko Live!</h1>');
 }
 b.send(`
  <div style="text-align:center;font-family:sans-serif;padding:20px">
   <h2>MBILAO BOT - Scan au Tumia Namba</h2>
   <img src="${qr}" width="300" style="border:1px solid #ccc;padding:10px"><br>
   <p>Scan haraka - QR ina-expire 40sec</p>
   <hr style="margin:30px">
   <h3>QR Inagoma? Tumia CODE (Haraka zaidi)</h3>
   <input id="n" placeholder="255654xxxxxx" style="padding:10px;width:200px">
   <button onclick="getCode()" style="padding:10px 20px;background:#25D366;color:white;border:none">Pata CODE</button>
   <h1 id="c" style="letter-spacing:5px"></h1>
   <p id="i"></p>
   <script>
    function getCode(){
     const num=document.getElementById('n').value;
     if(!num)return alert('Weka namba 255...');
     fetch('/pair?number='+num).then(r=>r.text()).then(t=>{
      document.getElementById('c').innerHTML=t;
      document.getElementById('i').innerHTML='Nenda WhatsApp > Linked Devices > Link with phone number > weka CODE';
     });
    }
    setTimeout(()=>location.reload(),20000);
   </script>
  </div>
 `);
});

app.get('/pair',async(a,b)=>{
 const n=a.query.number;
 if(!n)return b.send('Weka?number=255654xxxxxx');
 if(!sock)return b.send('Subiri bot i-load 10sec...');
 try{
  const code=await sock.requestPairingCode(n.trim());
  b.send(code);
 }catch(e){
  b.send('Error: '+e.message+' - Subiri 1min jaribu tena');
 }
});

app.listen(10000);
