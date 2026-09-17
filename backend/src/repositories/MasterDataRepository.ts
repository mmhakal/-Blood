/**
 * MasterDataRepository — Database repository for Master Data domain
 */

import { BaseRepository } from './BaseRepository';

export class MasterDataRepository extends BaseRepository {
  public readonly moduleName = 'MASTER_DATA';
  public readonly tablesOwned = [
    'patients',
    'doctors',
    'test_categories',
    'tests',
    'test_parameters',
    'reference_ranges',
    'test_prices',
    'packages',
    'package_tests',
    'sample_types',
    'departments'
  ];

  async findPatientById(patientId: string, labId: string) {
    return this.queryOne(`SELECT * FROM patients WHERE id = $1 AND lab_id = $2`, [patientId, labId]);
  }

  async findDoctorById(doctorId: string, labId: string) {
    return this.queryOne(`SELECT * FROM doctors WHERE id = $1 AND lab_id = $2`, [doctorId, labId]);
  }

  async findTestById(testId: string, labId?: string) {
    if (labId) {
      return this.queryOne(`SELECT * FROM tests WHERE id = $1 AND (lab_id = $2 OR lab_id IS NULL)`, [testId, labId]);
    }
    return this.queryOne(`SELECT * FROM tests WHERE id = $1`, [testId]);
  }

  async getTestParameters(testId: string) {
    return this.query(
      `SELECT tp.*, rr.normal_min, rr.normal_max, rr.critical_min, rr.critical_max, rr.text_options
       FROM test_parameters tp
       LEFT JOIN reference_ranges rr ON tp.id = rr.parameter_id
       WHERE tp.test_id = $1
       ORDER BY tp.display_order ASC`,
      [testId]
    );
  }
}

export default new MasterDataRepository();
