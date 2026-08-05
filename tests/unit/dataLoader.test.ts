import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadData } from '../../src/utils/dataLoader';

const FIXTURE_DATA = { key: 'value' };

describe('dataLoader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Ensure we start in browser context (no vscode API)
    if ('vscode' in window) {
      delete (window as unknown as Record<string, unknown>).vscode;
    }
  });

  describe('browser context', () => {
    it('resolves relative paths as-is in browser context', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        }),
      );

      const result = await loadData('./data/extensions.json');

      expect(fetch).toHaveBeenCalledWith('./data/extensions.json');
      expect(result).toEqual(FIXTURE_DATA);
    });

    it('returns parsed JSON on successful fetch', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        }),
      );

      const result = await loadData('./data/test.json');
      expect(result).toEqual(FIXTURE_DATA);
    });

    it('throws on non-OK response without tolerate404', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve(null),
        }),
      );

      await expect(loadData('./data/test.json')).rejects.toThrow('HTTP 500');
    });

    it('returns null on 404 with tolerate404 enabled', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: () => Promise.resolve(null),
        }),
      );

      const result = await loadData('./data/test.json', { tolerate404: true });
      expect(result).toBeNull();
    });

    it('throws on 404 without tolerate404', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: () => Promise.resolve(null),
        }),
      );

      await expect(loadData('./data/test.json')).rejects.toThrow('HTTP 404');
    });

    it('rethrows network errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network failure')),
      );

      await expect(loadData('./data/test.json')).rejects.toThrow(
        'Network failure',
      );
    });
  });

  describe('webview context', () => {
    beforeEach(() => {
      // Simulate VS Code webview context
      (window as unknown as Record<string, unknown>).vscode = {};
    });

    it('rewrites ./data/ paths to GitHub raw URLs', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        }),
      );

      const result = await loadData('./data/extensions.json');

      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/master/data/extensions.json',
      );
      expect(result).toEqual(FIXTURE_DATA);
    });

    it('rewrites ./data/ paths with subfolder', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        }),
      );

      await loadData('./data/Veverke.chatwizard.json');

      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/master/data/Veverke.chatwizard.json',
      );
    });

    it('throws on HTTP error in webview context', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve(null),
        }),
      );

      await expect(loadData('./data/test.json')).rejects.toThrow('HTTP 500');
    });

    it('returns null on 404 with tolerate404 in webview context', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: () => Promise.resolve(null),
        }),
      );

      const result = await loadData('./data/test.json', { tolerate404: true });
      expect(result).toBeNull();
    });

    it('tolerates 404 with releases.json path in webview', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: () => Promise.resolve(null),
        }),
      );

      const result = await loadData('./data/test.releases.json', {
        tolerate404: true,
      });
      expect(result).toBeNull();

      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/master/data/test.releases.json',
      );
    });

    it('prefers GitHub raw URL and ignores __VSCODE_DATA_BASE__ when fetch succeeds', async () => {
      window.__VSCODE_DATA_BASE__ = 'vscode-resource:/path/to/dist/data';

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        }),
      );

      const result = await loadData('./data/extensions.json');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/master/data/extensions.json',
      );
      expect(result).toEqual(FIXTURE_DATA);
    });

    it('falls back to bundled __VSCODE_DATA_BASE__ URL when GitHub raw fetch fails', async () => {
      window.__VSCODE_DATA_BASE__ = 'vscode-resource:/path/to/dist/data';

      const fetchMock = vi
        .fn<typeof fetch>()
        // First call — GitHub raw fails with network error
        .mockRejectedValueOnce(new Error('Network failure'))
        // Second call — bundled fallback succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        } as Response);

      vi.stubGlobal('fetch', fetchMock);

      const result = await loadData('./data/extensions.json');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/master/data/extensions.json',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'vscode-resource:/path/to/dist/data/extensions.json',
      );
      expect(result).toEqual(FIXTURE_DATA);
    });

    it('throws when GitHub raw returns 500 and no bundled fallback', async () => {
      window.__VSCODE_DATA_BASE__ = 'vscode-resource:/path/to/dist/data';

      const fetchMock = vi
        .fn<typeof fetch>()
        // First call — GitHub raw returns 500 (the code throws for non-ok responses)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve(null),
        } as Response)
        // Second call — bundled fallback succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(FIXTURE_DATA),
        } as Response);

      vi.stubGlobal('fetch', fetchMock);

      const result = await loadData('./data/extensions.json');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://raw.githubusercontent.com/Veverke/vscode-extension-analytics/master/data/extensions.json',
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'vscode-resource:/path/to/dist/data/extensions.json',
      );
      expect(result).toEqual(FIXTURE_DATA);
    });

    it('throws original error when both bundled and fallback fail', async () => {
      window.__VSCODE_DATA_BASE__ = 'vscode-resource:/path/to/dist/data';

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('Network failure'));

      vi.stubGlobal('fetch', fetchMock);

      await expect(loadData('./data/extensions.json')).rejects.toThrow(
        'Network failure',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});