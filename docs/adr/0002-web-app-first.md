# ADR 0002: Web app first, mobile apps later

- Status: accepted
- Date: 2026-11-05
- Issues: #32 (goal and roadmap), #3 (frontend), #16 (offline)

## Context

Kasa Genesis is a small project with one product to prove: children aged about 4 to 10 listening to stories in Twi and Ewe. Readers will mostly use budget Android phones on slow, expensive data. We need to ship, learn and change quickly, and we cannot maintain several clients yet.

## Decision

We build a responsive web app first. Mobile apps (a wrapper or a native app) come later, once the web product is proven.

## Alternatives considered

| Option | For | Against |
| --- | --- | --- |
| **Web app first** (chosen) | One codebase, instant updates, links work in WhatsApp and search (#52), no app store review or fees, installable as a PWA and usable offline (#16). | Less access to some device features; app store discovery is lost for now. |
| Native Android/iOS first | Best device integration and store presence. | Two codebases, slow releases, store fees and review, and a heavier download for the families we want to reach. |
| Cross-platform framework (React Native, Flutter) | One codebase for both stores. | Still store-bound, and the web would be a second product. |

## Consequences

- The frontend lives in `web/` and is designed phone first, with tablet and desktop layouts.
- Offline use and slow connections are web concerns we must solve ourselves (#16).
- Revisit when we need push notifications, store distribution or device features the web cannot give.
