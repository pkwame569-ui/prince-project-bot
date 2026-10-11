const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');

let lastQR = null;
let pairingCode = null;
let sockGlobal = null;
const userMemory = new Map();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_PAIR_FINAL_V2');
    const sock = makeWASocket({ 
        auth: state, 
        logger: P({ level: 'silent' }), 
        browser: ["MBILAO WORLDWIDE", "Chrome", "122.0"],
        printQRInTerminal: false
    });
    sockGlobal = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
        if(u.qr){ 
            lastQR = await QRCode.toDataURL(u.qr); 
            pairingCode = null;
            console.log('QR READY /qr'); 
        }
        if(u.connection==='open'){ 
            console.log('MBILAO CONNECTED ✅'); 
            lastQR=null; 
            pairingCode=null; 
        }
        if(u.connection==='close'){
            console.log('Connection closed, restarting...');
            setTimeout(startBot, 3000);
        }
    });

    const deep = {
        evaluation: [
`📚 **EVALUATION / TATHMINI - Level 1**
[SW] Evaluation ni uchunguzi wa kitaalamu - Je mradi umefikia malengo? Jamii imebadilika? Pesa imetumika vizuri? Bila hii USAID/EU/UN hawatakupa tena.
[EN] Evaluation is professional examination - Did it achieve goals? Change? Funds used? Without it, donors won't fund again.
At MBILAO: World-class report, Tunakusimamia hatua kwa hatua / step by step. 💰 $99→15%=$84 Nifafanue?/Explain more?`,
`📚 **EVALUATION - Level 2: Types & Example**
[SW] Aina 4: Baseline, Mid-term, Endline, Impact. [EN] 4 Types: same.
Mfano: Dodoma water 70% visima not working, donor $200k after our report. Power ya evaluation!
Mchakato: Field, interview, analysis, 40 pages. Unataka hatua?/Want step?`,
`📚 **EVALUATION - Level 3: Steps & Guarantee**
[SW] Hatua 5: Siku 1-2 kikao, 3-7 data field, 8-12 analysis, 13 draft, 14 final + presentation. Muda: Wiki 2.
[EN] 5 Steps: Day 1-2 meeting, 3-7 field, 8-12 analysis, 13 draft, 14 final. Time: 2 weeks.
Uhakika: Haijawahi kukataliwa/ Never rejected. $84 only! Mradi wako ni wa nini?/What project? 🙏`
        ],
        logframe: [
`📋 **LOGFRAME - Level 1**
[SW] Moyo wa proposal - Goal, Outcome, Output, Indicator, Verification. Bila nzuri 90% rejected. [EN] Heart of proposal. MBILAO world-class $99→$84 Nifafanue?`,
`📋 **LOGFRAME - Level 2**
Kosa kubwa: Indicators not SMART. Example: Goal reduce poverty, Outcome 5000 farmers increase 40%. At MBILAO 100% acceptable. Nikuonyeshe $500k winner?`,
`📋 **LOGFRAME - Level 3**
Tunakaa 2 hours, create Logframe, teach present, revise free 3 times. $84 only. Nipe wazo nikuanzishie bure?/Give idea I start free?`
        ],
        agrarian: [
`🌾 **AGRARIAN / KILIMO - Level 1**
[SW] Bila smart mazao -70%. Donors billions kwa climate smart. MBILAO +200% UN methods. [EN] Without smart -70% yield. $99→20%=$79 MINIMUM! Nifafanue?`,
`🌾 **AGRARIAN - Level 2**
1.Drought seeds 2.Drip 3.Compost 4.Intercrop 5.Insurance. Example Singida 10→35 bags/acre + $5k UNDP! Hatua ya kwanza?/First step?`,
`🌾 **AGRARIAN - Level 3**
Funding $10k-$50k proposal included in $79. Visit farm, check soil, weekly call. Guarantee: yield drops repeat free. $79 only! Shamba wapi?/Where farm?`
        ],
        grant: [
`💸 **GRANT / KUOMBA PESA - Level 1**
[SW] Kuomba pesa ni sanaa donor anataka ROI. Bad proposal 6 months loss. [EN] Art - donor wants ROI. MBILAO $Millions won $450→$405 Secret?`,
`💸 **GRANT - Level 2**
1.Background data 2.SMART logframe 3.Sustainability 5 years. Mistake: Budget no breakdown. Example Kigoma $750k USAID. Wazo lako?/Your idea?`,
`💸 **GRANT - Level 3**
Day 1 meeting, 2-5 research, 6-12 writing 30p, 13-14 editing, 15 final + training. If rejected revise free! 100% until accepted. $405. Wazo?`
        ],
        marketing: [
`🔥 **AI MARKETING VIRAL - Level 1 TRENDING**
[SW] Bila AI marketing biashara kama duka gizani. Dunia sasa video fupi AI viral kila siku. Mauzo -80% bila. [EN] Without AI dark shop. AI viral daily +500% sales. WORLDWIDE brand! $149→$111 Nifafanue?`,
`🔥 **AI MARKETING - Level 2**
Daily AI videos, TikTok IG FB viral, Brand WORLDWIDE, +500% sales. Example Dar nguo 20→150/day in 2 weeks! Tuanze na biashara yako?/Start with yours?`,
`🔥 **AI MARKETING - Level 3**
Day 1-2 analyze, 3 create 10 videos, 4-7 post boost, week 2 sales. Daily support. $111 only - DEMAND KUBWA! Tuanze leo?/Start today?`
        ]
    };

    sock.ev.on('messages.upsert', async ({messages})=>{
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const raw=m.message.conversation||m.message.extendedTextMessage?.text||"";
        const txt=raw.toLowerCase().trim(); const from=m.key.remoteJid;
        if(!userMemory.has(from)) userMemory.set(from,{topic:null, depth:0, lastReply:''});
        const mem=userMemory.get(from);
        let topic=null;
        if(txt.includes('evaluation')||txt.includes('tathmini')) topic='evaluation';
        else if(txt.includes('logframe')) topic='logframe';
        else if(txt.includes('agrar')||txt.includes('agri')||txt.includes('kilimo')||txt.includes('shamba')||txt.includes('climate')) topic='agrarian';
        else if(txt.includes('grant')||txt.includes('proposal')||txt.includes('omba')||txt.includes('donor')||txt.includes('fund')) topic='grant';
        else if(txt.includes('market')||txt.includes('brand')||txt.includes('viral')||txt.includes('masoko')||txt.includes('biashara')) topic='marketing';
        else if(txt.includes('monitor')||txt.includes('strategic')||txt.includes('feasib')||txt.includes('business')) topic='evaluation';
        const wantsMore=txt.includes('eleza')||txt.includes('fafanua')||txt.includes('zaidi')||txt.includes('more')||txt.includes('explain')||txt.includes('sijaelewa')||txt.includes('mifano')||txt.includes('example')||txt.includes('hatua')||txt.includes('step')||txt.includes('how')||txt.includes('vipi');
        let reply="";
        if(topic){
            if(mem.topic!==topic){mem.topic=topic; mem.depth=0;} else if(wantsMore){mem.depth=Math.min(mem.depth+1,2);} else if(mem.topic===topic && txt.length<20){mem.depth=Math.min(mem.depth+1,2);}
            reply=deep[topic][mem.depth];
        } else if(txt.includes('bei')||txt.includes('price')||txt.includes('huduma')||txt.includes('service')||txt.includes('list')){
            reply=`🌐 **MBILAO WORLDWIDE - MIN $99 + PUNGUZO/DISCOUNT**
SW: Karibu sana! EN: Welcome!
1. WhatsApp Bot $150→$135
2. Website $99→$84 MIN!
3. Automation $180→$162
4. Mentorship $99→$79 MIN!
5. M&E & Logframe $99→$84 MIN!
6. Grant $450→$405
7. Strategic $300→$255
8. Feasibility $149→$119
9. Business Plan $120→$108
10. Policy $150→$127.5
11. Agrarian $99→$79 MIN!
12. Project Mgmt $250→$225
13. AI Engineer $250→$212.5
14. 🔥 AI Marketing $149→$111 TRENDING!
SW: Tunakusimamia hatua kwa hatua. EN: We guide step by step. Unahitaji gani?/Which need? 🙏`;
        } else {
            reply=`Asante / Thank you: "${raw.substring(0,70)}" 🙏
SW: Karibu MBILAO WORLDWIDE - Wataalamu USAID/EU/UN. Nimekuelewa unahitaji msaada. Niko kukusikiliza kwa undani.
EN: Welcome MBILAO - Experts USAID/EU/UN. I understand you need help. Here to listen deeply.
SW: Changamoto gani? Mradi, shamba, biashara? EN: What challenge? Project, farm, business?
Niko tayari / Ready now 🌐`;
        }
        if(reply===mem.lastReply){mem.depth=Math.min(mem.depth+1,2); if(deep[mem.topic] && deep[mem.topic][mem.depth]) reply=deep[mem.topic][mem.depth];}
        mem.lastReply=reply; userMemory.set(from,mem);
        await sock.sendMessage(from,{text:reply});
    });
}
startBot();

app.get('/',(req,res)=>res.send('MBILAO PAIR + QR LIVE - /qr /pair'));

app.get('/qr',(req,res)=>{
    if(!lastQR) return res.send(`<html><body style="text-align:center;padding-top:50px;font-family:sans-serif"><h1>CONNECTED ✅ / Imeunganishwa<br>Bot Inafanya Kazi!</h1><a href="/qr">Refresh</a><script>setTimeout(()=>location.reload(),5000)</script></body></html>`);
    res.send(`<html><body style="text-align:center;padding-top:10px;font-family:sans-serif"><h1>MBILAO BILINGUAL SMART BOT<br>MIN $99 + PUNGUZO/DISCOUNT</h1><img src="${lastQR}" style="width:90%;max-width:350px;border:5px solid #000"/><br><br><a href="/pair" style="font-size:20px;color:blue">Get Pairing Code (Kama QR inakataa) → /pair</a><br><br><a href="/qr">Refresh 30s</a></body></html>`);
});

app.get('/pair', async (req,res)=>{
    try{
        if(!sockGlobal) return res.send(`<html><body style="text-align:center;padding-top:50px"><h1>Bot Starting... Refresh 5s</h1><script>setTimeout(()=>location.reload(),3000)</script></body></html>`);
        if(sockGlobal.authState.creds.registered){
            return res.send(`<html><body style="text-align:center;padding-top:50px"><h1>CONNECTED ✅ Tayari Imeunganishwa!</h1></body></html>`);
        }
        if(!pairingCode){
            const phone = "255795804621";
            pairingCode = await sockGlobal.requestPairingCode(phone);
            console.log('PAIRING CODE:', pairingCode, 'for', phone);
        }
        res.send(`<html><body style="text-align:center;padding-top:20px;font-family:sans-serif"><h1>MBILAO PAIRING CODE</h1><h1 style="font-size:65px;letter-spacing:10px;background:#000;color:#0f0;padding:20px">${pairingCode}</h1><p>WhatsApp > Linked Devices > Link a device > Link with phone number instead</p><p>Weka / Enter: <b>${pairingCode}</b></p><p>Namba: 255795804621</p><br><a href="/pair">Refresh Code</a> | <a href="/qr">QR Code</a></body></html>`);
    }catch(e){
        console.log('Pair error', e.message);
        res.send(`<html><body style="text-align:center;padding-top:30px"><h1>Error: ${e.message}<br>Subiri 10s jaribu tena</h1><a href="/pair">Retry</a><script>setTimeout(()=>location.reload(),5000)</script></body></html>`);
    }
});

const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log('MBILAO PAIR+QR Live on '+PORT));
