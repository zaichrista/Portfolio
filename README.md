# Portfolio website

A security-first, five-page personal portfolio intended for prospective employers. The current presentation is deliberately simple and demonstrates working multi-page navigation while leaving room for the final visual design.

## Pages

- Home (`public/index.html`)
- About (`public/about.html`)
- Studio (`public/studio.html`)
- Archive of work (`public/archive.html`)
- Substack introduction (`public/substack.html`)

All five pages use the shared `public/styles.css` stylesheet and include links to the privacy and cookie policies.

## Run locally

Requirements: Node.js 20.11 or newer.

```sh
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. The server has no runtime package dependencies.
`npm start` is the production command and expects production environment variables to be provided by the hosting platform.

## Contact form

The endpoint `POST /api/contact` is disabled until `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` are configured. Browser requests must come from `SITE_ORIGIN` and send JSON containing:

```json
{
  "name": "Example Person",
  "email": "person@example.com",
  "company": "Example Ltd",
  "message": "A message of at least twenty characters.",
  "website": "",
  "startedAt": 1789228800000,
  "privacyAccepted": true
}
```

`website` is an invisible honeypot field and `startedAt` is the time the form was displayed, in Unix milliseconds. The endpoint validates input, limits body size and request frequency, checks the request origin, applies a submission-time check, and avoids logging message contents.

## Before publishing

- Replace the owner and contact placeholders in `public/privacy.html`, `public/cookies.html`, and `SECURITY.md`.
- Set the production `SITE_ORIGIN` and a random `RATE_LIMIT_SECRET` of at least 32 characters.
- Confirm the privacy terms of the chosen host and email provider.
- Add the real portfolio content and remove the temporary `noindex` directive from `public/index.html` when ready.
- Run `npm test`, deploy behind HTTPS, and verify the response headers in production.

## Security and privacy

No cookies, analytics, advertising, database, or persistent visitor tracking are enabled. Security headers use a restrictive content policy, contact data is sent directly to the configured inbox, and rate-limit identifiers are one-way hashed and kept only in process memory.

See [SECURITY.md](SECURITY.md), [the privacy policy](public/privacy.html), and [the cookie policy](public/cookies.html).
