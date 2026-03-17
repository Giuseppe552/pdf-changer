# Contributing to PDF Changer

## Reporting bugs

Open an issue. Include which tool you were using, your browser, and any console errors.

## Pull requests

1. Fork the repo
2. Create a branch from `main`
3. Make your changes
4. Run `npm run lint` and `npm test`
5. Test in the browser — open the tool and process a real PDF
6. Open a PR against `main`

Keep PRs focused. One feature or fix per PR.

## Architecture

```
apps/
  web/     React SPA — all PDF processing, VPE sandbox, SSG pages
  api/     Hono on Cloudflare Workers — auth, billing only
packages/
  shared/  Types shared between apps
```

All PDF processing is client-side. If your change requires sending data to a server, open an issue to discuss first.

## Code style

- TypeScript strict mode
- All processing must work offline (no network calls from tool pages)
- Bundle budgets are enforced — if your change increases a page's bundle size significantly, the build will fail
- Test any byte-level operations with real PDFs, not just synthetic data

## Security

If you find a security vulnerability — especially anything that could leak file contents — **do not open a public issue**. Email contact@giuseppegiona.com instead.

## Privacy rule

PDF Changer's core promise is that files never leave the browser. Any PR that breaks this will be rejected. No exceptions.
