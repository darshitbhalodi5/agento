import { pool } from './pool.js'

export interface WorkflowTemplateRecord {
  workflowId: string
  name: string
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
        description,
        step_graph_json,
        default_policies_json,
        active,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
      RETURNING
        workflow_id,
        name,
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
}): Promise<WorkflowTemplateRecord[]> {
  const { limit, active } = params

  if (typeof active === 'boolean') {
    const result = await pool.query<WorkflowTemplateRow>(
      `
        SELECT
          workflow_id,
          name,
          description,
          step_graph_json,
          default_policies_json,
          active,
          created_at,
          updated_at
        FROM workflow_templates
        WHERE active = $1
        ORDER BY updated_at DESC, workflow_id ASC
        LIMIT $2
      `,
      [active, limit],
    )
    return result.rows.map(toRecord)
  }

  const result = await pool.query<WorkflowTemplateRow>(
    `
      SELECT
        workflow_id,
        name,
        description,
        step_graph_json,
        default_policies_json,
        active,
        created_at,
        updated_at
      FROM workflow_templates
      ORDER BY updated_at DESC, workflow_id ASC
      LIMIT $1
    `,
    [limit],
  )

  return result.rows.map(toRecord)
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
