# Mughai Mutram — Go Live Guide (Supabase)

Two separate sites share one online database (Supabase, free plan):

| Folder     | What it is                  | Who uses it          |
|------------|-----------------------------|----------------------|
| `website/` | Public site (`index.html`)  | Parents / visitors   |
| `admin/`   | Admin site (`index.html`)   | You (the owner) only |

When you publish something in the **admin**, it appears on the **website** for everyone.
When a parent submits the enquiry form on the **website**, it appears in **admin → Enquiries**.

---

## Step 1 — Create the Supabase project (5 minutes)

1. Go to <https://supabase.com> → sign in → **New project**.
2. Name: `mughai-mutram` · set a **database password** (save it) · Region: **South Asia (Mumbai)** if available · Create.
   Wait about a minute until it says the project is ready.

## Step 2 — Create the tables and security (2 minutes)

1. Open the file **`supabase-setup.sql`** from this package in a text editor.
2. Change `YOUR-ADMIN-EMAIL@gmail.com` (it appears once) to **your own email** — the one you will use to log in to the admin site.
3. In Supabase: **SQL Editor → New query** → paste the whole file → **Run**. You should see “Success”.

This creates the tables (announcement, photos, videos, enquiries), a public photo storage folder, and the safety rules:
visitors can **read** the site content and **add** an enquiry — nothing else. Only your admin email can change or read enquiries.

## Step 3 — Create your admin login

1. **Authentication → Users → Add user → Create new user**.
2. Email = the same email you put in the SQL file · choose a strong password · tick **Auto Confirm User** → Create.
3. **Authentication → Sign In / Providers** (or *Settings*) → switch **OFF** “Allow new users to sign up”, so nobody else can create accounts.

## Step 4 — Connect both sites

1. **Project Settings (gear) → API** (or the **Connect** button at the top).
2. Copy the **Project URL** and the **anon / public key** (a long text; newer projects call it the *publishable* key).
3. Open **`website/supabase-config.js`** and **`admin/supabase-config.js`** and replace `window.MM_SUPABASE = null;` with (same in both files):

```js
window.MM_SUPABASE = {
    url: "https://xxxxxxxx.supabase.co",
    anonKey: "eyJ..."
};
```

> Never paste the **service_role** / secret key anywhere in these files.

## Step 5 — Put both sites online

Upload each folder as its **own site** to a free static host, for example **Netlify** (drag the folder onto <https://app.netlify.com/drop>), **Cloudflare Pages**, **GitHub Pages** or **Vercel**.

* `website/` → your public address (e.g. `www.yourschool.in`)
* `admin/`   → a private address (e.g. `admin.yourschool.in`). Don't link to it from the public site.

Then set `window.MM_WEBSITE_URL` in **`admin/supabase-config.js`** to your public address (this powers the “View Visitor Website” button).

## Step 6 — Check it works

1. Open the admin site → sign in → top bar shows **● Live**.
2. **Announcement** → publish a message · **Photos** → add a photo · **Videos** → paste a YouTube link.
3. Open the public website on your phone → all three are there.
4. Fill the enquiry form on your phone → it shows up in **admin → Enquiries**.

---

## Good to know
* **Photos** are resized automatically and stored in Supabase Storage (1 GB free). The website shows the 24 newest photos and 12 newest videos.
* **Videos:** upload to YouTube (Unlisted is fine) and paste the link.
* The enquiry form still opens **WhatsApp** as well, so enquiries also reach your phone directly.
* **Free plan note:** Supabase pauses free projects after about a week with no activity. Regular visitors/admin use keeps it awake; if it ever pauses, press **Restore** in the Supabase dashboard.
* The **anon key** is meant to be public. The rules from Step 2 are what protect your data — don't skip that step.
* Admin → **Settings → Download Backup** saves everything to a file.
