/**
 * POST /api/funnel-intent
 * Registra intenção/clique de oferta do funil (pack, call, webnamoro).
 */
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

/** Mensagem de recusa presencial no idioma do lead */
function offlineRefuseReply(locale: string): string {
  const loc = String(locale || 'pt').slice(0, 2)
  const map: Record<string, string> = {
    pt: 'Ok, não tenho interesse no que você está me oferecendo.',
    en: "Ok, I'm not interested in what you're offering.",
    es: 'Ok, no tengo interés en lo que me estás ofreciendo.',
    fr: "Ok, je ne suis pas intéressée par ce que tu proposes.",
    de: 'Ok, ich habe kein Interesse an dem, was du anbietest.',
    it: 'Ok, non mi interessa quello che stai offrendo.',
  }
  return map[loc] || map.pt
}

function localOfflineBlock(message: string, locale: string = 'pt'): IntentResult | null {
  const t = message.toLowerCase().trim()

  const isOnlineOfferAsk = /chamada|videochamad|v[ií]deo\s*call|\bcall\b|\bpack\b|webnamoro|\bchat\b|\bmin\b|minuto|\bhora\b|pix|assinatura|conte[uú]do|ao vivo|online|foto|pack|pre[cç]o|valor/.test(t)

  if (!isOnlineOfferAsk && /encont[rro] presencial|te encontrar pessoal|sair junto|sair comigo|sa[ií]r com (voc[eê]|vc)|presencial|na vida real|fazer programa|(^|[^a-z])programa([^a-z]|$)|(^|[^a-z])gp([^a-z]|$)|acompanhante|cobra pra (sair|transar|fazer)|quanto (voc[eê] )?cobra pra (sair|transar)|te pagar pra (sair|te ver|transar)|pagar pra (sair|te ver)|me encontra|vir (aqui|a[ií]) te|ir (a[ií]|ai) te ver|hotel|motel|airbnb|transar pessoal|sexo presencial|te ver pessoalmente|ficar comigo (pessoal|de verdade)|vem pra c[aá]|tu quer sair|quer sair pra/.test(t)) {
    return {
      intent: 'encontros',
      confidence: 0.95,
      reply: offlineRefuseReply(locale),
      show_menu: false,
      suggest_step: 'closed_offline',
    }
  }
  return null
}

async function geminiIntent(
  message: string,
  history: string[],
  locale: string = 'pt',
): Promise<IntentResult | null> {
  const { key, model } = await getGeminiKey()
  if (!key) {
    console.warn('[funnel-intent] GEMINI_API_KEY ausente')
    return null
  }

  const loc = String(locale || 'pt').toLowerCase().slice(0, 2)
  const langName: Record<string, string> = {
    pt: 'português do Brasil',
    en: 'English',
    es: 'español',
    fr: 'français',
    de: 'Deutsch',
    it: 'italiano',
  }
  const lang = langName[loc] || langName.pt
  const langRule =
    loc === 'pt'
      ? 'Responda SEMPRE em português do Brasil (natural, safadinha).'
      : `Responda SEMPRE em ${lang}. Do NOT reply in Portuguese unless the lead writes in Portuguese.`

  const hist = (history || []).slice(-10).join('\n')
  const prompt = `Você é a Wanessa Borges no chat do seu site (estilo WhatsApp).
Tom: natural, safadinha, direta. Parece mulher real no celular.
IDIOMA OBRIGATÓRIO: ${langRule}
(Locale do lead: ${loc})

OBJETIVO ÚNICO: CONVERTER o lead em compra de UMA destas ofertas ONLINE (nunca presencial):
1) PACK de conteúdo (fotos/vídeos)
2) VIDEOCHAMADA ao vivo
3) CHAT PAGO / sexting (desbloquear mensagens)
4) VÍDEO AVULSO personalizado
5) FOTO / mídia avulsa (via pack ou chat+mídia)
6) WEBNAMORO

NÃO é papo de amizade. NÃO prolongue conversa casual. Depois de 1 resposta curta de conexão, DIRECIONE pra oferta.

PREÇOS FIXOS em BRL (use SEMPRE estes números; formate no idioma da resposta, ex: R$ 9,90 ou $9.90 BRL):
- Videochamada 10 min R$ 99,90 | 20 min R$ 149,90 | 30 min R$ 229,90 | 1h R$ 399,90
- Pack gostinho R$ 29,90 | Pack Gold R$ 79,90 | Combo R$ 109,90
- Liberar mensagens no chat: R$ 9,90 (único valor de desbloqueio de chat — não invente outros)
- Webnamoro 7d R$ 179,90 | 15d R$ 299,90 | 30d R$ 499,90
- Vídeo avulso: peça descrição e sugira faixa R$ 49,90 a R$ 149,90 conforme complexidade

PLAYBOOKS (obrigatório; escreva a reply no idioma do lead):

A) PREÇO / VALOR / QUANTO CUSTA / COMO PAGA:
→ Liste 3-4 opções com preço e pergunte qual ele quer.
suggest_step=menu, show_menu=true

B) COMO É O CONTEÚDO / O QUE TEM:
→ Explique packs + chamada + chat em 1-2 falas e feche com preço de entrada (pack R$ 29,90).
intent=pack ou video, suggest_step=packs ou menu

C) Pede FOTO grátis:
→ Não manda grátis. Oferece pack R$ 29,90 ou combo/mídia com preço.
intent=pack, suggest_step=packs

D) SEXO / DESEJO / quero te ver:
→ Videochamada (a partir de R$ 99,90) ou chat R$ 9,90.
intent=video ou chat

E) NAMORO:
→ Webnamoro a partir de R$ 179,90.
intent=webnamoro, suggest_step=webnamoro

F2) SÓ CONVERSAR / papo grátis / digitar no chat:
→ Único valor: R$ 9,90 pra liberar mensagens. NÃO ofereça menu de outros valores de chat.
intent=chat, suggest_step=chat_unlock, show_menu=false

F) Saudação (hi, oi, hello, hola…):
→ 1 fala curta + já pergunta o que ele quer (pack / call / chat).
NÃO fique só em "e você?" em loop.

G) Papo casual:
→ Resposta mínima e desvio pra oferta.

H) "Tá caro" / too expensive:
→ Ofereça a mais barata: pack R$ 29,90 ou chat R$ 9,90.

I) Confirma tempo de chamada:
→ Confirme preço e peça pagamento (PIX no BR; fora do BR diga que o pagamento será no checkout).
intent=video

REGRAS DE ESTILO:
- Respostas CURTAS (1-2 frases por bolha). Use ||| para separar bolhas.
- Máximo 1 emoji por fala.
- PROIBIDO: "pode repetir", "quero te entender certinho", "conta mais" vazio.
- Sempre avance a venda (qual oferta / pagar / qual tempo).
- NUNCA invente encontro presencial.
- NUNCA misture idiomas na mesma reply (exceto nomes de produto se necessário).

Intenções JSON: video | video_avulso | pack | webnamoro | chat | papo | encontros | unknown

Responda APENAS JSON válido:
{"intent":"...","confidence":0.0-1.0,"reply":"...","show_menu":true|false,"suggest_step":"menu|video_consult|video_avulso|packs|webnamoro|chat_unlock|chat|closed_offline|null"}

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
          temperature: 0.85,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn('[funnel-intent] gemini', res.status, errText.slice(0, 200))
      return null
    }
    const data = await res.json().catch(() => ({} as any))
    const rawText = String(
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ||
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        '',
    ).trim()
    if (!rawText) {
      console.warn('[funnel-intent] empty gemini text', data?.candidates?.[0]?.finishReason)
      return null
    }

    let parsed: any = null
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const m = rawText.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          parsed = JSON.parse(m[0])
        } catch {}
      }
    }
    if (!parsed || typeof parsed !== 'object') return null

    const reply = String(parsed.reply || '').trim()
    // bloqueia replies genéricas proibidas (PT/EN)
    const banned =
      /pode repetir com outras palavras|quero te entender certinho|conta mais|can you rephrase|tell me more about what you want$/i.test(
        reply,
      )
    if (banned) {
      console.warn('[funnel-intent] gemini gerou genérico proibido, descartando')
      return null
    }

    return {
      intent: String(parsed.intent || 'unknown'),
      confidence: Number(parsed.confidence) || 0.5,
      reply: reply.slice(0, 600),
      show_menu: !!parsed.show_menu,
      suggest_step: parsed.suggest_step ? String(parsed.suggest_step) : null,
    }
  } catch (e: any) {
    console.warn('[funnel-intent] geminiIntent', e?.message || e)
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

  // Idioma do lead (front envia locale; fallback Accept-Language)
  let locale = String(body?.locale || body?.lang || '').trim().toLowerCase().slice(0, 2)
  if (!locale || locale.length < 2) {
    const al = String(getHeader(event, 'accept-language') || '').toLowerCase()
    const m = al.match(/\b(pt|en|es|fr|de|it)\b/)
    locale = m ? m[1] : 'pt'
  }

  // Bloqueio offline local
  const offline = localOfflineBlock(message, locale)
  if (offline) {
    return { ok: true, ...offline }
  }

  // Só Gemini. Falha = ok:false + reply vazia (front não manda nada)
  const ai = await geminiIntent(message, history, locale)
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
      reply: offlineRefuseReply(locale),
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
