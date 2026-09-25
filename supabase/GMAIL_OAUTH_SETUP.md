# Gmail OAuth setup

This flow keeps Gmail credentials in Supabase Edge Functions. The GitHub Pages
frontend receives only the connected Gmail address and never receives a
refresh token.

## 1. Google Cloud

1. Create or select a Google Cloud project.
2. Enable the **Gmail API**.
3. Configure the OAuth consent screen.
4. Create an OAuth client with application type **Web application**.
5. Add this exact authorized redirect URI:

   `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback`

For testing, add the Gmail accounts that should be allowed to connect as test
users in the OAuth consent screen.

## 2. Apply the database migration

Run `supabase/migrations/20260925_add_gmail_connections.sql` in the Supabase
SQL editor, or apply it through the Supabase CLI.

## 3. Set Supabase Function secrets

Run these from the repository with the Supabase CLI linked to the correct
project. Do not put these values in `.env`, GitHub Pages, or the browser.

```bash
supabase secrets set \
  GMAIL_CLIENT_ID="your-google-client-id" \
  GMAIL_CLIENT_SECRET="your-google-client-secret" \
  GMAIL_REDIRECT_URI="https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback" \
  GMAIL_FRONTEND_URL="https://darapet.github.io/Darapet-Technology/scouting" \
  GMAIL_TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

`GMAIL_TOKEN_ENCRYPTION_KEY` encrypts refresh tokens before they are stored.
If it is omitted, the functions derive the encryption key from the OAuth
client secret, but setting a separate key is recommended.

## 4. Deploy the functions

```bash
supabase functions deploy gmail-oauth-start
supabase functions deploy gmail-oauth-callback --no-verify-jwt
supabase functions deploy gmail-status
supabase functions deploy gmail-disconnect
supabase functions deploy gmail-send
```

The callback must be deployed with JWT verification disabled because Google
redirects to it without a Supabase user JWT. It validates a short-lived,
single-use OAuth state stored in Supabase before saving the connection.

The Scouting page will then show **Connect Gmail**. Once connected, reviewed
scouting messages use the connected Gmail mailbox through the Gmail API.