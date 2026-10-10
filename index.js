const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = '';

// FUNCTION YA PUNGUZO 5%
function punguzo(priceStr) {
  if (priceStr.toLowerCase().includes('quote')) return { old: priceStr, new: "Punguzo maalum leo", disc: "5% OFF" };
  let num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  let currency = priceStr.includes('$') ? '$' : 'TZS';
  let newPrice = num * 0.95;
  if (currency === '$') return { old: priceStr, new: `$${newPrice.toFixed(0)}`, disc: "5% OFF leo!" };
  else return { old: priceStr, new: `${newPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} TZS`, disc: "5% Punguzo leo!" };
}

const SERVICES = {
  1: { name: "Project Monitoring & Evaluation Worldwide", price: "Custom Quote", 
    sw: "Hii ni huduma muhimu sana kwa NGO na mashirika makubwa. Tunafuatilia mradi wako ukiwa popote duniani - Arusha, Nairobi, hata London. Tunakupa ripoti ya kila wiki, picha, na ushauri wa kitaalamu ili donor asikukatalie pesa. Bila M&E, donor anakataa kutoa pesa ya awamu ya pili. Sisi ndio tunakuhakikishia pesa inaendelea kuingia.",
    en: "This is very crucial for NGOs and big organizations. We monitor your project anywhere in the world - Arusha, Nairobi, even London. We give weekly reports, photos, and professional advice so donor doesn't reject second phase money. Without M&E, donor stops funding. We guarantee your funding continues." },
  2: { name: "Grant Application", price: "$450", 
    sw: "Grant $450 ndio soko kubwa duniani. Tatizo la wengi proposal inakataliwa kwa sababu ya lugha mbovu. Sisi tunaandika kwa kiingereza sanifu cha donor, tunaweka Budget ya kina na Logframe inayokubalika. Wateja wetu 12 wameshinda Grant za USAID, EU, Global Fund kuanzia $10,000 hadi $100,000. Ukiwekeza $450 leo, unarudisha $10k baada ya miezi 2. Hii ndio uwekezaji bora.",
    en: "Grant $450 is biggest market worldwide. Many proposals rejected because of poor language. We write in donor professional English, with detailed Budget and acceptable Logframe. Our 12 clients won Grants from USAID, EU, Global Fund from $10k to $100k. Invest $450 today, get back $10k after 2 months. Best investment." },
  3: { name: "Project Planning & Management", price: "$300", 
    sw: "Hii ni msingi wa mradi. Bila Workplan na Gantt Chart, mradi wako utachelewa na utapoteza pesa. Sisi tunakupangia kila kitu - nani afanye nini, lini, na pesa ngapi. Unapata file la Excel na PDF tayari kupeleka kwa donor. Donor akiona hii anasema 'huyu ni professional'.",
    en: "This is foundation of project. Without Workplan and Gantt Chart, your project delays and loses money. We plan everything - who does what, when, and how much money. You get Excel and PDF file ready for donor. Donor sees this and says 'this one is professional'." },
  4: { name: "Feasibility Study", price: "$57", 
    sw: "Kwa $57 tu unajiepusha na hasara ya mamilioni. Watu wengi wanaanzisha miradi bila utafiti na wanafilisika. Sisi tunakuchambulia soko, gharama, washindani na faida. Ripoti yetu ya pages 15 inakuambia ukweli - kama mradi unafaa au la. Hii ndio busara kabla ya kutumia $300 ya Planning.",
    en: "For only $57 you avoid millions loss. Many start projects without research and go bankrupt. We analyze market, cost, competitors and profit. Our 15 pages report tells truth - if project viable or not. This is wisdom before spending $300 for Planning." },
  5: { name: "Business Plan Preparation", price: "$120", 
    sw: "Business Plan yetu sio ya copy-paste ya chuo. Hii ni ya benki. Tunaweka Executive Summary inayovutia, Market Analysis halisi ya TZ, na hesabu za Cashflow ya miezi 12 na Profit ya miaka 3. Meneja wa benki akiona anapitisha mkopo haraka. Wateja wetu 20 wamepata mkopo CRDB, NMB, NBC kwa hii plan.",
    en: "Our Business Plan not college copy-paste. This is for bank. We put attractive Executive Summary, real Market Analysis for TZ, and 12 months Cashflow and 3 years Profit calculations. Bank manager sees and approves loan fast. Our 20 clients got loan CRDB, NMB, NBC with this plan." },
  6: { name: "Tender / Zabuni Application", price: "80,000 TZS", 
    sw: "Soko KALI sana TZ! Kila siku Serikali inatoa zabuni NeST. Shida watu wanashindwa kujaza. Sisi tunaandika Company Profile ya kisasa, na tunajaza NeST kwa usahihi. Wateja 8 wameshinda tenda za 50M hadi 200M. Ukiwekeza 80k leo, kesho unaweza kushinda 20M. Huu ndio mchezo wa pesa TZ.",
    en: "Very HOT market TZ! Every day Government posts tenders on NeST. Problem people fail to fill. We write modern Company Profile and fill NeST correctly. 8 clients won tenders 50M to 200M. Invest 80k today, tomorrow you can win 20M. This is money game in TZ." },
  7: { name: "Project Proposal Writing", price: "$150", 
    sw: "Hii ndio kila NGO inatafuta! Proposal mbovu = hakuna pesa. Sisi tunaandika Proposal ya kilimo, afya, elimu kwa lugha ya donor. Sio Kiswahili kilichotafsiriwa. Tunaweka Background, Problem Statement, Objectives zenye nguvu. Proposal yetu inapita 90%.",
    en: "This is what every NGO looks for! Poor Proposal = no money. We write Proposal for agriculture, health, education in donor language. Not translated Swahili. We put Background, Problem Statement, powerful Objectives. Our proposal passes 90%." },
  8: { name: "Logical Framework & Theory of Change", price: "$80", 
    sw: "Donor akisema 'tuletee Logframe' watu wengi wanakwama. Hii ndio inafanya Grant ikataliwe. Sisi ni mafundi wa Logframe - tunachora Goal, Outcome, Output, Activity na Indicators zinazopimika. Bila hii, usitarajie kupata pesa yoyote kutoka EU au USAID.",
    en: "When donor says 'bring Logframe' many get stuck. This makes Grant rejected. We are experts of Logframe - we draw Goal, Outcome, Output, Activity and measurable Indicators. Without this, don't expect any money from EU or USAID." },
  9: { name: "Project Budget & Donor Reporting", price: "$100", 
    sw: "NGO nyingi zinapata pesa lakini zinashindwa kuripoti matumizi na donor anachukua pesa. Sisi tunatengeneza Budget kwa format ya EU/USAID na Financial Report inayokubalika. Hii inakufanya uonekane mwaminifu na donor anakupa pesa tena na tena. Soko la kudumu.",
    en: "Many NGOs get money but fail to report expenditure and donor takes money back. We make Budget in EU/USAID format and acceptable Financial Report. This makes you look trustworthy and donor gives you money again and again. Permanent market." }
};

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox','--disable-setuid-sandbox'] }
});

client.on('qr', async (qr) => { qrCodeData = await qrcode.toDataURL(qr); console.log('QR READY'); });
client.on('ready', () => console.log('LM TZ PROJECT 9 LIVE - NO GROUP'));

client.on('message', async msg => {
  try {
    // === ULINZI KAMILI - ISIJIBU GROUPS, STATUS, BROADCAST ===
    if (msg.fromMe) return;
    if (msg.isStatus) return;
    if (msg.from.endsWith('@g.us')) return;
    if (msg.from.endsWith('@broadcast')) return;
    if (msg.from.endsWith('@newsletter')) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;
    // === MWISHO WA ULINZI ===

    const bodyRaw = msg.body || "";
    const body = bodyRaw.toLowerCase().trim();
    if (!body) return;
    const isSw = ['habari','mambo','bei','naomba','huduma','asante','vipi','poa','mkuu','sawa','shikamoo','nipo','zabuni','tenda','mkopo','punguzo'].some(w=>body.includes(w));

    function jibuHuduma(n) {
      let s = SERVICES[n];
      if (!s) return null;
      let p = punguzo(s.price);
      let langText = isSw ? s.sw : s.en;
      if (isSw) {
        return `🔥 *${n}. ${s.name}* 🔥\n\n*Bei ya kawaida: ${p.old}*\n*Leo kwa wewe: ${p.new}* - ${p.disc}\n\n${langText}\n\n💡 *Kwa nini unipe leo na sio kesho?*\n1. Leo kuna punguzo la 5% - kesho linaisha saa 6 usiku\n2. Niko online sasa hivi, nikianza leo kesho unapata draft\n3. Wateja wengine 3 wameulizia leo, nafasi inajaa\n\nUnataka niweke nafasi yako?\n\nLipa: *0795804621* (M-Pesa/Tigo) au PayPal kwa $\nKisha tuma screenshot + *NUNUA ${n}*\n\nAu niulize swali lolote kuhusu hii, niko hapa kukuelekeza kama binadamu.`;
      } else {
        return `🔥 *${n}. ${s.name}* 🔥\n\n*Normal Price: ${p.old}*\n*Today for you: ${p.new}* - ${p.disc}\n\n${langText}\n\n💡 *Why give me today not tomorrow?*\n1. Today 5% discount - tomorrow ends 6pm\n2. I am online now, if I start today tomorrow you get draft\n3. Other 3 clients asked today, slots filling\n\nShall I reserve your slot?\n\nPay: *0795804621* (M-Pesa/Tigo) or PayPal for $\nThen send screenshot + *BUY ${n}*\n\nOr ask any question, I'm here to guide like human.`;
      }
    }

    if (body.length < 7 || ['hi','hello','habari','mambo','hey','poa','hujambo','salam'].some(w=>body===w || body.startsWith(w+' '))) {
      return await chat.sendMessage(isSw?
`Karibu sana! 🙏 Mimi ni *LM TZ - Project Consultant Worldwide*

Mimi sio bot ya MENU tu, naongea na wewe kama binadamu na kukushauri hadi uelewe.

Leo nina *punguzo la 5%* kwa huduma zote 9 za PROJECT!

🌍 *HUDUMA 9:*
1 Monitoring & Evaluation Worldwide
2 Grant Application - $450
3 Planning & Management - $300
4 Feasibility - $57
5 Business Plan - $120
6 Tender/Zabuni - 80k
7 Proposal Writing - $150
8 Logframe & ToC - $80
9 Budget & Reporting - $100

Niambie, mradi wako ni wa nini? Kilimo? Afya? Elimu? NGO? Au unatafuta Grant?

Niambie kwa maneno yako tu, sio namba, nikuchagulie huduma itakayokupatia pesa haraka.`
:
`Welcome! 🙏 I am *LM TZ - Project Consultant Worldwide*

I am not just MENU bot, I talk like human and advise till you understand.

Today I have *5% discount* for all 9 PROJECT services!

🌍 *9 SERVICES:*
1 Monitoring Worldwide
2 Grant $450
3 Planning $300
4 Feasibility $57
5 Business Plan $120
6 Tender 80k
7 Proposal $150
8 Logframe & ToC $80
9 Budget & Reporting $100

Tell me, what is your project about? Agriculture? Health? Education? NGO? Or looking for Grant?

Tell me in your own words, not number, I choose service that will bring you money fast.`);
    }

    let numMatch = body.match(/\b([1-9])\b/);
    if (numMatch) {
      let resp = jibuHuduma(numMatch[0]);
      if (resp) return await chat.sendMessage(resp);
    }

    if (body.includes('grant') || body.includes('fadhili')) return await chat.sendMessage(jibuHuduma(2));
    if (body.includes('proposal')) return await chat.sendMessage(jibuHuduma(7));
    if (body.includes('logframe') || body.includes('theory')) return await chat.sendMessage(jibuHuduma(8));
    if (body.includes('budget') || body.includes('reporting') || body.includes('ripoti')) return await chat.sendMessage(jibuHuduma(9));
    if (body.includes('feasibility') || body.includes('upembuzi')) return await chat.sendMessage(jibuHuduma(4));
    if (body.includes('business plan') || (body.includes('business') && body.includes('plan'))) return await chat.sendMessage(jibuHuduma(5));
    if (body.includes('tender') || body.includes('zabuni') || body.includes('tenda') || body.includes('nest')) return await chat.sendMessage(jibuHuduma(6));
    if (body.includes('monitor') || body.includes('evaluation') || body.includes('tathmini')) return await chat.sendMessage(jibuHuduma(1));
    if (body.includes('planning') || body.includes('kupanga')) return await chat.sendMessage(jibuHuduma(3));

    if (body.includes('bei') || body.includes('price') || body.includes('list') || body.includes('huduma')) {
      let list = Object.keys(SERVICES).map(k=>{
        let s=SERVICES[k]; let p=punguzo(s.price);
        return `${k}. ${s.name} - ${s.price} -> *Leo ${p.new}* (${p.disc})`;
      }).join('\n');
      return await chat.sendMessage(isSw? `📋 *HUDUMA 9 NA PUNGUZO 5% LEO TU!*\n\n${list}\n\nLipa: 0795804621\nAndika NUNUA namba mfano NUNUA 2\n\nPunguzo linaisha leo saa 6 usiku!` : `📋 *9 SERVICES WITH 5% OFF TODAY ONLY!*\n\n${list}\n\nPay: 0795804621\nWrite BUY number e.g BUY 2\n\nDiscount ends today 6pm!`);
    }

    if (body.includes('nunua') || body.includes('buy') || body.includes('lipa') || body.includes('pay')) {
      return await chat.sendMessage(isSw?
`Hongera kwa uamuzi mzuri! 🎉

Umeamua vizuri kuchukua hatua leo na kupata punguzo la 5%.

*Jinsi ya kulipia:*
TZS: *0795804621* - Jina LM TZ (M-Pesa/Tigo)
Dola: PayPal - niambie nikupe link ya $

Baada ya kulipa:
1. Tuma screenshot hapa
2. Andika NUNUA + namba
Mfano: NUNUA 2 kwa Grant

Mimi nipo hapa 24H, nikiona malipo yako naanza mara moja, hata kama ni saa 2 usiku. Hutalala ukiwa na wasiwasi.

Uko tayari kulipa sasa?`
:
`Congrats for good decision! 🎉

You made right decision to take action today and get 5% discount.

*How to pay:*
TZS: *0795804621* - Name LM TZ (M-Pesa/Tigo)
Dollar: PayPal - tell me I send $ link

After pay:
1. Send screenshot here
2. Write BUY + number
Example: BUY 2 for Grant

I am here 24H, once I see your payment I start immediately, even at 2am. You won't sleep worried.

Ready to pay now?`);
    }

    return await chat.sendMessage(isSw?
`Nimekuelewa vizuri: "${bodyRaw}"

Kama mshauri wako wa Project, nakuona unahitaji msaada wa haraka.

Ushauri wa bure:

Kama unataka pesa ya donor haraka, usichukue moja tu. Chukua *Combo*:
👉 Grant $450 (2) + Logframe $80 (8) + Budget $100 (9) = $630 -> *Leo kwa punguzo 5% ni $598 tu!* Unaokoa $32.

Kama unataka kuanza mradi mpya, anza na *Feasibility $57 (4)*. Leo ni *$54 tu!*

Mradi wako ni wa nini hasa? Kilimo, Afya, Elimu, au NGO? Niambie nikuwekee punguzo la leo kabla halijaisha saa 6 usiku.`
:
`I understand well: "${bodyRaw}"

As your Project advisor, I see you need quick help.

Free advice:

If you want donor money fast, don't take one only. Take *Combo*:
👉 Grant $450 (2) + Logframe $80 (8) + Budget $100 (9) = $630 -> *Today with 5% off only $598!* You save $32.

If you want start new project, start with *Feasibility $57 (4)*. Today only *$54!*

What is your project exactly? Agriculture, Health, Education, or NGO? Tell me I reserve today's discount before 6pm.`);

  } catch (err) { console.log('Error:', err.message); }
});

client.initialize();
app.get('/', (req,res)=>{
  if(qrCodeData) res.send(`<h2>LM TZ PROJECT 9 LIVE 0795804621 - 5% OFF - NO GROUP REPLY</h2><img src="${qrCodeData}" width="350"/><p>Scan na WhatsApp Business | DM Only</p>`);
  else res.send('Bot inawaka 0795804621 5% OFF NO GROUP... Refresh 10 sec');
});
app.listen(PORT, ()=>console.log('Live 9 Services 5% OFF NO GROUP on '+PORT));
