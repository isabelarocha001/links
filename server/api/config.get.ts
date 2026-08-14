export default defineEventHandler(async () => {
  const supabase = useAnonSupabase()
  const { data, error } = await supabase
    .from('link_page_config')
    .select('name, bio, avatar_url, links, updated_at')
    .eq('id', 'main')
    .single()

  const DEFAULT = {
    name: 'Wanessa',
    bio: 'língua bifurcada · o resto tu descobre 👅',
    avatar_url: '',
    links: [
      { label: 'Canal de prévias', icon: '📱', url: 'https://t.me/+yA5Y1pAWx5RlMWIx' },
      { label: 'Telegram VIP', icon: '⭐', url: 'https://t.me/wanessaavipbot?start=pressel' },
      { label: 'PrivSex', icon: '🔥', url: 'https://privsex.com/wanessa' }
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

  return data
})
