const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');
let lastQR = null;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_final_99');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
        if(u.qr){ lastQR = await QRCode.toDataURL(u.qr); console.log('QR READY /qr'); }
        if(u.connection==='open'){ console.log('MBILAO WORLDWIDE CONNECTED ✅'); lastQR=null; }
    });

    const knowledge = {
        evaluation: {
            sw: `📚 EVALUATION (Tathmini) ni nini?\n\nEvaluation ni mchakato wa kuchunguza kwa kina kama mradi umefikia malengo yake, matokeo gani, na rasilimali zimetumika vizuri.\n\nAINA:\n✓ Baseline - kabla ya mradi\n✓ Mid-term - katikati\n✓ Endline/Final - mwisho\n✓ Impact - athari za muda mrefu\n\nKWANINI MUHIMU? Bila evaluation hujui kama pesa za donor zimefanya kazi. USAID wanahitaji report hii.\n\nAt MBILAO tunafanya evaluation ya kimataifa. Bei $99 → Punguzo 15% = $84. Nikusaidie?`,
            en: `📚 What is EVALUATION?\n\nSystematic process to examine if project achieved objectives, results, and efficient resource use.\n\nTYPES: Baseline, Mid-term, Endline, Impact\n\nWHY? Without it you don't know if donor funds worked. USAID requires it.\n\nMBILAO world-class evaluation $99 → 15% OFF = $84. Need help?`
        },
        monitoring: {
            sw: `📊 MONITORING (Ufuatiliaji) ni nini?\n\nKufuatilia mradi kila siku/ wiki kuhakikisha shughuli zinaenda kama ilivyopangwa. Ni kama GPS ya mradi.\n\nMonitoring ni kila siku, Evaluation ni kwa vipindi.\n\nVifaa: Logframe, indicators, data collection.\n\nMBILAO M&E System kamili $99 → Punguzo 15% = $84`,
            en: `📊 MONITORING - Daily/weekly tracking of project. Like GPS. Continuous vs Evaluation periodic. Tools: Logframe, indicators. MBILAO $99 → 15% OFF = $84`
        },
        logframe: {
            sw: `📋 LOGFRAME ni nini?\n\nLogical Framework - jedwali: Goal, Outcome, Output, Activities, Indicators, Means of Verification, Assumptions.\n\nMoyo wa proposal zote. Bila logframe nzuri hutapata funding.\n\nMBILAO tunatengeneza $99 → Punguzo 15% = $84`,
            en: `📋 LOGFRAME - Table: Goal, Outcome, Output, Activities, Indicators, Means of Verification, Assumptions. Heart of proposals. Without it no funding. MBILAO $99 → 15% OFF`
        }
    };

    sock.ev.on('messages.upsert', async ({messages})=>{
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const raw=m.message.conversation||m.message.extendedTextMessage?.text||"";
        const txt=raw.toLowerCase(); const from=m.key.remoteJid;
        const isSW=txt.includes('habari')||txt.includes('nini')||txt.includes('maana')||txt.includes('bei')||txt.includes('ni nini');

        let reply="";
        if(txt.includes('evaluation')||txt.includes('tathmini')) reply=isSW?knowledge.evaluation.sw:knowledge.evaluation.en;
        else if(txt.includes('monitoring')||txt.includes('ufuatiliaji')) reply=isSW?knowledge.monitoring.sw:knowledge.monitoring.en;
        else if(txt.includes('logframe')||txt.includes('logical')) reply=isSW?knowledge.logframe.sw:knowledge.logframe.en;
        else if(txt.includes('grant')||txt.includes('proposal')) reply=isSW?`Grant Proposal ni kuomba pesa USAID/EU/UN. Ina background, logframe, budget. Bila nzuri hutapata pesa. MBILAO $450 → 10% = $405. Nikusaidie?`:`Grant Proposal to request funds from donors. Needs good proposal. MBILAO $450 → 10% OFF = $405`;
        else if(txt.includes('strategic')||txt.includes('mkakati')) reply=isSW?`Strategic Plan ramani ya miaka 5: Vision, Mission, SWOT, Goals. Bila dira taasisi inapotea. MBILAO $300 → 15% = $255`:`Strategic Plan 5-year roadmap Vision Mission SWOT Goals. MBILAO $300 → 15% OFF = $255`;
        else if(txt.includes('feasibility')) reply=isSW?`Feasibility Study utafiti kama mradi unawezekana kiuchumi, kiteknolojia. Bank zinahitaji. MBILAO $149 → 20% = $119`:`Feasibility checks viability. Banks need it. MBILAO $149 → 20% OFF = $119`;
        else if(txt.includes('agrar')||txt.includes('agri')||txt.includes('climate')||txt.includes('mazingira')||txt.includes('shamba')) reply=isSW?`🌾 Agrarian, Environmental & Climate Smart - $99 → Punguzo 20% = $79 (BEI YA CHINI!)\n\nBila kilimo smart mazao -70%. Tunakupa mbinu za UN, +200% mavuno, funding ya climate. At MBILAO tunakusimamia hatua kwa hatua. Tuanze lini? 🌱`:`🌾 Agrarian Environmental Climate Smart $99 → 20% OFF = $79 MINIMUM! Without smart farming -70% yield. UN methods +200% yield. MBILAO full support 🌱`;
        else if(txt.includes('market')||txt.includes('brand')||txt.includes('viral')) reply=isSW?`🔥 TRENDING #1 AI Digital Marketing & Viral - $149 → Punguzo 25% = $111! AI viral videos daily, brand WORLDWIDE, sales +500%. Bila hii biashara nyuma. MBILAO tunakufanya BRAND kubwa! 🚀`:`🔥 TRENDING #1 AI Digital Marketing & Viral $149 → 25% OFF = $111! AI viral daily, WORLDWIDE brand, +500% sales. MBILAO makes you BIG BRAND! 🚀`;
        else if(txt.includes('price')||txt.includes('bei')||txt.includes('list')||txt.includes('punguzo')||txt.includes('huduma')){
            reply=`🌐 MBILAO PROJECT CONSULTANT WORLDWIDE - HUDUMA 14 PREMIUM BEI CHINI $99 + PUNGUZO:

1. WhatsApp AI Bot 24/7 - $150 → 10% = $135
2. Professional Website - $99 → 15% = $84 (MIN $99!)
3. Business Automation - $180 → 10% = $162
4. 1-on-1 Mentorship - $99 → 20% = $79 (MIN!)
5. M&E System & Logframe - $99 → 15% = $84 (MIN!)
6. Grant Proposal (USAID/EU/UN) - $450 → 10% = $405
7. Strategic Plan - $300 → 15% = $255
8. Feasibility Study - $149 → 20% = $119
9. Bankable Business Plan - $120 → 10% = $108
10. Policy Analysis - $150 → 15% = $127.5
11. Agrarian/Environmental/Climate Smart - $99 → 20% = $79 (MIN!)
12. Project Planning & Management - $250 → 10% = $225
13. AI Automation ENGINEER - $250 → 15% = $212.5
14. 🔥 TRENDING AI Marketing Viral - $149 → 25% = $111 [DEMAND KUBWA!]

💎 BEI YA CHINI KABISA NI $99 - ZOTE PREMIUM!

Andika kama 'evaluation ni nini?' nikueleze nje ya bei! At MBILAO tunakuhudumia hatua kwa hatua. Karibu sana! 🙏🌐`;
        } else {
            reply=`Habari! Karibu MBILAO WORLDWIDE 🌐\n\nMimi nina elimu nje ya bei! Uliza:\n- evaluation ni nini?\n- logframe ni nini?\n- monitoring maana?\n- grant proposal?\n\nAu andika 'bei' kuona huduma 14 kuanzia $99 na punguzo!\n\nAt MBILAO tunakuhudumia popote duniani hatua kwa hatua. Karibu! 🙏`;
        }
        await sock.sendMessage(from,{text:reply});
    });
}
startBot();
app.get('/',(req,res)=>res.send('MBILAO WORLDWIDE PREMIUM $99 MIN KNOWLEDGE BOT 🌐 Live - /qr'));
app.get('/qr',(req,res)=>{
    if(!lastQR) return res.send('<html><body style="text-align:center;padding-top:50px"><h1>MBILAO CONNECTED ✅ Au Refresh 10s QR</h1><a href="/qr">Refresh QR</a></body></html>');
    res.send(`<html><body style="text-align:center;padding-top:15px"><h1>MBILAO WORLDWIDE 🌐<br>14 HUDUMA PREMIUM MIN $99<br>KNOWLEDGE BOT + PUNGUZO<br>Scan 0795804621</h1><img src="${lastQR}" style="width:90%;max-width:350px;border:5px solid #000"/><br><br><a href="/qr" style="font-size:22px">Refresh kama ime-expire</a></body></html>`);
});
const PORT = process.env.PORT || 10000;
app.listen(PORT,()=>console.log('MBILAO KNOWLEDGE Live on '+PORT+' - /qr'));
