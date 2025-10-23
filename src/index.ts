import { Hono } from 'hono/tiny'
import { cache } from 'hono/cache'
import { sha256 } from 'hono/utils/crypto'
import { basicAuth } from 'hono/basic-auth'
import { getExtension } from 'hono/utils/mime'
import * as z from 'zod'

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

const imageParameterSchema = z.object({
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  quality: z.coerce.number().optional()
})

const getPreferredContentType = (acceptHeader: string | undefined, fallback: string) => {
  if (acceptHeader) {
    const types = ['image/avif', 'image/webp']
    for (const type of types) {
      if (acceptHeader.includes(type)) {
        return type
      }
    }
  }
  return fallback
}

app.get('/:key', async (c) => {
  const key = c.req.param('key')

  const object = await c.env.BUCKET.get(key)
  if (!object) return c.notFound()
  const contentType = object.httpMetadata?.contentType ?? ''

  const query = c.req.query()

  if (Object.keys(query).length !== 0 && c.env.IMAGES) {
    const schemaResult = imageParameterSchema.safeParse(query)
    if (schemaResult.success) {
      const preferredContentType = getPreferredContentType(c.req.header('Accept'), contentType)
      const parameters = schemaResult.data
      const imageResult = await c.env.IMAGES.input(object.body).transform(parameters).output({
        //@ts-expect-error the contentType maybe valid format
        format: preferredContentType,
        quality: parameters.quality
      })
      const res = imageResult.response()
      res.headers.set('Cache-Control', `public, max-age=${maxAge}`)
      return res
    }
  }

  const data = await object.arrayBuffer()
  return c.body(data, 200, {
    'Cache-Control': `public, max-age=${maxAge}`,
    'Content-Type': contentType
  })
})

export default app
