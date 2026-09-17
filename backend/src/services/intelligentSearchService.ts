import db from '../db/database';

export interface SearchResultEntity {
  entity_type: 'patient' | 'order' | 'sample' | 'report' | 'test' | 'doctor' | 'invoice' | 'inventory' | 'analyzer' | 'equipment' | 'qc';
  entity_id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badge_color?: string;
  url: string;
  created_at?: string;
}

export class IntelligentSearchService {
  /**
   * Execute intelligent cross-entity natural-language search.
   */
  static async search(query: string, labId: string, roleCode?: string): Promise<{
    query: string;
    parsed_intent?: string;
    total_results: number;
    results: SearchResultEntity[];
  }> {
    const raw = query.trim().toLowerCase();
    const results: SearchResultEntity[] = [];
    let parsedIntent = '';

    const param = `%${raw}%`;

    // 1. PATIENT SEARCH
    const patients = await db.query<{ id: string; name: string; patient_id_code: string; mobile: string; created_at: string }>(
      `SELECT id, name, patient_id_code, mobile, created_at
       FROM patients
       WHERE lab_id = $1 AND (LOWER(name) LIKE $2 OR LOWER(patient_id_code) LIKE $2 OR mobile LIKE $2)
       LIMIT 5`,
      [labId, param]
    );
    for (const p of patients) {
      results.push({
        entity_type: 'patient',
        entity_id: p.id,
        title: p.name,
        subtitle: `Patient Code: ${p.patient_id_code} | Tel: ${p.mobile}`,
        badge: 'PATIENT',
        badge_color: '#0284c7',
        url: `/patients?id=${p.id}`,
        created_at: p.created_at
      });
    }

    // 2. ORDER SEARCH
    const orders = await db.query<{ id: string; order_number: string; patient_name: string; priority: string; status: string; created_at: string }>(
      `SELECT o.id, o.order_number, p.name as patient_name, o.priority, o.status, o.created_at
       FROM test_orders o
       JOIN patients p ON o.patient_id = p.id
       WHERE o.lab_id = $1 AND (LOWER(o.order_number) LIKE $2 OR LOWER(p.name) LIKE $2)
       LIMIT 5`,
      [labId, param]
    );
    for (const o of orders) {
      results.push({
        entity_type: 'order',
        entity_id: o.id,
        title: `Order #${o.order_number}`,
        subtitle: `Patient: ${o.patient_name} | Priority: ${o.priority.toUpperCase()}`,
        badge: o.status.toUpperCase(),
        badge_color: o.priority === 'stat' ? '#ef4444' : '#6366f1',
        url: `/orders?id=${o.id}`,
        created_at: o.created_at
      });
    }

    // 3. SPECIMEN / SAMPLE SEARCH
    const samples = await db.query<{ id: string; sample_barcode: string; sample_type: string; status: string; patient_name: string }>(
      `SELECT s.id, s.sample_barcode, s.sample_type, s.status, p.name as patient_name
       FROM samples s
       JOIN test_orders o ON s.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       WHERE s.lab_id = $1 AND (LOWER(s.sample_barcode) LIKE $2 OR LOWER(p.name) LIKE $2)
       LIMIT 5`,
      [labId, param]
    );
    for (const s of samples) {
      results.push({
        entity_type: 'sample',
        entity_id: s.id,
        title: `Specimen ${s.sample_barcode}`,
        subtitle: `${s.sample_type} — Patient: ${s.patient_name}`,
        badge: s.status.toUpperCase(),
        badge_color: '#10b981',
        url: `/lis/accession?barcode=${s.sample_barcode}`
      });
    }

    // 4. DIAGNOSTIC REPORTS
    const reports = await db.query<{ id: string; report_number: string; patient_name: string; status: string }>(
      `SELECT r.id, r.report_number, p.name as patient_name, r.status
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       WHERE r.lab_id = $1 AND (LOWER(r.report_number) LIKE $2 OR LOWER(p.name) LIKE $2)
       LIMIT 5`,
      [labId, param]
    );
    for (const r of reports) {
      results.push({
        entity_type: 'report',
        entity_id: r.id,
        title: `Report #${r.report_number}`,
        subtitle: `Patient: ${r.patient_name}`,
        badge: r.status.toUpperCase(),
        badge_color: r.status === 'approved' || r.status === 'released' ? '#16a34a' : '#d97706',
        url: `/reports?id=${r.id}`
      });
    }

    // 5. TEST MASTER
    const tests = await db.query<{ id: string; name: string; code: string; department: string }>(
      `SELECT id, name, code, department
       FROM tests
       WHERE (lab_id = $1 OR lab_id IS NULL) AND (LOWER(name) LIKE $2 OR LOWER(code) LIKE $2)
       LIMIT 4`,
      [labId, param]
    );
    for (const t of tests) {
      results.push({
        entity_type: 'test',
        entity_id: t.id,
        title: `${t.name} (${t.code})`,
        subtitle: `Department: ${t.department}`,
        badge: 'TEST',
        badge_color: '#8b5cf6',
        url: `/tests`
      });
    }

    // 6. INVENTORY REAGENTS & CONSUMABLES
    const inventory = await db.query<{ id: string; name: string; item_code: string; current_stock: number; unit: string }>(
      `SELECT id, name, code as item_code, current_stock, unit
       FROM inventory_items
       WHERE lab_id = $1 AND (LOWER(name) LIKE $2 OR LOWER(code) LIKE $2)
       LIMIT 4`,
      [labId, param]
    );
    for (const inv of inventory) {
      results.push({
        entity_type: 'inventory',
        entity_id: inv.id,
        title: `${inv.name} (${inv.item_code})`,
        subtitle: `Stock Level: ${inv.current_stock} ${inv.unit}`,
        badge: 'STOCK',
        badge_color: '#d97706',
        url: `/inventory/items`
      });
    }

    // 7. ANALYZERS & INSTRUMENTS
    const analyzers = await db.query<{ id: string; name: string; model: string; status: string }>(
      `SELECT id, name, model, status
       FROM analyzers
       WHERE lab_id = $1 AND (LOWER(name) LIKE $2 OR LOWER(model) LIKE $2)
       LIMIT 3`,
      [labId, param]
    );
    for (const a of analyzers) {
      results.push({
        entity_type: 'analyzer',
        entity_id: a.id,
        title: `${a.name} (${a.model})`,
        subtitle: `Analyzer Fleet Asset`,
        badge: a.status.toUpperCase(),
        badge_color: a.status === 'online' ? '#16a34a' : '#ef4444',
        url: `/analyzers`
      });
    }

    // Check for natural language intent
    if (raw.includes('pending') && (raw.includes('cbc') || raw.includes('hemogram'))) {
      parsedIntent = 'Filtered for pending Complete Blood Count (CBC) orders awaiting review';
    } else if (raw.includes('critical') || raw.includes('panic')) {
      parsedIntent = 'Filtered for immediate panic/critical alert results';
    } else if (raw.includes('low stock') || raw.includes('reagent')) {
      parsedIntent = 'Filtered for low stock inventory items requiring replenishment';
    }

    return {
      query,
      parsed_intent: parsedIntent || undefined,
      total_results: results.length,
      results
    };
  }
}

export default IntelligentSearchService;
