This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## Nurture Sequence

Automated email sequence for low-intent leads (timeline="researching" or intent_level="low").

### Overview

Low-intent leads automatically receive 3 educational emails spaced over 3 weeks:
- **Email #1**: Sent immediately (day 0) - "Ce presupune FIV în România – pași generali"
- **Email #2**: Sent 7 days after Email #1 - "Când este momentul potrivit pentru a începe FIV?"
- **Email #3**: Sent 14 days after Email #2 (day 21) - "Doriți să discutăm opțiunile disponibile?"

### Cron Schedule

Cron runs daily at 09:00 UTC (11:00 Europe/Bucharest in winter, 12:00 in summer) via Vercel Cron.

The cron job is configured in `vercel.json` and calls `/api/internal/run-nurture`.

### Manual Testing

To test the nurture endpoint manually:

```bash
curl -X POST https://your-domain.com/api/internal/run-nurture \
  -H "x-internal-token: your-token"
```

Replace `your-token` with the value from `INTERNAL_CRON_TOKEN` environment variable.

### Safety Features

Nurture emails stop automatically when:
- Lead is sent to clinic (via operator panel `/api/leads/[id]/send`)
- Lead submits new form with same email address
- Lead manually unsubscribes (via unsubscribe link in emails)

### Database Migration

Run the migration to add nurture columns:

```sql
-- See scripts/migration-005-nurture-sequence.sql
```

This adds:
- `nurture_stage` (INTEGER) - Current email stage (0-3)
- `nurture_next_at` (TIMESTAMP) - When to send next email
- `nurture_completed` (BOOLEAN) - Stops all future nurture emails

### Environment Variables

Required for nurture sequence:
- `INTERNAL_CRON_TOKEN` - Token for protecting the cron endpoint
- `RESEND_API_KEY` - For sending emails
- `RESEND_FROM_EMAIL` - From address for emails
- `NEXT_PUBLIC_SITE_URL` - Used in email unsubscribe links
