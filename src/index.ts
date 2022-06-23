import { Hono } from 'hono'
import { sha256 } from 'hono/utils/crypto'
import { basicAuth } from 'hono/basic-auth'
import { detectType } from './utils'

interface Env {
  BUCKET: R2Bucket
  R2_IMAGE_KV: KVNamespace
  USER: string
  PASS: string
}

interface Data {
  body: string
}

type MetaData = {
  contentType: string
}

const app = new Hono<Env>()

app.put('/upload', async (c, next) => {
  const auth = basicAuth({ username: c.env.USER, password: c.env.PASS })
  await auth(c, next)
})

app.put('/upload', async (c) => {
  const data = await c.req.json<Data>()
  const base64 = data.body
  if (!base64) return c.notFound()

  const type = detectType(base64)
  if (!type) return c.notFound()

  const body = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  const key = (await sha256(body)) + '.' + type?.suffix
  await c.env.BUCKET.put(key, body, { httpMetadata: { contentType: type.mimeType } })

  return c.text(key)
})

app.get('*', async (c, next) => {
  const key = c.req.url
  const cache = caches.default
  const response = await cache.match(key)
  if (!response) {
    await next()
    c.event?.waitUntil(cache.put(key, c.res.clone()))
  } else {
    return response
  }
})

app.get('/:key', async (c) => {
  const key = c.req.param('key')

  const res = await c.env.R2_IMAGE_KV.getWithMetadata<MetaData>(key, {
    type: 'arrayBuffer',
  })

  let data: ArrayBuffer | null = res.value
  let contentType: string = ''

  if (data) {
    contentType = res.metadata?.contentType || ''
  } else {
    const object = await c.env.BUCKET.get(key)
    if (!object) return c.notFound()
    data = await object.arrayBuffer()
    contentType = object.httpMetadata.contentType || ''
    c.executionCtx?.waitUntil(
      c.env.R2_IMAGE_KV.put(key, data, {
        metadata: { contentType },
      })
    )
  }

  return c.body(data, 200, {
    'Content-Type': contentType,
  })
})

export default app
