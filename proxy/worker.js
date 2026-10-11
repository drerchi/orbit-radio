export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = url.searchParams.get('url')

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400 })
    }

    let upstream
    try {
      upstream = new URL(target)
    } catch {
      return new Response('Invalid stream URL', { status: 400 })
    }

    try {
      const response = await fetch(upstream, {
        headers: {
          Accept: '*/*',
          'User-Agent': 'Mozilla/5.0 OrbitRadio/1.0',
        },
      })

      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type')

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers })
      }

      return new Response(response.body, {
        status: response.status,
        headers,
      })
    } catch (error) {
      return new Response(`Unable to proxy stream: ${String(error)}`, { status: 502 })
    }
  },
}
