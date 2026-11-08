# ELVIAN — Learn more. Work smart.

## About the developer

**Master Tonmoy Kumar Deb** is currently pursuing a Bachelor of Technology in Computer Science and Engineering. He loves turning ideas into working software, and his goal is to become a skilled software developer. He works with HTML5, CSS3, JavaScript, React, Python, C, C++ and MySQL, and he keeps adding new things to his toolbox. In August 2026 he participated in the Smart India Hackathon (SIH).

- Instagram: [@tonmoy_deb339](https://www.instagram.com/tonmoy_deb339/)
- LinkedIn: [Tonmoy Kumar Deb](https://www.linkedin.com/in/tonmoy-kumar-deb-45b4a9449/)

| Area | Skills |
|---|---|
| Programming languages | Python, C, C++, JavaScript |
| Frontend | HTML5, CSS3, JavaScript, React |
| Backend | Python |
| Frameworks & libraries | React |
| Database | MySQL |

## About Elvian

**Elvian** was made for gaining knowledge. It is a friendly assistant that helps you learn, understand and work smart: it explains things clearly, solves maths with real symbols, draws graphs and animated diagrams, shows reference pictures, reads your files and photos, and helps you finish tasks faster — so your time goes into learning and creating instead of searching.

---

## 1. Files and where they go

| File / folder | What it is | GitHub? |
|---|---|---|
| `index.html`, `e-ELVIAN.html`, `physical-elvian.html` | The website | ✅ upload |
| `help.html`, `privacy.html`, `terms.html` | Help Centre, Privacy Policy, Terms & Conditions | ✅ upload |
| `manifest.webmanifest`, `sw.js`, `assets/icons/*` | Install-as-app + offline + notifications | ✅ upload |
| `assets/tonmoy.jpg` | Your photo for the About card | ✅ upload |
| `server.js`, `package.json` | Optional backend (lock code, prompt counter, AI key) | ✅ upload (contains no secrets) |
| `.env.example`, `.gitignore`, `README.md` | Template, safety list, this guide | ✅ upload |
| **`.env`** | **Your secrets** (lock-code hash, backend settings) | ❌ **NEVER** |
| `state.json` | Backend counters (auto-created) | ❌ never (ignored) |

Keep all `.html` files, `manifest.webmanifest`, `sw.js` and `assets/` in the **same folder**.

## 1b. Where every file lives (and where secrets go)

| File | Your computer (`elv` folder) | GitHub repository | Render (the backend host) |
|---|---|---|---|
| `index.html`, `e-ELVIAN.html`, `physical-elvian.html`, `manifest.webmanifest`, `sw.js`, `assets/` | ✅ | ✅ upload | — |
| `server.js`, `package.json` | ✅ | ✅ upload (Render reads them from GitHub) | runs here |
| `.gitignore`, `.env.example`, `README.md` | ✅ | ✅ upload | — |
| **`.env`** (secrets) | ✅ keep **only here** + a private backup (password manager / USB) | ❌ never | ❌ not a file — type the same values into Render → **Environment Variables** |
| **`state.json`** (prompt counters) | ❌ you never create it (delete it if it appears while testing) | ❌ never | created **automatically** by the backend on Render's disk; lost on restart (free plan) |

So: `.env` is your private notebook on your own PC; Render gets the same values through its Environment page; GitHub gets neither `.env` nor `state.json`.

## 1c. Google sign-in — exactly what to enter in Google Cloud Console

Elvian uses the "Sign in with Google" button (Google Identity Services), which needs **no redirect address**.

1. console.cloud.google.com → create/select a project → **APIs & Services → OAuth consent screen**: *External*, app name `Elvian`, your e-mail; under **Test users** add your own Gmail.
2. **Credentials → Create credentials → OAuth client ID → Application type: Web application**.
3. **Authorised JavaScript origins → Add URI:** `https://YOURNAME.github.io` (only the site address: no `/repo-name`, no `/` at the end).
4. **Authorised redirect URIs:** leave it **empty** — not used.
5. Create → copy the **Client ID** (ends with `.apps.googleusercontent.com`). Never use the *Client secret*.
6. In `e-ELVIAN.html` change `gid:''` to `gid:'YOUR-ID.apps.googleusercontent.com'` and upload the file again (or paste it when Elvian asks). Wait a few minutes, then refresh.

## 2. Where does `.env` go? (important)

GitHub Pages only serves **static files**. It cannot read a `.env` file and it cannot run `server.js`. So:

- **The website** (GitHub Pages) needs **no** `.env`. Everything in the browser works without it.
- **`.env` is only for the optional backend** (`server.js`): the secret lock/unlock code, the 50-prompt counter and (optionally) your AI key. The backend must run on a Node host, **separate from GitHub Pages**.
- On a host such as **Render, Railway or Fly.io** you do not upload `.env` at all. You type the same values into the host's **Environment Variables** page. That *is* the `.env` there.
- On your own PC, keep `.env` next to `server.js` and run `node server.js`.

### Set up the backend on Render (free) — step by step
1. Render dashboard → **New → Web Service** → **Git Provider → GitHub** → *Authorize* → pick your Elvian repository.
2. Fill the form: **Name** `elvian-backend` · **Region** Singapore (closest to India) · **Branch** `main` · **Root Directory** (empty) · **Runtime** Node · **Build Command** `npm install` · **Start Command** `node server.js` · **Instance Type** Free.
3. Open **Environment Variables** and add (copy values from your private `.env`, never upload that file):
   - `UNLOCK_CODE_HASH` = the long text after `=` in your `.env`
   - `ALLOWED_ORIGIN` = your site address from GitHub → Settings → Pages, e.g. `https://yourname.github.io` (no path, no `/` at the end)
   - optional: `LLM_URL`, `LLM_KEY`, `LLM_MODEL`
4. Under **Advanced** set **Health Check Path** to `/api/health`, then **Create Web Service**. Wait for "Live".
5. Copy the address Render shows (like `https://elvian-backend.onrender.com`). Open `…/api/health` — you should see `{"ok":true}`.
6. In Elvian → **Settings → Secure backend** paste the address (or set `backend:''` at the top of `e-ELVIAN.html` and re-upload so every device uses it).

### Keeping the Render backend awake (so it never "goes to sleep")
Render's **free** web services stop after about 15 minutes without visitors, and the next visit then waits ~30–60 seconds to wake up. To keep it awake, use all three:
1. **Built-in keep-alive (already in `server.js`)** — while the service is running it pings its own address every 10 minutes. This needs no setup on Render.
2. **Free outside pinger (recommended backup)** — at uptimerobot.com (or cron-job.org) create an *HTTP(s) monitor* for `https://YOUR-SERVICE.onrender.com/api/health` every **5 minutes**. It also wakes the service if it ever restarts and e-mails you when it is down.
3. **Guaranteed option** — upgrade the instance to a paid plan (Starter). Paid services never sleep and can have a persistent disk.

Good to know: a free account has a monthly allowance of instance hours (about 750 — one always-on service fits; check Render's pricing page, it can change). Render can still restart a free service for maintenance or a new deploy, and a restart **erases `state.json`** (the prompt counters) unless you add a persistent disk (paid). Locked chats then reset — acceptable for testing, not for strict limits.

### If you already uploaded `.env` to GitHub
1. Delete it from the repository (`git rm --cached .env`, commit, push) and make sure `.gitignore` is uploaded.
2. Treat the code as exposed: make a **new** lock code with `node server.js --hash "new code"` and replace `UNLOCK_CODE_HASH` on your host.
3. If it held an AI key (`LLM_KEY`), **revoke it** with the AI provider and create a new one.
4. The file still exists in old commits; to remove it from history use GitHub's guide *"Removing sensitive data from a repository"* (or BFG Repo-Cleaner). Turning on **Secret scanning / push protection** (Repository → Settings → Code security) helps stop this in future.
5. The lock code is stored only as a salted scrypt hash, which is much safer than plain text — but a short or guessable code can still be cracked, so use a long one.

## 3. Install on phone / PC, notifications, widgets

**Install as an app** (needs the website to be opened from your GitHub address, not a file):
- **Android (Chrome):** ⋮ menu → *Install app* (or the **Install app** button in Elvian's sidebar).
- **iPhone / iPad (Safari):** Share → *Add to Home Screen*.
- **Windows / Mac / Chromebook (Chrome or Edge):** the install icon in the address bar.
After installing, long-pressing the app icon on Android/Windows shows shortcuts: **New chat, Ask by voice, Set a timer, Saved messages**. Elvian also appears in the Android **Share** menu so you can share text to it.

**Notifications:** Settings → *Device notifications*. Elvian then shows a notification in your device's notification panel when a **timer finishes** or an **answer is ready** while you are in another app or tab. On iPhone this works only after adding Elvian to the Home Screen (iOS 16.4+).

**Home-screen widgets — what is and isn't possible:** a website/PWA **cannot** create real Android or iPhone home-screen widgets; those must be built natively. What you get now is the installed app icon with the shortcuts above. Real widgets need a native app (Android: wrap the site with Capacitor/Trusted Web Activity and add a Kotlin widget; iOS: a Swift WidgetKit app). That is a good future project.

## 4. Lock / unlock code
- Every chat allows **50 prompts**; reminder at 40; at 50 the chat locks. **Alt+K** asks for the secret code to unlock (+50) or lock.
- The code is never in the web page; `.env` holds only a salted hash. Change it: `node server.js --hash "new code"`.
- Wrong guesses: 5 per 15 minutes per person.

## 5. Security — what is protected and what you must do
**Already built in:** all text is escaped before display; a Content-Security-Policy blocks unknown scripts, frames, plug-ins and form posts; files are read only on your device; code you run executes in an isolated background worker; links open with `noopener`; uploads are size-checked; message rate limit (6 per 30 s); the backend checks the website origin, validates every request, limits wrong codes, and never stores the code in plain text; API keys are never sent over an unprotected connection.

**You must:** never upload `.env`; keep the Google Client ID public but never a "client secret"; use a **long** lock code; if a key leaks, revoke it; prefer the backend (so the AI key stays on the server); keep your GitHub account protected with two-factor login.

**Honest limits:** a website alone cannot enforce the 50-prompt lock — anyone can edit their own browser. Real enforcement needs the backend. The CSP still allows inline scripts (the page is a single file), so it limits damage but is not a complete shield.

## 6. What Elvian can and cannot do
**Can:** chat and explain; answer today's date/time/day; maths with real symbols; graphs for any function (explicit, implicit, polar, parametric) and charts; animated diagrams; reference photos with credits and AI-made pictures; read pictures (AI vision, or text inside them), PDF, Word, PowerPoint, Excel, OpenDocument, RTF, ZIP, code/text and any other file (details at least); create PowerPoint/Word/Excel/PDF files and QR codes; timers with alarm; speak answers in a male Indian-English voice with word highlight; voice typing (stops after 3 s of silence); saved messages and saved answers; slideshow backgrounds; Google sign-in; installable app with shortcuts; device notifications.

**Cannot (yet):** make real home-screen widgets; send notifications when the app is completely closed (needs a push server); hear audio or watch video (only details and one frame); read scanned PDFs as text; guarantee live news (it uses Wikipedia/weather lookups and the AI's knowledge); enforce the prompt limit without the backend; work offline for AI answers.

## 7. Shortcuts and right-click menu
**Ctrl+1** splash screen · **Ctrl+2** Physical ELVIAN · **Ctrl+3** e-ELVIAN (Alt+1/2/3 work the same if your browser keeps Ctrl+number for tabs) · **F1** Help Centre.

**Right-click (or press and hold on a phone)** opens a menu that adapts to what you point at: cut / copy / paste / select all in the message box; copy a paragraph, point, whole list, table (or download CSV), code; copy or save a graph, picture or QR code; plus Select text, Set a timer, Lock / unlock chat, New chat, Saved messages, Settings and Help.

Enter send · Shift+Enter new line · Alt+N new chat · Ctrl+S sidebar · Ctrl+F full screen · Ctrl+H saved · Alt+D theme · Alt+S settings · Alt+M mic · Alt+L slideshow · Alt+K lock/unlock · Alt+↑ edit last · `/` focus · Esc stop · Ctrl+/ list.

## 8. Troubleshooting
- **"The free AI is busy"** — the free service is rate-limited; Elvian retries by itself. Add your own key in Settings for more speed.
- **No Indian male voice** — Windows: Settings → Time & language → Speech → add *English (India)* (Ravi / Prabhat). Edge has the best voices.
- **Google sign-in asks for a Client ID** — put it in `gid:''` at the top of `e-ELVIAN.html` and add your site address under *Authorised JavaScript origins*.
- **Photo missing in About** — add `assets/tonmoy.jpg`.
- **Tab icon missing or old** — the icon is now built into every page, so it shows even if the `assets` folder is missing. Refresh with Ctrl+F5 (browsers cache tab icons).

## 9. The app icon / logo does not show my custom logo
1. Make sure the **whole `assets/icons/` folder**, `favicon.ico`, `manifest.webmanifest` and `sw.js` were uploaded to GitHub next to the `.html` files. Open `https://YOURNAME.github.io/REPO/assets/icons/icon-192.png` in a browser — you must see the gold E with rings. A "page not found" there means the folder was not uploaded, and the browser then draws a plain letter "E".
2. Hard-refresh the site (Ctrl+Shift+R). Tab icons are cached for a long time — close the tab and reopen it.
3. **Uninstall the old app** (Chrome → ⋮ → Uninstall Elvian, or right-click the taskbar icon), then install it again. Operating systems copy the icon when the app is installed, so an old install keeps the old picture.

## 10. Quick Render checklist (backend)
Render → New → **Web Service** → *Git Provider* → **GitHub** → authorise → pick your repository → Branch `main` → Runtime **Node** → Build command *(empty)* → Start command `node server.js` → Instance **Free** → add the Environment Variables from section 2 → **Create Web Service**. When it says *Live*, copy the `https://….onrender.com` address into Elvian → Settings → Secure backend.
