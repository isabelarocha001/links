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
  return null
}

async function geminiIntent(message: string, history: string[]): Promise<IntentResult | null> {
  const { key, model } = await getGeminiKey()
  if (!key) {
    console.warn('[funnel-intent] GEMINI_API_KEY ausente')
    return null
  }

  const hist = (history || []).slice(-8).join('\n')
  const prompt = `Você é a Wanessa Borges, criadora de conteúdo adulto, falando no chat do seu site de links (estilo WhatsApp).
Tom: natural, safadinha, acolhedora, em português brasileiro do Brasil. Parece mulher real no celular — NÃO robô, NÃO script de vendas genérico.

SUA TAREFA:
1) Responder de verdade o que o lead perguntou ou comentou (use o histórico).
2) Classificar a intenção.
3) Só empurrar oferta quando fizer sentido na conversa.

Preços fixos (use SEMPRE estes, não invente):
- Videochamada 10 min: R$ 99,90
- Videochamada 20 min: R$ 149,90
- Videochamada 30 min: R$ 229,90
- Videochamada 1 hora: R$ 399,90
- Pack gostinho: R$ 29,90 | Pack Gold: R$ 79,90 | Combo: R$ 109,90
- Chat 30-40 min: R$ 49,90 | Chat + mídia: R$ 79,90
- Webnamoro 7d R$ 179,90 | 15d R$ 299,90 | 30d R$ 499,90

O que você oferece ONLINE (nunca presencial):
- Videochamada ao vivo
- Vídeo avulso personalizado
- Packs de conteúdo
- Webnamoro
- Chat pago / sexting

Intenções:
- video | video_avulso | pack | webnamoro | chat | papo | encontros | unknown

Regras OBRIGATÓRIAS:
1. A "reply" DEVE responder o conteúdo da mensagem do lead E o histórico. Se vocês já falaram de videochamada de 10 min e o lead diz "quero só o de 10", confirme o fechamento (R$ 99,90) e pergunte se gera o PIX.
1b. Nunca diga que ouviu áudio se não há transcrição no histórico.
1c. Mensagens curtas de desejo tipo "quero vc", "quero você", "te quero", "quero te ver": responda de forma safadinha e acolhedora, deixe claro que é ONLINE e pergunte o que ele mais quer fazer (videochamada, chat, pack…).
2. Se for oi / bom dia / boa tarde / tudo bem / oi amor: responda A SAUDAÇÃO de verdade. Conexão primeiro.
3. Se perguntar preço/como funciona de algo online: explique de forma direta e ofereça o caminho.
4. Se pedir encontro PRESENCIAL / programa / sair / hotel / "quanto cobra pra SAIR": intent=encontros, closed_offline. NÃO confundir com preço de videochamada/pack/chat.
5. NÃO invente que faz encontro presencial.
6. NÃO jogue lista enorme de preços sem o lead pedir.
7. ESTILO DE MENSAGEM:
   - Respostas CURTAS, como WhatsApp real (1 a 2 frases por bolha).
   - Se precisar falar mais, separe em várias falas usando ||| entre elas.
   - NÃO use reticências (...) nem travessão/hífen de lista (-).
   - NÃO monte textão. NÃO use bullet points. NÃO use markdown.
   - Pode usar emoji com moderação (no máximo 1 por fala).
8. PROIBIDO respostas genéricas de "não entendi" / "pode repetir com outras palavras" / "quero te entender certinho" / "me conta mais" vazio. Sempre engaje de forma natural e contextual.

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
          temperature: 0.65,
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

    const reply = String(parsed.reply || '').trim().slice(0, 500)
    // Sem reply do modelo = falha (front deixa no vácuo)
    if (!reply) return null

    // Se o modelo ainda gerar genérico proibido, trata como falha (vácuo)
    if (/pode repetir com outras palavras|quero te entender certinho|não entendi bem|pode reformular|me explica melhor com outras/i.test(reply)) {
      console.warn('[funnel-intent] gemini gerou resposta genérica proibida, descartando')
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
    ? body.history.map((h: any) => String(h).slice(0, 300)).slice(-10)
    : []

  // Bloqueio offline local (único caso com reply fixa)
  const offline = localOfflineBlock(message)
  if (offline) {
    return { ok: true, ...offline }
  }

  // Tudo o mais: só Gemini. Se falhar → ok:false e reply vazia (front não manda nada)
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

  // Gemini marcou encontros → normaliza reply de recusa
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

  // log leve
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
