# Menuor

Menuor is a multi-restaurant menu platform. Each restaurant can optionally attach
its own domain from the restaurant dashboard.

## Local Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Custom Domain Setup

The app stores a restaurant domain as pending until the VPS confirms DNS and issues
a Let's Encrypt certificate. Before verification, public links and QR codes continue
using `APP_BASE_URL`.

On the VPS:

1. Point the restaurant's DNS `A` record to the VPS public IP.
2. Keep the app container bound to `127.0.0.1:3030` so nginx is the public entrypoint.
3. Install `nginx`, `certbot`, `python3-certbot-nginx`, `postgresql-client`, and `dnsutils`.
4. Copy `scripts/provision-domains.sh` to the host, make it executable, and run it every five minutes with the production `DATABASE_URL`:

```cron
*/5 * * * * DATABASE_URL='postgresql://...' CERTBOT_EMAIL='ops@example.com' SERVER_IPS='203.0.113.10' /opt/menuor/scripts/provision-domains.sh >> /var/log/menuor-domain-provision.log 2>&1
```

The script creates the nginx reverse proxy, reloads nginx, requests the certificate,
enables HTTP-to-HTTPS redirect, and marks `domainVerifiedAt` only after certificate
issuance succeeds. It also removes managed nginx configs when an owner changes or
removes a domain.

For near-immediate provisioning after an owner saves a domain, run the included
`scripts/domain-provisioner-server.js` as the host service
`scripts/menuor-domain-provisioner.service`. Set the same
`DOMAIN_PROVISIONER_SECRET` in the app environment and `/etc/menuor/domain-provisioner.env`.
The app trigger is best-effort and the cron job remains the retry fallback.

For a verified custom domain, `/` shows the landing page when enabled; otherwise `/`
shows the menu. `/menu` remains available when the landing page is enabled.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
