# r2-image-worker

Store and Deliver images with Cloudflare R2 backend Cloudflare Workers.

## Synopsis

1. Make a base64 strings from the image file such as `.png`, `jpg`, or `gif`.
2. `PUT` the base64 strings to **r2-image-worker**.
3. Image binary will be stored in Cloudflare R2 storage.
4. **r2-image-worker** will respond the key of the stored image.
5. Image will be cached in Cloudflare KV.

```
Image => base64 => r2-image-worker => R2 => r2-image-worker => key
```

## Prerequisites

* Cloudflare Account
* Access privilege for Cloudflare R2 beta
* Wrangler CLI

## Set up


First, `git clone`

```
git clone https://github.com/yusukebe/r2-iamge-worker.git
cd r2-image-worker
```

Create R2 bucket:

```
wrangler r2 bucket create images
```

Create KV namespace:

```
wrangler kv:namespace create "R2_IMAGE_KV"
wrangler kv:namespace create "R2_IMAGE_KV" --preview
```


Copy `wrangler.example.toml` to `wrangler.toml`:


```
cp wrangler.example.toml wrangler.toml
```

Edit `wrangler.toml`.


## Variables

### Secret variables

Secret variables are:

- `NAME` - User name of basic auth
- `PASS` - User password of basic auth

To set these, use `wrangler secret put` command:

```bash
wrangler secret put NAME
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

```
Authorization: Basic ...
```

Body:

Value of `body` is Basic64 string of image binary.

```json
{
  "body": "Base64 Text..."
}
```

## Use with Shortcuts

Awesome!!!

![SS](https://user-images.githubusercontent.com/10682/167978838-b3ef2d72-81ac-4058-b161-ccb2b4f0bc16.gif)

Setting shortcuts like this:

![Screenshot](https://r2-image-worker.yusukebe.workers.dev/6b371c81284926f01c7af462a1d67c287fed94049570704048eb3ca09097b2c8.png)

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
