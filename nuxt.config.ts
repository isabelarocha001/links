export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  ssr: true,

  runtimeConfig: {
    supabaseServiceKey:
      process.env.SUPABASE_SERVICE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2xtbWhidWZvc210aWdhYWt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjMzMTQ1OSwiZXhwIjoyMTAxOTA3NDU5fQ.mLI9yoIaBvNBvu5RiBh5M5INDz9ygQMy20GLUuq6srA',
    adminSessionSecret:
      process.env.ADMIN_SESSION_SECRET || 'wanessa-links-session-secret-change-me',
    syncpayClientId: process.env.SYNCPAY_CLIENT_ID || '',
    syncpayClientSecret: process.env.SYNCPAY_CLIENT_SECRET || '',
    syncpayWebhookUrl: process.env.SYNCPAY_WEBHOOK_URL || '',
    public: {
      supabaseUrl:
        process.env.SUPABASE_URL || 'https://sgolmmhbufosmtigaakx.supabase.co',
      supabaseAnonKey:
        process.env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2xtbWhidWZvc210aWdhYWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMzE0NTksImV4cCI6MjEwMTkwNzQ1OX0.-MDLmEa2LaW_3Y6d5mpUFML6SqjPJLPNh4Dxv1a7yC8',
    }
  },

  app: {
    head: {
      title: 'Wanessa | Links',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Todos os meus links em um só lugar' },
        { name: 'theme-color', content: '#0a0a0c' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
        },
        { rel: 'dns-prefetch', href: 'https://t.me' },
        { rel: 'dns-prefetch', href: 'https://privsex.com' },
        { rel: 'preconnect', href: 'https://t.me', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://privsex.com', crossorigin: 'anonymous' }
      ]
    }
  },

  css: ['~/assets/css/main.css']
})
