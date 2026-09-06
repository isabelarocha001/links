/** Build id — muda a cada deploy. Sem cache. */
export default defineEventHandler((event) => {
  const id =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.BUILD_ID ||
    String(Date.now())
  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  return {
    ok: true,
    build: String(id).slice(0, 12),
    env: process.env.VERCEL_ENV || 'unknown',
  }
})
