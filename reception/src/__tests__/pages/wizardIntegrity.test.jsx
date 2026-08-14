/**
 * D-21 · D-22 · D-23 · D-24 · D-25 — reception integrity regressions.
 *
 * These five defects were found in Campaign I (deep/P2-RECEPTION.md) and are all
 * about a control doing something other than what its label promises. The worst
 * of them, D-22, put a real child in production under a guardian the operator
 * never typed.
 *
 * Asserted against source text rather than a full render: the wizard mounts
 * three step components, a toast provider, an auth context and an axios
 * instance, and the defects here are properties of the code (does Next
 * validate? does the trigger have an onClick? is details[] read?) rather than of
 * a particular rendered tree. Source assertions cannot regress silently the way
 * a mocked render can.
 */
import { describe, it, expect } from 'vitest';
import wizardSrc from '../../pages/ParentWizard/ParentWizardPage.jsx?raw';
import parentMgmtSrc from '../../pages/ParentManagement.jsx?raw';
import teacherMgmtSrc from '../../pages/TeacherManagement.jsx?raw';
import uz from '../../locales/uz/common.json';
import ru from '../../locales/ru/common.json';
import en from '../../locales/en/common.json';

// strip comments so a fix's own explanatory comment cannot satisfy an assertion
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('D-22 — the draft-resume button must not read as the wizard Next button', () => {
  it.each([['uz', uz], ['ru', ru], ['en', en]])(
    '%s: draftResume differs from wizard.next',
    (_loc, cat) => {
      const resume = cat.parentsPage.wizard.draftResume;
      const next = cat.wizard.next;
      expect(resume).toBeTruthy();
      expect(next).toBeTruthy();
      // Two buttons on the same screen, identical words, opposite meanings:
      // one advances, the other destroys what you typed.
      expect(resume.trim().toLowerCase()).not.toBe(next.trim().toLowerCase());
    }
  );

  it('confirms before overwriting live form input', () => {
    const src = code(wizardSrc);
    const fn = src.slice(src.indexOf('const handleResumeDraft'), src.indexOf('const handleDiscardDraft'));
    expect(fn).toMatch(/liveFormHasData/);
    expect(fn).toMatch(/confirm\(/);
    // the confirm must gate the setters, not merely be present after them
    expect(fn.indexOf('confirm(')).toBeLessThan(fn.indexOf('setParentData'));
  });

  it('names the guardian the draft belongs to', () => {
    expect(code(wizardSrc)).toMatch(/draftBanner\.parentData\?\.firstName/);
  });
});

describe('D-23 — Next must not advance past a blank required step', () => {
  it('handleNext validates before incrementing the step', () => {
    const src = code(wizardSrc);
    const fn = src.slice(src.indexOf('const handleNext'), src.indexOf('const handleBack'));
    expect(fn).toMatch(/validateStep\(step\)/);
    expect(fn.indexOf('validateStep')).toBeLessThan(fn.indexOf('setStep'));
    expect(fn).toMatch(/return;/);
  });

  it('validateStep requires every starred field on step 1', () => {
    const src = code(wizardSrc);
    const fn = src.slice(src.indexOf('const validateStep'), src.indexOf('const handleNext'));
    for (const f of ['firstName', 'lastName', 'localPart', 'phone', 'password']) {
      expect(fn).toContain(`'${f}'`);
    }
  });

  it.each([['uz', uz], ['ru', ru], ['en', en]])('%s: has a stepIncomplete message', (_l, cat) => {
    expect(cat.wizard.stepIncomplete).toMatch(/\{\{fields\}\}/);
  });
});

describe('D-24 — browser Back must walk the steps, not exit the wizard', () => {
  it('registers a popstate handler that restores a wizard step', () => {
    const src = code(wizardSrc);
    expect(src).toMatch(/addEventListener\('popstate'/);
    expect(src).toMatch(/wizardStep/);
    expect(src).toMatch(/history\.pushState\(\{ wizardStep/);
  });

  it('warns before leaving with unsaved input', () => {
    const src = code(wizardSrc);
    const h = src.slice(src.indexOf('const onPop'), src.indexOf("addEventListener('popstate'"));
    expect(h).toMatch(/liveFormHasData/);
    expect(h).toMatch(/confirm\(/);
  });
});

describe('D-25 — the parent action menu must open without hover', () => {
  it('the trigger has an onClick', () => {
    const src = code(parentMgmtSrc);
    // anchor on the JSX element, not the lucide-react import of the same name
    const i = src.indexOf('<MoreHorizontal');
    expect(i).toBeGreaterThan(0);
    const btn = src.slice(Math.max(0, i - 700), i);
    expect(btn).toMatch(/onClick=\{\(\) => setOpenMenuId/);
  });

  it('menu visibility is not hover-only', () => {
    const src = code(parentMgmtSrc);
    // the exact class string the defect was written as
    expect(src).not.toMatch(/className="hidden group-hover:block absolute right-0 top-full/);
    expect(src).toMatch(/openMenuId === parent\.id \? 'block' : 'hidden'/);
  });

  it('the trigger is announced to assistive tech', () => {
    const src = code(parentMgmtSrc);
    expect(src).toMatch(/aria-haspopup="menu"/);
    expect(src).toMatch(/aria-expanded=\{openMenuId === parent\.id\}/);
  });
});

describe('D-21 — a validation rejection must name the field', () => {
  it('reads details[] rather than only data.error', () => {
    const src = code(teacherMgmtSrc);
    const i = src.indexOf("t('teachersPage.toastSaveError')");
    const handler = src.slice(Math.max(0, i - 800), i + 120);
    expect(handler).toMatch(/details/);
    expect(handler).toMatch(/d\.field/);
    // data.error alone must no longer be the first thing shown
    expect(handler).not.toMatch(/showError\(error\.response\?\.data\?\.error \|\|/);
  });
});
