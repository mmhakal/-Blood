/**
 * Storage Schema Versioning & Safe Migration Manager
 */

import { extensionStorage } from './extensionStorage';

const CURRENT_STORAGE_VERSION = 1;

export async function checkAndRunStorageMigrations(): Promise<void> {
  const version = (await extensionStorage.get<number>('schema_version')) || 0;

  if (version === CURRENT_STORAGE_VERSION) {
    return; // Up to date
  }

  console.log(`[Storage Migration] Upgrading storage schema from v${version} to v${CURRENT_STORAGE_VERSION}`);

  if (version < 1) {
    // Migration v0 -> v1: Ensure default settings structure
    const settings = await extensionStorage.getSettings();
    await extensionStorage.updateSettings(settings);
  }

  // Update version
  await extensionStorage.set('schema_version', CURRENT_STORAGE_VERSION);
  console.log('[Storage Migration] Storage schema upgrade complete.');
}
