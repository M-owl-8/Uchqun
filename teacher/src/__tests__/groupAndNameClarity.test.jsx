/**
 * D-29 · D-30 — two ways the teacher's screens told them something untrue about
 * which children they were looking at.
 *
 * D-29: a teacher owning two groups saw one group's name over all of both
 *       groups' children, and the second group was never named anywhere.
 * D-30: two children sharing a first and last name inside one group rendered as
 *       identical cards, so marking attendance on the wrong one wrote a false
 *       absence for one child and a false presence for another — both
 *       safeguarding records, neither visibly wrong afterwards.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { groupSummary, groupCount } from '../utils/groupSummary';
import { AttendanceGrid } from '../components/AttendanceGrid';

// t() stand-in matching i18next's defaultValue contract
const t = (_k, opts) => opts?.defaultValue ?? _k;

describe('D-29 — the group label must describe every group shown', () => {
  const umid = { id: 'a', groupName: 'Umid guruhi' };
  const yulduz = { id: 'b', groupName: 'Yulduz guruhi' };

  it('one group still reads as just that group (unchanged behaviour)', () => {
    expect(groupSummary([umid, { ...umid, id: 'c' }], t)).toBe('Umid guruhi');
  });

  it('two groups name BOTH — the old code named only the first', () => {
    const label = groupSummary([umid, yulduz], t);
    expect(label).toContain('Umid guruhi');
    expect(label).toContain('Yulduz guruhi');
  });

  it('the real reported case: 12 Umid + 9 Yulduz never hides Yulduz', () => {
    const children = [
      ...Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, groupName: 'Umid guruhi' })),
      ...Array.from({ length: 9 }, (_, i) => ({ id: `y${i}`, groupName: 'Yulduz guruhi' })),
    ];
    expect(groupCount(children)).toBe(2);
    expect(groupSummary(children, t)).toContain('Yulduz guruhi');
  });

  it('four or more groups collapse to a count rather than a run-on header', () => {
    const many = ['A', 'B', 'C', 'D'].map((n, i) => ({ id: String(i), groupName: `${n} guruhi` }));
    expect(groupSummary(many, t)).toBe('4 guruh');
  });

  it('no groups yields null so the caller can use its own fallback', () => {
    expect(groupSummary([{ id: 'x' }, { id: 'y', groupName: '  ' }], t)).toBeNull();
    expect(groupSummary([], t)).toBeNull();
    expect(groupSummary(undefined, t)).toBeNull();
  });
});

describe('D-30 — same-named children must be distinguishable', () => {
  // the exact production collision: two Gulnoza Ergasheva in Umid guruhi,
  // four years apart
  const twins = [
    { id: '5eed0c9a', firstName: 'Gulnoza', lastName: 'Ergasheva', dateOfBirth: '2018-02-22' },
    { id: '5eeddf8b', firstName: 'Gulnoza', lastName: 'Ergasheva', dateOfBirth: '2022-01-23' },
  ];

  it('their accessible names are no longer identical', () => {
    render(<AttendanceGrid childList={twins} states={{}} onStateChange={() => {}} />);
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels).toHaveLength(2);
    expect(new Set(labels).size).toBe(2); // this was 1 before the fix
    expect(labels.some((l) => l.includes('2018'))).toBe(true);
    expect(labels.some((l) => l.includes('2022'))).toBe(true);
  });

  it('the birth year is visible on the card, not only to a screen reader', () => {
    render(<AttendanceGrid childList={twins} states={{}} onStateChange={() => {}} />);
    expect(screen.getByText('2018')).toBeTruthy();
    expect(screen.getByText('2022')).toBeTruthy();
  });

  it('children with distinct names are NOT annotated — the ordinary card is untouched', () => {
    const ordinary = [
      { id: '1', firstName: 'Gulnoza', lastName: 'Ergasheva', dateOfBirth: '2018-02-22' },
      { id: '2', firstName: 'Zaynab', lastName: 'Umarova', dateOfBirth: '2019-03-11' },
    ];
    render(<AttendanceGrid childList={ordinary} states={{}} onStateChange={() => {}} />);
    expect(screen.queryByText('2018')).toBeNull();
    expect(screen.queryByText('2019')).toBeNull();
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels.every((l) => !/\(\d{4}\)/.test(l))).toBe(true);
  });

  it('a collision with no usable date of birth degrades quietly, not into "(Invalid Date)"', () => {
    const undated = [
      { id: '1', firstName: 'Gulnoza', lastName: 'Ergasheva', dateOfBirth: null },
      { id: '2', firstName: 'Gulnoza', lastName: 'Ergasheva', dateOfBirth: 'not-a-date' },
    ];
    render(<AttendanceGrid childList={undated} states={{}} onStateChange={() => {}} />);
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels.every((l) => !/Invalid|NaN|null/.test(l))).toBe(true);
  });

  it('the match is case- and whitespace-insensitive', () => {
    const messy = [
      { id: '1', firstName: 'Gulnoza', lastName: 'Ergasheva', dateOfBirth: '2018-02-22' },
      { id: '2', firstName: ' gulnoza ', lastName: 'ERGASHEVA', dateOfBirth: '2022-01-23' },
    ];
    render(<AttendanceGrid childList={messy} states={{}} onStateChange={() => {}} />);
    expect(screen.getByText('2018')).toBeTruthy();
    expect(screen.getByText('2022')).toBeTruthy();
  });
});
