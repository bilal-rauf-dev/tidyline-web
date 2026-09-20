import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { deliveryPayload, dueReminderInstances } from './schedule.js'

const PAGE_SIZE = 500
const CLAIM_SIZE = 100
const MAX_CLAIM_BATCHES = 5
const LOOKBACK_MS = 10 * 60 * 1000

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function serverKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const encoded = requiredEnv('SUPABASE_SECRET_KEYS')
  try {
    const keys = JSON.parse(encoded) as Record<string, string>
    if (keys.default) return keys.default
  } catch {
    // The generic error below avoids logging any part of a server key.
  }
  throw new Error('Missing the default Supabase server key')
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/https?:\/\/\S+/g, '[push endpoint]').slice(0, 500)
}

async function fetchSubscriptions(client: ReturnType<typeof createClient>) {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth_key,expiration_time,timezone')
      .eq('enabled', true)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

async function fetchTasks(client: ReturnType<typeof createClient>, userIds: string[]) {
  const rows: Record<string, unknown>[] = []
  for (const userBatch of chunks(userIds, 100)) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await client
        .from('tasks')
        .select('id,user_id,title,deadline,created_at,reminders,done,archived')
        .in('user_id', userBatch)
        .eq('done', false)
        .eq('archived', false)
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE_SIZE) break
    }
  }
  return rows
}

async function queueDueReminders(
  client: ReturnType<typeof createClient>,
  now: number,
) {
  const subscriptions = await fetchSubscriptions(client)
  const userIds = [...new Set(subscriptions.map((row) => String(row.user_id)))]
  if (userIds.length === 0) return 0

  const tasks = await fetchTasks(client, userIds)
  const tasksByUser = new Map<string, Record<string, unknown>[]>()
  for (const task of tasks) {
    const userId = String(task.user_id)
    const entries = tasksByUser.get(userId) ?? []
    entries.push(task)
    tasksByUser.set(userId, entries)
  }

  const deliveries: Record<string, unknown>[] = []
  const windowStart = now - LOOKBACK_MS

  for (const subscription of subscriptions) {
    const timezone = String(subscription.timezone || 'UTC')
    const userTasks = tasksByUser.get(String(subscription.user_id)) ?? []
    for (const task of userTasks) {
      const reminders = Array.isArray(task.reminders) ? task.reminders : []
      for (const reminder of reminders) {
        const instances = dueReminderInstances(task, reminder, windowStart, now, timezone)
        for (const instance of instances) {
          deliveries.push({
            user_id: task.user_id,
            task_id: task.id,
            subscription_id: subscription.id,
            reminder_id: instance.reminderId,
            scheduled_for: instance.scheduledFor,
            payload: deliveryPayload(task, instance),
          })
        }
      }
    }
  }

  for (const batch of chunks(deliveries, PAGE_SIZE)) {
    const { error } = await client
      .from('reminder_deliveries')
      .upsert(batch, {
        onConflict: 'subscription_id,task_id,reminder_id,scheduled_for',
        ignoreDuplicates: true,
      })
    if (error) throw error
  }
  return deliveries.length
}

async function markSent(client: ReturnType<typeof createClient>, delivery: Record<string, unknown>) {
  const now = new Date().toISOString()
  const deliveryResult = await client.from('reminder_deliveries').update({
    status: 'sent', sent_at: now, claimed_at: null, last_error: null, updated_at: now,
  }).eq('id', delivery.delivery_id)
  if (deliveryResult.error) throw deliveryResult.error
  const subscriptionResult = await client.from('push_subscriptions').update({
    last_success_at: now, last_error_at: null, last_error: null, updated_at: now,
  }).eq('id', delivery.subscription_id)
  if (subscriptionResult.error) {
    console.warn('[send-reminders] Notification sent, but device status could not be updated')
  }
}

async function markFailed(
  client: ReturnType<typeof createClient>,
  delivery: Record<string, unknown>,
  error: unknown,
) {
  const now = new Date()
  const statusCode = Number((error as { statusCode?: number })?.statusCode)
  const expired = statusCode === 404 || statusCode === 410
  const attempts = Number(delivery.attempt_count) || 1
  const finalFailure = expired || attempts >= 3
  const message = safeError(error)
  const nextAttempt = new Date(now.getTime() + attempts * 5 * 60 * 1000).toISOString()

  const updates = [
    client.from('reminder_deliveries').update({
      status: finalFailure ? 'failed' : 'retry',
      next_attempt_at: nextAttempt,
      claimed_at: null,
      last_error: message,
      updated_at: now.toISOString(),
    }).eq('id', delivery.delivery_id),
    client.from('push_subscriptions').update({
      enabled: expired ? false : true,
      last_error_at: now.toISOString(),
      last_error: expired ? 'This browser subscription expired. Enable background reminders again.' : message,
      updated_at: now.toISOString(),
    }).eq('id', delivery.subscription_id),
  ]
  const results = await Promise.all(updates)
  for (const result of results) if (result.error) throw result.error
}

async function sendClaimed(client: ReturnType<typeof createClient>) {
  let sent = 0
  let failed = 0

  for (let batch = 0; batch < MAX_CLAIM_BATCHES; batch += 1) {
    const { data, error } = await client.rpc('claim_reminder_deliveries', { p_limit: CLAIM_SIZE })
    if (error) throw error
    if (!data?.length) break

    for (const delivery of data) {
      try {
        await webpush.sendNotification({
          endpoint: delivery.endpoint,
          keys: { p256dh: delivery.p256dh, auth: delivery.auth_key },
        }, JSON.stringify(delivery.payload), {
          TTL: 24 * 60 * 60,
          urgency: 'high',
          topic: `tidyline-${String(delivery.delivery_id)}`.slice(0, 32),
        })
        await markSent(client, delivery)
        sent += 1
      } catch (pushError) {
        await markFailed(client, delivery, pushError)
        failed += 1
      }
    }
  }

  return { sent, failed }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const cronSecret = requiredEnv('CRON_SECRET')
    if (request.headers.get('x-cron-secret') !== cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = requiredEnv('SUPABASE_URL')
    const serviceKey = serverKey()
    webpush.setVapidDetails(
      requiredEnv('WEB_PUSH_VAPID_SUBJECT'),
      requiredEnv('WEB_PUSH_VAPID_PUBLIC_KEY'),
      requiredEnv('WEB_PUSH_VAPID_PRIVATE_KEY'),
    )

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const queued = await queueDueReminders(client, Date.now())
    const result = await sendClaimed(client)

    // Keep operational evidence without growing the table forever.
    await client.from('reminder_deliveries')
      .delete()
      .eq('status', 'sent')
      .lt('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    await client.from('reminder_deliveries')
      .delete()
      .eq('status', 'failed')
      .lt('updated_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    return Response.json({ queued, ...result })
  } catch (error) {
    console.error('[send-reminders]', safeError(error))
    return Response.json({ error: 'Reminder dispatch failed' }, { status: 500 })
  }
})
