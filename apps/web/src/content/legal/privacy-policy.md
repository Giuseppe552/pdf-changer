# Privacy Policy

**Effective:** 2026-04-15

This policy explains what data PDF Changer collects, why, and what your rights are. The service is operated by Giuseppe Giona ("we", "us"), acting as data controller.

## The short version

- Your PDF files never leave your browser. We cannot see them.
- We do not run analytics, tracking pixels, or fingerprinting.
- We store the minimum needed for accounts and billing.
- We encrypt newsletter emails at rest.
- You can request deletion of your data at any time.

## What we collect and why

### Account data

If you create an account, we store:

| Data | Lawful basis (GDPR Art. 6) | Purpose |
|------|---------------------------|---------|
| Passkey public keys + counters | Contract performance (Art. 6(1)(b)) | Authenticate you |
| Plan status (free/paid) | Contract performance | Deliver the service you paid for |
| Stripe customer ID + subscription ID | Contract performance | Link your account to billing |
| Account creation timestamp | Legitimate interest (Art. 6(1)(f)) | Service operation and abuse prevention |
| Recovery code hashes | Contract performance | Allow account recovery |

We do **not** require an email address, phone number, real name, or any other personally identifying information for accounts.

### Newsletter (optional)

If you subscribe to product updates, we store:

| Data | Lawful basis | Purpose |
|------|-------------|---------|
| Email address (encrypted at rest with AES-256-GCM) | Consent (Art. 6(1)(a)) | Send product updates |
| Email hash (for deduplication) | Legitimate interest | Prevent duplicate subscriptions |

You can unsubscribe at any time via the unsubscribe link in every email, or by emailing privacy@pdfchanger.org. On unsubscribe, the encrypted email is marked inactive. On deletion request, it is permanently removed.

### Cookies

We use a single session cookie:

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| Session token | Authenticate your logged-in session | Browser session (cleared on close) | Strictly necessary (no consent required under PECR) |

We do not use tracking cookies, advertising cookies, or third-party cookies. No cookie consent banner is needed because we only use a strictly necessary cookie, which is exempt under the Privacy and Electronic Communications Regulations 2003 (PECR Reg. 6(4)).

## What we do not collect

Your PDF files never leave your browser. We cannot see them, we do not transmit them, and we have no server-side storage for user documents.

We do not store or log IP addresses in our own systems. (The underlying infrastructure — Cloudflare — processes IPs to deliver requests. That is how the internet works. We do not build profiles from them.)

There are no analytics scripts, tracking pixels, fingerprinting, session recorders, or heatmaps on this site. No Google Analytics, no Segment, no Mixpanel, no Hotjar, no Meta Pixel, no ad tags of any kind.

## Third-party processors

| Processor | Purpose | Data shared | Their privacy policy |
|-----------|---------|-------------|---------------------|
| Stripe (US) | Payment processing | Customer ID, subscription ID, payment method (handled by Stripe, not stored by us) | [stripe.com/privacy](https://stripe.com/privacy) |
| Cloudflare (US) | Hosting, DNS, DDoS protection | IP addresses transit Cloudflare's network | [cloudflare.com/privacypolicy](https://www.cloudflare.com/privacypolicy/) |

We do not share your data with any other third parties. We do not sell data. We do not use data for advertising.

## International data transfers

Stripe and Cloudflare are US-based companies. Data transiting their infrastructure may be processed in the United States. Both companies participate in data transfer mechanisms recognised under GDPR, including Standard Contractual Clauses (SCCs). Details are available in their respective privacy policies linked above.

## Data retention

| Data | Retention period |
|------|-----------------|
| Account data | Until you delete your account, or until we terminate it under the terms of service |
| Stripe identifiers | Retained as long as your account exists, then deleted within 30 days of account deletion |
| Newsletter email (active) | Until you unsubscribe |
| Newsletter email (unsubscribed) | Marked inactive immediately on unsubscribe; permanently deleted within 30 days, or immediately on a deletion request |
| Recovery codes | Until used, revoked, or account deleted |

We may retain limited data beyond these periods only where required by law (for example, financial records required under UK tax law for up to 7 years).

## Your rights (GDPR Art. 15–22)

If you are in the UK or European Economic Area, you have the right to:

- **Access** the personal data we hold about you (Art. 15)
- **Rectify** inaccurate data (Art. 16)
- **Erase** your data ("right to be forgotten") (Art. 17)
- **Restrict** processing in certain circumstances (Art. 18)
- **Data portability** — receive your data in a structured, machine-readable format (Art. 20)
- **Object** to processing based on legitimate interest (Art. 21)
- **Withdraw consent** for newsletter processing at any time, without affecting the lawfulness of processing before withdrawal (Art. 7(3))

We do not carry out automated decision-making or profiling (Art. 22).

### How to exercise your rights

Send a request to **privacy@pdfchanger.org**. We will respond within 30 days. If we need more time (up to 60 additional days for complex requests), we will tell you why within the initial 30 days.

We may ask you to verify your identity before acting on a request, to protect against unauthorised access to your data.

## Data breach notification

In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the Information Commissioner's Office (ICO) within 72 hours of becoming aware of it, as required by GDPR Art. 33. Where the breach poses a high risk, we will also notify affected individuals directly (Art. 34).

## Children

The service is not directed at anyone under 18. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data from a child, contact privacy@pdfchanger.org and we will delete it.

## Security

We protect stored data with encryption at rest (AES-256-GCM for newsletter emails), authentication via WebAuthn (no passwords stored), strict Content Security Policy headers, and HTTPS everywhere. However, no internet service can guarantee absolute security.

## Your right to complain

If you are not satisfied with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office:

- **Website:** [ico.org.uk](https://ico.org.uk)
- **Phone:** 0303 123 1113
- **Post:** Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF

## Changes

We may update this policy. The effective date at the top reflects the latest version. For material changes, we will make reasonable efforts to notify users.

## Contact

- **Privacy and data requests:** privacy@pdfchanger.org
- **General enquiries:** via the [contact page](/contact)
