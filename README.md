# r2-image-worker

Store and deliver images with Cloudflare R2 backend Cloudflare Workers.

## Synopsis

1. Deploy **r2-image-worker** to Cloudflare Workers.
2. `PUT` your image file to **r2-image-worker**.
3. The image file will be stored in Cloudflare R2 storage.
4. **r2-image-worker** will respond the key of the stored image. `abcdef.png`
5. **r2-image-worker** serve the images on `https://r2-image-worker.username.workers.dev/abcdef.png`
6. Images will be cached on Cloudflare CDN.

```plain
User => Image => r2-image-worker => R2
User <= Image <= r2-image-worker <= CDN Cache <= R2
```

## Prerequisites

- Cloudflare Account
- Wrangler CLI
- _Optional: Custom domain - (Cache API is not available in `.workers.dev` domain)_

## Set up

First, `git clone`

```plain
git clone https://github.com/yusukebe/r2-image-worker.git
cd r2-image-worker
```

Create R2 bucket:

```plain
wrangler r2 bucket create images
```

Copy `wrangler.example.jsonc` to `wrangler.jsonc`:

```plain
cp wrangler.example.jsonc wrangler.jsonc
```

Edit `wrangler.jsonc`.

## Variables

### Secret variables

Secret variables are:

- `USER` - User name of basic auth
- `PASS` - User password of basic auth

To set these, use `wrangler secret put` command:

```bash
wrangler secret put USER
```

## Publish

To publish to your Cloudflare Workers:

```bash
npm run deploy
```

## Endpoints

### `/upload`

Header:

To pass the Basic Auth, add the Base64 string of "user:pass" to `Authorization` header.

```plain
Authorization: Basic ...
```

Body:

Value of `body` should be a `Form` contains an image binary and a width and a height.

- image: `File`
- width: `string` (optional)
- height: `string` (optional)

### Test

1. Download a simple image

```bash
wget https://hono.dev/images/hono-kawaii.png -O /tmp/1.jpg
```

2. Upload to u endpoint.

```bash
curl -X PUT \
  -F "image=@/tmp/1.jpg" \
  https://change_user_here:change_pass_here@change_url_here/upload \
  -vvv
```

3. Visit the image

```bash
https://change_user_here:change_pass_here@change_url_here/image_returned_in_step2
```

## Tips

### Using Cloudflare Images

You can deliver your images via [Cloudflare Images](https://developers.cloudflare.com/images/) if you are using a custom domain.

```plain
https://<ZONE>/cdn-cgi/image/format=auto,width=800,quality=75/<SOURCE-IMAGE>
```

### Using with Shortcuts

Awesome!!!

![Screen cast](https://github.com/user-attachments/assets/c9239e96-dce9-45ba-aa07-a94aa53b3ba7)

Setting shortcuts like this:

![Screenshot](https://ss.yusukebe.com/cdn-cgi/image/format=auto,quality=90/44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a_1530x2366.png)

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
