const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');

let lastQR = null;
const userMemory = new Map();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_BILINGUAL_FINAL');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["MBILAO WORLDWIDE", "Chrome", "122.0"] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
        if(u.qr){ lastQR = await QRCode.toDataURL(u.qr); console.log('QR READY /qr'); }
        if(u.connection==='open'){ console.log('MBILAO CONNECTED ✅'); lastQR=null; }
    });

    const deep = {
        evaluation: [
`📚 **EVALUATION / TATHMINI - Level 1**

**[SWAHILI]** Ndugu, Evaluation ni uchunguzi wa kitaalamu wa mradi wako - Je, umefikia malengo? Jamii imebadilika? Pesa ya donor imetumika vizuri? Bila hii USAID/EU/UN hawatakupa pesa tena.

**[ENGLISH]** Evaluation is professional examination of your project - Did it achieve goals? What change? Were funds well used? Without it, donors won't fund you again.

**At MBILAO:** World-class report accepted globally. Tunakusimamia hatua kwa hatua / We guide you step by step.
💰 $99 → **15% OFF = $84** - Minimum Premium Price!
Niku-fafanulie zaidi? / Shall I explain more deeper?`,

`📚 **EVALUATION - Level 2: Types & Real Example / Aina na Mfano**

**[SW]** Aina 4: Baseline (kabla), Mid-term (katikati), Endline (mwisho), Impact (miaka 2 baadaye).
**[EN]** 4 Types: Baseline (before), Mid-term (middle), Endline (end), Impact (after 2 years).

**Mfano / Example:** Dodoma water project - tuligundua 70% ya visima havifanyi kazi, donor akatoa $200k zaidi after our report. Hii ndio power ya evaluation nzuri / This is power of good evaluation.

**Mchakato / Process:** Field visit, community interview, data analysis, 40 pages report.
Unataka hatua ya kwanza? / Want first step?`,

`📚 **EVALUATION - Level 3: Steps, Time & Guarantee**

**[SW]** Hatua 5: Siku 1-2 kikao na wewe, 3-7 data field, 8-12 analysis, 13 draft, 14 final + presentation kwa donor. Muda: Wiki 2 tu.

**[EN]** 5 Steps: Day 1-2 meeting with you, 3-7 field data, 8-12 analysis, 13 draft, 14 final + donor presentation. Time: Only 2 weeks.

**Uhakika / Guarantee:** Ripoti yetu haijawahi kukataliwa / Our report never rejected by USAID/EU/UN. Tunakusimamia mpaka donor aridhike / We support until donor satisfied.

💰 **$84 only this week!** Mradi wako ni wa nini? / What is your project about? I'm ready now 🙏`
        ],
        logframe: [
`📋 **LOGFRAME / MFUMO WA KIMANTIKI - Level 1**

**[SW]** Logframe ni moyo wa proposal - Goal, Outcome, Output, Activities, Indicators, Verification, Assumptions. Bila nzuri, 90% ya proposal zinakataliwa.
**[EN]** Logframe is heart of proposal - Goal, Outcome, Output, Activities, Indicators, Verification, Assumptions. Without good one, 90% proposals rejected.

**MBILAO:** Tunatengeneza ya kimataifa / We make world-class accepted by all donors.
💰 $99 → **15% = $84**
Nifafanue muundo? / Explain structure?`,

`📋 **Level 2: Structure & Why Rejected / Muundo na Kwanini Inakataliwa**

**[SW]** Kosa kubwa: Viashiria visivyo SMART. Donor anataka Specific, Measurable, Achievable.
**[EN]** Big mistake: Indicators not SMART. Donor wants Specific, Measurable, Achievable.

**Example / Mfano:**
Goal: Kupunguza umaskini / Reduce poverty
Outcome: Wakulima 5000 ongezeko kipato / 5000 farmers income increase
Indicator: % increase - Verification: Survey

At MBILAO tunatengeneza 100% acceptable. Nikuonyeshe mfano iliyoshinda $500k? / Show example won $500k?`,

`📋 **Level 3: Real Sample & Support**

**[SW]** Tunakaa na wewe masaa 2, tunaelewa mradi, tunatengeneza, tunakufundisha kuipresent, tunasahihisha bure mara 3 mpaka ikubalike.
**[EN]** We sit with you 2 hours, understand project, create logframe, teach you to present, revise free 3 times until accepted.

**$84 only.** Nipe wazo la mradi nikuanzishie bure? / Give me your idea I start one free now?`
        ],
        agrarian: [
`🌾 **AGRARIAN / KILIMO & CLIMATE SMART - Level 1**

**[SW]** Bila kilimo smart, mazao -70% kwa jua kali. Donors wanatoa billions kwa climate smart. MBILAO +200% mavuno na mbinu za UN.
**[EN]** Without smart farming, yield -70% due to climate. Donors give billions for climate smart. MBILAO +200% yield with UN methods.

💰 $99 → **20% OFF = $79 MINIMUM!** Bei ya chini kabisa / Lowest premium price!
Nifafanue mbinu? / Explain methods?`,

`🌾 **Level 2: 5 Methods & Example / Mbinu 5 na Mfano**

**[SW/EN]**
1. Mbegu ukame / Drought seeds
2. Drip irrigation / Umwagiliaji matone
3. Compost / Mbolea asili
4. Mseto / Intercropping
5. Bima / Crop insurance

**Mfano / Example:** Singida farmer - gunia 10 → 35 per acre! + $5k funding UNDP.

Unataka hatua ya kwanza shambani? / Want first step on farm?`,

`🌾 **Level 3: Funding + Full Support / Ufadhili na Usimamizi**

**[SW]** Funding: Tunakuandikia proposal ya climate $10k-$50k ndani ya $79. Usimamizi: Tunakuja shambani, tunaangalia udongo, tunakupangia msimu, kila wiki simu.
**[EN]** Funding: We write climate proposal $10k-$50k included in $79. Support: We visit farm, check soil, plan season, weekly call.

**Dhamana / Guarantee:** Mavuno yakipungua, tunarudia bure / If yield drops, we repeat free.
**$79 only!** Shamba liko wapi? / Where is your farm? 🌱`
        ],
        grant: [
`💸 **GRANT PROPOSAL / KUOMBA PESA - Level 1**

**[SW]** Kuomba pesa ni sanaa - donor anataka ROI ya kijamii. Proposal mbovu = hasara miezi 6.
**[EN]** Requesting funds is art - donor wants social ROI. Bad proposal = 6 months loss.

**MBILAO:** Tumeshinda $Millions USAID/EU/UN. Tunakusimamia hatua kwa hatua / We guide step by step.
💰 $450 → **10% = $405**
Siri ya kushinda? / Secret to win?`,

`💸 **Level 2: 3 Secrets / Siri 3**

**[SW/EN]**
1. Background na data / Background with data
2. Logframe SMART / SMART logframe
3. Sustainability miaka 5 / 5 years sustainability

**Kosa / Mistake:** Budget bila breakdown.
**Mfano / Example:** Kigoma health $750k USAID - kwa sababu ya sustainability.

Wazo lako ni lipi? / What is your idea?`,

`💸 **Level 3: Process & Guarantee**

**[SW]** Siku 1 kikao, 2-5 research donor, 6-12 kuandika 30 pages + logframe + budget, 13-14 editing, 15 final + training present. Kama ikikataliwa, tunahariri bure!
**[EN]** Day 1 meeting, 2-5 donor research, 6-12 writing 30 pages + logframe + budget, 13-14 editing, 15 final + presentation training. If rejected, we revise free!

**Uhakika / Guarantee:** 100% mpaka ikubalike / Until accepted.
**$405.** Wazo lako? / Your idea?`
        ],
        marketing: [
`🔥 **AI MARKETING VIRAL / MASOKO YA AI - Level 1 TRENDING #1**

**[SW]** Bila AI marketing leo, biashara kama duka gizani - hakuna akuonaye. Dunia imehamia video fupi za AI zinazoviral kila siku. Mauzo -80% bila hii.
**[EN]** Without AI marketing today, business like dark shop - no one sees you. World moved to AI short videos viral daily. Sales -80% without this.

**MBILAO:** AI viral videos daily, WORLDWIDE brand, +500% sales. Tunakusimamia hatua kwa hatua / We make you BIG BRAND worldwide!
💰 $149 → **25% OFF = $111 TRENDING!**
Nifafanue jinsi? / Explain how?`,

`🔥 **Level 2: How We Do / Jinsi Tunavyofanya**

**[SW/EN]**
- AI video creation kila siku / daily AI videos
- TikTok, Instagram, Facebook viral
- Brand WORLDWIDE
- Sales +500%

**Mfano / Example:** Biashara ya nguo Dar - tulimfanya viral, mauzo 20 → 150 per day ndani ya wiki 2!

Unataka tuanze na biashara yako? / Want start with your business? 🚀`,

`🔥 **Level 3: Steps & Guarantee**

**[SW]** Siku 1-2 tunachambua biashara, 3 tunatengeneza AI videos 10, 4-7 tunapost na ku-boost, wiki 2 unaanza kuona mauzo. Tunakusimamia kila siku.
**[EN]** Day 1-2 analyze business, 3 create 10 AI videos, 4-7 post & boost, week 2 you see sales. Daily support.

**$111 only - DEMAND KUBWA! / HIGH DEMAND!** Tuanze leo? / Start today?`
        ]
    };

    sock.ev.on('messages.upsert', async ({messages})=>{
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const raw=m.message.conversation||m.message.extendedTextMessage?.text||"";
        const txt=raw.toLowerCase().trim(); const from=m.key.remoteJid;

        if(!userMemory.has(from)) userMemory.set(from,{topic:null, depth:0, lastReply:''});
        const mem = userMemory.get(from);

        let topic=null;
        if(txt.includes('evaluation')||txt.includes('tathmini')) topic='evaluation';
        else if(txt.includes('logframe')||txt.includes('logical')) topic='logframe';
        else if(txt.includes('agrar')||txt.includes('agri')||txt.includes('kilimo')||txt.includes('shamba')||txt.includes('climate')||txt.includes('mazingira')||txt.includes('environment')) topic='agrarian';
        else if(txt.includes('grant')||txt.includes('proposal')||txt.includes('omba')||txt.includes('usaid')||txt.includes('donor')||txt.includes('fund')) topic='grant';
        else if(txt.includes('market')||txt.includes('brand')||txt.includes('viral')||txt.includes('masoko')||txt.includes('biashara')) topic='marketing';
        else if(txt.includes('monitor')||txt.includes('strategic')||txt.includes('feasib')||txt.includes('business plan')||txt.includes('policy')) topic='evaluation';

        const wantsMore = txt.includes('eleza')||txt.includes('fafanua')||txt.includes('zaidi')||txt.includes('more')||txt.includes('explain')||txt.includes('sijaelewa')||txt.includes('mifano')||txt.includes('example')||txt.includes('hatua')||txt.includes('step')||txt.includes('how')||txt.includes('vipi')||txt.includes('jinsi');

        let reply="";
        if(topic){
            if(mem.topic!==topic){ mem.topic=topic; mem.depth=0; }
            else if(wantsMore){ mem.depth=Math.min(mem.depth+1,2); }
            else if(mem.topic===topic && txt.length<20){ mem.depth=Math.min(mem.depth+1,2); }
            reply = deep[topic][mem.depth];
        }
        else if(txt.includes('bei')||txt.includes('price')||txt.includes('huduma')||txt.includes('service')||txt.includes('list')||txt.includes('gharama')){
            reply=`🌐 **MBILAO PROJECT CONSULTANT WORLDWIDE**
*Popote Duniani / Worldwide - Premium but Lowest Price from $99 + Discount!*

**[SW] Karibu sana! [EN] Welcome so much!**

**HUDUMA 14 / 14 SERVICES MIN $99 + PUNGUZO / DISCOUNT:**
1. WhatsApp AI Bot $150→$135 (10% OFF)
2. Website $99→$84 MIN!
3. Automation $180→$162
4. Mentorship $99→$79 MIN!
5. M&E & Logframe $99→$84 MIN!
6. Grant Proposal $450→$405
7. Strategic Plan $300→$255
8. Feasibility $149→$119
9. Business Plan $120→$108
10. Policy $150→$127.5
11. Agrarian Climate $99→$79 MIN! - BEI YA CHINI / LOWEST!
12. Project Mgmt $250→$225
13. AI Engineer $250→$212.5
14. 🔥 AI Marketing Viral $149→$111 TRENDING! DEMAND KUBWA / HIGH DEMAND!

**[SW] Tunakusimamia hatua kwa hatua mpaka ufanikiwe.**
**[EN] We guide you step by step until you succeed.**

Niambie unahitaji gani? / Tell me which you need? Niko tayari / I'm ready 🙏🌐`;
        }
        else {
            reply=`Asante sana / Thank you so much for: "${raw.substring(0,70)}" 🙏

**[SW]** Karibu MBILAO WORLDWIDE - Wataalamu wa kimataifa USAID/EU/UN. Nimekuelewa unahitaji msaada. Niko hapa kukusikiliza kwa undani, sio jibu fupi.

**[EN]** Welcome to MBILAO WORLDWIDE - International experts USAID/EU/UN. I understand you need help. I'm here to listen deeply, not short answer.

**[SW]** Changamoto yako ni gani? Mradi, shamba, biashara, kuomba pesa?
**[EN]** What is your challenge? Project, farm, business, funding?

**[SW]** Nikijua, nitakufafanulia hatua kwa hatua + mfano + bei ya punguzo + usimamizi kamili.
**[EN]** Once I know, I'll explain step by step + real example + discount price + full support.

Niko tayari / I'm ready now 🌐`;
        }

        if(reply===mem.lastReply){
            mem.depth=Math.min(mem.depth+1,2);
            if(deep[mem.topic] && deep[mem.topic][mem.depth]) reply=deep[mem.topic][mem.depth];
        }
        mem.lastReply=reply;
        userMemory.set(from,mem);
        await sock.sendMessage(from,{text:reply});
    });
}
startBot();
app.get('/',(req,res)=>res.send('MBILAO BILINGUAL NO-REPEAT LIVE 🌐 /qr'));
app.get('/qr',(req,res)=>{
    if(!lastQR) return res.send(`<html><body style="text-align:center;padding-top:50px"><h1>MBILAO CONNECTED ✅ / Imeunganishwa<br>Refresh 5s</h1><a href="/qr">Refresh QR</a><script>setTimeout(()=>location.reload(),5000)</script></body></html>`);
    res.send(`<html><body style="text-align:center;padding-top:10px"><h1>MBILAO WORLDWIDE 🌐<br>BILINGUAL SMART BOT<br>MIN $99 + PUNGUZO / DISCOUNT</h1><img src="${lastQR}" style="width:90%;max-width:350px;border:5px solid #000"/><br><br><a href="/qr">Refresh 30s</a></body></html>`);
});
const PORT = process.env.PORT || 10000;
app.listen(PORT,()=>console.log('MBILAO BILINGUAL Live on '+PORT));
