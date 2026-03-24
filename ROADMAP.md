# CCBenefits Roadmap

## Completed Features

### Core Application
- [x] Credit card benefits tracker with FastAPI backend + React frontend
- [x] 11 seeded card templates (Amex Platinum, Chase Sapphire Reserve, etc.)
- [x] Benefit tracking by period type (monthly, quarterly, semiannual, annual)
- [x] Binary and continuous redemption types
- [x] Perceived value overrides for ROI calculation
- [x] User feedback system (submit + admin view)

### Authentication & Security
- [x] JWT authentication (access + refresh tokens)
- [x] Email/password registration with bcrypt hashing
- [x] Email verification via Resend (24-hour token expiry)
- [x] Password reset with opaque tokens (SHA-256 hashed)
- [x] Forgot password UI (web + mobile)
- [x] OAuth sign-in: Google (web + mobile), Apple (coming soon)
- [x] Auto account linking by verified email
- [x] OAuth profile management (link/unlink providers)
- [x] Admin role via `CCB_ADMIN_EMAILS` env var

### Multi-Year Tracking
- [x] `closed_date` on UserCard (replaces `is_active` — backward compat maintained)
- [x] Close/reopen card endpoints with date-range validation
- [x] `?year=YYYY` query parameter on all card GET endpoints
- [x] Year-aware card filtering (closed cards visible in past years)
- [x] `available_years` computed per card in API responses
- [x] Year picker component (web + mobile) with add-past-year confirmation
- [x] Past-year amber warning banner (web + mobile)
- [x] Close/reopen UI on Card Detail (web + mobile)

### Mobile App (Android)
- [x] React Native / Expo SDK 55 with full feature parity
- [x] 10+ screens matching web functionality
- [x] Year picker on Dashboard, All Credits, and Card Detail
- [x] Close/reopen cards with cross-platform date input
- [x] Google OAuth sign-in on login and register screens
- [x] Secure token storage (expo-secure-store)
- [x] Push notifications (expo-notifications + Firebase FCM)
- [x] Notification preferences with timezone selector
- [x] Renewal date picker on card detail
- [x] ADB screenshot tests (8 screens with content assertions)
- [x] Auto local backend in dev mode (`__DEV__` → `10.0.2.2:8000`)

### Notifications
- [x] 5 notification types: expiring credits, period start, unused recap, fee approaching, utilization summary
- [x] Email delivery via Resend with separate senders (noreply@ + notifications@)
- [x] Push delivery via Expo Push API
- [x] APScheduler with hourly timezone-aware dispatch
- [x] Channel-based dedup (email and push independent)
- [x] One-click unsubscribe (opaque token, 60-day CAN-SPAM compliant)
- [x] Per-user notification preferences (type × channel toggles)
- [x] Do-not-reply footer with feedback link on all emails

### Infrastructure & DevOps
- [x] Docker multi-stage build (Node 22 + Python 3.13)
- [x] Oracle Cloud VM deployment (E2.1.Micro, Ubuntu 24.04)
- [x] GitHub Actions CI/CD (tests → build → GHCR → SSH deploy)
- [x] Cloudflare DNS + SSL
- [x] PostgreSQL 16 in production, SQLite for dev/tests
- [x] Alembic schema migrations
- [x] Single worker for APScheduler safety

### Observability
- [x] OpenTelemetry auto-instrumentation (FastAPI + SQLAlchemy)
- [x] Custom business metrics (auth, cards, feedback, notifications, scheduler)
- [x] Structured JSON logging with PII masking
- [x] Grafana Cloud integration (metrics + logs)
- [x] Dashboards as code via grafanactl (Service Health + Business Metrics)
- [x] CI sync: dashboards auto-pushed on merge, validated on PRs

### Analytics & Visualization
- [x] SVG donut chart (overall utilization) and bar chart (per-card) on web Dashboard
- [x] Summary stats row on mobile Dashboard (total fees, YTD redeemed, utilization)
- [x] All Credits: "By Period" / "By Card" / "Sheet" tab views (web + mobile)
- [x] Compact sheet view with issuer color coding and progress indicators
- [x] Collapsible sections (first expanded, rest collapsed by default)
- [x] Batch detail endpoint `GET /api/user-cards/details` (fixes N+1 fetch)

### Testing & CI/CD
- [x] Integration tests: API smoke tests + Playwright E2E tests + OAuth button checks
- [x] Docker Compose test stack (app + postgres) for CI
- [x] Deploy approval gate via GitHub Environments (manual approve after integration tests pass)
- [x] Emergency deploy escape hatch via workflow_dispatch
- [x] Mobile ADB screenshot tests: 8-screen smoke tests with content assertions, auto-seeded data

### Code Quality
- [x] 190+ backend tests with 87%+ coverage
- [x] Ruff (Python) + ESLint (TypeScript) enforced in CI
- [x] Frontend TypeScript strict mode + Vite build
- [x] Mobile TypeScript compilation checks
- [x] Shared types drift check (CI enforced)
- [x] Code review workflows (superpowers:code-reviewer)

---

## Future Work

### High Priority
- [ ] **Alert rules**: Define Grafana alert rules as code (error rate spike, latency degradation, zero requests)
- [ ] **Automated database backups**: `pg_dump` cron to OCI Object Storage (protects against highest-impact failure)
- [ ] **Uptime monitoring**: External health check (UptimeRobot or similar) — lower effort than Grafana alerts, immediate value
- [ ] **Expo receipt checking**: Poll Expo Push API for delivery receipts after 15 min (catches DeviceNotRegistered at receipt stage)
- [x] **In-app notification inbox**: Bell icon with notification history (web + mobile)

### Medium Priority
- [ ] **Apple Sign-In**: Requires Apple Developer account ($99/yr), Service ID, private key for web flow
- [ ] **iOS app**: Build and distribute via TestFlight / App Store (requires Apple Developer account $99/yr)
- [ ] **Shared/family cards**: Allow multiple users to track the same card's benefits
- [ ] **Benefit usage reminders**: Configurable reminder frequency (not just 3 days before expiry)
- [ ] **Web push notifications**: Service worker for browser push (depends on in-app inbox being built first)
- [ ] **Rate limiting audit**: Verify coverage on registration, login, password reset, and verification endpoints

### Low Priority
- [ ] **Export/import benefit data**: CSV/JSON export for personal record keeping
- [ ] **Dark/light theme toggle**: Currently dark theme only on both web and mobile
- [ ] **Monorepo shared package**: Extract shared types/utils between frontend and mobile (currently using CI drift check — only if drift check starts failing regularly)

### Research / Exploration
- [ ] **Plaid integration**: Connect real bank/card accounts for automatic benefit detection (significant cost, compliance, and mapping complexity)
- [ ] **Card recommendation engine**: Suggest cards based on spending patterns (depends on Plaid data — without it, recommendations are generic)

### Technical Debt
- [ ] Extract `_dispatch_notification()` helper in notifications.py — 5 repeated dispatch patterns (inbox + email + push), design carefully around differing dedup semantics in `send_utilization_summary`
- [ ] Standardize naive vs aware datetime handling — audit all DateTime columns and comparisons, decide on one pattern, extract shared `utc_now()` utility
- [ ] Extract `useBenefitActions` frontend hook — deduplicate usage handlers between CardDetail and AllCredits (verify both pages are stable before abstracting)
- [ ] Verify `ROISummary.tsx` intent — check git history; delete if abandoned, integrate if planned
- [ ] Frontend page-level tests — Dashboard, CardDetail, AllCredits, ProfilePage with react-query mocks
- [ ] Notification scheduler job tests — `check_expiring_credits`, `check_period_transitions`, `check_fee_approaching`, `send_utilization_summary` with freezegun
- [x] Fix `notifications.jobs_run` cardinality issue — removed dynamic `users` label from counter
- [x] Add composite index on `notification_logs` — migration 729e700f7e6b applied
- [x] Generalize expired token cleanup — `cleanup_expired_data()` cleans notifications, verification tokens, reset tokens, unsubscribe tokens
- [x] Add Alembic migration test to CI — upgrade/downgrade/upgrade on SQLite
- [x] Periodic dependency audit — Dependabot for npm + GitHub Actions; Poetry deps managed manually
- [ ] Migrate from deprecated OTel semantic conventions — auto-instrumentation handles it, defer until library update
- [x] Add mobile test runner — ADB screenshot tests cover 8 screens with content assertions
- [ ] Investigate SQLite vs PostgreSQL test parity (type coercion, constraint behavior differences)
