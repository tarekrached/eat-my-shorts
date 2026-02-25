/**
 * Cloudflare Worker — BART CORS Proxy
 *
 * Proxies BART GTFS-RT and GTFS static endpoints, adding CORS headers
 * so the GitHub Pages frontend can fetch them directly.
 */

const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ROUTE_MAP: Record<string, string> = {
  '/gtfsrt/': 'https://api.bart.gov/gtfsrt/',
  '/gtfs-static/': 'https://www.bart.gov/dev/schedules/',
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const url = new URL(request.url)
    const path = url.pathname

    for (const [prefix, upstream] of Object.entries(ROUTE_MAP)) {
      if (path.startsWith(prefix)) {
        const target = upstream + path.slice(prefix.length)
        const upstreamResponse = await fetch(target, { redirect: 'follow' })

        const headers = new Headers(upstreamResponse.headers)
        for (const [k, v] of Object.entries(CORS_HEADERS)) {
          headers.set(k, v)
        }

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          headers,
        })
      }
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler
