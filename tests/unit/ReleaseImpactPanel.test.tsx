import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReleaseImpactPanel from '../../src/components/cards/ReleaseImpactPanel';
import { computeReleaseImpact } from '../../src/metrics/releaseCorrelation';
import type { ReleaseEntry } from '../../src/types/schema';
import releasesFixture from '../../fixtures/data/Veverke.chatwizard.releases.json';

const CURRENT_INSTALLS = 1380;

function getImpacts() {
  return computeReleaseImpact(releasesFixture as ReleaseEntry[], CURRENT_INSTALLS);
}

describe('ReleaseImpactPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders "Release Impact" heading', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    expect(screen.getByText('Release Impact')).toBeInTheDocument();
  });

  it('renders 3 table rows in tbody', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const rows = screen.getAllByRole('row');
    // 1 header row + 3 data rows = 4 total
    expect(rows).toHaveLength(4);
  });

  it('first row shows the version with highest installsGained and has top-release class', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const impacts = getImpacts();
    const topVersion = impacts[0].version;
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first data row
    expect(rows[1]).toHaveClass('top-release');
    expect(rows[1]).toHaveTextContent(topVersion);
  });

  it('sorted by installsGained descending by default', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const impacts = getImpacts();
    // impacts is already sorted descending by installsGained
    const rows = screen.getAllByRole('row').slice(1);
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i]).toHaveTextContent(impacts[i].version);
    }
  });

  it('renders empty state when impacts is empty', () => {
    render(<ReleaseImpactPanel impacts={[]} />);
    expect(screen.getByText('No release data available yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders all required column headers', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.getByText(/Installs at Release/)).toBeInTheDocument();
    expect(screen.getByText(/Installs Gained/)).toBeInTheDocument();
    expect(screen.getByText(/Days Active/)).toBeInTheDocument();
    expect(screen.getByText(/Installs\/Day/)).toBeInTheDocument();
  });

  it('does not render Diff column when githubRepo is not provided', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    expect(screen.queryByText('Diff')).toBeNull();
  });

  it('renders Diff column with View diff links when githubRepo is provided', () => {
    render(
      <ReleaseImpactPanel
        impacts={getImpacts()}
        githubRepo="https://github.com/veverke/chatwizard"
      />
    );
    expect(screen.getByText('Diff')).toBeInTheDocument();
    const links = screen.getAllByText('View diff');
    expect(links).toHaveLength(3);
  });

  it('top row has highlight background style', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const rows = screen.getAllByRole('row');
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveStyle(
      'background-color: rgba(34, 197, 94, 0.15)'
    );
  });

  it('clicking Installs Gained header twice toggles asc/desc', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const gainedHeader = screen.getByText(/Installs Gained/);

    // Default is descending — click once to ascending
    fireEvent.click(gainedHeader);
    const impactsAsc = [...getImpacts()].sort(
      (a, b) => a.installsGained - b.installsGained
    );
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent(impactsAsc[0].version);

    // Click again → descending
    fireEvent.click(gainedHeader);
    const impactsDesc = [...getImpacts()].sort(
      (a, b) => b.installsGained - a.installsGained
    );
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent(impactsDesc[0].version);
  });

  it('clicking Days Active header sorts by daysElapsed descending', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const daysHeader = screen.getByText(/Days Active/);
    fireEvent.click(daysHeader);

    const impactsByDays = [...getImpacts()].sort(
      (a, b) => b.daysElapsed - a.daysElapsed
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent(impactsByDays[0].version);
  });

  it('clicking Installs/Day header sorts by installsPerDay descending', () => {
    render(<ReleaseImpactPanel impacts={getImpacts()} />);
    const perDayHeader = screen.getByText(/Installs\/Day/);
    fireEvent.click(perDayHeader);

    const impactsByPerDay = [...getImpacts()].sort(
      (a, b) => b.installsPerDay - a.installsPerDay
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent(impactsByPerDay[0].version);
  });

  it('View diff link for first release (no prev) uses tag URL', () => {
    const impacts = getImpacts();
    render(
      <ReleaseImpactPanel
        impacts={impacts}
        githubRepo="https://github.com/veverke/chatwizard"
      />
    );
    // The oldest version by date has no previous version → uses releases/tag URL
    const byDate = [...impacts].sort((a, b) =>
      a.publishedAt.localeCompare(b.publishedAt)
    );
    const oldestVersion = byDate[0].version;
    const links = screen.getAllByRole('link', { name: 'View diff' });
    const tagLink = links.find((l) =>
      l.getAttribute('href')?.includes(`releases/tag/v${oldestVersion}`)
    );
    expect(tagLink).toBeDefined();
  });
});