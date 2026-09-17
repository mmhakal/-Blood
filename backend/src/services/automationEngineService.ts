import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notificationService';

export interface AutomationCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';
  value: any;
  logical_op?: 'AND' | 'OR';
}

export interface AutomationAction {
  action_type: 'NOTIFY_USER' | 'CREATE_TASK' | 'HOLD_ANALYZER_WORKFLOW' | 'DISPATCH_WEBHOOK';
  params: Record<string, any>;
}

export class AutomationEngineService {
  /**
   * Evaluate conditions array with AND / OR precedence
   */
  public static evaluateConditions(conditions: AutomationCondition[], context: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const actualVal = context[cond.field];
      let condMatch = false;

      switch (cond.operator) {
        case '=':
          condMatch = String(actualVal) === String(cond.value);
          break;
        case '!=':
          condMatch = String(actualVal) !== String(cond.value);
          break;
        case '>':
          condMatch = Number(actualVal) > Number(cond.value);
          break;
        case '<':
          condMatch = Number(actualVal) < Number(cond.value);
          break;
        case '>=':
          condMatch = Number(actualVal) >= Number(cond.value);
          break;
        case '<=':
          condMatch = Number(actualVal) <= Number(cond.value);
          break;
        case 'contains':
          condMatch = String(actualVal || '').toLowerCase().includes(String(cond.value || '').toLowerCase());
          break;
        case 'in':
          const valArray = Array.isArray(cond.value) ? cond.value : String(cond.value).split(',');
          condMatch = valArray.map((v: any) => String(v).trim()).includes(String(actualVal));
          break;
        default:
          condMatch = false;
      }

      if (i === 0) {
        result = condMatch;
      } else {
        const logicalOp = conditions[i - 1].logical_op || 'AND';
        if (logicalOp === 'AND') {
          result = result && condMatch;
        } else {
          result = result || condMatch;
        }
      }
    }

    return result;
  }

  /**
   * Execute automation rules triggered by an enterprise event
   */
  public static async triggerEvent(
    labId: string,
    triggerEvent: string,
    entityId: string,
    context: Record<string, any>
  ): Promise<{ triggeredCount: number; executedRules: string[] }> {
    const rules = await db.query<any>(
      `SELECT * FROM automation_rules WHERE lab_id = $1 AND trigger_event = $2 AND is_active = 1`,
      [labId, triggerEvent]
    );

    const executedRuleNames: string[] = [];

    for (const rule of rules) {
      try {
        const conditions: AutomationCondition[] = JSON.parse(rule.conditions_json || '[]');
        const actions: AutomationAction[] = JSON.parse(rule.actions_json || '[]');

        const conditionMet = this.evaluateConditions(conditions, context);

        if (conditionMet) {
          const executedActionsLog: any[] = [];

          for (const act of actions) {
            if (act.action_type === 'CREATE_TASK') {
              const taskNum = `TSK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
              await db.execute(
                `INSERT INTO enterprise_tasks (id, lab_id, task_number, title, description, source_type, source_id, department, priority, status, sla_hours, due_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, CURRENT_TIMESTAMP)`,
                [
                  `tsk-${uuidv4().substring(0, 8)}`,
                  labId,
                  taskNum,
                  act.params?.title || `Automated Task: ${rule.name}`,
                  act.params?.description || `Triggered by rule ${rule.name} on event ${triggerEvent}`,
                  act.params?.source_type || 'automation',
                  entityId,
                  act.params?.department || 'general',
                  act.params?.priority || 'medium',
                  act.params?.sla_hours || 24,
                ]
              );
              executedActionsLog.push({ action: 'CREATE_TASK', task_number: taskNum });
            } else if (act.action_type === 'NOTIFY_USER') {
              await NotificationService.sendInApp(
                labId,
                act.params?.user_id || 'system',
                `[Automated Alert] ${rule.name}`,
                act.params?.message || `Automated rule triggered for ${triggerEvent} on entity ${entityId}`
              );
              executedActionsLog.push({ action: 'NOTIFY_USER', recipient: act.params?.user_id || act.params?.role });
            } else if (act.action_type === 'HOLD_ANALYZER_WORKFLOW') {
              if (context.analyzer_id) {
                await db.execute(
                  `UPDATE analyzers SET status = 'maintenance' WHERE id = $1 AND lab_id = $2`,
                  [context.analyzer_id, labId]
                );
              }
              executedActionsLog.push({ action: 'HOLD_ANALYZER_WORKFLOW', analyzer_id: context.analyzer_id });
            }
          }

          // Update rule execution count & timestamp
          await db.execute(
            `UPDATE automation_rules SET execution_count = execution_count + 1, last_executed_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [rule.id]
          );

          // Log execution in audit table
          await db.execute(
            `INSERT INTO automation_executions (id, rule_id, lab_id, trigger_event, trigger_entity_id, condition_result, actions_executed_json, status)
             VALUES ($1, $2, $3, $4, $5, 1, $6, 'success')`,
            [
              `exec-${uuidv4().substring(0, 8)}`,
              rule.id,
              labId,
              triggerEvent,
              entityId,
              JSON.stringify(executedActionsLog),
            ]
          );

          executedRuleNames.push(rule.name);
        } else {
          // Log skipped condition
          await db.execute(
            `INSERT INTO automation_executions (id, rule_id, lab_id, trigger_event, trigger_entity_id, condition_result, status)
             VALUES ($1, $2, $3, $4, $5, 0, 'skipped')`,
            [`exec-${uuidv4().substring(0, 8)}`, rule.id, labId, triggerEvent, entityId]
          );
        }
      } catch (err: any) {
        console.error(`Automation rule execution error [${rule.id}]:`, err.message);
        await db.execute(
          `INSERT INTO automation_executions (id, rule_id, lab_id, trigger_event, trigger_entity_id, condition_result, status, error_message)
           VALUES ($1, $2, $3, $4, $5, 0, 'failed', $6)`,
          [`exec-${uuidv4().substring(0, 8)}`, rule.id, labId, triggerEvent, entityId, err.message]
        );
      }
    }

    return {
      triggeredCount: executedRuleNames.length,
      executedRules: executedRuleNames,
    };
  }
}

export default AutomationEngineService;
