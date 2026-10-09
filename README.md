# Ledger

A personal finance dashboard. Log your spending, set monthly budgets per category, and get short AI-written notes about where your money went.

**Live demo:** https://finance-dashboard-khizar9.vercel.app

> The API runs on a free host, so the first load after a quiet period can take up to a minute. Sign-in is Google only.

<!-- Add 2-3 screenshots here (docs/ folder): the dashboard, the budgets page, the add-transaction form -->

## What it does

- **Dashboard.** Total spent this month with the change from last month, a category pie chart, and a spending trend line.
- **AI insights.** Three short notes per month (a trend, a warning, a tip) written by Gemini from your totals.
- **Add transactions.** Leave the category blank and Gemini picks one from Food, Transport, Bills, Shopping, Entertainment, Health or Other.
- **Budgets.** Set a monthly limit per category and watch an animated progress bar fill.
- **Transactions list.** Browse and delete entries.

## Design decisions

- **Own look.** A custom palette (ink, parchment, moss, marigold, brick) and a serif, sans and mono type mix, with a "ledger tape" receipt component, instead of a default dashboard theme.
- **Safe AI fallback.** If Gemini fails, a transaction is filed under "Other" and insights come back empty, so the page never breaks.
- **Validated input.** Zod schemas check every create and update request.
- **Rate limits.** A general limit on the API and a tighter one on the AI insights route.
- **Month handling.** Budget months are stored as UTC dates to avoid timezone mismatches.
- **Loading and errors.** Skeleton loaders and retry buttons on each panel.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Auth | NextAuth with Google OAuth |
| Backend | Node.js, Express, Zod |
| Database | PostgreSQL (Neon), Prisma 7 |
| AI | Google Gemini |
| Hosting | Vercel (web), Render (API) |

## Project layout

```
backend/    Express API: transactions, budgets, categories, dashboard, Gemini
frontend/   Next.js app: dashboard, transactions, budgets, sign-in
```

## Run it locally

1. Create a Postgres database (Neon works) and a Google OAuth client.
2. In `backend/`, create `.env` with `DATABASE_URL`, `GEMINI_API_KEY` and `PORT`. Then run `npm install` and `npm run dev`.
3. In `frontend/`, create `.env.local` with `DATABASE_URL`, `DIRECT_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` and `NEXT_PUBLIC_API_URL`. Then run `npm install`, `npx prisma db push`, `npx prisma generate` and `npm run dev`.
4. Open http://localhost:3000.

## Known limits

- Amounts are in Rs and there is no currency setting.
- Transactions are entered by hand; there is no bank import or receipt scanning yet.
- Free-tier Gemini quotas limit AI categorization and insights.

## Author

Khizar Islam Rathore, Software Engineering student at the University of Karachi.
GitHub: github.com/Khizar-Islam | LinkedIn: linkedin.com/in/khizar-islam-rathore
