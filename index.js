const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const express = require('express');
const app = express();
const P = require('pino');
let lastQR = null;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_mbilao_14_knowledge');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
        if(u.qr){ lastQR = await QRCode.toDataURL(u.qr); console.log('QR READY /qr'); }
        if(u.connection==='open'){ console.log('MBILAO KNOWLEDGE BOT CONNECTED ✅'); lastQR=null; }
    });

    // KNOWLEDGE BASE - ELIMU NJE YA CODE
    const knowledge = {
        evaluation: {
            sw: `📚 EVALUATION (Tathmini) ni nini?\n\nEvaluation ni mchakato wa kuchunguza kwa kina kama mradi umefikia malengo yake, umeleta matokeo gani, na kama rasilimali zimetumika vizuri.\n\nAINA ZAKE:\n✓ Baseline Evaluation - kabla ya mradi\n✓ Mid-term Evaluation - katikati ya mradi\n✓ Endline/Final Evaluation - mwisho wa mradi\n✓ Impact Evaluation - athari za muda mrefu\n\nKWANINI MUHIMU? Bila evaluation, hujui kama pesa za donor zimefanya kazi au la. Donors kama USAID wanahitaji evaluation report.\n\nAt MBILAO WORLDWIDE tunafanya evaluation kwa viwango vya kimataifa. Bei $99 → Punguzo 15% = $84. Nikusaidie?`,
            en: `📚 What is EVALUATION?\n\nEvaluation is a systematic process to examine if a project achieved its objectives, what results it brought, and if resources were used efficiently.\n\nTYPES:\n✓ Baseline - before project\n✓ Mid-term - during project\n✓ Endline/Final - at end\n✓ Impact Evaluation - long-term effects\n\nWHY IMPORTANT? Without evaluation, you don't know if donor funds worked. Donors like USAID require evaluation reports.\n\nAt MBILAO WORLDWIDE we do world-class evaluations. Price $99 → 15% OFF = $84. Need help?`
        },
        monitoring: {
            sw: `📊 MONITORING (Ufuatiliaji) ni nini?\n\nNi kufuatilia mradi kila siku/kila wiki kuhakikisha shughuli zinaenda kama ilivyopangwa. Ni kama GPS ya mradi.\n\nTofauti na Evaluation, Monitoring ni ya kila siku.\n\nVifaa: Logframe, indicators, data collection tools.\n\nMBILAO tunatengeneza M&E System kamili $99 → Punguzo 15%`,
            en: `📊 What is MONITORING?\n\nDaily/weekly tracking of project to ensure activities go as planned. Like GPS for project.\n\nUnlike Evaluation which is periodic, Monitoring is continuous.\n\nTools: Logframe, indicators, data collection.\n\nMBILAO builds full M&E System $99 → 15% OFF`
        },
        logframe: {
            sw: `📋 LOGFRAME ni nini?\n\nLogical Framework - jedwali linaloonyesha: Goal, Outcome, Output, Activities, Indicators, Means of Verification, Assumptions.\n\nNi moyo wa proposal zote za donors.\n\nBila logframe nzuri, hutapata funding.\n\nMBILAO tunatengeneza logframe $99 → Punguzo 15%`,
            en: `📋 What is LOGFRAME?\n\nLogical Framework - table showing Goal, Outcome, Output, Activities, Indicators, Means of Verification, Assumptions.\n\nIt's heart of all donor proposals. Without good logframe, no funding.\n\nMBILAO creates logframe $99 → 15% OFF`
        },
        policy: {
            sw: `Policy Analysis $150 → Punguzo 15% = $127.5\n\nTunachambua sera na kutoa mapendekezo ya kitaalamu kwa viwango vya kimataifa.`,
            en: `Policy Analysis $150 → 15% OFF = $127.5 - We analyze policies with global standards.`
        }
    };

    sock.ev.on('messages.upsert', async ({messages})=>{
        const m=messages[0]; if(!m.message||m.key.fromMe) return;
        const raw=m.message.conversation||m.message.extendedTextMessage?.text||"";
        const txt=raw.toLowerCase(); const from=m.key.remoteJid;
        const isSW=txt.includes('habari')||txt.includes('nini')||txt.includes('maana')||txt.includes('ni nini')||txt.includes('elezea');

        let reply="";

        if(txt.includes('evaluation')||txt.includes('tathmini')){
            reply = isSW? knowledge.evaluation.sw : knowledge.evaluation.en;
        } else if(txt.includes('monitoring')||txt.includes('ufuatiliaji')){
            reply = isSW? knowledge.monitoring.sw : knowledge.monitoring.en;
        } else if(txt.includes('logframe')||txt.includes('logical')){
            reply = isSW? knowledge.logframe.sw : knowledge.logframe.en;
        } else if(txt.includes('grant')||txt.includes('proposal')){
            reply = isSW? `Grant Proposal ni nyaraka ya kuomba pesa kwa donors (USAID, EU, UN). Ina: background, logframe, budget, methodology. Bila proposal nzuri hutapata pesa. MBILAO tunatengeneza $450 → Punguzo 10% = $405. Tunakuhakikishia viwango vya dunia. Nikusaidie?` : `Grant Proposal is document to request funds from donors. Includes background, logframe, budget. Without good proposal, no funds. MBILAO $450 → 10% OFF = $405`;
        } else if(txt.includes('strategic')||txt.includes('mkakati')){
            reply = isSW? `Strategic Plan ni ramani ya miaka 5 ya taasisi yako. Ina Vision, Mission, SWOT, Goals. Bila strategic plan, taasisi inatembea bila dira. MBILAO $300 → Punguzo 15% = $255. Nikupangie?` : `Strategic Plan is 5-year roadmap with Vision, Mission, SWOT, Goals. Without it, org has no direction. MBILAO $300 → 15% OFF = $255`;
        } else if(txt.includes('feasibility')||txt.includes('upembuzi')){
            reply = isSW? `Feasibility Study ni utafiti kama mradi unawezekana kiuchumi, kiteknolojia, kisheria. Bank zinahitaji hii kabla ya loan. MBILAO $149 → Punguzo 20% = $119` : `Feasibility Study checks if project is viable economically, technically, legally. Banks need it. MBILAO $149 → 20% OFF = $119`;
        } else if(txt.includes('price')||txt.includes('bei')||txt.includes('punguzo')||txt.includes('list')){
            reply = isSW?
            `🌐 HUDUMA 14 PREMIUM - BEI YA CHINI $99:\n1. WhatsApp Bot $150-10%\n2. Website $99-15% (MIN)\n3. Automation $180-10%\n4. Mentorship $99-20%\n5. M&E $99-15%\n6. Grant $450-10%\n7. Strategic $300-15%\n8. Feasibility $149-20%\n9. Business Plan $120-10%\n10. Policy $150-15%\n11. Agrarian/Environmental/Climate $99-20% (MIN)\n12. Project Planning $250-10%\n13. AI Automation Engineer $250-15%\n14. 🔥 AI Marketing Viral $149-25% [TRENDING!]\n\nAndika neno kama 'evaluation' nikueleze maana yake nje ya bei!`
            :
            `🌐 14 PREMIUM SERVICES - MIN $99:\n1. Bot $150\n2. Website $99 (MIN)\n3. Automation $180\n4. Mentorship $99\n5. M&E $99\n6. Grant $450\n7. Strategic $300\n8. Feasibility $149\n9. Business Plan $120\n10. Policy $150\n11. Agrarian $99\n12. Project $250\n13. AI Engineer $250\n14. 🔥 AI Marketing $149 [TRENDING!]\n\nType word like 'evaluation' to get explanation beyond price!`;
        } else {
            // Jibu la jumla lenye elimu
            reply = isSW?
            `Habari! Karibu MBILAO WORLDWIDE 🌐\n\nMimi si bot wa bei tu, nina elimu pia! Uliza chochote kama:\n- "evaluation ni nini?"\n- "logframe ni nini?"\n- "monitoring maana yake?"\n- "grant proposal ni nini?"\n\nNitakueleza kwa kina nje ya code, na mwisho nitakupa ofa ya huduma husika.\n\nAu andika 'bei' kuona huduma 14 zote kuanzia $99 na punguzo!\n\nAt MBILAO tunakuhudumia hatua kwa hatua. Karibu sana! 🙏`
            :
            `Hello! Welcome MBILAO WORLDWIDE 🌐\n\nI'm not just price bot, I have knowledge too! Ask anything like:\n- "what is evaluation?"\n- "what is logframe?"\n- "what is monitoring?"\n\nI'll explain deeply beyond code, plus offer service discount.\n\nOr type 'price' to see 14 services from $99 with discount!\n\nFull support guaranteed. Welcome! 🙏`;
        }

        await sock.sendMessage(from,{text:reply});
    });
}
startBot();
app.get('/',(req,res)=>res.send('MBILAO KNOWLEDGE BOT 🌐 Live - /qr'));
app.get('/qr',(req,res)=>{
    if(!lastQR) return res.send('<h1>MBILAO KNOWLEDGE Connected ✅ Refresh</h1>');
    res.send(`<html><body style="text-align:center;padding-top:15px"><h1>MBILAO WORLDWIDE KNOWLEDGE BOT 🌐<br>Anajibu Nje ya Code<br>Scan 0795804621</h1><img src="${lastQR}" width="330"/></body></html>`);
});
app.listen(10000,()=>console.log('MBILAO KNOWLEDGE Live - /qr'));
