# Background reminder setup

TidyLine keeps open-page reminders as a local browser fallback. Closed-page delivery for signed-in users uses a browser push subscription, Supabase tables, a scheduled Edge Function, and VAPID credentials. The app shows background reminders as unavailable until all public configuration is present.

## 1. Apply the database migration

Apply these files in order:

1. `supabase_migration.sql`
2. `supabase_migrations/20260918_atomic_task_replace.sql`
3. `supabase_migrations/20260920_deadline_times.sql`
4. `supabase_migrations/20260920_web_push.sql`

The deadline-time migration lets relative reminders use the time the user entered. The push migration stores one endpoint per browser, moves an endpoint safely when a shared browser changes accounts, records delivery and retry state, and keeps all browser reads behind row-level security.

## 2. Create VAPID credentials

Generate one VAPID key pair for the deployment. For example, the maintained `web-push` command provides:

```bash
npx web-push generate-vapid-keys
```

Use the same pair for the frontend and the Edge Function:

- Put only the public key in the frontend host as `VITE_WEB_PUSH_PUBLIC_KEY`.
- Store the public key in the Edge Function as `WEB_PUSH_VAPID_PUBLIC_KEY`.
- Store the private key only in the Edge Function as `WEB_PUSH_VAPID_PRIVATE_KEY`.
- Set `WEB_PUSH_VAPID_SUBJECT` to a monitored `mailto:` address or an HTTPS site URL.

Never place the private key in a `VITE_` variable. Vite values are shipped to every browser.

## 3. Configure and deploy the Edge Function

Create a long random value for `CRON_SECRET`, then add these Edge Function secrets through the Supabase dashboard or CLI:

```bash
supabase secrets set WEB_PUSH_VAPID_PUBLIC_KEY=PUBLIC_KEY
supabase secrets set WEB_PUSH_VAPID_PRIVATE_KEY=PRIVATE_KEY
supabase secrets set WEB_PUSH_VAPID_SUBJECT=mailto:notifications@example.com
supabase secrets set CRON_SECRET=LONG_RANDOM_VALUE
```

Deploy the function:

```bash
supabase functions deploy send-reminders
```

The function uses the server-only key Supabase injects into its Edge Function environment, including the current secret-key map and the legacy service-role fallback. Do not copy either value into frontend configuration.

## 4. Schedule delivery

Enable Supabase Cron, `pg_net`, and Vault for the project. Copy `supabase_migrations/20260920_schedule_push_dispatch.sql.example`, replace its project URL and random cron secret, then run the completed SQL once. It invokes the dispatcher every minute without storing the cron secret in the repository.

Supabase documents the Cron plus Vault pattern in [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions). Browser subscriptions require a secure context and a user gesture, as described by [PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe).

## 5. Verify on real devices

Use a disposable task and a reminder several minutes ahead:

1. Sign in, open Settings, and enable background reminders.
2. Confirm Settings says the device is ready.
3. Close every TidyLine tab before the reminder time.
4. Confirm one notification arrives and opens the relevant task.
5. Repeat after changing the task deadline and after disabling reminders.
6. Review Edge Function logs, Cron history, `push_subscriptions`, and `reminder_deliveries` for retries or failures.

Test desktop Chrome or Edge, Android Chrome, Safari on macOS, and an iPhone or iPad Home Screen installation. The included web app manifest supplies the standalone installation mode required for the iPhone and iPad path. A normal iPhone or iPad Safari tab cannot subscribe to Web Push; the planner and open-page reminders remain usable there.
