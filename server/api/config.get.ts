export default defineEventHandler(async () => {
  const supabase = useAnonSupabase()
  const { data, error } = await supabase
    .from('link_page_config')
    .select('name, bio, avatar_url, links, updated_at')
    .eq('id', 'main')
    .single()

  if (error || !data) {
    return {
      name: 'Wanessa',
      bio: 'Creator • Conteúdo & Links',
      avatar_url: 'https://i.pravatar.cc/200?img=5',
      links: [
        { label: 'Prévia Telegram', icon: '📱', url: '#' },
        { label: 'Telegram VIP', icon: '⭐', url: '#' },
        { label: 'PrivSex', icon: '🔥', url: 'https://privsex.com' }
      ]
    }
  }

  return data
})
