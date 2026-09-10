/**
 * supabaseStorage.js
 *
 * All Supabase read/write operations for tasks and user_settings.
 * Provides camelCase ↔ snake_case field mapping so the rest of the
 * codebase never has to think about DB column names.
 */

import { supabase } from '../supabaseClient'

// ── Field mapping: JS → DB row ────────────────────────────────────────────────

function taskToRow(userId, task) {
  return {
    id:                task.id,
    user_id:           userId,
    title:             task.title,
    deadline:          task.deadline ?? null,
    start_date:        task.startDate ?? null,
    planned_date:      task.plannedDate ?? null,
    original_deadline: task.originalDeadline ?? null,
    follow_up_date:    task.followUpDate ?? null,
    scheduled_start:   task.scheduledStart ?? null,
    completed_at:      task.completedAt ?? null,
    created_at:        task.createdAt,
    done:              task.done,
    pinned:            task.pinned,
    archived:          task.archived,
    notes:             task.notes,
    location:          task.location,
    duration:          task.duration ?? null,
    energy_level:      task.energyLevel ?? null,
    status:            task.status,
    waiting_for:       task.waitingFor,
    recurrence:        task.recurrence ?? null,
    reminders:         task.reminders,
    tags:              task.tags,
    checklist:         task.checklist,
    links:             task.links,
    attachments:       task.attachments,
    postpone_history:  task.postponeHistory,
  }
}

// ── Field mapping: DB row → JS ────────────────────────────────────────────────

export function rowToTask(row) {
  return {
    id:              row.id,
    title:           row.title,
    deadline:        row.deadline ?? null,
    startDate:       row.start_date ?? null,
    plannedDate:     row.planned_date ?? null,
    originalDeadline:row.original_deadline ?? null,
    followUpDate:    row.follow_up_date ?? null,
    scheduledStart:  row.scheduled_start ?? null,
    completedAt:     row.completed_at ?? null,
    createdAt:       row.created_at,
    done:            row.done,
    pinned:          row.pinned,
    archived:        row.archived,
    notes:           row.notes,
    location:        row.location,
    duration:        row.duration ?? null,
    energyLevel:     row.energy_level ?? null,
    status:          row.status,
    waitingFor:      row.waiting_for,
    recurrence:      row.recurrence ?? null,
    reminders:       Array.isArray(row.reminders)        ? row.reminders        : [],
    tags:            Array.isArray(row.tags)             ? row.tags             : [],
    checklist:       Array.isArray(row.checklist)        ? row.checklist        : [],
    links:           Array.isArray(row.links)            ? row.links            : [],
    attachments:     Array.isArray(row.attachments)      ? row.attachments      : [],
    postponeHistory: Array.isArray(row.postpone_history) ? row.postpone_history : [],
  }
}

// ── Settings mapping ──────────────────────────────────────────────────────────

/**
 * Convert a camelCase patch object into the columns we need to upsert.
 * Only keys present in `patch` are included, so partial updates are safe.
 */
function settingsPatchToRow(userId, patch) {
  const row = { user_id: userId, updated_at: new Date().toISOString() }
  if ('workspaceName'  in patch) row.workspace_name  = patch.workspaceName
  if ('theme'          in patch) row.theme            = patch.theme
  if ('accent'         in patch) row.accent           = patch.accent
  if ('density'        in patch) row.density          = patch.density
  if ('bucketOrder'    in patch) row.bucket_order     = patch.bucketOrder
  if ('overloadHours'  in patch) row.overload_hours   = patch.overloadHours
  if ('confirmDelete'  in patch) row.confirm_delete   = patch.confirmDelete
  if ('templates'      in patch) row.templates        = patch.templates
  if ('savedFilters'   in patch) row.saved_filters    = patch.savedFilters
  return row
}

export function rowToSettings(row) {
  if (!row) return null
  return {
    workspaceName: row.workspace_name ?? '',
    theme:         row.theme          ?? 'dark',
    accent:        row.accent         ?? '#ff5a36',
    density:       row.density        ?? 'comfortable',
    bucketOrder:   Array.isArray(row.bucket_order) ? row.bucket_order : null,
    overloadHours: typeof row.overload_hours === 'number' ? row.overload_hours : 6,
    confirmDelete: typeof row.confirm_delete === 'boolean' ? row.confirm_delete : true,
    templates:     Array.isArray(row.templates)    ? row.templates    : [],
    savedFilters:  Array.isArray(row.saved_filters) ? row.saved_filters : [],
  }
}

// ── Tasks CRUD ────────────────────────────────────────────────────────────────

export async function fetchTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToTask)
}

export async function upsertTask(userId, task) {
  const { error } = await supabase
    .from('tasks')
    .upsert(taskToRow(userId, task), { onConflict: 'id' })

  if (error) throw error
}

export async function upsertManyTasks(userId, tasks) {
  if (tasks.length === 0) return
  const { error } = await supabase
    .from('tasks')
    .upsert(tasks.map((t) => taskToRow(userId, t)), { onConflict: 'id' })

  if (error) throw error
}

export async function deleteTaskRow(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

export async function deleteManyTaskRows(taskIds) {
  if (taskIds.length === 0) return
  const { error } = await supabase.from('tasks').delete().in('id', taskIds)
  if (error) throw error
}

/**
 * Replace all of a user's tasks atomically (used for undo and importTasks).
 * Deletes all existing rows first, then batch-inserts the new set.
 */
export async function replaceAllTasks(userId, tasks) {
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw deleteError
  if (tasks.length > 0) await upsertManyTasks(userId, tasks)
}

// ── Settings CRUD ─────────────────────────────────────────────────────────────

export async function fetchSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return rowToSettings(data)   // null if no row yet
}

export async function upsertSettings(userId, patch) {
  const { error } = await supabase
    .from('user_settings')
    .upsert(settingsPatchToRow(userId, patch), { onConflict: 'user_id' })

  if (error) throw error
}
