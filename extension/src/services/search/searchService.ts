/**
 * Intelligent Multi-Entity Search Framework for MediFlow Extension
 */

import apiClient from '../api/apiClient';
import { SearchResultEntity } from '../../types';
import { extensionStorage } from '../storage/extensionStorage';
import telemetry from '../logging/telemetry';

export type SearchFilter = 'all' | 'patient' | 'order' | 'test' | 'report' | 'sample';

class SearchService {
  private recentSearchesKey = 'recent_searches';

  public async search(
    query: string,
    filter: SearchFilter = 'all'
  ): Promise<{
    total_results: number;
    results: SearchResultEntity[];
  }> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { total_results: 0, results: [] };
    }

    try {
      const res = await apiClient.get<{
        total_results: number;
        results: SearchResultEntity[];
      }>(`/search?q=${encodeURIComponent(cleanQuery)}`);

      let results = res.results || [];
      if (filter !== 'all') {
        results = results.filter(r => r.entity_type === filter);
      }

      await this.addRecentSearch(cleanQuery);
      await telemetry.track('search_performed', { queryLength: cleanQuery.length, filter });

      return {
        total_results: results.length,
        results
      };
    } catch (err) {
      console.error('[Search Service Error]', err);
      throw err;
    }
  }

  public async getRecentSearches(): Promise<string[]> {
    const list = await extensionStorage.get<string[]>(this.recentSearchesKey);
    return Array.isArray(list) ? list : [];
  }

  public async addRecentSearch(query: string): Promise<void> {
    const existing = await this.getRecentSearches();
    const filtered = existing.filter(q => q.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query);
    const capped = filtered.slice(0, 8);
    await extensionStorage.set(this.recentSearchesKey, capped);
  }

  public async clearRecentSearches(): Promise<void> {
    await extensionStorage.remove(this.recentSearchesKey);
  }
}

export const searchService = new SearchService();
export default searchService;
