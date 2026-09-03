export type Locale = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it'

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'pt'
  const list = [...(navigator.languages || []), navigator.language || 'pt']
  for (const raw of list) {
    const code = String(raw || '').toLowerCase().slice(0, 2)
    if (code === 'pt') return 'pt'
    if (code === 'en') return 'en'
    if (code === 'es') return 'es'
    if (code === 'fr') return 'fr'
    if (code === 'de') return 'de'
    if (code === 'it') return 'it'
  }
  return 'pt'
}

/** BR market only: pt-BR (or bare "pt"). Portugal (pt-PT) is international. */
export function isBrazilAudience(): boolean {
  if (typeof navigator === 'undefined') return true
  const list = [...(navigator.languages || []), navigator.language || 'pt-BR'].map((x) =>
    String(x || '').toLowerCase().replace(/_/g, '-'),
  )
  // Prefer explicit region if present
  for (const tag of list) {
    if (tag === 'pt-pt' || tag.startsWith('pt-pt-')) return false
    if (tag === 'pt-br' || tag.startsWith('pt-br-')) return true
  }
  // No explicit BR/PT region: if any Portuguese tag ("pt"), treat as BR (main market)
  for (const tag of list) {
    if (tag === 'pt' || tag.startsWith('pt-')) return true
  }
  return false
}

/** BR market only: pt-BR (or bare "pt"). Portugal (pt-PT) is international. */
export function isBrazilAudience(): boolean {
  if (typeof navigator === 'undefined') return true
  const list = [...(navigator.languages || []), navigator.language || 'pt-BR'].map((x) =>
    String(x || '').toLowerCase().replace(/_/g, '-'),
  )
  // Prefer explicit region if present
  for (const tag of list) {
    if (tag === 'pt-pt' || tag.startsWith('pt-pt-')) return false
    if (tag === 'pt-br' || tag.startsWith('pt-br-')) return true
  }
  // No explicit BR/PT region: if any Portuguese tag ("pt"), treat as BR (main market)
  for (const tag of list) {
    if (tag === 'pt' || tag.startsWith('pt-')) return true
  }
  return false
}

type Dict = Record<string, string>

const pt: Dict = {
  waName: 'Criadora de conteúdo · Wanessa',
  waTyping: 'digitando…',
  waOnline: 'online',
  waDay: 'Hoje',
  waPlaceholder: 'Responda pelos botões acima',
  q1: 'Oi 😊 Você já assinou Privacy, PrivSex ou VIP de alguma criadora?',
  q1yes: 'Sim, já assinei',
  q1no: 'Nunca assinei nada',
  q2: 'Você já me conhece pelo Instagram?',
  q2yes: 'Sim',
  q2no: 'Não',
  q3: 'O que você busca aqui agora?',
  q3assinar: 'Quero assinar o VIP hoje',
  q3precos: 'Quero ver preços / opções',
  q3olhando: 'Só estou olhando',
  qPay: 'Você estaria disposto a pagar por conteúdo exclusivo de uma criadora como eu?',
  qPayYes: 'Sim, estou disposto',
  qPayNo: 'Não, não pagaria',
  rejectPay: 'Obrigada. Este espaço é só pra quem valoriza e investe em conteúdo exclusivo.',
  rejectNever: 'Obrigada. Este espaço é exclusivo pra quem já valoriza conteúdo pago. Não libero acesso pra quem nunca assinou nada.',
  rejectIg: 'Obrigada. Você não é o tipo de pessoa que estou procurando.',
  rejectCurious: 'Obrigada. Este espaço é pra quem já está pronto pra assinar. Quando decidir, volta aqui.',
  passAssinar: 'Perfeito. Vou te levar pro bot VIP e às opções de compra…',
  passPrecos: 'Perfeito. Entrando nas opções e valores…',
  portalBadge: 'Portal',
  privTitle: 'PrivSex',
  privDesc: 'Aqui você desbloqueia meu conteúdo pago, chat privado, sou tua noiva virtual, faço lives e chamadas de vídeo ao vivo.',
  privEnter: 'Entrar no portal →',
  tgBadge: 'Telegram',
  pubTitle: 'Canal Público',
  pubDesc: 'Meu canal público onde posto todos os teasers dos meus filmes pagos.',
  pubEnter: 'Entrar →',
  vipTitle: 'Bot pra assinar o VIP no Telegram',
  vipDesc: 'Assinatura instantânea · acesso imediato ao conteúdo',
  directLabel: 'Privado · somente venda de conteúdo',
  waTitle: 'WhatsApp privado',
  waSub: 'Só venda de conteúdo',
  tgPrivTitle: 'Telegram privado',
  tgPrivSub: 'Só venda de conteúdo',
  bioMeta: 'Criadora de conteúdo · Catarinense · 22 anos',
  bioText: 'Presença digital com mais de 30 mil pessoas. O que você encontra aqui é o que não cabe no Instagram.',
  posts: 'posts',
  followers: 'seguidores',
  following: 'seguindo',
  followersCount: '32,2 mil',
  waPrefill: 'Quero mais informações sobre o seu conteúdo VIP',
}

const en: Dict = {
  waName: 'Content creator · Wanessa',
  waTyping: 'typing…',
  waOnline: 'online',
  waDay: 'Today',
  waPlaceholder: 'Reply using the buttons above',
  q1: 'Hi 😊 Have you ever subscribed to Privacy, PrivSex or a creator VIP?',
  q1yes: 'Yes, I have',
  q1no: 'Never subscribed',
  q2: 'Do you already know me from Instagram?',
  q2yes: 'Yes',
  q2no: 'No',
  q3: 'What are you looking for right now?',
  q3assinar: 'I want to join VIP today',
  q3precos: 'I want to see prices / options',
  q3olhando: 'Just browsing',
  qPay: 'Would you be willing to pay for exclusive content from a creator like me?',
  qPayYes: 'Yes, I would',
  qPayNo: 'No, I would not pay',
  rejectPay: 'Thanks. This space is only for people who value and invest in exclusive content.',
  rejectNever: 'Thanks. This space is only for people who already value paid content.',
  rejectIg: 'Thanks. You are not the type of person I am looking for.',
  rejectCurious: 'Thanks. This space is for people ready to subscribe. Come back when you decide.',
  passAssinar: 'Perfect. Taking you to the VIP bot and purchase options…',
  passPrecos: 'Perfect. Opening options and prices…',
  portalBadge: 'Portal',
  privTitle: 'PrivSex',
  privDesc: 'Unlock my paid content, private chat, I am your virtual girlfriend, live streams and live video calls.',
  privEnter: 'Enter portal →',
  tgBadge: 'Telegram',
  pubTitle: 'Public Channel',
  pubDesc: 'My public channel where I post all teasers of my paid films.',
  pubEnter: 'Enter →',
  vipTitle: 'Bot to subscribe VIP on Telegram',
  vipDesc: 'Instant subscription · immediate content access',
  directLabel: 'Private · content sales only',
  waTitle: 'Private WhatsApp',
  waSub: 'Content sales only',
  tgPrivTitle: 'Private Telegram',
  tgPrivSub: 'Content sales only',
  bioMeta: 'Content creator · From Santa Catarina · 22',
  bioText: 'Digital presence with over 30k people. What you find here does not fit on Instagram.',
  posts: 'posts',
  followers: 'followers',
  following: 'following',
  followersCount: '32.2k',
  waPrefill: 'I want more information about your VIP content',
}

const es: Dict = {
  ...en,
  waName: 'Creadora de contenido · Wanessa',
  waTyping: 'escribiendo…',
  waDay: 'Hoy',
  waPlaceholder: 'Responde con los botones de arriba',
  q1: 'Hola 😊 ¿Ya te has suscrito a Privacy, PrivSex o al VIP de alguna creadora?',
  q1yes: 'Sí, ya me suscribí',
  q1no: 'Nunca me suscribí',
  q2: '¿Ya me conoces por Instagram?',
  q2yes: 'Sí',
  q2no: 'No',
  q3: '¿Qué buscas aquí ahora?',
  q3assinar: 'Quiero el VIP hoy',
  q3precos: 'Quiero ver precios / opciones',
  q3olhando: 'Solo estoy mirando',
  qPay: '¿Estarías dispuesto a pagar por contenido exclusivo de una creadora como yo?',
  qPayYes: 'Sí, estaría dispuesto',
  qPayNo: 'No, no pagaría',
  rejectPay: 'Gracias. Este espacio es solo para quien valora e invierte en contenido exclusivo.',
  rejectNever: 'Gracias. Este espacio es solo para quien ya valora el contenido de pago.',
  rejectIg: 'Gracias. No eres el tipo de persona que busco.',
  rejectCurious: 'Gracias. Este espacio es para quien ya está listo para suscribirse.',
  passAssinar: 'Perfecto. Te llevo al bot VIP y a las opciones…',
  passPrecos: 'Perfecto. Entrando en opciones y precios…',
  privDesc: 'Aquí desbloqueas mi contenido de pago, chat privado, soy tu novia virtual, hago lives y videollamadas en vivo.',
  privEnter: 'Entrar al portal →',
  pubTitle: 'Canal Público',
  pubDesc: 'Mi canal público donde publico todos los teasers de mis películas de pago.',
  pubEnter: 'Entrar →',
  vipTitle: 'Bot para suscribirte al VIP en Telegram',
  vipDesc: 'Suscripción instantánea · acceso inmediato al contenido',
  directLabel: 'Privado · solo venta de contenido',
  waTitle: 'WhatsApp privado',
  waSub: 'Solo venta de contenido',
  tgPrivTitle: 'Telegram privado',
  tgPrivSub: 'Solo venta de contenido',
  bioMeta: 'Creadora de contenido · Catarinense · 22 años',
  bioText: 'Presencia digital con más de 30 mil personas. Lo que encuentras aquí no cabe en Instagram.',
  posts: 'pubs',
  followers: 'seguidores',
  following: 'siguiendo',
  followersCount: '32,2 mil',
  waPrefill: 'Quiero más información sobre tu contenido VIP',
}

const fr: Dict = {
  ...en,
  waName: 'Créatrice de contenu · Wanessa',
  waTyping: 'écrit…',
  waDay: "Aujourd'hui",
  waPlaceholder: 'Réponds avec les boutons ci-dessus',
  q1: 'Salut 😊 As-tu déjà pris Privacy, PrivSex ou le VIP d’une créatrice ?',
  q1yes: 'Oui, déjà',
  q1no: 'Jamais',
  q2: 'Tu me connais déjà sur Instagram ?',
  q2yes: 'Oui',
  q2no: 'Non',
  q3: 'Que cherches-tu ici maintenant ?',
  q3assinar: 'Je veux le VIP aujourd’hui',
  q3precos: 'Je veux voir les prix / options',
  q3olhando: 'Je regarde seulement',
  rejectNever: 'Merci. Cet espace est réservé à ceux qui valorisent déjà le contenu payant.',
  rejectIg: 'Merci. Tu n’es pas le profil que je cherche.',
  rejectCurious: 'Merci. Cet espace est pour ceux prêts à s’abonner.',
  passAssinar: 'Parfait. Je t’emmène vers le bot VIP…',
  passPrecos: 'Parfait. Ouverture des options et tarifs…',
  privDesc: 'Débloque mon contenu payant, chat privé, je suis ta petite amie virtuelle, lives et appels vidéo en direct.',
  privEnter: 'Entrer dans le portail →',
  pubTitle: 'Canal public',
  pubDesc: 'Mon canal public où je poste tous les teasers de mes films payants.',
  pubEnter: 'Entrer →',
  vipTitle: 'Bot pour prendre le VIP sur Telegram',
  vipDesc: 'Abonnement instantané · accès immédiat au contenu',
  directLabel: 'Privé · vente de contenu uniquement',
  waTitle: 'WhatsApp privé',
  waSub: 'Vente de contenu uniquement',
  tgPrivTitle: 'Telegram privé',
  tgPrivSub: 'Vente de contenu uniquement',
  bioMeta: 'Créatrice de contenu · Santa Catarina · 22 ans',
  bioText: 'Présence digitale auprès de plus de 30k personnes. Ce que tu trouves ici ne tient pas sur Instagram.',
  posts: 'posts',
  followers: 'abonnés',
  following: 'abonnements',
  followersCount: '32,2k',
  waPrefill: 'Je veux plus d’informations sur ton contenu VIP',
}

const de: Dict = {
  ...en,
  waName: 'Content Creatorin · Wanessa',
  waTyping: 'tippt…',
  waDay: 'Heute',
  waPlaceholder: 'Antworte mit den Buttons oben',
  q1: 'Hi 😊 Hast du schon Privacy, PrivSex oder VIP einer Creatorin abonniert?',
  q1yes: 'Ja, schon',
  q1no: 'Noch nie',
  q2: 'Kennst du mich schon von Instagram?',
  q2yes: 'Ja',
  q2no: 'Nein',
  q3: 'Was suchst du hier gerade?',
  q3assinar: 'Ich will heute VIP',
  q3precos: 'Ich will Preise / Optionen sehen',
  q3olhando: 'Nur schauen',
  rejectNever: 'Danke. Dieser Bereich ist nur für Menschen, die bezahlte Inhalte schätzen.',
  rejectIg: 'Danke. Du bist nicht die Person, die ich suche.',
  rejectCurious: 'Danke. Dieser Bereich ist für Leute, die bereit sind zu abonnieren.',
  passAssinar: 'Perfekt. Ich bringe dich zum VIP-Bot…',
  passPrecos: 'Perfekt. Optionen und Preise werden geöffnet…',
  privDesc: 'Hier freischaltest du meine bezahlten Inhalte, privaten Chat, ich bin deine virtuelle Freundin, Lives und Videoanrufe live.',
  privEnter: 'Portal betreten →',
  pubTitle: 'Öffentlicher Kanal',
  pubDesc: 'Mein öffentlicher Kanal mit allen Teasern meiner bezahlten Filme.',
  pubEnter: 'Eintreten →',
  vipTitle: 'Bot für VIP auf Telegram',
  vipDesc: 'Sofort-Abo · sofortiger Zugang zu Inhalten',
  directLabel: 'Privat · nur Content-Verkauf',
  waTitle: 'Privates WhatsApp',
  waSub: 'Nur Content-Verkauf',
  tgPrivTitle: 'Privates Telegram',
  tgPrivSub: 'Nur Content-Verkauf',
  bioMeta: 'Content Creatorin · Santa Catarina · 22',
  bioText: 'Digitale Präsenz mit über 30k Menschen. Was du hier findest, passt nicht auf Instagram.',
  posts: 'Beiträge',
  followers: 'Follower',
  following: 'Folge ich',
  followersCount: '32,2k',
  waPrefill: 'Ich möchte mehr Infos zu deinem VIP-Content',
}

const it: Dict = {
  ...en,
  waName: 'Content creator · Wanessa',
  waTyping: 'sta scrivendo…',
  waDay: 'Oggi',
  waPlaceholder: 'Rispondi con i pulsanti sopra',
  q1: 'Ciao 😊 Hai già sottoscritto Privacy, PrivSex o VIP di qualche creator?',
  q1yes: 'Sì, già',
  q1no: 'Mai',
  q2: 'Mi conosci già da Instagram?',
  q2yes: 'Sì',
  q2no: 'No',
  q3: 'Cosa cerchi qui adesso?',
  q3assinar: 'Voglio il VIP oggi',
  q3precos: 'Voglio vedere prezzi / opzioni',
  q3olhando: 'Sto solo guardando',
  rejectNever: 'Grazie. Questo spazio è solo per chi valorizza già i contenuti a pagamento.',
  rejectIg: 'Grazie. Non sei il tipo di persona che cerco.',
  rejectCurious: 'Grazie. Questo spazio è per chi è pronto a iscriversi.',
  passAssinar: 'Perfetto. Ti porto al bot VIP…',
  passPrecos: 'Perfetto. Apro opzioni e prezzi…',
  privDesc: 'Qui sblocchi i miei contenuti a pagamento, chat privata, sono la tua fidanzata virtuale, live e videochiamate live.',
  privEnter: 'Entra nel portale →',
  pubTitle: 'Canale pubblico',
  pubDesc: 'Il mio canale pubblico dove posto tutti i teaser dei miei film a pagamento.',
  pubEnter: 'Entra →',
  vipTitle: 'Bot per abbonarti al VIP su Telegram',
  vipDesc: 'Abbonamento istantaneo · accesso immediato ai contenuti',
  directLabel: 'Privato · solo vendita di contenuti',
  waTitle: 'WhatsApp privato',
  waSub: 'Solo vendita di contenuti',
  tgPrivTitle: 'Telegram privato',
  tgPrivSub: 'Solo vendita di contenuti',
  bioMeta: 'Content creator · Santa Catarina · 22 anni',
  bioText: 'Presenza digitale con oltre 30 mila persone. Quello che trovi qui non sta su Instagram.',
  posts: 'post',
  followers: 'follower',
  following: 'seguiti',
  followersCount: '32,2 mila',
  waPrefill: 'Voglio più informazioni sul tuo contenuto VIP',
}

const ALL: Record<Locale, Dict> = { pt, en, es, fr, de, it }

export function t(locale: Locale, key: string): string {
  return ALL[locale]?.[key] || ALL.pt[key] || key
}
