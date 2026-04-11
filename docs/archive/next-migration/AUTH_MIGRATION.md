# Authentication migration (Devise → Auth.js)

## What the Next app does

- **Credentials (email + password)**  
  Auth.js `Credentials` provider loads the user from the existing `users` table and verifies the password with `bcrypt.compare` against `encrypted_password`. That column is written by **Devise** using bcrypt — no password migration is required if hashes stay unchanged.

- **Google OAuth**  
  When `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, the Google provider is enabled. The `signIn` callback mirrors Rails `User.from_omniauth`: match by email, update `provider` / `uid` / `avatar_url`, or insert a new row with a random bcrypt password (OAuth-only users).

- **Sessions**  
  JWT sessions (`session: { strategy: "jwt" }`) avoid new `sessions` tables. The JWT carries `sub` (user id) and `role` (`users.role`: 0 = viewer, 1 = admin).

## Cutover choices

1. **Recommended:** Keep using the same `users` rows. Users keep existing passwords; OAuth users keep linked accounts.
2. **Forced reset:** If you ever change the bcrypt cost or re-hash outside Devise, schedule a “reset password” email campaign.
3. **AUTH_SECRET:** Must be stable per environment so JWTs are not invalidated every deploy. Use a long random string (not the Rails `SECRET_KEY_BASE` unless you consciously want coupling).

## Related env vars

See [`apps/web/.env.example`](../../../apps/web/.env.example): `AUTH_SECRET`, `NEXTAUTH_URL`, optional Google keys.
