# Fine Art Portrait Image Sitemap

This existing Next.js application reads the published Webflow Portrait Pages collection and serves `/portrait-image-sitemap.xml`. It includes the main portrait image, featured detail image, and additional detail images, removing duplicates within each page. It only performs CMS reads; it does not update the portrait website, CMS, or Webflow's default sitemap.

## Existing Webflow Cloud configuration

Inspection on October 12, 2026 confirmed:

- Repository: `paintyou/fineartportrait-image-sitemap`, application root `/`.
- Existing Cloud app: `fineartportrait-image-sitemap` (`1826f801-7cf1-40bb-b595-7a298a086596`).
- Existing environment: `7f587c96-91e8-46b8-8a26-14f2ebbf48cd`, tracking `main`, mounted at `/app`.
- Reported environment URL: `https://fineartportrait.webflow.io/app`.
- Latest deployment: failed for commit `c3c34bc3ca1657800ffd45dd66dfd02b496a2109`. Available logs end during framework dependency installation and do not expose a specific underlying error.
- No environment variables were configured. The service requires `WEBFLOW_API_TOKEN` as a server-only secret with read-only CMS access before it can return a sitemap.

Keep this app and environment. No new app or hosting is required for these code changes. The expected environment sitemap path is `/app/portrait-image-sitemap.xml`. Confirm the domain actually serving the app before submitting any URL to Google; the inspected environment URL is on `webflow.io`, while XML page URLs deliberately use `www.fineartportrait.com`.

## Compatibility and corrected-package comparison

The corrected ZIP has the same CMS collection, XML generation logic, and dependency versions as the original repository. Its substantive runtime change is `runtime = 'edge'`.

Do **not** adopt that change: Webflow Cloud uses the OpenNext Cloudflare adapter, which expects Next.js's `nodejs` runtime and translates it to Cloudflare Workers. Next.js's `edge` runtime is a different target. The route keeps `nodejs` and remains dynamic so a CMS token is not required at build time.

The ZIP's secret template, ignore rules, and React strict mode have been incorporated. The homepage now uses Next.js `Link` so the sitemap link receives the environment mount path, including when `/app` is opened without a trailing slash. Framework detection is explicitly declared in `webflow.json`. Dependencies remain on Next.js 15 / React 19, with patch updates and a committed npm lockfile. Node.js 22 or later matches Webflow's current requirements.

Webflow supplies the production adapter, base path, asset prefix, and worker configuration. Do not hard-code `/app` in the committed Next.js configuration. No storage bindings are needed, so a committed Wrangler configuration or adapter dependency is unnecessary.

References:

- https://developers.webflow.com/webflow-cloud/environment/configuration
- https://developers.webflow.com/webflow-cloud/bring-your-own-app
- https://developers.webflow.com/webflow-cloud/environment/framework-customization
- https://opennext.js.org/cloudflare

## Local validation

```sh
npm ci
npm test
npm run build
npm start
```

For local CMS access, copy `.env.example` to `.env.local` and configure a read-only token. Never commit the token or use a `NEXT_PUBLIC_` variable for it. A missing token or failed CMS request intentionally returns HTTP 503 with `Cache-Control: no-store`, rather than an empty sitemap.

Tests cover image fields, deduplication, XML escaping, unpublished-item filtering, CMS pagination, upstream errors, and HTTP success/failure behavior. Success responses request one-hour shared caching; actual caching depends on the hosting platform.

Before a future deployment, review the changes on a separate branch. Updating the tracked `main` branch can trigger an automatic Cloud deployment. This repair does not merge into `main`, trigger a deployment, publish Webflow, or submit to Search Console. A local build or adapter validation is not proof of a successful Webflow-hosted deployment.

## Repair validation and remaining blockers

- The production Next.js build and all four tests passed on Node.js 22.23.3.
- An isolated OpenNext Cloudflare 1.20.10 build succeeded with a simulated `/app` base path. Its temporary adapter and Wrangler files are outside this repository; Webflow supplies its own production configuration and adapter version.
- A local production Next.js HTTP check at `/app` returned HTTP 200 and the correctly mounted sitemap link. `/app/portrait-image-sitemap.xml` returned the expected uncached HTTP 503 without a token. This validates Next.js routing, not the Workers runtime.
- Local Workers preview was blocked by the execution environment: `uv_interface_addresses returned Unknown system error 1`. No Workers runtime success is claimed.
- This session can clone the repository but cannot push: Git reports no HTTPS authentication credentials. The repair is committed locally on `fix/webflow-cloud-compatibility`; remote `main` is unchanged.
- The existing Cloud environment has no `WEBFLOW_API_TOKEN` secret. A valid read-only token is required for live CMS integration testing and sitemap service.
- The existing hosted build remains failed. Its underlying dependency-installation error is not identified by the available logs. A future authorized deployment must verify whether the dependency updates resolve it.
