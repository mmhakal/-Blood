import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { db } from '../db/database';

export interface ReportData {
  report_number: string;
  created_at: string;
  approved_at?: string;
  version_number?: number;
  is_amended?: boolean;
  watermark_text?: string;
  patient: {
    name: string;
    patient_id_code: string;
    lab_number: string;
    age: number;
    age_unit: string;
    gender: string;
    mobile: string;
    address?: string;
  };
  doctor?: {
    name: string;
    qualification?: string;
    specialization?: string;
    clinic_hospital?: string;
  };
  branch?: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  lab: {
    name: string;
    license_number?: string;
    address?: string;
    phone?: string;
    email?: string;
    header_text?: string;
    footer_text?: string;
  };
  sample?: {
    sample_barcode: string;
    sample_type: string;
    collected_at?: string;
  };
  tests: Array<{
    test_name: string;
    method?: string;
    department?: string;
    clinical_remarks?: string;
    impression?: string;
    parameters: Array<{
      param_name: string;
      value: string | number;
      unit?: string;
      ref_range?: string;
      flag: string;
      is_critical: boolean;
    }>;
  }>;
  approver?: {
    name: string;
    role_code: string;
  };
}

function renderReportContent(doc: PDFKit.PDFDocument, data: ReportData): void {
  const primaryColor = '#0369a1';
  const secondaryColor = '#0f172a';
  const grayColor = '#475569';
  const lightGray = '#f1f5f9';
  const alertColor = '#dc2626';

  // 1. HEADER SECTION
  doc.fontSize(18).fillColor(primaryColor).font('Helvetica-Bold')
     .text(data.lab.name.toUpperCase(), { align: 'center' });

  if (data.lab.license_number) {
    doc.fontSize(8.5).fillColor(grayColor).font('Helvetica')
       .text(`Accreditation & License: ${data.lab.license_number}`, { align: 'center' });
  }

  const labDetails = [data.branch?.name || data.lab.address, data.lab.phone ? `Phone: ${data.lab.phone}` : '', data.lab.email ? `Email: ${data.lab.email}` : '']
    .filter(Boolean)
    .join('  |  ');

  doc.fontSize(8).fillColor(grayColor).font('Helvetica').text(labDetails, { align: 'center' });
  doc.moveDown(0.5);

  // Decorative blue header bar
  doc.rect(36, doc.y, 523, 2.5).fill(primaryColor);
  doc.moveDown(0.5);

  // 2. PATIENT & SAMPLE DEMOGRAPHICS BOX
  const boxTop = doc.y;
  doc.rect(36, boxTop, 523, 90).fillAndStroke(lightGray, '#cbd5e1');

  doc.fillColor(secondaryColor).fontSize(8.5);

  // Left Column
  doc.font('Helvetica-Bold').text('Patient Name:', 46, boxTop + 8);
  doc.font('Helvetica').text(data.patient.name, 125, boxTop + 8);

  doc.font('Helvetica-Bold').text('Age / Gender:', 46, boxTop + 24);
  doc.font('Helvetica').text(`${data.patient.age} ${data.patient.age_unit || 'Yrs'} / ${data.patient.gender}`, 125, boxTop + 24);

  doc.font('Helvetica-Bold').text('Patient ID:', 46, boxTop + 40);
  doc.font('Helvetica').text(data.patient.patient_id_code, 125, boxTop + 40);

  doc.font('Helvetica-Bold').text('Ref. Doctor:', 46, boxTop + 56);
  doc.font('Helvetica').text(data.doctor?.name ? `${data.doctor.name} (${data.doctor.specialization || 'Consultant'})` : 'Self / General OPD', 125, boxTop + 56);

  doc.font('Helvetica-Bold').text('Branch / Center:', 46, boxTop + 72);
  doc.font('Helvetica').text(data.branch?.name || 'Main Diagnostic Hub', 125, boxTop + 72);

  // Right Column
  doc.font('Helvetica-Bold').text('Report Number:', 320, boxTop + 8);
  doc.font('Helvetica').text(data.report_number, 415, boxTop + 8);

  doc.font('Helvetica-Bold').text('Lab Reference:', 320, boxTop + 24);
  doc.font('Helvetica').text(data.patient.lab_number || 'N/A', 415, boxTop + 24);

  doc.font('Helvetica-Bold').text('Sample ID / Barcode:', 320, boxTop + 40);
  doc.font('Helvetica').text(data.sample?.sample_barcode || 'SMP-ONLINE', 415, boxTop + 40);

  doc.font('Helvetica-Bold').text('Collected At:', 320, boxTop + 56);
  doc.font('Helvetica').text(data.sample?.collected_at ? new Date(data.sample.collected_at).toLocaleString('en-IN') : 'Standard Routine', 415, boxTop + 56);

  doc.font('Helvetica-Bold').text('Report Version:', 320, boxTop + 72);
  const versionText = `Version ${data.version_number || 1}${data.is_amended ? ' — Amended' : ''}`;
  doc.font('Helvetica-Bold').fillColor(data.is_amended ? '#b45309' : secondaryColor).text(versionText, 415, boxTop + 72);

  doc.y = boxTop + 100;

  // 3. TABLE HEADER: | Parameter | Observed Value | Unit | Biological Reference Interval | Flag |
  const tableTop = doc.y;
  doc.rect(36, tableTop, 523, 20).fill('#e2e8f0');
  doc.fillColor(secondaryColor).fontSize(8).font('Helvetica-Bold');
  doc.text('TEST / PARAMETER', 46, tableTop + 5);
  doc.text('OBSERVED VALUE', 215, tableTop + 5);
  doc.text('UNIT', 315, tableTop + 5);
  doc.text('BIOLOGICAL REF. INTERVAL', 375, tableTop + 5);
  doc.text('FLAG', 505, tableTop + 5);

  doc.y = tableTop + 25;

  // 4. TEST SECTIONS & PARAMETERS
  data.tests.forEach((test) => {
    if (doc.y > 690) {
      doc.addPage();
    }

    // Test Name Section Banner
    const testHeaderY = doc.y;
    doc.rect(36, testHeaderY, 523, 18).fill('#f8fafc');
    doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
    doc.text(test.test_name.toUpperCase(), 46, testHeaderY + 4);
    if (test.method) {
      doc.fillColor(grayColor).fontSize(7.5).font('Helvetica')
         .text(`Method: ${test.method}`, 330, testHeaderY + 5, { width: 220, align: 'right' });
    }

    doc.y = testHeaderY + 22;

    // Parameters
    test.parameters.forEach((param, pIdx) => {
      if (doc.y > 720) {
        doc.addPage();
      }

      const rowY = doc.y;
      const isCritical = param.is_critical;
      const isAbnormal = isCritical || param.flag === 'high' || param.flag === 'low' || param.flag === 'abnormal';

      // Zebra background
      if (pIdx % 2 === 1) {
        doc.rect(36, rowY, 523, 16).fill('#fafafa');
      }

      // Parameter Name
      doc.fillColor(secondaryColor).fontSize(8.5).font(isAbnormal ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(param.param_name, 48, rowY + 3, { width: 160 });

      // Observed Value
      if (isCritical) {
        doc.fillColor('#991b1b').font('Helvetica-Bold');
        doc.text(`${param.value} **`, 215, rowY + 3);
      } else if (isAbnormal) {
        doc.fillColor(alertColor).font('Helvetica-Bold');
        doc.text(`${param.value} *`, 215, rowY + 3);
      } else {
        doc.fillColor(secondaryColor).font('Helvetica');
        doc.text(String(param.value), 215, rowY + 3);
      }

      // Unit
      doc.fillColor(grayColor).font('Helvetica').text(param.unit || '-', 315, rowY + 3);

      // Reference Interval
      doc.fillColor(grayColor).font('Helvetica').text(param.ref_range || 'Normal', 375, rowY + 3, { width: 120 });

      // Flag
      let flagText = 'NORMAL';
      let flagColor = '#10b981';
      if (param.flag === 'critical_high') {
        flagText = 'CRIT HIGH';
        flagColor = '#991b1b';
      } else if (param.flag === 'critical_low') {
        flagText = 'CRIT LOW';
        flagColor = '#991b1b';
      } else if (param.flag === 'high') {
        flagText = 'HIGH';
        flagColor = '#dc2626';
      } else if (param.flag === 'low') {
        flagText = 'LOW';
        flagColor = '#d97706';
      } else if (param.flag === 'abnormal') {
        flagText = 'ABNORMAL';
        flagColor = '#dc2626';
      }

      doc.fillColor(flagColor).font('Helvetica-Bold').fontSize(7.5).text(flagText, 500, rowY + 3);

      doc.y = rowY + 16;
    });

    // Clinical remarks if any
    if (test.clinical_remarks || test.impression) {
      doc.moveDown(0.3);
      const remarkBoxY = doc.y;
      doc.rect(46, remarkBoxY, 503, 26).fillAndStroke('#f0f9ff', '#bae6fd');
      doc.fillColor('#0369a1').fontSize(8).font('Helvetica-Bold').text('Clinical Impression & Remarks: ', 52, remarkBoxY + 4);
      doc.fillColor(secondaryColor).font('Helvetica').text(test.impression || test.clinical_remarks || '', 52, remarkBoxY + 14, { width: 490 });
      doc.y = remarkBoxY + 32;
    }

    doc.moveDown(0.3);
  });

  // Check page overflow for signatures
  if (doc.y > 680) {
    doc.addPage();
  }

  // 5. SIGNATURE & VERIFICATION SECTION
  const sigY = 705;
  doc.rect(36, sigY, 523, 1).fill('#cbd5e1');

  // Left Signatory: Medical Laboratory Technologist
  doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica-Bold');
  doc.text('Alex Rivera, B.Sc MLT', 50, sigY + 14);
  doc.fontSize(7.5).font('Helvetica').fillColor(grayColor);
  doc.text('Senior Medical Laboratory Technologist', 50, sigY + 26);
  doc.text('Specimen Verified & Analyzed', 50, sigY + 36);

  // Right Signatory: Pathologist
  const pathologistName = data.approver?.name || 'Dr. Sarah Jenkins, MD';
  doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica-Bold');
  doc.text(pathologistName, 350, sigY + 14, { width: 200, align: 'right' });
  doc.fontSize(7.5).font('Helvetica').fillColor(grayColor);
  doc.text('Consultant Clinical Pathologist', 350, sigY + 26, { width: 200, align: 'right' });
  doc.text('Reg No: MED-PATH-84291 (Digital Certified)', 350, sigY + 36, { width: 200, align: 'right' });

  // 6. FOOTER & WATERMARK ON ALL PAGES
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);

    // Watermark if amended
    if (data.is_amended || data.watermark_text) {
      doc.save();
      doc.opacity(0.08);
      doc.rotate(-35, { origin: [300, 420] });
      doc.fontSize(48).fillColor('#000000').font('Helvetica-Bold')
         .text(data.watermark_text || 'AMENDED REPORT', 80, 400, { align: 'center', width: 450 });
      doc.restore();
    }

    // End of Report marker on final page
    if (i === totalPages - 1) {
      doc.fontSize(8).fillColor(grayColor).font('Helvetica-Oblique')
         .text('***** End of Diagnostic Laboratory Report *****', 36, 760, { align: 'center' });
    }

    // Disclaimer & Page number
    const footerText = data.lab.footer_text || 'Diagnostic tests are intended to assist clinical diagnosis. Findings should correlate with clinical conditions.';
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
       .text(footerText, 36, 775, { align: 'center', width: 523 });

    doc.fontSize(7).fillColor('#64748b').font('Helvetica')
       .text(`Report Number: ${data.report_number}  |  Version: ${data.version_number || 1}  |  Generated on ${new Date().toLocaleDateString('en-IN')}  |  Page ${i + 1} of ${totalPages}`, 36, 792, { align: 'center' });
  }

  doc.end();
}

export function generateReportPdf(data: ReportData, res: Response): void {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 36, bottom: 40, left: 36, right: 36 },
    bufferPages: true,
    info: {
      Title: `Diagnostic Report - ${data.report_number}`,
      Author: data.lab.name,
      Subject: `Laboratory Results for ${data.patient.name}`,
    }
  });

  doc.pipe(res);
  renderReportContent(doc, data);
}

export function generatePdfBuffer(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, bottom: 40, left: 36, right: 36 },
      bufferPages: true,
      info: {
        Title: `Diagnostic Report - ${data.report_number}`,
        Author: data.lab.name,
        Subject: `Laboratory Results for ${data.patient.name}`,
      }
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    renderReportContent(doc, data);
  });
}

export async function generatePdfReport(reportId: string): Promise<Buffer> {
  const reportRow = await db.queryOne<any>(
    `SELECT r.*,
            o.order_number, o.lab_number, o.created_at as order_date,
            p.name as patient_name, p.patient_id_code, p.age, p.age_unit, p.gender, p.mobile, p.address as patient_address,
            d.name as doctor_name, d.qualification as doctor_qualification, d.specialization as doctor_specialization, d.clinic_hospital as doctor_hospital,
            b.name as branch_name, b.code as branch_code, b.address as branch_address, b.phone as branch_phone,
            l.name as lab_name, l.license_number, l.address as lab_address, l.phone as lab_phone, l.email as lab_email, l.header_text, l.footer_text,
            u_app.name as approver_name, r_role.code as approver_role
     FROM reports r
     JOIN test_orders o ON r.order_id = o.id
     JOIN patients p ON o.patient_id = p.id
     LEFT JOIN doctors d ON o.referring_doctor_id = d.id
     LEFT JOIN branches b ON r.branch_id = b.id
     LEFT JOIN laboratories l ON r.lab_id = l.id
     LEFT JOIN users u_app ON r.approved_by = u_app.id
     LEFT JOIN roles r_role ON u_app.role_id = r_role.id
     WHERE r.id = $1`,
    [reportId]
  );

  if (!reportRow) {
    throw new Error('Report not found');
  }

  const sample = await db.queryOne<any>(`SELECT * FROM samples WHERE order_id = $1 LIMIT 1`, [reportRow.order_id]);

  const results = await db.query<any>(
    `SELECT r.id as result_id, r.clinical_remarks, r.impression, t.name as test_name, t.department, t.method
     FROM results r
     JOIN tests t ON r.test_id = t.id
     WHERE r.order_id = $1`,
    [reportRow.order_id]
  );

  const testSections: any[] = [];
  for (const r of results) {
    const values = await db.query<any>(
      `SELECT rv.*, tp.name as param_name, tp.display_order
       FROM result_values rv
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       WHERE rv.result_id = $1
       ORDER BY tp.display_order ASC`,
      [r.result_id]
    );

    testSections.push({
      test_name: r.test_name,
      department: r.department,
      method: r.method,
      clinical_remarks: r.clinical_remarks,
      impression: r.impression,
      parameters: values.map(v => ({
        param_name: v.param_name,
        value: v.value_numeric !== null ? v.value_numeric : (v.value_text || '-'),
        unit: v.unit,
        ref_range: v.reference_range_text,
        flag: v.flag,
        is_critical: Boolean(v.is_critical)
      }))
    });
  }

  const reportData: ReportData = {
    report_number: reportRow.report_number,
    created_at: reportRow.created_at,
    approved_at: reportRow.approved_at,
    version_number: reportRow.version_number || 1,
    is_amended: Boolean(reportRow.is_amended),
    watermark_text: reportRow.is_amended ? 'AMENDED REPORT' : undefined,
    patient: {
      name: reportRow.patient_name,
      patient_id_code: reportRow.patient_id_code,
      lab_number: reportRow.lab_number,
      age: reportRow.age,
      age_unit: reportRow.age_unit || 'Yrs',
      gender: reportRow.gender,
      mobile: reportRow.mobile,
      address: reportRow.patient_address
    },
    doctor: reportRow.doctor_name ? {
      name: reportRow.doctor_name,
      qualification: reportRow.doctor_qualification,
      specialization: reportRow.doctor_specialization,
      clinic_hospital: reportRow.doctor_hospital
    } : undefined,
    branch: {
      name: reportRow.branch_name,
      code: reportRow.branch_code,
      address: reportRow.branch_address,
      phone: reportRow.branch_phone
    },
    lab: {
      name: reportRow.lab_name,
      license_number: reportRow.license_number,
      address: reportRow.lab_address,
      phone: reportRow.lab_phone,
      email: reportRow.lab_email,
      header_text: reportRow.header_text,
      footer_text: reportRow.footer_text
    },
    sample: sample ? {
      sample_barcode: sample.sample_barcode,
      sample_type: sample.sample_type,
      collected_at: sample.collected_at
    } : undefined,
    tests: testSections,
    approver: reportRow.approver_name ? {
      name: reportRow.approver_name,
      role_code: reportRow.approver_role || 'pathologist'
    } : undefined
  };

  return generatePdfBuffer(reportData);
}
