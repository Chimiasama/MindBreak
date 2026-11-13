import { CampaignSave, decodeCampaignSave, MAX_SAVE_BYTES } from './save';

export const CAMPAIGN_SAVE_KEY = 'mindbreak.campaign.v1';
export const CAMPAIGN_BACKUP_KEY = `${CAMPAIGN_SAVE_KEY}.backup`;
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type StoredCampaign =
  | { status: 'ready' | 'recovered'; save: CampaignSave }
  | { status: 'missing' | 'corrupt' | 'incompatible' | 'unavailable' };

function browserStorage(): SaveStorage { return window.localStorage; }

/** Invalid data is retained until explicitly replaced/discarded. No partial runtime restoration. */
export function readCampaignSave(storage?: SaveStorage): StoredCampaign {
  try {
    const backend = storage ?? browserStorage();
    const text = backend.getItem(CAMPAIGN_SAVE_KEY);
    const primary = text === null ? null : decodeCampaignSave(text);
    if (primary?.status === 'ready') return primary;
    const backupText = backend.getItem(CAMPAIGN_BACKUP_KEY);
    const backup = backupText === null ? null : decodeCampaignSave(backupText);
    if (backup?.status === 'ready') return { status: 'recovered', save: backup.save };
    return primary ?? backup ?? { status: 'missing' };
  } catch { return { status: 'unavailable' }; }
}

export function writeCampaignSave(save: CampaignSave, storage?: SaveStorage): 'saved' | 'invalid' | 'unavailable' {
  try {
    const text = JSON.stringify(save);
    if (new TextEncoder().encode(text).length > MAX_SAVE_BYTES || decodeCampaignSave(text).status !== 'ready') return 'invalid';
    const backend = storage ?? browserStorage();
    const previous = backend.getItem(CAMPAIGN_SAVE_KEY);
    if (previous && decodeCampaignSave(previous).status === 'ready') {
      // Backup is best effort. setItem on the primary remains atomic if quota is exhausted.
      try { backend.setItem(CAMPAIGN_BACKUP_KEY, previous); } catch { /* preserve the primary */ }
    }
    backend.setItem(CAMPAIGN_SAVE_KEY, text);
    return 'saved';
  } catch { return 'unavailable'; }
}

export function discardCampaignSave(storage?: SaveStorage): boolean {
  try {
    const backend = storage ?? browserStorage();
    backend.removeItem(CAMPAIGN_SAVE_KEY);
    backend.removeItem(CAMPAIGN_BACKUP_KEY);
    return true;
  } catch { return false; }
}
