import db from '../db/database';
import Logger from './logger';

export interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  category: 'account' | 'facility' | 'clinical' | 'operational';
  is_completed: boolean;
  action_url: string;
}

export const ONBOARDING_STEPS_CATALOG: Omit<OnboardingStep, 'is_completed'>[] = [
  { id: 'signup', order: 1, title: 'Account Registration', description: 'Create primary administrator credentials', category: 'account', action_url: '/login' },
  { id: 'verify_contact', order: 2, title: 'Contact Verification', description: 'Verify organization email and mobile number', category: 'account', action_url: '/settings' },
  { id: 'select_plan', order: 3, title: 'Subscription Tier', description: 'Select suitable diagnostic volume tier', category: 'account', action_url: '/subscriptions' },
  { id: 'create_org', order: 4, title: 'Organization Profile', description: 'Set headquarters and legal entity name', category: 'facility', action_url: '/organizations' },
  { id: 'create_lab', order: 5, title: 'Laboratory Master', description: 'Configure central diagnostic laboratory', category: 'facility', action_url: '/laboratories' },
  { id: 'create_branch', order: 6, title: 'Primary Collection Branch', description: 'Register main accessioning facility', category: 'facility', action_url: '/branches' },
  { id: 'configure_settings', order: 7, title: 'System Settings', description: 'Configure reference ranges & currencies', category: 'operational', action_url: '/settings' },
  { id: 'import_master', order: 8, title: 'Import Master Data', description: 'Migrate legacy patients, doctors, tests', category: 'clinical', action_url: '/import' },
  { id: 'add_staff', order: 9, title: 'Staff Roster & Roles', description: 'Invite pathologists, technicians & receptionists', category: 'facility', action_url: '/users' },
  { id: 'add_tests', order: 10, title: 'Test Master Catalog', description: 'Establish test parameters & pricing', category: 'clinical', action_url: '/tests' },
  { id: 'configure_report', order: 11, title: 'Report Design Template', description: 'Brand diagnostic PDF headers and signatures', category: 'operational', action_url: '/templates' },
  { id: 'configure_billing', order: 12, title: 'Billing & Invoicing', description: 'Set tax rates, receipts & payment modes', category: 'operational', action_url: '/billing' },
  { id: 'configure_notifications', order: 13, title: 'SMS & WhatsApp Gateway', description: 'Setup DLT credentials and message templates', category: 'operational', action_url: '/communication' },
  { id: 'optional_analyzer', order: 14, title: 'Analyzer Interfacing', description: 'Configure ASTM / HL7 bidirectional links', category: 'clinical', action_url: '/analyzers' }
];

export class OnboardingService {
  /**
   * Get laboratory onboarding progress and milestone checklist.
   */
  static async getProgress(labId: string): Promise<{
    lab_id: string;
    completed_count: number;
    total_steps: number;
    progress_percentage: number;
    is_ready_to_operate: boolean;
    steps: OnboardingStep[];
  }> {
    // Check actual DB records to dynamically verify completion
    const [lab, branches, users, tests, templates] = await Promise.all([
      db.queryOne(`SELECT * FROM laboratories WHERE id = $1`, [labId]),
      db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM branches WHERE lab_id = $1`, [labId]),
      db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM users WHERE lab_id = $1`, [labId]),
      db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM tests WHERE lab_id = $1 OR lab_id IS NULL`, [labId]),
      db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM report_templates WHERE lab_id = $1`, [labId])
    ]);

    const completedStepIds = new Set<string>([
      'signup',
      'verify_contact',
      'select_plan',
      'create_org'
    ]);

    if (lab) completedStepIds.add('create_lab');
    if (Number(branches?.count || 0) > 0) completedStepIds.add('create_branch');
    if (Number(users?.count || 0) >= 2) completedStepIds.add('add_staff');
    if (Number(tests?.count || 0) > 0) completedStepIds.add('add_tests');
    if (Number(templates?.count || 0) > 0) completedStepIds.add('configure_report');

    // Default configuration milestones
    completedStepIds.add('configure_settings');
    completedStepIds.add('configure_billing');
    completedStepIds.add('configure_notifications');

    const steps: OnboardingStep[] = ONBOARDING_STEPS_CATALOG.map(s => ({
      ...s,
      is_completed: completedStepIds.has(s.id)
    }));

    const completedCount = steps.filter(s => s.is_completed).length;
    const progressPercentage = Math.round((completedCount / steps.length) * 100);

    return {
      lab_id: labId,
      completed_count: completedCount,
      total_steps: steps.length,
      progress_percentage: progressPercentage,
      is_ready_to_operate: progressPercentage >= 70,
      steps
    };
  }

  /**
   * 1-Click Starter Pack Provisioning for newly registered labs.
   */
  static async provisionQuickStarter(labId: string) {
    // 1. Ensure default branch exists
    const branchCheck = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM branches WHERE lab_id = $1`, [labId]);
    if (Number(branchCheck?.count || 0) === 0) {
      await db.execute(
        `INSERT INTO branches (id, lab_id, name, code, address, status)
         VALUES ($1, $2, $3, $4, $5, 'active')`,
        [`br-${Date.now()}`, labId, 'Central Laboratory Branch', 'BR-CENTRAL', 'Facility Head Branch']
      );
    }

    // 2. Ensure default report template exists
    const templateCheck = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM report_templates WHERE lab_id = $1`, [labId]);
    if (Number(templateCheck?.count || 0) === 0) {
      await db.execute(
        `INSERT INTO report_templates (id, lab_id, name, is_default, header_html, footer_html)
         VALUES ($1, $2, $3, 1, $4, $5)`,
        [`tpl-${Date.now()}`, labId, 'Standard Clinical NABL Template', 'Diagnostic Laboratory Reference Center', 'NABL / ISO 15189 Accredited']
      );
    }

    Logger.info(`Starter pack provisioned for laboratory ${labId}`);
    return { success: true };
  }
}

export default OnboardingService;
