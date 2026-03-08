# User Profiles & Authentication Design

## Goal

Add multi-user support with proper data isolation to CCBenefits. Each user sees only their own cards and benefits. JWT-based auth with email + password.

## Tech Decisions

- **Approach:** FastAPI-native auth (no external services or auth libraries)
- **Libraries:** `passlib[bcrypt]` for password hashing, `PyJWT` for JWT encoding/decoding, `pydantic[email]` for email validation
- **Token strategy:** Access token (30 min) + refresh token (7 days), both JWTs
- **Migration:** Clean slate — drop and recreate DB, seed data re-applied on startup

## Data Model

### New: User

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| email | str | unique, indexed, validated with EmailStr, normalized to lowercase |
| display_name | str | |
| hashed_password | str | bcrypt (max 72 bytes enforced at schema level) |
| preferred_currency | str | default "USD" |
| timezone | str | default "UTC" |
| notification_preferences | JSON | default {} |
| is_active | bool | default true |
| password_reset_token | str | nullable, SHA-256 hashed random token, cleared after use |
| password_reset_expires | datetime | nullable, 1-hour expiry |
| created_at | datetime | |
| updated_at | datetime | |

### Modified: UserCard

- Add `user_id` FK to `User.id` (required, indexed)
- `BenefitUsage` and `UserBenefitSetting` are scoped via `UserCard` joins — no direct FK needed
- **Important:** `usage.py` endpoints query `BenefitUsage` by ID directly — must verify ownership via `BenefitUsage -> UserCard -> user_id` match

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account, returns user + tokens. Returns 409 on duplicate (no email enumeration via different error) |
| POST | /api/auth/login | No | Returns access_token + refresh_token |
| POST | /api/auth/refresh | No | Exchange refresh_token (in request body) for new access_token |
| POST | /api/auth/password-reset-request | No | Generate reset token (email pluggable). Always returns 200 (prevents email enumeration) |
| POST | /api/auth/password-reset | No | Reset password with opaque token |

### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/users/me | Yes | Get current user profile |
| PUT | /api/users/me | Yes | Update profile settings |
| PUT | /api/users/me/password | Yes | Change password (requires current) |
| DELETE | /api/users/me | Yes | Soft delete (set is_active=false) |

### Existing Endpoints

- All `/api/user-cards/` and `/api/usage/` routes require auth, filtered by `user_id`
- `/api/card-templates` stays public
- **Authorization contract:** ownership checks happen at the router level, not in private helper functions like `_compute_summary`

## Auth Dependency

`get_current_user` FastAPI dependency:
- Decodes JWT from `Authorization: Bearer` header
- Returns `User` object or raises 401
- Checks `is_active` on every request (catches soft-deleted users within token validity window)
- Applied to all protected routes

## Config

`config.py` module (singleton pattern, matching `database.py`):
- `CCB_SECRET_KEY` — loaded from env var. Refuses to start if unset when `CCB_ENV=production`
- `CCB_ALLOWED_ORIGINS` — configurable CORS origins
- Token expiry constants

## Frontend Changes

### New Pages
- `LoginPage.tsx` — email + password form, link to register
- `RegisterPage.tsx` — email, display name, password, confirm password
- `ProfilePage.tsx` — view/edit profile, change password

### Auth Infrastructure
- `AuthContext.tsx` — React context storing user + tokens, provides login/logout/register
- Tokens in `localStorage`
- Axios interceptor: attaches Bearer header, handles 401 with token refresh (deduplicated via promise mutex), redirects to login on failure
- `queryClient.clear()` on login/logout to prevent stale data leaking between users

### Routing
- Public: `/login`, `/register`
- Protected (redirect to `/login` if unauthenticated): `/`, `/cards/:id`, `/all-credits`, `/add-card`, `/profile`
- Post-login redirect to dashboard
- Backend uses catch-all SPA routing for non-`/api` paths (replaces hardcoded route list)

### Header
- User menu with display name dropdown (Profile / Logout)

### No New Frontend Dependencies
- React Router, Axios, TanStack Query already sufficient

## Security

- `CCB_SECRET_KEY` env var for JWT signing — refuses to start without it in production
- Password: min 8 chars, max 72 chars (bcrypt truncation limit), bcrypt hashed
- Email: validated with `EmailStr`, normalized to lowercase before storage
- Password reset tokens: random opaque strings, SHA-256 hashed in DB, 1-hour expiry, single-use
- CORS tightened from `*` to configurable allowed origins
- All user data queries filtered by authenticated `user_id`
- `usage.py` endpoints verify ownership via UserCard join (not just by usage ID)
- Interceptor swallows 401 errors and redirects to /login; components never see auth errors

## Email Interface

Abstract `EmailSender` protocol with `send_reset_email(to, token)`. Ships with `ConsoleEmailSender` (logs to stdout). Swap in real implementation later.

## Known Limitations (Intentionally Deferred)

- No email verification — acceptable for a personal finance tool
- No concurrent session limits or session revocation
- Tokens stored in localStorage (not httpOnly cookies) — simpler, adequate for this app
- Soft-delete deactivation has a 30-min token validity window — mitigated by `is_active` check per request
- No rate limiting initially
- No GDPR hard-delete support
- `preferred_currency` and `timezone` have no consumers yet — stored for future use
- `notification_preferences` has no notification system yet — stored for future use
- Clean-slate migration only works once — need Alembic before next schema change

## TODOs (Post-MVP)

- [ ] **TODO: Alembic migrations** — Add migration framework before any future schema changes. Current `create_all` + clean slate approach only works for initial deployment.
- [ ] **TODO: httpOnly cookies for refresh tokens** — Move refresh token from localStorage to httpOnly cookie for better XSS protection. Requires CSRF consideration (SameSite=Lax sufficient for most cases).
- [ ] **TODO: Refresh token rotation & revocation** — Store refresh tokens server-side, rotate on each refresh, invalidate on logout/password change. Currently tokens are stateless JWTs that remain valid until expiry.
- [ ] **TODO: Rate limiting** — Add `slowapi` or similar on `/api/auth/login` and `/api/auth/password-reset-request` to prevent brute force and email bombing.
- [ ] **TODO: Email verification** — Add `is_verified` flag, gate certain features behind it, send verification email on registration.
- [ ] **TODO: Concurrent session management** — Allow users to view active sessions and revoke specific ones.
- [ ] **TODO: GDPR hard delete** — Add endpoint to fully purge user data (not just soft delete).
- [ ] **TODO: Password strength checking** — Check against common password lists (pwned passwords API or local top-10000).
- [ ] **TODO: Wire up preference consumers** — `preferred_currency` and `timezone` currently unused. Implement currency display and timezone-aware period calculations.
- [ ] **TODO: Catch-all SPA routing** — Current implementation uses catch-all for non-`/api` paths. Consider edge cases with static assets.
