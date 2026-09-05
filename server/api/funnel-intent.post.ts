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

function localIntent(message: string): IntentResult {
  const t = message.toLowerCase()

  // NUNCA tratar preço de oferta online como "programa"
  const isOnlineOfferAsk = /chamada|videochamad|v[ií]deo\s*call|\bcall\b|\bpack\b|webnamoro|\bchat\b|\bmin\b|minuto|\bhora\b|pix|assinatura|conte[uú]do|ao vivo|online/.test(t)

  if (!isOnlineOfferAsk && /encont[rro] presencial|te encontrar pessoal|sair junto|sair comigo|sa[ií]r com (voc[eê]|vc)|presencial|na vida real|fazer programa|(^|[^a-z])programa([^a-z]|$)|(^|[^a-z])gp([^a-z]|$)|acompanhante|cobra pra (sair|transar|fazer)|quanto (voc[eê] )?cobra pra (sair|transar)|te pagar pra (sair|te ver|transar)|pagar pra (sair|te ver)|me encontra|vir (aqui|a[ií]) te|ir (a[ií]|ai) te ver|hotel|motel|airbnb|transar pessoal|sexo presencial|te ver pessoalmente|ficar comigo (pessoal|de verdade)|vem pra c[aá]/.test(t)) {
    return {
      intent: 'encontros',
      confidence: 0.95,
      reply: 'Ok, não tenho interesse no que você está me oferecendo.',
      show_menu: false,
      suggest_step: 'closed_offline',
    }
  }
  // "quanto cobra chamada de 10 min" etc. = oferta online
  if (/quanto (voc[eê] )?(cobra|custa|é)|pre[cç]o|valor/.test(t) && /(chamada|call|video|v[ií]deo|pack|chat|webnamoro|\bmin\b|minuto|hora)/.test(t)) {
    if (/chamada|call|videochamad|v[ií]deo/.test(t)) {
      return {
        intent: 'video',
        confidence: 0.9,
        reply: 'A videochamada de 10 min fica R$ 99,90.|||Tem também 20 min, 30 min e 1 hora.|||Qual tempo você prefere?',
        show_menu: false,
        suggest_step: 'video',
      }
    }
  }
    if (/v[ií]deo\s*chamad|videochamad|chamada de v[ií]deo|call ao vivo|ao vivo/.test(t)) {
    return {
      intent: 'video',
      confidence: 0.9,
      reply: 'Videochamada comigo fica bem intenso 🔥 Me conta o clima que você quer e eu te mostro os tempos e valores.',
      show_menu: false,
      suggest_step: 'video_consult',
    }
  }
  if (/v[ií]deo avulso|v[ií]deo personaliz|me grava|grava pra mim|v[ií]deo sob demanda/.test(t)) {
    return {
      intent: 'video_avulso',
      confidence: 0.88,
      reply: 'Vídeo só pra você. me descreve o que você quer que eu faça nele 😈',
      show_menu: false,
      suggest_step: 'video_avulso',
    }
  }
  if (/pack|conte[uú]do|fotos? e v[ií]deos|pacote|assinatura|vip|only/.test(t)) {
    return {
      intent: 'pack',
      confidence: 0.85,
      reply: 'Tenho packs deliciosos pra você me conhecer melhor 🔥 Quer que eu te mostre as opções e preços?',
      show_menu: false,
      suggest_step: 'packs',
    }
  }
  if (/webnamoro|namoro virtual|namoradinha|namorar/.test(t)) {
    return {
      intent: 'webnamoro',
      confidence: 0.85,
      reply: 'Webnamoro comigo é bem especial 💕 Quer ver os planos?',
      show_menu: false,
      suggest_step: 'webnamoro',
    }
  }
  if (/s[oó] conversar|s[oó] papo|bater papo|conversar sem|s[oó] falar|\boi\b|\bol[aá]\b|oie|oii+|bom dia|boa tarde|boa noite|tudo bem|td bem|e a[ií]|blz|beleza|oi amor|ola amor/.test(t)) {
    return {
      intent: 'papo',
      confidence: 0.75,
      reply: 'Oi amor 😘|||Tudo bem sim. E você?',
      show_menu: false,
      suggest_step: null,
    }
  }
  if (/chat|conversa safad|papo quente|sexting/.test(t)) {
    return {
      intent: 'chat',
      confidence: 0.8,
      reply: 'Chat comigo pode ser bem safado 😏 Quer que eu te mostre os planos de chat?',
      show_menu: false,
      suggest_step: 'chat',
    }
  }
  if (/pre[cç]o|valor|quanto custa|quanto [eé]|pix|pagar|assin/.test(t)) {
    return {
      intent: 'unknown',
      confidence: 0.6,
      reply: 'Depende do que você quer, amor 💚 Videochamada, pack, chat ou webnamoro… me fala o que te interessa que eu te passo o valor certinho.',
      show_menu: true,
      suggest_step: 'menu',
    }
  }

  return {
    intent: 'unknown',
    confidence: 0.4,
    reply: 'Hmm entendi. me fala um pouco mais sobre isso? Quero te responder direito 😘',
    show_menu: false,
    suggest_step: null,
  }
}

async function geminiIntent(message: string, history: string[]): Promise<IntentResult | null> {
  const { key, model } = await getGeminiKey()
  if (!key) return null

  const hist = (history || []).slice(-8).join('\n')
  const prompt = `Você é a Wanessa Borges, criadora de conteúdo adulto, falando no chat do seu site de links (estilo WhatsApp).
Tom: natural, safadinha, acolhedora, em português brasileiro do Brasil. Parece mulher real no celular — NÃO robô, NÃO script de vendas genérico.

SUA TAREFA:
1) Responder de verdade o que o lead perguntou ou comentou (use o histórico).
2) Classificar a intenção.
3) Só empurrar oferta quando fizer sentido na conversa.

O que você oferece ONLINE (nunca presencial):
- Videochamada ao vivo
- Vídeo avulso personalizado
- Packs de conteúdo
- Webnamoro
- Chat pago / sexting

Intenções:
- video | video_avulso | pack | webnamoro | chat | papo | encontros | unknown

Regras OBRIGATÓRIAS:
1. A "reply" DEVE responder o conteúdo da mensagem do lead (pergunta, elogio, dúvida). Proibido resposta genérica tipo "me conta o que você quer" se ele já perguntou algo específico.
2. Se for oi / bom dia / boa tarde / tudo bem / oi amor: responda A SAUDAÇÃO de verdade (ex: "Oi amor" + "Tudo bem sim, e você?"). Nunca ignore a saudação. Nunca pule pro menu de vendas nessa hora. Conexão primeiro.
3. Se perguntar preço/como funciona de algo online: explique de forma direta e ofereça o caminho.
4. Se pedir encontro PRESENCIAL / programa / sair / hotel / "quanto cobra pra SAIR": intent=encontros, closed_offline. NÃO confundir com preço de videochamada, pack, chat ou "quanto cobra uma chamada de 10 min" — isso é oferta ONLINE (intent video/pack/chat).
5. NÃO invente que faz encontro presencial.
6. NÃO jogue lista enorme de preços sem o lead pedir.
7. ESTILO DE MENSAGEM (obrigatório):
   - Respostas CURTAS, como WhatsApp real (1 a 2 frases por bolha).
   - Se precisar falar mais, separe em várias falas usando o caractere ||| entre elas (ex: "frase um|||frase dois").
   - NÃO use reticências (...) nem travessão/hífen de lista (-) — isso denuncia IA.
   - NÃO monte textão. NÃO use bullet points. NÃO use markdown.
   - Pode usar emoji com moderação (no máximo 1 por fala).

Responda APENAS JSON válido:
{"intent":"video|video_avulso|pack|webnamoro|chat|papo|encontros|unknown","confidence":0.0-1.0,"reply":"...","show_menu":true|false,"suggest_step":"menu|video_consult|video_avulso|packs|webnamoro|chat|closed_offline|null"}

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
          maxOutputTokens: 400,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) {
      console.warn('[funnel-intent] gemini', res.status)
      return null
    }
    const data = await res.json()
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      ''
    let cleaned = String(text).replace(/```json|```/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1)
    const parsed = JSON.parse(cleaned)
    const intent = String(parsed.intent || 'unknown')
    const allowed = new Set(['video', 'video_avulso', 'pack', 'webnamoro', 'chat', 'papo', 'encontros', 'unknown'])
    return {
      intent: (allowed.has(intent) ? intent : 'unknown') as IntentResult['intent'],
      confidence: Number(parsed.confidence) || 0.5,
      reply: String(parsed.reply || '').slice(0, 500) || 'Me conta mais, amor 😘',
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
    ? body.history.map((h: any) => String(h).slice(0, 300)).slice(-10)
    : []

  // Filtro offline/programa SEMPRE local primeiro (não confia só no Gemini)
  const local = localIntent(message)
  if (local.intent === 'encontros') {
    return { ok: true, ...local }
  }

  // Gemini para o resto; se Gemini marcar encontros, respeita
  const ai = await geminiIntent(message, history)
  let result = ai || local
  if (ai && ai.intent === 'encontros') {
    result = {
      intent: 'encontros',
      confidence: Math.max(ai.confidence, 0.9),
      reply: 'Ok, não tenho interesse no que você está me oferecendo.',
      show_menu: false,
      suggest_step: 'closed_offline',
    }
  } else if (ai) {
    // ainda assim: se o texto localmente grita offline e o AI errou, sobrescreve
    const again = localIntent(message)
    if (again.intent === 'encontros') result = again
  }

  // log leve
  try {
    const supabase = useServiceSupabase()
    const visitor_id = body?.visitor_id ? String(body.visitor_id).slice(0, 80) : null
    if (visitor_id) {
      await supabase.from('wa_funnel_messages').insert({
        visitor_id,
        direction: 'system',
        message: `[intent] ${result.intent} conf=${result.confidence}`,
        step: 'intent',
        metadata: {
          intent: result.intent,
          confidence: result.confidence,
          show_menu: result.show_menu,
          suggest_step: result.suggest_step,
          ip: getClientIp(event),
          source: 'funnel-intent',
        },
      }).then(() => {}).catch(() => {})
    }
  } catch {}

  return { ok: true, ...result }
})
