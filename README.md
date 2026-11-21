# Store Ratings

React + Express + PostgreSQL implementation of the coding challenge.

## Run it

1. Create a PostgreSQL database named `store_ratings` and copy `.env.example` to `.env`.
2. `npm install`
3. `psql "$DATABASE_URL" -f server/schema.sql`
4. `npm run seed` (optional demo accounts)
5. `npm run dev`, then open `http://localhost:5173`.

Demo password for seeded accounts: `Password!1`

| Role | Email |
| --- | --- |
| Administrator | admin@example.com |
| Store owner | owner@example.com |
| User | user@example.com |

The API is served on port 3001. Change `VITE_API_URL` if it is hosted elsewhere.
