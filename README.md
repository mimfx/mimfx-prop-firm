# NEXORA FUNDING

A responsive front-end prototype for a trading challenge platform, with a Supabase-backed trader registration and sign-in foundation.

## Included

- Responsive NEXORA FUNDING marketing website
- Five account-size previews: $5,000, $10,000, $20,000, $50,000 and $100,000
- Trader registration, email/password sign-in, password reset and sign-out
- Supabase Auth session handling
- Private trader profile table protected by Row Level Security
- Trader dashboard prototype with illustrative balances and draft rules
- Netlify static-site configuration

## Backend

The separate Supabase project is NEXORA FUNDING (jklmzkmankwnrlcgbtsa).

The browser uses only the Supabase publishable key. No service-role or secret key is stored in this repository.

The profiles table is protected by RLS. Traders can read and update only their own profile. A database trigger creates the profile after Supabase Auth creates a user.

## Before testing email authentication on the deployed site

In Supabase Dashboard → Authentication → URL Configuration:

1. Set the Site URL to the deployed Netlify site URL.
2. Add the deployed site URL and https://YOUR-SITE.netlify.app/** to Redirect URLs.
3. Keep email confirmation enabled for public registration.
4. For production email delivery, configure a trusted custom SMTP provider.

## Deploy with Netlify

1. Import mimfx/mimfx-prop-firm from GitHub.
2. Leave the build command empty.
3. Set the publish directory to .
4. Deploy the site.

## Important status

Authentication and private trader profiles are implemented, but this is not yet an operating prop firm. Account sizes and dashboard figures are previews only. There is no checkout, purchased challenge provisioning, MT5/broker connection, live trade ingestion, automated drawdown enforcement, payout processing or admin operations yet.

Do not accept challenge fees or promise funded accounts or payouts until the trading-server integration, server-side risk engine, operational procedures, final challenge rules and legal/compliance review are complete.
