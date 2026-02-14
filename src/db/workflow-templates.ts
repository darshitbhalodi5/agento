import { pool } from './pool.js'

export interface WorkflowTemplateRecord {
  workflowId: string
  name: string
  ownerId: string | null
  description: string | null
  stepGraph: unknown
  defaultPolicies: unknown
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowTemplateInput {
  workflowId: string
  name: string
  ownerId?: string | null
  description?: string | null
  stepGraph: unknown
  defaultPolicies?: unknown
  active?: boolean
}

export interface UpdateWorkflowTemplateInput {
  workflowId: string
  name?: string
  description?: string | null
  stepGraph?: unknown
  defaultPolicies?: unknown
  active?: boolean
}

interface WorkflowTemplateRow {
  workflow_id: string
  name: string
  owner_id: string | null
  description: string | null
  step_graph_json: unknown
  default_policies_json: unknown
  active: boolean
  created_at: string
  updated_at: string
}

function toRecord(row: WorkflowTemplateRow): WorkflowTemplateRecord {
  return {
    workflowId: row.workflow_id,
    name: row.name,
    ownerId: row.owner_id,
    description: row.description,
    stepGraph: row.step_graph_json,
    defaultPolicies: row.default_policies_json,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createWorkflowTemplate(
  input: CreateWorkflowTemplateInput,
): Promise<WorkflowTemplateRecord> {
  const result = await pool.query<WorkflowTemplateRow>(
    `
      INSERT INTO workflow_templates (
        workflow_id,
        name,
        owner_id,
        description,
        step_graph_json,
        default_policies_json,
        active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, NOW())
      RETURNING
        workflow_id,
        name,
        owner_id,
        description,
        step_graph_json,
        default_policies_json,
        active,
        created_at,
        updated_at
    `,
    [
      input.workflowId,
      input.name,
      input.ownerId ?? null,
      input.description ?? null,
      JSON.stringify(input.stepGraph),
      JSON.stringify(input.defaultPolicies ?? {}),
      input.active ?? true,
    ],
  )

  return toRecord(result.rows[0])
}

export async function getWorkflowTemplateById(workflowId: string): Promise<WorkflowTemplateRecord | null> {
  const result = await pool.query<WorkflowTemplateRow>(
    `
      SELECT
        workflow_id,
        name,
        owner_id,
        description,
        step_graph_json,
        default_policies_json,
        active,
        created_at,
        updated_at
      FROM workflow_templates
      WHERE workflow_id = $1
      LIMIT 1
    `,
    [workflowId],
  )

  if (result.rowCount === 0) {
    return null
  }

  return toRecord(result.rows[0])
}

export async function listWorkflowTemplates(params: {
  limit: number
  active?: boolean
  ownerId?: string
}): Promise<WorkflowTemplateRecord[]> {
  const { limit, active, ownerId } = params

  const conditions: string[] = []
  const values: unknown[] = []

  if (typeof active === 'boolean') {
    values.push(active)
    conditions.push(`active = $${values.length}`)
  }

  if (ownerId) {
    values.push(ownerId)
    conditions.push(`owner_id = $${values.length}`)
  }

  values.push(limit)
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query<WorkflowTemplateRow>(
    `
      SELECT
        workflow_id,
        name,
        owner_id,
        description,
        step_graph_json,
        default_policies_json,
        active,
        created_at,
        updated_at
      FROM workflow_templates
      ${whereClause}
      ORDER BY updated_at DESC, workflow_id ASC
      LIMIT $${values.length}
    `,
    values,
  )

  return result.rows.map(toRecord)
}

export async function getWorkflowTemplateOwnerId(workflowId: string): Promise<string | null | undefined> {
  const result = await pool.query<{ owner_id: string | null }>(
    `
      SELECT owner_id
      FROM workflow_templates
      WHERE workflow_id = $1
      LIMIT 1
    `,
    [workflowId],
  )

  if (result.rowCount === 0) {
    return undefined
  }

  return result.rows[0].owner_id
}

export async function updateWorkflowTemplate(
  input: UpdateWorkflowTemplateInput,
): Promise<WorkflowTemplateRecord | null> {
  const updates: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (input.name !== undefined) {
    updates.push(`name = $${idx}`)
    values.push(input.name)
    idx += 1
  }

  if (input.description !== undefined) {
    updates.push(`description = $${idx}`)
    values.push(input.description)
    idx += 1
  }

  if (input.stepGraph !== undefined) {
    updates.push(`step_graph_json = $${idx}::jsonb`)
    values.push(JSON.stringify(input.stepGraph))
    idx += 1
  }

  if (input.defaultPolicies !== undefined) {
    updates.push(`default_policies_json = $${idx}::jsonb`)
    values.push(JSON.stringify(input.defaultPolicies))
    idx += 1
  }

  if (input.active !== undefined) {
    updates.push(`active = $${idx}`)
    values.push(input.active)
    idx += 1
  }

  if (updates.length === 0) {
    return getWorkflowTemplateById(input.workflowId)
  }

  updates.push('updated_at = NOW()')
  values.push(input.workflowId)

  const result = await pool.query<WorkflowTemplateRow>(
    `
      UPDATE workflow_templates
      SET ${updates.join(', ')}
      WHERE workflow_id = $${idx}
      RETURNING
        workflow_id,
        name,
        owner_id,
        description,
        step_graph_json,
        default_policies_json,
        active,
        created_at,
        updated_at
    `,
    values,
  )

  if (result.rowCount === 0) {
    return null
  }

  return toRecord(result.rows[0])
}
