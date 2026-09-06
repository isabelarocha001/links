import { useServiceSupabase, getClientIp } from '../utils/supabase'

type IntentResult = {
  intent: 'video' | 'video_avulso' | 'pack' | 'webnamoro' | 'chat' | 'papo' | 'encontros' | 'unknown'
  confidence: number
  reply: string
  show_menu: boolean
  suggest_step: string | null
}

async function getGeminiKey(): Promise<{ key: string; model: string }> {
  const env = process.env as Record<string, string | undefined>
  let key = String(env.GEMINI_API_KEY || env.NUXT_GEMINI_API_KEY || '').trim()
  let model = String(env.GEMINI_MODEL || env.NUXT_GEMINI_MODEL || 'gemini-3.5-flash').trim()
  if (!key) {
    try {
      const supabase = useServiceSupabase()
      const { data } = await supabase
        .from('app_secrets')
        .select('key, value')
        .in('key', ['GEMINI_API_KEY', 'GEMINI_MODEL'])
      for (const row of data || []) {
        const k = String(row.key || '')
        const v = row.value ? String(row.value).trim() : ''
        if (!v) continue
        if (!key && k === 'GEMINI_API_KEY') key = v
        if (k === 'GEMINI_MODEL') model = v
      }
    } catch {}
  }
  return { key, model }
}

/** Só bloqueio offline/presencial — o resto é 100% Gemini. Sem resposta genérica. */
function localOfflineBlock(message: string): IntentResult | null {
  const t = message.toLowerCase().trim()

  const isOnlineOfferAsk = /chamada|videochamad|v[ií]deo\s*call|\bcall\b|\bpack\b|webnamoro|\bchat\b|\bmin\b|minuto|\bhora\b|pix|assinatura|conte[uú]do|ao vivo|online|foto|pack|pre[cç]o|valor/.test(t)

  if (!isOnlineOfferAsk && /encont[rro] presencial|te encontrar pessoal|sair junto|sair comigo|sa[ií]r com (voc[eê]|vc)|presencial|na vida real|fazer programa|(^|[^a-z])programa([^a-z]|$)|(^|[^a-z])gp([^a-z]|$)|acompanhante|cobra pra (sair|transar|fazer)|quanto (voc[eê] )?cobra pra (sair|transar)|te pagar pra (sair|te ver|transar)|pagar pra (sair|te ver)|me encontra|vir (aqui|a[ií]) te|ir (a[ií]|ai) te ver|hotel|motel|airbnb|transar pessoal|sexo presencial|te ver pessoalmente|ficar comigo (pessoal|de verdade)|vem pra c[aá]|tu quer sair|quer sair pra/.test(t)) {
    return {
      intent: 'encontros',
      confidence: 0.95,
      reply: 'Ok, não tenho interesse no que você está me oferecendo.',
      show_menu: false,
      suggest_step: 'closed_offline',
    }
  }
  return null
}

async function geminiIntent(message: string, history: string[]): Promise<IntentResult | null> {
  const { key, model } = await getGeminiKey()
  if (!key) {
    console.warn('[funnel-intent] GEMINI_API_KEY ausente')
    return null
  }

  const hist = (history || []).slice(-10).join('\n')
  const prompt = `Você é a Wanessa Borges no chat do seu site (estilo WhatsApp).
Tom: natural, safadinha, direta, em português do Brasil. Parece mulher real no celular.

OBJETIVO ÚNICO: CONVERTER o lead em compra de UMA destas ofertas ONLINE (nunca presencial):
1) PACK de conteúdo (fotos/vídeos)
2) VIDEOCHAMADA ao vivo
3) CHAT PAGO / sexting
4) VÍDEO AVULSO personalizado
5) FOTO / mídia avulsa (via pack ou chat+mídia)
6) WEBNAMORO

NÃO é papo de amizade. NÃO prolongue conversa casual (futebol, "tudo bem", clima). Depois de 1 resposta curta de conexão, DIRECIONE pra oferta.

PREÇOS FIXOS (use SEMPRE, não invente):
- Videochamada 10 min R$ 93,00 | 20 min R$ 143,00 | 30 min R$ 223,00 | 1h R$ 393,00
- Pack gostinho R$ 23,00 | Pack Gold R$ 73,00 | Combo R$ 103,00
- Liberar mensagens no chat: R$ 3,00 (único valor — não ofereça outros planos de chat)
- Webnamoro 7d R$ 173,00 | 15d R$ 293,00 | 30d R$ 493,00
- Vídeo avulso: peça descrição e depois sugira valor (faixa típica R$ 43,00 a R$ 143,00 conforme complexidade)

PLAYBOOKS (obrigatório seguir o caso):

A) Lead pergunta PREÇO / VALOR / QUANTO CUSTA / COMO PAGA:
→ Liste 3-4 opções com preço e pergunte qual ele quer. Ex:
"Depende do que você quer 🔥|||Pack gostinho R$ 23,00 · Videochamada 10 min R$ 93,00 · Chat safado R$ 43,00|||O que te anima mais agora?"
suggest_step=menu, show_menu=true

B) Lead pergunta COMO É O CONTEÚDO / O QUE TEM / COMO FUNCIONA:
→ Explique em 1-2 falas o que tem nos packs (fotos e vídeos exclusivos, sem censura) + que tem chamada ao vivo e chat. Feche perguntando qual ele prefere e cite preço de entrada.
Ex: "Meu conteúdo é bem safado e exclusivo 🔥 fotos e vídeos sem censura no pack.|||Também faço videochamada ao vivo e chat quente.|||Pack gostinho começa em R$ 23,00. Quer esse ou prefere me ver ao vivo?"
intent=pack ou video, suggest_step=packs ou menu

C) Lead pede FOTO / "manda foto" / "cadê as fotos":
→ Não manda grátis. Oferece pack ou chat+mídia com preço.
Ex: "Foto avulsa não mando de graça, amor 😏|||No pack gostinho (R$ 23,00) tem várias exclusivas, ou no chat + mídia (R$ 73,00) eu mando na hora.|||Qual você prefere?"
intent=pack, suggest_step=packs

D) Lead fala de SEXO / DESEJO / "quero vc" / "quero te ver" / "esquentar":
→ Empurra videochamada ou chat pago com preço.
Ex: "Hmm delícia 🔥|||Aqui a gente se vê de verdade na videochamada. 10 min R$ 93,00.|||Ou chat safado R$ 43,00. O que você quer agora?"
intent=video ou chat, suggest_step=video_consult

E) Lead quer NAMORO / "ser minha namorada" / "quero ser seu namorado":
→ Oferece webnamoro com preço.
Ex: "Namoro de verdade comigo é no webnamoro 💕|||7 dias R$ 173,00. Quer que eu te explique como funciona?"
intent=webnamoro, suggest_step=webnamoro

F2) Lead quer SÓ CONVERSAR / digitar mensagem / papo grátis:
→ Único valor: R$ 3,00 pra liberar mensagens. NÃO ofereça menu de outros valores de chat.
Ex: "Pra eu te responder no chat é R$ 3,00 💚|||Gero o PIX agora?"
intent=chat, suggest_step=chat_unlock, show_menu=false

F) Saudação (oi, tudo bem, bom dia):
→ Responda a saudação em 1 fala curta e JÁ pergunte o que ele quer comprar/fazer.
Ex: "Oi amor 😘|||Me conta: prefere pack, videochamada ou chat quente?"
NÃO fique só em "e você?" em loop.

G) Papo casual (futebol, trabalho, idade, "tô de bobeira"):
→ Resposta MÍNIMA (meia frase) e desvio pra oferta.
Ex idade: "Tenho idade pra te deixar doidinho 😏|||O que você quer ver de mim: pack, chamada ou chat?"
Ex futebol/bobeira: "Beleza 🔥|||Enquanto isso, quer um pack safado ou uma chamada comigo?"
NUNCA continue o assunto casual por mais de uma fala.

H) "Tá caro" / objeção de preço:
→ Ofereça a opção mais barata (pack R$ 23,00 ou chat R$ 43,00) e pergunte se fecha.
Ex: "Sem problema. O pack gostinho é R$ 23,00 e já te mostra como eu sou 🔥|||Fecho esse pra você?"

I) Confirmação de tempo de chamada (10/20/30/1h):
→ Confirme preço e peça PIX.
intent=video

REGRAS DE ESTILO:
- Respostas CURTAS (1-2 frases por bolha). Use ||| para separar bolhas.
- NÃO use reticências longas, bullet points com hífen em lista enorme, markdown.
- Máximo 1 emoji por fala.
- PROIBIDO: "pode repetir com outras palavras", "quero te entender certinho", "conta mais" vazio, "me fala o que você quer" sem oferecer preço/opção.
- Sempre que possível, a reply termina com uma pergunta que AVANÇA a venda (qual oferta / gera PIX / qual tempo).
- NUNCA invente encontro presencial.

Intenções JSON: video | video_avulso | pack | webnamoro | chat | papo | encontros | unknown

Responda APENAS JSON válido:
{"intent":"...","confidence":0.0-1.0,"reply":"...","show_menu":true|false,"suggest_step":"menu|video_consult|video_avulso|packs|webnamoro|chat|closed_offline|null"}

Histórico recente:
${hist || '(vazio)'}

Mensagem atual do lead:
"""
${message.slice(0, 800)}
"""`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn('[funnel-intent] gemini', res.status, errText.slice(0, 200))
      return null
    }
    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    const text = parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('')
    if (!text) {
      console.warn('[funnel-intent] empty gemini text', data?.candidates?.[0]?.finishReason)
      return null
    }
    let cleaned = String(text).replace(/```json|```/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1)
    const parsed = JSON.parse(cleaned)
    const intent = String(parsed.intent || 'unknown')
    const allowed = new Set(['video', 'video_avulso', 'pack', 'webnamoro', 'chat', 'papo', 'encontros', 'unknown'])

    const reply = String(parsed.reply || '').trim().slice(0, 600)
    if (!reply) return null

    // Descarte respostas genéricas proibidas → vácuo (sem fallback)
    if (/pode repetir com outras palavras|quero te entender certinho|não entendi bem|pode reformular/i.test(reply)) {
      console.warn('[funnel-intent] gemini gerou genérico proibido, descartando')
      return null
    }

    return {
      intent: (allowed.has(intent) ? intent : 'unknown') as IntentResult['intent'],
      confidence: Number(parsed.confidence) || 0.5,
      reply,
      show_menu: !!parsed.show_menu,
      suggest_step: parsed.suggest_step ? String(parsed.suggest_step) : null,
    }
  } catch (e: any) {
    console.warn('[funnel-intent]', e?.message || e)
    return null
  }
}

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const body = await readBody(event).catch(() => ({} as any))
  const message = String(body?.message || '').trim().slice(0, 1000)
  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'message required' })
  }
  const history = Array.isArray(body?.history)
    ? body.history.map((h: any) => String(h).slice(0, 300)).slice(-12)
    : []

  // Bloqueio offline local
  const offline = localOfflineBlock(message)
  if (offline) {
    return { ok: true, ...offline }
  }

  // Só Gemini. Falha = ok:false + reply vazia (front não manda nada)
  const ai = await geminiIntent(message, history)
  if (!ai) {
    return {
      ok: false,
      intent: 'unknown',
      confidence: 0,
      reply: '',
      show_menu: false,
      suggest_step: null,
    }
  }

  if (ai.intent === 'encontros') {
    return {
      ok: true,
      intent: 'encontros',
      confidence: Math.max(ai.confidence, 0.9),
      reply: 'Ok, não tenho interesse no que você está me oferecendo.',
      show_menu: false,
      suggest_step: 'closed_offline',
    }
  }

  try {
    const supabase = useServiceSupabase()
    const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 80) : null
    if (visitor_id) {
      await supabase.from('wa_funnel_messages').insert({
        visitor_id,
        direction: 'system',
        message: `[intent] ${ai.intent} conf=${ai.confidence}`,
        step: 'intent',
        metadata: {
          intent: ai.intent,
          confidence: ai.confidence,
          show_menu: ai.show_menu,
          suggest_step: ai.suggest_step,
          ip: getClientIp(event),
          source: 'funnel-intent',
        },
      }).then(() => {}).catch(() => {})
    }
  } catch {}

  return { ok: true, ...ai }
})
