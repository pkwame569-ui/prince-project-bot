const express=require('express');
const OpenAI=require('openai');
const axios=require('axios');
const app=express();
app.use(express.json());

const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const META_TOKEN=process.env.META_TOKEN; // kutoka Meta Developer
const PHONE_ID=process.env.PHONE_ID;

const PROMPT=`Wewe ni MBILAO CONSULTANT WORLDWIDE, jibu kwa lugha ya mteja, elimisha, toa gharama/muda/punguzo 10%, hakikisha WORLDWIDE 24H`;

async function aiReply(msg){
 const r=await openai.chat.completions.create({
  model:"gpt-4o-mini",
  messages:[{role:"system",content:PROMPT},{role:"user",content:msg}],
  max_tokens:400
 });
 return r.choices[0].message.content;
}

app.get('/webhook',(req,res)=>{
 if(req.query['hub.verify_token']==='mbilao123') res.send(req.query['hub.challenge']);
 else res.sendStatus(403);
});

app.post('/webhook',async(req,res)=>{
 const msg=req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
 if(msg){
  const text=msg.text?.body;
  const from=msg.from;
  const reply=await aiReply(text);
  await axios.post(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,{
   messaging_product:"whatsapp", to:from, text:{body:reply}
  },{headers:{Authorization:`Bearer ${META_TOKEN}`}});
 }
 res.sendStatus(200);
});

app.listen(10000,()=>console.log('META BOT LIVE'));
