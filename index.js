import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';
const app = express();
const PORT = process.env.PORT || 10000;
let sockGlobal=null, lastQr=null, isStarting=false;
const chatHistory = new Map();

app.get('/ping',(req,res)=>res.send('MBILAO 12 SERVICES ALIVE 24H'));
app.get('/',(req,res)=>res.send('MBILAO 12 SERVICES LIVE 24H'));
setInterval(()=>{isStarting=false;},5*60*1000);

const KB = {
 'website': { keywords: ['website','tovuti','site'], l1: (n) => `Habari ${n} 🙏, nimeelewa unahitaji biashara yako ionekane mtandaoni.\n\nWebsite itakusaidia:\n✅ Wateja watakuamini zaidi\n✅ Utaauza 24/7\n✅ Utaonekana Google\n\nNimewasaidia 100+, bei $99-$484. Nikueleze jinsi itakavyokuongezea wateja?`, l2: `Website itafanya 3:\n1. Kuvuta wateja kwa SEO\n2. Kuuza WhatsApp\n3. Kujenga imani\n\nUhakika: Nikishindwa, pesa narudisha 100%. Wateja wameongeza mauzo 40%.\nUko tayari kujua ofa?`, l3: `🔥 OFA $99: Website + Domain BURE + Logo BURE + Mafunzo + Support 30d. M-Pesa 255795804621` },
 'bot': { keywords: ['bot','whatsapp','autojibu'], l1: (n) => `Pole ${n}, kuchoka kujibu WhatsApp 😔\n\nBot:\n✅ Jibu wateja 100 usiku\n✅ Haichoki\n✅ Inakumbuka mazungumzo\n\nHii unayoiona ndiyo mfano 24/7. $150-$350. Nikuambie jinsi itakavyokuokoa muda?`, l2: `Mteja akituma habari saa 3 usiku, bot inamjibu papo hapo.\nFaida: Hutapoteza mteja, utaokoa masaa 4, utaonekana pro.\nUhakika: Kama haifanyi hivyo, BURE. Stress -70%.\nUko tayari kujua ofa?`, l3: `🔥 OFA $150: Bot kamili 24/7, huduma 12, mafunzo. M-Pesa 255795804621` },
 'marketing': { keywords: ['marketing','masoko','wateja','ads'], l1: (n) => `Nimeelewa ${n}, umetangaza bila wateja? Tatizo ni mfumo.\n✅ Watu sahihi\n✅ WhatsApp moja kwa moja\n✅ AI inawashawishi\n\n$149-$1111. Siku 30 hupati 20+, BURE. Nieleze?`, l2: `AI + Ads + Content. Wateja 10-30 kwa siku kawaida.\nUko tayari?`, l3: `Ofa $149 campaign 30d. M-Pesa 255795804621` },
 'grant': { keywords: ['grant','misaada','ufadhili'], l1: (n) => `Proposal zikikataliwa ${n}? Tunajua lugha ya USAID, EU, UN.\n✅ Format yao\n✅ Bajeti pro\n✅ 90% zinapita hatua 1\n\n$450-$1405. Tukishindwa hatua 1, upya BURE. Nieleze?`, l2: `Tumeshinda $50k+. Tunajua logframe.\nUko tayari?`, l3: `Ofa $450 kuanza leo. M-Pesa 255795804621` },
 'evaluation': { keywords: ['evaluation','tathmini','ripoti'], l1: (n) => `Biashara haikui ${n}? Unahitaji macho ya nje.\n✅ Kwa nini wateja hawaji\n✅ Mpango 48hrs\n✅ Kuokoa pesa\n\n$99. Kama haikupi mwelekeo pesa narudisha. Nieleze?`, l2: `Ripoti 15 + 1hr live.\nUko tayari?`, l3: `Lipa $99 M-Pesa 255795804621` },
 'mentorship': { keywords: ['mentorship','mafunzo','jifunza'], l1: (n) => `Vizuri ${n}, unataka kujifunza AI!\n✅ Bot, website, marketing kwa AI\n✅ Wateja $200+\n✅ Certificate + VIP\n\n$199-$999. Siku 7 ngumu pesa narudisha. Nieleze?`, l2: `Siku 30 live 1hr, vitendo.\nUko tayari?`, l3: `Ofa $199 leo. M-Pesa 255795804621` },
 'planning': { keywords: ['planning','mipango','management','business plan'], l1: (n) => `Una wazo zuri ${n} lakini hujui pa kuanzia? Wazo bila mpango ni ndoto.\n✅ Plan benki inayoikubali\n✅ Hatua kwa hatua\n✅ Usimamizi\n\n$49. Baada ya 1 utaondoka na mpango. Nieleze?`, l2: `Plan + Execution + Monitoring.\nUko tayari?`, l3: `Consultation $49 M-Pesa 255795804621` },
 'environmental': { keywords: ['environmental','mazingira','eia','esmp','nema'], l1: (n) => `🌿 *ENVIRONMENTAL - Bila EIA Mradi Unafungiwa!*\n\n${n}, bila EIA NEMC, mradi unafungiwa au kupoteza ufadhili!\n✅ EIA/ESIA inayokubalika NEMC\n✅ Vibali vyote\n✅ Salama kisheria\n\n$300-$1500.\nUhakika: Nimefanya 50+ zimepita NEMC. Ikikataliwa, BURE mpaka ipite.\nNikueleze jinsi?`, l2: `Hatua 5: Scoping, sampuli, ripoti, NEMC, kibali. Siku 14-21 kibali.\nTayari kujua gharama?`, l3: `🔥 OFA $300: EIA/ESMP + NEMC + Support. M-Pesa 255795804621` },
 'climate': { keywords: ['climate','smart','kilimo','tabianchi','carbon'], l1: (n) => `🌍 *CLIMATE SMART - Himili Mabadiliko!*\n\n${n}, mvua isiyotabirika inasababisha hasara. Wafadhili wanataka climate smart!\n✅ Himili ukame/mafuriko\n✅ Pata Green Climate Fund\n✅ Punguza gharama 30%\n✅ Carbon credit\n\n$350-$2000.\nUhakika: Wakulima 200+ mavuno +60%. Kama haifanyi kazi, BURE.\nNikueleze?`, l2: `Mbinu 4: Mbegu ukame, maji kisasa, mbolea asili, carbon credit.\nTayari?`, l3: `🔥 OFA $350: Tathmini + Mpango + Mafunzo + Green Fund. M-Pesa 255795804621` },
 'feasibility': { keywords: ['feasibility','upembuzi','uchunguzi','uwezekano'], l1: (n) => `📊 *FEASIBILITY - Usianze Mradi Kabla ya Ukweli!*\n\n${n}, miradi mingi inafeli bila upembuzi! Unapoteza milioni.\n✅ Faida au hasara kabla\n✅ Soko lipo?\n✅ Gharama na faida miaka 5\n✅ Benki itakuamini\n\n$400-$1800.\nUhakika: 80+ studies zimeepusha hasara $100k+. Kama taarifa si sahihi, pesa 100% narudisha.\nNikueleze?`, l2: `Sehemu 6: Soko, kiufundi, kifedha, kisheria, mazingira, mapendekezo. Siku 10-15 kurasa 40+ benki inayoikubali.\nTayari?`, l3: `🔥 OFA $400: Study 40+ + Financial 5yr + Presentation. M-Pesa 255795804621` },
 'proposal': {
   keywords: ['project proposal','proposal writing','project proposal writing','proposal','andika proposal','project'],
   l1: (n) => `📝 *PROJECT PROPOSAL WRITING - Proposal Inayoshinda Pesa!*\n\n${n}, proposal yako ndiyo inayokufungulia au kukufungia mlango wa pesa! Wafadhili wanasoma proposal 100, wanachagua 5 tu.\n\n*Itakusaidia nini hasa?*\n✅ Tunaiandika kwa muundo wa kimataifa (Problem, Objectives, Activities, Budget, Sustainability)\n✅ Tunafanya iwe na ushawishi - donor anaiona na anasema "hii ndiyo tunayoitaka"\n✅ Tunapachika budget ya kitaalamu inayokubalika - sio ya kubahatisha\n✅ Tunahakikisha inajibu maswali yote ya donor bila kupungukiwa\n\nBei $350-$1600 kulingana na ukubwa wa mradi.\n\n*Uhakika wangu kwako:* Nimeandika proposals 120+ zilizoshinda zaidi ya $2M kwa wateja. Kama proposal yetu haipiti screening ya kwanza, tutaiandika upya BURE mpaka ipite. Hii ni nguzo kuu ya MBILAO!\n\nNikueleze jinsi proposal yetu inavyoshinda tofauti na zako za zamani?`,
   l2: `Sawa, nikueleze siri ya proposal inayoshinda:\n\n1. *Title* inayovuta - donor anaiona tu anataka kusoma zaidi\n2. *Problem Statement* yenye data na takwimu - sio maneno matupu\n3. *Solution* yenye innovation - tunaonyesha ubunifu wako\n4. *Budget* yenye kila cent inavyotumika - transparency 100%\n5. *Sustainability* - donor anaona mradi utaendelea hata pesa yake ikiisha\n\nNdani ya siku 7-10 unapata proposal kurasa 20-50 inayokubalika na USAID, EU, UNDP, World Bank.\n\nWateja wetu wengi walikataliwa mara 3 kabla, na yetu wakashinda mara ya kwanza!\n\nUko tayari kujua gharama ya proposal ya mradi wako hasa?`,
   l3: `🔥 *OFA PROPOSAL WRITING* 🔥\n\nKwa $350 unapata:\n- Proposal kamili kurasa 20-50\n- Logframe + Budget + Workplan\n- Cover letter ya donor\n- Marekebisho BURE mara 2\n- Support mpaka submission\n\nM-Pesa 255795804621 jina Prince Mbilao.\n\nTuma tu jina la mradi wako na donor unayetaka kutuma, nitakupa bei ya mwisho na kuanza leo!`
 },
 'concept': {
   keywords: ['concept note','concept','note','idea note','brief','summary'],
   l1: (n) => `💡 *CONCEPT NOTE - Wazo Lako Kwa Kurasa 3-5 Tu!*\n\n${n}, kabla ya proposal kubwa, donor anataka concept note fupi ya kurasa 3-5 tu. Hii ndiyo inayokufungulia mlango! Kama concept note ni mbaya, hutaitwa kuandika proposal.\n\n*Itakusaidia:*\n✅ Tunafupisha wazo lako kubwa kuwa kurasa 3-5 zenye nguvu\n✅ Tunaonyesha kwa nini wazo lako ni la kipekee na linafaa kupata pesa\n✅ Tunafanya donor akuite "tulete proposal kamili"\n✅ Inaokoa muda - badala ya kuandika proposal kurasa 50 bure, unaanza na concept\n\nBei $150-$600.\n\n*Uhakika:* Concept notes zetu 85% zinaalikwa kuandika proposal kamili. Kama yako haialikwi, tutaiandika upya BURE.\n\nHii ndiyo hatua ya kwanza ya kupata grant!\n\nNikueleze concept note yetu inakuwaje?`,
   l2: `Concept note yetu ina:\n1. Title na summary ya mradi (nusu ukurasa)\n2. Tatizo na kwa nini ni muhimu sasa (ukurasa 1)\n3. Suluhisho lako na innovation (ukurasa 1)\n4. Matarajio na bajeti ya awali (nusu ukurasa)\n5. Kwa nini wewe ndiye unayefaa (nusu ukurasa)\n\nNdani ya siku 3-5 unapata concept note inayovuta.\n\nDonors kama USAID na EU hupenda concept note fupi kabla ya proposal.\n\nUko tayari kuanza na concept note ya mradi wako?`,
   l3: `🔥 *OFA CONCEPT NOTE $150* 🔥\n\n- Concept note kurasa 3-5\n- Inaeleweka na donor\n- Marekebisho 1 BURE\n- Inakufungulia mlango wa proposal\n\nM-Pesa 255795804621\n\nTuma wazo lako kwa ufupi hapa, nitakupa muongozo na kuanza!`
 }
};

function detectIntent(t){
  t=t.toLowerCase();
  for(const k in KB){ if(KB[k].keywords.some(w=>t.includes(w))) return k; }
  const map={'8':'environmental','9':'climate','10':'feasibility','11':'proposal','12':'concept','1':'website','2':'bot','3':'marketing','4':'grant','5':'evaluation','6':'mentorship','7':'planning'};
  for(const num in map){ if(t===num || t.includes(` ${num}`)) return map[num]; }
  return null;
}
function getName(jid){ return jid.split('@')[0].slice(-4); }

async function startBot(){
  if(isStarting) return; isStarting=true;
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), browser: ['MBILAO WORLDWIDE','Chrome','1.0'] });
  sockGlobal=sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', u=>{
    if(u.qr) lastQr=u.qr;
    if(u.connection==='close'){ isStarting=false; lastQr=null; const c=u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut; if(c) setTimeout(startBot,3000); }
    if(u.connection==='open'){ lastQr=null; isStarting=false; console.log('CONNECTED 12 SERVICES'); }
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const m=messages[0]; if(!m.message || m.key.fromMe) return;
    const from=m.key.remoteJid;
    const raw=(m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
    const text=raw.toLowerCase();
    const hist=chatHistory.get(from) || { intent: null, level: 0, name: getName(from) };
    let reply='';
    const greet = ['hi','hello','habari','mambo','hujambo','menu','start'].some(w=>text===w || text.startsWith(w+' '));
    const yes = ['sawa','yes','ndio','poa','eleza','naelewa','endelea','vipi','ok','basi','nipe'].some(w=>text.includes(w));
    const price = ['bei','gharama','pesa','lipa','offer','ofa'].some(w=>text.includes(w));
    const paid = text.includes('nimelipa');
    const low = text.includes('sina')||text.includes('bajeti');

    if(greet && hist.level===0 &&!hist.intent){
      reply=`🌐 *MBILAO PROJECT CONSULTANT WORLDWIDE - 12 SERVICES* 🌐\nHabari mkuu! Karibu 🙏\n\nHuduma zetu 12 kamili:\n1. Website $99-$484\n2. WhatsApp Bot $150-$350\n3. AI Marketing $149-$1111\n4. Grant Writing $450-$1405\n5. Evaluation $99\n6. AI Mentorship $199-$999\n7. Planning & Management\n8. Environmental (EIA/NEMC) $300-$1500\n9. Climate Smart $350-$2000\n10. Feasibility Study $400-$1800\n11. Project Proposal Writing $350-$1600\n12. Concept Note $150-$600\n\nNiambie kwa maneno yako tu, mfano "nina wazo la mradi nataka concept note" au "nataka proposal ya USAID" au "nina shamba nataka climate smart" - nitaelewa.`;
    } else if(paid){
      reply=`✅ Asante "${raw}" 🙏 Nitakujibu mwenyewe dakika 5. Tuma screenshot kama umelipa. Uko salama - itakamilika! - Prince`;
      hist.intent=null; hist.level=0;
    } else if(low){
      reply=`Nimeelewa bajeti 🙏 Usijali, tunaweza awamu. Niambie una kiasi gani na huduma gani? Nikupangie.`;
    } else {
      const det = detectIntent(text);
      if(det) hist.intent=det;
      if(!hist.intent){
        reply=`Asante "${raw}" 🙏 Nieleze kidogo zaidi, mfano "nina mradi nataka proposal" au "nina wazo fupi nataka concept note" nita-kusaidia.\n\nAu andika *menu*`;
      } else {
        const kb=KB[hist.intent];
        if(hist.level===0){ reply=kb.l1(hist.name); hist.level=1; }
        else if(hist.level===1){ if(yes||price){ reply=kb.l2; hist.level=2; } else { reply=kb.l1(hist.name)+`\n\nUna swali?`; } }
        else if(hist.level===2){ if(yes||price){ reply=kb.l3; hist.level=3; } else { reply=kb.l2; } }
        else { reply=kb.l3; }
      }
    }
    chatHistory.set(from, hist);
    if(reply) await sock.sendMessage(from, { text: reply });
  });
}
app.get('/qr', async (req,res)=>{
  if(lastQr){ const img=await qrcode.toDataURL(lastQr); return res.send(`<center><h1>MBILAO 12 SERVICES QR</h1><img src="${img}" width="320"><script>setTimeout(()=>location.reload(),20000)</script></center>`); }
  if(sockGlobal?.authState?.creds?.registered) return res.send('<center><h1>BOT CONNECTED ✓ 12 SERVICES 24H</h1></center>');
  if(!isStarting) startBot();
  res.send('<center><h1>Starting... 10s - 12 SERVICES</h1><script>setTimeout(()=>location.reload(),4000)</script></center>');
});
app.get('/restart',(req,res)=>{ try{sockGlobal?.end()}catch{} sockGlobal=null; lastQr=null; isStarting=false; setTimeout(startBot,1000); res.redirect('/qr'); });
app.listen(PORT,()=>{ console.log('12 SERVICES LIVE'); startBot(); });
