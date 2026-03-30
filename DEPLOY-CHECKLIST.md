# BrycePerry.org Deployment Checklist

## Before Publish

- Confirm `bryceperry.org` is allowed in the Google reCAPTCHA configuration used by the shared Doing Life Today form backend.
- Confirm the shared Doing Life Today endpoints are live and reachable:
  - `https://dolifetoday.com/api/public-config`
  - `https://dolifetoday.com/api/contact`
  - `https://dolifetoday.com/api/subscribe`
- Confirm the shared backend is allowed to keep using the same MailerLite groups as Doing Life Today.

## Files Added Or Updated

- `site.js` now sends Bryce form submissions to the shared Doing Life Today backend instead of calling MailerLite directly from the browser.
- `images/bryce-home.jpg` is now the homepage portrait.
- `images/bryce-about.jpg` is now the About page portrait.
- `og-image.jpg` is now the local social preview image.

## Publish Steps

- Deploy the current Bryce site files, including:
  - `site.js`
  - `index.html`
  - `about.html`
  - `contact.html`
  - `privacy.html`
  - `images/bryce-home.jpg`
  - `images/bryce-about.jpg`
  - `og-image.jpg`
- If the host uses a manual upload flow, verify the new `images/` folder and `og-image.jpg` were uploaded.

## Live Tests After Publish

- Open the homepage and confirm the hero/about portrait loads from the local site, not GitHub.
- Open the About page and confirm the portrait loads from the local site.
- Submit the newsletter form with a real address and verify:
  - reCAPTCHA appears and validates
  - success message displays
  - subscriber lands in the expected MailerLite audience/group
- Submit the contact form with a test inquiry and verify:
  - reCAPTCHA appears and validates
  - success message displays
  - inquiry lands in the expected MailerLite contact flow
- Share the homepage URL in a preview tool or messaging app and confirm the social card uses `og-image.jpg`.

## Spot Checks

- Confirm the contact form note matches the live behavior.
- Confirm the newsletter note matches the live behavior.
- Confirm browser console is clean during newsletter and contact submissions.
- Confirm no pages still reference GitHub `user-attachments` images.

## Rollback Targets

- If form submissions fail, first check reCAPTCHA domain configuration.
- If social previews fail, verify `og-image.jpg` is published at `https://bryceperry.org/og-image.jpg`.
- If portraits fail, verify the `images/` directory was uploaded with both Bryce image files.