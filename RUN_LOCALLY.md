# Running TicketTrade on your PC

This guide gets the app running locally so you can see it in your browser.
Everything here has been tested end to end.

You'll run **two things at once**: the backend (Flask/Python) and the
frontend (React). Use **two separate PowerShell windows**.

---

## One-time setup

You need **Python** and **Node.js** installed. If you already installed them,
skip to the next section.

- Python: https://www.python.org/downloads/  — on the first install screen,
  check the box **"Add Python to PATH"** (easy to miss, causes problems if skipped).
- Node.js: https://nodejs.org/ — get the **LTS** version.

To confirm they're installed, open PowerShell and run:

    python --version
    node --version

Both should print a version number.

---

## Window 1 — Backend (Flask)

    cd C:\Users\Colle\tickettrade
    pip install -r requirements.txt
    python app.py

You should see something like `Running on http://127.0.0.1:5000`.
Leave this window open — it's your backend server.

Notes:
- It uses a local **SQLite** database (a file called `tickettrade.db` that
  appears automatically). No PostgreSQL needed for local dev.
- The database tables are created automatically the first time it runs.
- Stripe keys are **not** required to run locally. Everything works except the
  final "pay" step, which needs keys added later.

---

## Window 2 — Frontend (React)

Open a **second** PowerShell window:

    cd C:\Users\Colle\tickettrade\client
    npm install
    npm start

The first `npm install` takes a minute or two. Then a browser tab opens
automatically at **http://localhost:3000** with the app running.

---

## Trying it out

1. Click **Sign Up** and make an account.
2. Click **Sell Ticket**, pick a Phish show, set a price, create the listing.
3. Go **Home** — your listing shows up.
4. Open it, and (from a second account, or an incognito window) make an offer.
5. Check the **Dashboard** — you'll see your listings, offers received, and
   the purchases/sales tabs.

---

## Stopping the servers

In each PowerShell window, press **Ctrl+C**.

---

## Before you ever go live (not needed for local testing)

- Set a proper `JWT_SECRET_KEY` (a long random string) in a `.env` file.
  The dev default is short and only fine for local use.
- Switch `DATABASE_URL` to PostgreSQL for production.
- Add your real Stripe keys to enable payments.

---

## If something doesn't work

- **"python is not recognized"** — Python isn't on PATH. Reinstall and check
  "Add Python to PATH", or use `py app.py` instead of `python app.py`.
- **Frontend can't reach backend** — make sure Window 1 (Flask) is still
  running. The frontend expects it at http://localhost:5000.
- **Port already in use** — an old server is still running. Close other
  PowerShell windows or restart your PC.
