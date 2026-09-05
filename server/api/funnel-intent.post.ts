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

  if (/encont[rro]|sair junto|te encontrar|encontrar pessoal|presencial|na vida real|marcar algo/.test(t)) {
    return {
      intent: 'encontros',
      confidence: 0.85,
      reply: 'Amor, eu não faço encontros presenciais 😘 Meu negócio é online — conteúdo, chat e videochamada. O que te anima mais por aqui?',
      show_menu: true,
      suggest_step: 'menu',
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
      reply: 'Vídeo só pra você… me descreve o que você quer que eu faça nele 😈',
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
  if (/s[oó] conversar|s[oó] papo|bater papo|conversar sem|s[oó] falar|oi$|ol[aá]$|e a[ií]$|bom dia|boa noite|tudo bem/.test(t)) {
    return {
      intent: 'papo',
      confidence: 0.7,
      reply: 'Oi amor 😘 Pode falar comigo… me conta o que te trouxe até aqui, sem pressa.',
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
    reply: 'Hmm, me conta um pouco mais… o que você tá a fim agora? Pode falar à vontade 😘',
    show_menu: false,
    suggest_step: null,
  }
}

async function geminiIntent(message: string, history: string[]): Promise<IntentResult | null> {
  const { key, model } = await getGeminiKey()
  if (!key) return null

  const hist = (history || []).slice(-8).join('\n')
  const prompt = `Você é a Wanessa, criadora de conteúdo adulto, no chat do site de links. Tom natural, safado e acolhedor em português brasileiro. NÃO seja robótica. NÃO liste menu de opções na primeira resposta a menos que o lead já tenha deixado claro o que quer.

Classifique a intenção do lead e responda de forma natural.

Intenções possíveis:
- video = quer videochamada ao vivo
- video_avulso = quer vídeo gravado personalizado
- pack = quer pack de conteúdo / fotos e vídeos
- webnamoro = quer webnamoro
- chat = quer chat pago / sexting
- papo = só quer conversar, oi, enrolar, sem intenção clara de comprar
- encontros = quer encontro presencial (você NÃO faz — redirecione pro online com carinho)
- unknown = ainda não deu pra saber

Regras:
1. Se ainda for vago (oi, e aí, só conversar), NÃO mostre menu. Continue a conversa pra puxar intenção.
2. Se já deixou claro o desejo (ex: videochamada, pack), aí sim sugira o caminho e show_menu true se fizer sentido.
3. reply deve parecer mensagem de WhatsApp curta (1-3 frases), sem bullets de preço ainda.

Responda APENAS JSON:
{"intent":"...","confidence":0.0-1.0,"reply":"...","show_menu":true|false,"suggest_step":"menu|video_consult|video_avulso|packs|webnamoro|chat|null"}

Histórico recente:
${hist || '(vazio)'}

Mensagem do lead:
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

  // Gemini primeiro; fallback local
  const ai = await geminiIntent(message, history)
  const result = ai || localIntent(message)

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
