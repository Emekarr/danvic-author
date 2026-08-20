# DANVIC Author

This is a static, browser-rendered author workspace. It talks directly to the DANVIC backend through its `/api/author/*` compatibility API and does not require an application server.

1. Copy `.env.example` to `.env.local` and provide the public backend URL.
2. Add the deployed site origin to the backend's `CORS_ORIGINS` setting.
3. Run `npm install` and `npm run build`.
4. Deploy `out/` only.

For Cloudflare Pages, select **Next.js (Static HTML Export)**, use `npx next build`, set `out` as the output directory, and define `NEXT_PUBLIC_BACKEND_API_URL` and `NEXT_PUBLIC_DANVIC_APP=author` as build variables. Do not use `@cloudflare/next-on-pages`.

Course files follow Cloudflare's documented browser upload flow: the app requests a short-lived
presigned `PutObject` URL from the backend, then sends the raw file directly to that R2 S3 API URL
with `PUT` and a matching `Content-Type` header. The R2 bucket CORS rule must allow this app's exact
origin, `PUT`, and `Content-Type`. Do not add R2 credentials to this frontend.
