# UBMS – static website preview (GitHub Pages)

A static copy of the **Unified Barangay Management System** public website, with sample data
("Barangay Sample"). It shows the design and the resident journey; **nothing is saved or sent** –
forms run in demo mode and every page shows a "static preview" notice.

| Page | What it shows |
|---|---|
| `index.html` | Home: hero, quick actions, online services, how it works, figures, officials, verify box |
| `services.html` | Services & Citizen's Charter (requirements, fees, steps, processing time) |
| `officials.html` | Barangay officials |
| `register.html` | The 5-step resident registration wizard (ends with a demo confirmation) |
| `verify.html` | Document verification – try control number **CLR-2026-000123** |
| `verify-result.html` | Sample "genuine & valid" verification result |
| `login.html`, `privacy.html`, `404.html` | Sign-in page (demo), privacy notice, not-found page |

## Publish on GitHub Pages

1. Create a GitHub repository (for example `ubms-preview`).
2. Upload the **contents** of this folder to the repository root – including the hidden `.nojekyll` file.
3. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder `/ (root)` → Save.
4. After a minute the site is live at `https://<your-username>.github.io/ubms-preview/`.

All links are relative, so the site also works from a sub-folder or opened through any static web server.

## Rebuild after changing the real site

The pages are rendered from the real templates in `ubms/system/app/Views` with sample data:

```
php tools/build-static.php
```

Sample data (barangay name, officials, services, figures) is at the top of `tools/build-static.php`.
After changing CSS or JS in `ubms/assets`, copy that folder here again (`assets/`), then copy
`tools/static-assets/demo.js` to `assets/js/demo.js`.
