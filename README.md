# Snippets — Code & Note Workspace

[![Next.js 14](https://img.shields.io/badge/Next.js-14.1.0-black?logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Storage](https://img.shields.io/badge/Storage-Offline--Ready-teal)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
[![Zero Backend](https://img.shields.io/badge/Backend-Zero_Required-emerald)](https://github.com/imranpollob)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Screenshot](./Screenshot.jpeg)

**Snippets** is a distraction-free developer knowledge and code snippet manager designed and built by **Imran Pollob**.

It enables developers, engineers, and creators to instantly capture, organize, and copy reusable code fragments, shell commands, and rich markdown notes with zero latency, zero backend requirement, and complete privacy.

---

## Key Highlights & CV-Worthy Engineering Features

### 1. Frictionless Snippet Creation & Instant Search Interface
- **Quick-Capture Dock**:
  - Direct paste-and-go with instant auto-focus on the code canvas.
  - **Real-Time Language Auto-Detection**: As you paste or type, automatically detects 10+ languages (TypeScript, Python, SQL, Docker/YAML, Go, Rust, Bash, HTML, CSS).
  - **Dynamic Smart Title Generator**: Derives meaningful titles automatically from docstrings, top comments (`// React debounce hook`), or function signatures (`def parse_log()`).
  - **1-Click Tag Chips**: Toggle frequently-used tags (`#React`, `#TypeScript`, `#Utility`, `#DevOps`, `#SQL`, `#Python`) in one click.
  - **Live Tabs**: Instant toggle between Write and Preview modes.
  - **Power-User Shortcut**: `⌘ + Enter` / `Ctrl + Enter` saves immediately.

- **Omni-Search Hub**:
  - Global `⌘ + K` or `/` shortcut to jump directly to search from anywhere on the page.
  - Concurrent multi-field search across titles, code, tags, and languages with live highlight markers.
  - Interactive clickable language count pills (`All (4)`, `TypeScript (1)`, `Docker (1)`, `Bash (1)`, etc.).
  - Sort by Newest, Most Recent, or Alphabetical.

- **Dual View Modes**:
  - **Grid View**: Rich preview cards with syntax-highlighted code blocks, line numbers, and metadata.
  - **Compact List View**: Dense, scannable rows engineered for fast scanning of large code libraries.
  - **1-Click Copy**: Prominently featured on every card and row with animated checkmark feedback.

---

### 2. Standalone Client-Side Architecture (Zero Backend Required)
- **Standalone Persistence**:
  - Runs entirely client-side in browser `localStorage` with zero setup or API keys needed.
  - Anyone viewing your portfolio (recruiters, peers, hiring managers) can immediately test the full app without hitting login barriers or broken API errors.
  - Pre-seeded with curated developer starter snippets (React hooks, Docker Compose, Git workflows, SQL window queries).
  - Optional Firebase sync support when environment variables are supplied.

---

### 3. Rich Text & Multi-Language Syntax Highlighting
- Live syntax highlighting for JavaScript, TypeScript, Python, HTML/CSS, SQL, Bash/Shell, YAML/Docker, Go, Rust, and Markdown.
- Monospace line numbering with hover guides.
- Distraction-free formatting toolbar (**Bold**, *Italic*, # Headings, • Lists, `Inline Code`, and `</>` Code block insertion).

---

### 4. Personal Brand & Modern Design System
- Customized personal brand token palette (`--brand-50` to `--brand-950` teal scale, primary `#0d9488` / `#14b8a6`).
- High-resolution **iP** ribbon logo monogram.
- Editorial & Developer typography pairing:
  - **Outfit** (modern geometric headings)
  - **Plus Jakarta Sans** (clean modern UI body)
  - **JetBrains Mono** (precise monospace code)
- Persistent **Light & Dark Mode** toggle with anti-FOUC inline script and system preference sync.

---

### 5. Production-Grade SEO & Web Standards
- Next.js App Router dynamic metadata, OpenGraph tags, and Twitter Cards with custom social preview.
- Web App Manifest (`manifest.js`) for progressive web app (PWA) installability.
- Dynamic `sitemap.js` and `robots.js`.
- Schema.org JSON-LD structured data (`WebApplication` / `SoftwareApplication`).

---

### 6. Data Portability & Keyboard Shortcuts
- **Full Library Export/Import**: Export your entire snippet repository as a portable JSON backup file and restore it on any machine.
- **Markdown Export**: Export any individual snippet as a standalone `.md` file.
- **Global Keyboard Shortcuts**:
  - `C` or `⌥ + N` / `Alt + N` – Open new snippet composer
  - `⌘ + K` / `Ctrl + K` or `/` – Focus instant search bar
  - `⌘ + Enter` – Save snippet immediately
  - `Esc` – Close modal, dialog, or search
  - `?` – Open keyboard shortcuts reference

---

## Tech Stack

| Layer           | Technology                                                                                                                                                                                                            |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**   | [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)                                                                                                                                            |
| **UI Library**  | [React 18](https://react.dev/)                                                                                                                                                                                        |
| **Typography**  | `next/font/google` ([Outfit](https://fonts.google.com/specimen/Outfit), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)) |
| **Styling**     | Modern CSS Variables, Semantic Tokens, Glassmorphism, Dark Mode `[data-theme]`                                                                                                                                        |
| **Persistence** | Browser Storage (`localStorage`) + Optional Firebase Firestore                                                                                                                                                        |
| **SEO & PWA**   | Dynamic Manifest, Robots, Sitemap, JSON-LD Schema                                                                                                                                                                     |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/imranpollob/snippet-notes.git
cd snippet-notes
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app runs immediately with sample snippets ready to use!

### 3. Build for Production

```bash
npm run lint
npm run build
npm run start
```

### 4. Optional: Enable Firebase Cloud Sync

If you wish to enable Google Authentication and cloud Firestore sync in addition to local storage, create a `.env.local` file:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Deploy to GitHub Pages (`github.io`)

This project is configured for 1-click automated deployment to GitHub Pages via GitHub Actions:

1. In your GitHub repository, navigate to **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Push your code to `main` (or run the workflow manually under **Actions** → **Deploy to GitHub Pages**).
4. Your site will automatically build and publish to `https://<your-username>.github.io/<repo-name>/`!

*Note: If using Firebase, add your Firebase keys under **Settings** → **Secrets and variables** → **Actions**.*

---

## Author

Crafted with attention to detail by **Imran Pollob**.
- GitHub: [@imranpollob](https://github.com/imranpollob)
