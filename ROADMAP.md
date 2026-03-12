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
- [x] Admin role via `CCB_ADMIN_EMAILS` env var

### Mobile App (Android)
- [x] React Native / Expo SDK 54 with full feature parity
- [x] 9 screens matching web functionality
- [x] Secure token storage (expo-secure-store)
- [x] Push notifications (expo-notifications + Firebase FCM)
- [x] Notification preferences with timezone selector
- [x] Renewal date picker on card detail
- [x] EAS Build for APK generation

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

### Code Quality
- [x] 157+ backend tests with 88%+ coverage
- [x] Frontend TypeScript strict mode + Vite build
- [x] Mobile TypeScript compilation checks
- [x] Shared types drift check (CI enforced)
- [x] Code review workflows (superpowers:code-reviewer)

---

## Future Work

### High Priority
- [ ] **Alert rules**: Define Grafana alert rules as code (error rate spike, latency degradation, zero requests)
- [ ] **Expo receipt checking**: Poll Expo Push API for delivery receipts after 15 min (catches DeviceNotRegistered at receipt stage)
- [ ] **Scheduler advisory locks**: Switch from single-worker to PostgreSQL advisory locks for multi-worker APScheduler safety
- [ ] **iOS app**: Build and distribute via TestFlight / App Store

### Medium Priority
- [ ] **Plaid integration**: Connect real bank/card accounts for automatic benefit detection
- [ ] **Card recommendation engine**: Suggest cards based on spending patterns and benefit utilization
- [ ] **Shared/family cards**: Allow multiple users to track the same card's benefits
- [ ] **Benefit usage reminders**: Configurable reminder frequency (not just 3 days before expiry)
- [ ] **In-app notification inbox**: Bell icon with notification history (currently backend-only logs)
- [ ] **Dashboard Jsonnet templates**: Replace raw YAML with grafonnet-lib for templated dashboards

### Low Priority
- [ ] **Web push notifications**: Service worker for browser push (currently email-only for web users)
- [ ] **Monorepo shared package**: Extract shared types/utils between frontend and mobile (currently using CI drift check)
- [ ] **Dark/light theme toggle**: Currently dark theme only on both web and mobile
- [ ] **Export/import benefit data**: CSV/JSON export for personal record keeping
- [ ] **Multi-currency support**: Display benefit values in user's preferred currency
- [ ] **Scheduled drift detection**: Periodic `grafanactl diff` to detect manual Grafana UI changes

### Technical Debt
- [ ] Fix `notifications.jobs_run` cardinality issue (`users` label should be a gauge, not a counter label)
- [ ] Add composite index on `notification_logs` for `(user_id, notification_type, reference_key, channel)` — migration exists but verify in production
- [ ] Migrate from deprecated OTel semantic conventions (old HTTP metric names) when updating `opentelemetry-instrumentation-fastapi`
- [ ] Add Alembic `render_as_batch=True` test to CI to prevent SQLite migration failures
- [ ] Clean up expired `UnsubscribeToken` records (no cleanup job exists yet)
