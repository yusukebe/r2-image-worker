import { Hono } from 'hono/quick'
import { cache } from 'hono/cache'
import { sha256 } from 'hono/utils/crypto'
import { basicAuth } from 'hono/basic-auth'
import { getExtension } from 'hono/utils/mime'

const maxAge = 60 * 60 * 24 * 30

const app = new Hono<{ Bindings: Cloudflare.Env }>()

app.put('/upload', async (c, next) => {
  const auth = basicAuth({ username: c.env.USER, password: c.env.PASS })
  await auth(c, next)
})

app.put('/upload', async (c) => {
  const data = await c.req.parseBody<{ image: File; width: string; height: string }>()

  const body = data.image
  const type = data.image.type
  const extension = getExtension(type) ?? 'png'

  let key

  if (data.width && data.height) {
    key = (await sha256(await body.text())) + `_${data.width}x${data.height}` + '.' + extension
  } else {
    key = (await sha256(await body.text())) + '.' + extension
  }

  await c.env.BUCKET.put(key, body, { httpMetadata: { contentType: type } })

  return c.text(key)
})

app.get(
  '*',
  cache({
    cacheName: 'r2-image-worker'
  })
)

app.get('/:key', async (c) => {
  const key = c.req.param('key')

  const object = await c.env.BUCKET.get(key)
  if (!object) return c.notFound()
  const data = await object.arrayBuffer()
  const contentType = object.httpMetadata?.contentType ?? ''

  return c.body(data, 200, {
    'Cache-Control': `public, max-age=${maxAge}`,
    'Content-Type': contentType
  })
})

export default app
