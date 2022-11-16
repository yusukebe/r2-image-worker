import {Hono} from 'hono'
import {sha256} from 'hono/utils/crypto'
import {basicAuth} from 'hono/basic-auth'
import {detectType} from './utils'


interface Env {
  BUCKET: R2Bucket
  USER: string
  PASS: string
}

interface Data {
  body: string
}

const maxAge = 60 * 60 * 24 * 30

const app = new Hono<Env>()


// app.use('*', basicAuth({ ...users[0]}))

app.get('/', async (c, next) => {
  const auth = basicAuth({username: c.env.USER, password: c.env.PASS, realm: 'hono'})
  return await auth(c, next)
})
app.put('/', async (c, next) => {
  const auth = basicAuth({username: c.env.USER, password: c.env.PASS, realm: 'hono'})
  return await auth(c, next)
})
app.put('/upload', async (c) => {
  const data = await c.req.json<Data>()
  const base64 = data.body
  if (!base64) return c.notFound()
  if (base64.startsWith('data:')) {
    const type = base64.split(';')[0].split(':')[1].split('/')[1]
    const image = Uint8Array.from(atob(base64.split(',')[1]), (c) => c.charCodeAt(0))
    const mime_type = base64.split(';')[0].split(':')[1]
    const key = (await sha256(image)) + '.' + type
    await c.env.BUCKET.put(key, image, {httpMetadata: {contentType: mime_type}})
    return c.text(key)
  } else {
    const type = detectType(base64)
    if (!type) return c.notFound()

    const body = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

    const key = (await sha256(body)) + '.' + type?.suffix
    await c.env.BUCKET.put(key, body, {httpMetadata: {contentType: type.mimeType}})

    return c.text(key)
  }
})

app.get('/', (c) => {
  return c.html(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>R2ImageWorker</title>
        <style>
            body {
                text-align: center;
                font-family: "PT Mono";
                font-style: italic;
                margin-top: 10px;
            }
        </style>
      </head>
      <h1 style="font-weight: lighter;">Welcome to R2ImageWorker</h1>
      <body>
        Paste your image here.
                <p id="uploading"></p>
        </body>
      <footer></footer>
      <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
      <script>
        // window.addEventListener('paste', ... or
    document.onpaste = function(event){
  var items = (event.clipboardData || event.originalEvent.clipboardData).items;
  var blob = items[0].getAsFile();
  var reader = new FileReader();
  reader.onload = function(event){
    $("#uploading").text("Uploading...")
    $.ajax({
        url: '/upload',
        type: 'PUT',
        data: JSON.stringify({body: event.target.result}),
        success: function (data) {
            const image_url = 'https://${c.req.headers.get("host")}/image/' + data
            document.body.innerHTML += '<hr><img style="max-width:500px" src="' + image_url + '" />'
            document.body.innerHTML += '<br>URL is: <a target="_blank" href="' + image_url + '">' + image_url + '</a>'
            $("#uploading").text("")
        }
    })
    
  }
  
  reader.readAsDataURL(blob);
}

</script>
    </html>
  `)
})

app.get('/image/:key', async (c) => {
  const key = c.req.param('key')

  const object = await c.env.BUCKET.get(key)
  if (!object) return c.notFound()
  const data = await object.arrayBuffer()
  const contentType = object.httpMetadata.contentType || ''

  return c.body(data, 200, {
    'Cache-Control': `public, max-age=${maxAge}`,
    'Content-Type': contentType,
  })
})

export default app
