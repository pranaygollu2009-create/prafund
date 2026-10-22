# Prafund public reviews API

The `/reviews` wall posts reviews to a small public API instead of the
static-safe Supabase client, so a review submitted by any visitor shows up on
every visitor's wall. The worker in this folder is the exact code deployed to
the `prafund-reviews` site (Freebuff Sites → production):

- **Base URL:** `https://site-cbdd83d396b94426930c13c78aa7c323.freebuff.page`
- **Storage:** a D1 database bound as `REVIEWS` on both environments of that
  site; the worker creates its table + index lazily (`batch` of
  `CREATE TABLE IF NOT EXISTS` statements) on the first request.
- App code that calls it: [src/lib/mq/reviews.ts](../src/lib/mq/reviews.ts)
  (the `REVIEWS_API` constant, update it if the site URL ever changes).

## Endpoints

| Method + path | Description |
| --- | --- |
| `GET /reviews` | `{ rows: [...] }` newest first, max 500 |
| `POST /reviews` | `{ name, rating, body }` → `201 { review, delete_token }`. Name ≤ 40 chars, body 3–400 chars, integer rating 1–5. Max 5 posts per IP per hour (429 above that). |
| `DELETE /reviews?id=<id>&token=<delete_token>` | Removes the review; the token is returned at post time and stored in the poster's browser. |
| `OPTIONS /reviews` | CORS preflight, allowed origins: the GitHub Pages site, `prafund.co`, and `localhost:8080/5173` for development. |

## Redeploying

1. Edit `worker.js` here **and** in the deployed workspace copy
   (`prafund-reviews-api/worker.js`, the file Freebuff Sites deploys).
2. In the Codebuff chat: `sites_deploy` for site `prafund-reviews`
   (id `b91c3bc4-941f-446f-a486-93d60d03fd8f`) with
   `prafund-reviews-api/manifest.json`.
