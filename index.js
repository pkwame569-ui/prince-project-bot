import express from 'express'
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'

const app = express()
let lastQR = null

app.get('/', (req,res)=>res.send('BOT IS LIVE - /qr'))
app.get('/ping', (req,res)=>res.send('pong'))
app.get('/qr', async (req,res)=>{
  if(!lastQR) return res.send('<h1>Bot IMESHA-CONNECT ✅<br>Hakuna QR. Bot inafanya kazi.</h1>')
  const qr = await QRCode.toDataURL(lastQR)
  res.send(`<img src="${qr}" width="320"/><br><a href="/qr">Refresh</a>`)
})
app.listen(10000, ()=>console.log('Live 10000'))

// HAILALI - Jipige kila dakika 4
setInterval(()=>{ console.log('Stay Alive'); fetch('https://prince-project-bot.onrender.com/ping').catch(()=>{}) }, 4*60*1000)

const KNOW = {
  evaluation:{sw:`📚 EVALUATION (Tathmini): Ni kuchunguza kama mradi umefikia malengo, kama pesa za donor zimetumika vizuri.\n\nAina: Baseline, Mid-term, Endline, Impact.\n\nBila evaluation huwezi jua mradi umefanikiwa. Donors kama USAID wanailazimisha.\n\nAt MBILAO tunakusimamia hatua kwa hatua hadi upate report ya kimataifa. $99→15%=$84. Nikusaidie kuanza lini?`,en:`📚 EVALUATION: Systematic assessment if a project achieved its goals and funds were used well.\n\nTypes: Baseline, Mid-term, Endline, Impact.\n\nWithout it you can't prove success. USAID/EU require it.\n\nAt MBILAO we guide you step-by-step. $99→15%=$84.`},
  monitoring:{sw:`📊 MONITORING (Ufuatiliaji): Ni GPS ya mradi kila siku. Unafuatilia indicators, budget, activities. Monitoring ni kila siku, Evaluation ni kwa vipindi.\n\nMBILAO $99→15%=$84`,en:`📊 MONITORING: Daily tracking of your project like GPS. You track indicators, budget, activities. Monitoring is continuous.\n\nMBILAO $99→15%=$84`},
  logframe:{sw:`📋 LOGFRAME: Jedwali la Goal, Outcome, Output, Activities, Indicators. Huu ndio moyo wa proposal. Bila logframe nzuri hutapata funding.\n\nMBILAO $99→15%=$84`,en:`📋 LOGFRAME: Table of Goal, Outcome, Output, Activities, Indicators, Means of Verification. Heart of all proposals. No funding without it.\n\nMBILAO $99→15%=$84`},
  grant:{sw:`💰 GRANT PROPOSAL: Kuandika ombi la pesa USAID/EU/UN. Tunatengeneza proposal zinazoshinda. Ina background, logframe, budget, sustainability.\n\nMBILAO $450→10%=$405. Nikusaidie?`,en:`💰 GRANT PROPOSAL: Writing winning proposals for USAID/EU/UN. Includes background, logframe, budget, sustainability.\n\nMBILAO $450→10%=$405`},
  strategic:{sw:`🗺️ STRATEGIC PLAN: Ramani ya miaka 5 - Vision, Mission, SWOT. Bila dira taasisi inapotea.\n\nMBILAO $300→15%=$255`,en:`🗺️ STRATEGIC PLAN: 5-year roadmap - Vision, Mission, SWOT, Goals. Without it org is lost.\n\nMBILAO $300→15%=$255`},
  feasibility:{sw:`🔍 FEASIBILITY STUDY: Utafiti kama mradi unawezekana kiuchumi, kiteknolojia. Bank zinahitaji kabla ya mkopo.\n\nMBILAO $149→20%=$119`,en:`🔍 FEASIBILITY: Study if project is viable economically, technically. Banks need it before loan.\n\nMBILAO $149→20%=$119`},
  business:{sw:`📝 BUSINESS PLAN: Mpango wa biashara wa kibenki - market, financials 3 years. Inakubalika bank.\n\nMBILAO $120→10%=$108`,en:`📝 BANKABLE BUSINESS PLAN: Bank-approved plan with market analysis, 3-year financials.\n\nMBILAO $120→10%=$108`},
  policy:{sw:`📜 POLICY ANALYSIS: Kuchambua sera za serikali na athari.\n\nMBILAO $150→15%=$127.5`,en:`📜 POLICY ANALYSIS: Analyzing gov policies and impact.\n\nMBILAO $150→15%=$127.5`},
  agrarian:{sw:`🌾 KILIMO / MAZINGIRA / CLIMATE $99→20%=$79 BEI YA CHINI!\n\nBila kilimo smart mazao -70%. Tunakupa mbinu za UN, +200% mavuno, funding ya climate. At MBILAO tunakusimamia hatua kwa hatua. Tuanze lini? 🌱`,en:`🌾 AGRARIAN/CLIMATE SMART $99→20%=$79 BEST PRICE!\n\nWithout smart farming yields -70%. We give UN methods, +200% harvest, climate funding. Step-by-step support. 🌱`},
  planning:{sw:`📅 PROJECT PLANNING: Kupanga mradi hatua kwa hatua, Gantt, risk, budget.\n\nMBILAO $250→10%=$225`,en:`📅 PROJECT PLANNING & MGMT: Step-by-step planning, Gantt, risk, budget.\n\nMBILAO $250→10%=$225`},
  automation:{sw:`🤖 AI AUTOMATION: AI ifanye kazi zako automatiki - emails, reports.\n\nMBILAO $250→15%=$212.5`,en:`🤖 AI AUTOMATION ENGINEER: AI does your work automatically - emails, reports.\n\nMBILAO $250→15%=$212.5`},
  marketing:{sw:`🔥 AI MARKETING VIRAL $149→25%=$111 TRENDING!\n\nAI viral videos kila siku, brand WORLDWIDE, mauzo +500%. Bila hii biashara nyuma. MBILAO tunakufanya BRAND kubwa! 🚀`,en:`🔥 TRENDING #1 AI VIRAL MARKETING $149→25%=$111!\n\nAI viral videos daily, WORLDWIDE brand, sales +500%. Without it business is behind. We make you BIG BRAND! 🚀`},
  website:{sw:`💻 WEBSITE: Tovuti ya kisasa, haraka, SEO, simu.\n\nMBILAO $99→15%=$84 BEI YA CHINI!`,en:`💻 WEBSITE: Modern fast SEO website, mobile ready.\n\nMBILAO $99→15%=$84 BEST PRICE!`},
  bot:{sw:`🤖 WHATSAPP BOT 24/7: Bot kama mimi inayojibu wateja 24/7, inaelewa nia, inauza.\n\nMBILAO $150→10%=$135 HAILALI!`,en:`🤖 WHATSAPP BOT 24/7: Bot like me answering 24/7, understands intent, sells.\n\nMBILAO $150→10%=$135 NEVER SLEEPS!`},
  mentorship:{sw:`👨‍🏫 MENTORSHIP: Mafunzo binafsi 1-on-1 hadi ufanikiwe.\n\nMBILAO $99→20%=$79`,en:`👨‍🏫 MENTORSHIP: 1-on-1 private coaching till success.\n\nMBILAO $99→20%=$79`}
}

function getLang(text){
  const swWords = ['nini','habari','bei','huduma','ni','ya','na','mambo','sasa','mteja','kilimo','shamba','tathmini','ufuatiliaji','mkakati']
  let score=0; swWords.forEach(w=>{ if(text.includes(w)) score++ })
  return score>=1? 'sw' : 'en'
}

function getIntent(t){
  if(t.includes('evaluat')||t.includes('tathmini')) return 'evaluation'
  if(t.includes('monitor')||t.includes('ufuatiliaji')||t.includes('m&e')) return 'monitoring'
  if(t.includes('logframe')||t.includes('logical')) return 'logframe'
  if(t.includes('grant')||t.includes('proposal')||t.includes('usaid')||t.includes('donor')||t.includes('fund')) return 'grant'
  if(t.includes('strategic')||t.includes('mkakati')||t.includes('strategy')) return 'strategic'
  if(t.includes('feasib')) return 'feasibility'
  if(t.includes('business plan')||t.includes('bankable')) return 'business'
  if(t.includes('policy')||t.includes('sera')) return 'policy'
  if(t.includes('agri')||t.includes('agrar')||t.includes('climate')||t.includes('mazingira')||t.includes('kilimo')||t.includes('shamba')||t.includes('environment')) return 'agrarian'
  if(t.includes('planning')||t.includes('usimamizi')||t.includes('project management')) return 'planning'
  if(t.includes('automation')||t.includes('engineer')&&t.includes('ai')) return 'automation'
  if(t.includes('market')||t.includes('viral')||t.includes('brand')||t.includes('digital market')) return 'marketing'
  if(t.includes('website')||t.includes('tovuti')||t.includes('web ')) return 'website'
  if(t.includes('whatsapp')||t.includes('bot')) return 'bot'
  if(t.includes('mentor')) return 'mentorship'
  return null
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const sock = makeWASocket({ auth: state, printQRInTerminal:false })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', u=>{
    const { connection, lastDisconnect, qr } = u
    if(qr){ lastQR=qr; console.log('QR READY') }
    if(connection==='close'){
      const rc = (lastDisconnect?.error)?.output?.statusCode!== DisconnectReason.loggedOut
      if(rc) startBot()
    } else if(connection==='open'){ console.log('✅ CONNECTED'); lastQR=null }
  })

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m=messages[0]; if(!m.message) return
    const jid=m.key.remoteJid
    // HAIJIBU GROUPS
    if(jid.endsWith('@g.us')||jid.endsWith('@broadcast')||jid.includes('group')) return
    const raw=m.message.conversation||m.message.extendedTextMessage?.text||""
    const t=raw.toLowerCase().trim(); if(!t||t.length<2) return
    if(m.key.fromMe) return

    const lang = getLang(t)
    const intent = getIntent(t)

    if(t.includes('bei')||t.includes('huduma')||t.includes('price')||t.includes('list')||t.includes('services')){
      const msg = lang==='sw'? `🌐 MBILAO WORLDWIDE - HUDUMA 14 MIN $99:\n\n1.Bot 24/7 $135\n2.Website $84 MIN!\n3.Automation $162\n4.Mentorship $79\n5.M&E $84\n6.Grant $405\n7.Strategic $255\n8.Feasibility $119\n9.Business Plan $108\n10.Policy $127.5\n11.Kilimo/Climate $79 🌾\n12.Planning $225\n13.AI Engineer $212.5\n14.🔥Marketing Viral $111\n\nUliza huduma yoyote: 'evaluation ni nini?'` : `🌐 MBILAO WORLDWIDE - 14 SERVICES MIN $99:\n\n1.Bot 24/7 $135\n2.Website $84 MIN!\n3.Automation $162\n4.Mentorship $79\n5.M&E $84\n6.Grant $405\n7.Strategic $255\n8.Feasibility $119\n9.Business Plan $108\n10.Policy $127.5\n11.Agrarian/Climate $79\n12.Planning $225\n13.AI Engineer $212.5\n14.🔥Marketing $111\n\nAsk: 'what is evaluation?'`
      await sock.sendMessage(jid,{text:msg}); return
    }

    if(intent){
      const ans = KNOW[intent][lang]
      await sock.sendMessage(jid,{text:ans}); return
    }

    // Salamu
    if(t.includes('habari')||t.includes('hello')||t.includes('hi')||t.includes('mambo')||t.includes('hey')){
      const msg = lang==='sw'? `Karibu MBILAO WORLDWIDE 🌐\n\nMimi nina elimu nje ya bei! Niulize chochote kuhusu huduma, nitaelewa nia yako.\n\nMfano:\n- evaluation ni nini?\n- nataka grant proposal\n- kilimo smart ni nini?\n- bei ya website?\n\nAt MBILAO tunakuhudumia hatua kwa hatua popote duniani 🙏` : `Welcome to MBILAO WORLDWIDE 🌐\n\nI understand your intent beyond price! Ask me anything about services.\n\nExample:\n- what is evaluation?\n- I need grant proposal\n- website price?\n\nWe support you step-by-step worldwide 🙏`
      await sock.sendMessage(jid,{text:msg}); return
    }

    // Haijaeleweka - uliza vizuri bila kurudia ovyo
    const fallback = lang==='sw'? `Samahani sijaelewa vizuri. Niulize kuhusu huduma moja:\n- evaluation, monitoring, logframe, grant, kilimo, marketing, website, bot n.k\n\nAu andika 'bei' kuona huduma zote 14.` : `Sorry I didn't catch that. Ask about one service:\n- evaluation, monitoring, logframe, grant, agrarian, marketing, website, bot etc\n\nOr type 'price' to see all 14 services.`
    await sock.sendMessage(jid,{text:fallback})
  })
}
startBot()
