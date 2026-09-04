export default defineEventHandler(async () => {
  const supabase = useAnonSupabase()
  const { data, error } = await supabase
    .from('link_page_config')
    .select('name, bio, avatar_url, links, highlight_label, quiz_enabled, updated_at')
    .eq('id', 'main')
    .single()

  const DEFAULT = {
    name: 'Wanessa',
    bio: 'língua bifurcada · o resto tu descobre 👅',
    avatar_url: '',
    highlight_label: 'PrivSex',
    quiz_enabled: false,
    links: [
      { label: 'PrivSex', icon: '🔥', url: 'https://privsex.com/wanessa' },
      { label: 'Telegram VIP', icon: '⭐', url: 'https://t.me/wanessaavipbot?start=pressel' },
      { label: 'Canal de prévias', icon: '📱', url: 'https://t.me/+yA5Y1pAWx5RlMWIx' }
    ]
  }

  if (error || !data) {
    return DEFAULT
  }

  // Limpa bio genérica antiga do painel
  const bio = (data.bio || '').trim()
  if (!bio || /creator|conteúdo\s*&?\s*links|content\s*&?\s*links/i.test(bio)) {
    data.bio = DEFAULT.bio
  }

  // Garante highlight (fallback PrivSex)
  if (!data.highlight_label || !String(data.highlight_label).trim()) {
    data.highlight_label = 'PrivSex'
  }

  // Quiz desativado por padrão (coluna pode ainda não existir)
  data.quiz_enabled = data.quiz_enabled === true

  return data
})
