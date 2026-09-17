/**
 * MediFlow LIS — Universal Analyzer Communication & Protocol Parser
 * Supports:
 * 1. ASTM E1381 / ASTM E1394 (Standard Specification for Transferring Information Between Clinical Instruments and Computer Systems)
 * 2. HL7 v2.x (Health Level Seven Standard - ORU_R01 Observation Results & ACK Acknowledgements)
 * 3. Structured JSON and CSV Clinical Analyzer Data Frames
 */

export interface ParsedAnalyzerResult {
  sampleBarcode: string;
  accessionNumber?: string;
  testCode: string;
  rawValue: string;
  parsedNumericValue: number | null;
  unit?: string;
  flag?: string; // normal, low, high, critical_low, critical_high, abnormal
  timestamp?: string;
}

export interface ParsedAnalyzerMessage {
  protocol: 'astm' | 'hl7' | 'json' | 'csv';
  instrumentId?: string;
  messageType?: string;
  controlId?: string;
  patientId?: string;
  patientName?: string;
  results: ParsedAnalyzerResult[];
  errors: string[];
}

/**
 * Parses ASTM E1381 / E1394 raw message frames.
 * ASTM Records:
 * - H: Header
 * - P: Patient Information
 * - O: Test Order / Specimen Accession
 * - R: Result Record (R|<seq>|^^^<test_code>|<value>|<unit>|<flag>|||<status>|||<timestamp>)
 * - C: Comment
 * - L: Message Terminator
 */
export function parseAstmMessage(raw: string): ParsedAnalyzerMessage {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const results: ParsedAnalyzerResult[] = [];
  const errors: string[] = [];

  let currentBarcode = '';
  let currentPatientId = '';
  let currentPatientName = '';
  let instrumentId = 'ASTM_GENERIC';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('|');
    const recordType = parts[0]?.toUpperCase();

    if (recordType === 'H') {
      // Header: H|\^&|||<instrument_id>|||||||...
      if (parts[4]) instrumentId = parts[4];
    } else if (recordType === 'P') {
      // Patient: P|1||<patient_id>||<patient_name>...
      if (parts[3]) currentPatientId = parts[3];
      if (parts[5]) currentPatientName = parts[5].replace(/\^/g, ' ').trim();
    } else if (recordType === 'O') {
      // Order / Specimen: O|1|<barcode>|<accession>|^^^<test>...
      currentBarcode = parts[2] || parts[3] || 'UNKNOWN_BARCODE';
    } else if (recordType === 'R') {
      // Result: R|1|^^^<test_code>|<value>|<unit>|<flag>...
      const testField = parts[2] || '';
      const testCode = testField.replace(/^\^*/, '').split('^')[0] || testField;
      const rawValue = parts[3] || '';
      const unit = parts[4] || '';
      const flagStr = (parts[5] || '').toUpperCase();

      let flag = 'normal';
      if (flagStr.includes('LL') || flagStr.includes('CL')) flag = 'critical_low';
      else if (flagStr.includes('HH') || flagStr.includes('CH')) flag = 'critical_high';
      else if (flagStr.includes('L')) flag = 'low';
      else if (flagStr.includes('H')) flag = 'high';
      else if (flagStr.includes('A')) flag = 'abnormal';

      const numericVal = parseFloat(rawValue);

      results.push({
        sampleBarcode: currentBarcode,
        testCode,
        rawValue,
        parsedNumericValue: isNaN(numericVal) ? null : numericVal,
        unit,
        flag,
        timestamp: new Date().toISOString()
      });
    }
  }

  return {
    protocol: 'astm',
    instrumentId,
    patientId: currentPatientId,
    patientName: currentPatientName,
    results,
    errors
  };
}

/**
 * Parses HL7 v2.x ORU_R01 Observation Messages.
 * Segments:
 * - MSH: Message Header (Delimiters, Sending App, Control ID)
 * - PID: Patient Identification
 * - OBR: Observation Request (Order / Specimen ID)
 * - OBX: Observation / Result (OBX|<seq>|NM|^^^<test_code>|<sub_id>|<value>|<unit>|<range>|<flag>...)
 */
export function parseHl7Message(raw: string): ParsedAnalyzerMessage {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const results: ParsedAnalyzerResult[] = [];
  const errors: string[] = [];

  let instrumentId = 'HL7_GENERIC';
  let controlId = '';
  let currentBarcode = '';
  let patientId = '';
  let patientName = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('|');
    const seg = parts[0]?.toUpperCase();

    if (seg === 'MSH') {
      // MSH|^~\&|<SendingApp>|<SendingFacility>|<ReceivingApp>|<ReceivingFacility>|<Timestamp>||ORU^R01|<ControlID>|P|2.5
      instrumentId = parts[2] || 'HL7_ANALYZER';
      controlId = parts[9] || `HL7-${Date.now()}`;
    } else if (seg === 'PID') {
      // PID|1||<PatientID>||<LastName>^<FirstName>...
      patientId = parts[3] || '';
      if (parts[5]) patientName = parts[5].replace(/\^/g, ' ').trim();
    } else if (seg === 'OBR') {
      // OBR|1|<PlacerOrderNum>|<FillerOrderNum_Barcode>|^^^<PanelCode>...
      currentBarcode = parts[3] || parts[2] || '';
    } else if (seg === 'OBX') {
      // OBX|1|NM|^^^<TestCode>^<TestName>||<Value>|<Units>|<RefRange>|<AbnormalFlags>|||F
      const testField = parts[3] || '';
      const testCode = testField.replace(/^\^*/, '').split('^')[0] || testField;
      const rawValue = parts[5] || '';
      const unit = parts[6] || '';
      const flagStr = (parts[8] || '').toUpperCase();

      let flag = 'normal';
      if (flagStr.includes('LL') || flagStr.includes('CL')) flag = 'critical_low';
      else if (flagStr.includes('HH') || flagStr.includes('CH')) flag = 'critical_high';
      else if (flagStr.includes('L')) flag = 'low';
      else if (flagStr.includes('H')) flag = 'high';
      else if (flagStr.includes('A')) flag = 'abnormal';

      const numericVal = parseFloat(rawValue);

      results.push({
        sampleBarcode: currentBarcode,
        testCode,
        rawValue,
        parsedNumericValue: isNaN(numericVal) ? null : numericVal,
        unit,
        flag,
        timestamp: new Date().toISOString()
      });
    }
  }

  return {
    protocol: 'hl7',
    instrumentId,
    controlId,
    patientId,
    patientName,
    results,
    errors
  };
}

/**
 * Builds standard HL7 v2.x ACK acknowledgement message in response to received ORU_R01
 */
export function generateHl7Ack(controlId: string, ackCode: 'AA' | 'AE' | 'AR' = 'AA', errorMsg?: string): string {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const ackLines = [
    `MSH|^~\\&|MEDIFLOW_LIS|APEX_CENTRAL|ANALYZER|LAB|${timestamp}||ACK|ACK-${controlId}|P|2.5`,
    `MSA|${ackCode}|${controlId}${errorMsg ? `|${errorMsg}` : ''}`
  ];
  return ackLines.join('\r') + '\r';
}

/**
 * Universal analyzer message router: autodetects protocol or uses specified format
 */
export function parseAnalyzerPacket(raw: string, protocolHint?: string): ParsedAnalyzerMessage {
  const trimmed = raw.trim();

  // 1. JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const results: ParsedAnalyzerResult[] = items.map((it: any) => ({
        sampleBarcode: it.barcode || it.sample_barcode || it.accession || 'UNKNOWN',
        accessionNumber: it.accession,
        testCode: it.test_code || it.code || it.parameter,
        rawValue: String(it.value !== undefined ? it.value : it.raw_value || ''),
        parsedNumericValue: typeof it.value === 'number' ? it.value : (isNaN(parseFloat(it.value)) ? null : parseFloat(it.value)),
        unit: it.unit || '',
        flag: it.flag || 'normal',
        timestamp: it.timestamp || new Date().toISOString()
      }));

      return {
        protocol: 'json',
        instrumentId: items[0]?.analyzer_id || 'JSON_API',
        results,
        errors: []
      };
    } catch (e: any) {
      return { protocol: 'json', results: [], errors: [`JSON Parse Error: ${e.message}`] };
    }
  }

  // 2. HL7 (Starts with MSH or contains MSH|)
  if (trimmed.startsWith('MSH') || trimmed.includes('|ORU^') || protocolHint === 'hl7') {
    return parseHl7Message(raw);
  }

  // 3. ASTM (Contains record delimiters like H|\ or R|1|)
  if (trimmed.startsWith('H|') || trimmed.includes('|R|') || protocolHint === 'astm') {
    return parseAstmMessage(raw);
  }

  // 4. Default to ASTM parser
  return parseAstmMessage(raw);
}
