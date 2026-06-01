import { useState } from 'react';
import { Emblem } from '../components/identity/Emblem';
import { GuillochePattern } from '../components/identity/GuillochePattern';
import { Field } from '../components/dnp/Field';
import { PrimaryButton } from '../components/dnp/PrimaryButton';
import { Checkbox } from '../components/dnp/Checkbox';
import { InlineLink } from '../components/dnp/InlineLink';
import { SecurePill } from '../components/dnp/SecurePill';
import { LangToggle } from '../components/dnp/LangToggle';
import { Spinner } from '../components/dnp/Spinner';

/**
 * _DnpPreview — sandbox page for GOV-REDESIGN-01 design system primitives.
 * Dev-only: accessible at /_dnp-preview (registered in App.jsx).
 */
export default function DnpPreview() {
  const [fieldValue, setFieldValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [lang, setLang] = useState('uz');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function simulateLoading() {
    setLoading(true);
    setDone(false);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    }, 1800);
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] p-8 font-inter">
      <h1 className="text-2xl font-bold text-[#1C2A1E] mb-2">
        GOV-REDESIGN-01 — DNP Design System Preview
      </h1>
      <p className="text-[#6A7A6B] text-sm mb-10">
        Foundation tokens, SVG assets, and primitive components. Dev-only route.
      </p>

      {/* ── Panel section (dark green) ─────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          Panel surface (dark green)
        </h2>
        <div
          className="relative overflow-hidden rounded-[22px] p-10 flex flex-col items-center gap-6"
          style={{
            background: 'linear-gradient(180deg, #2E5A36 0%, #1B3A22 100%)',
          }}
        >
          <GuillochePattern />

          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Emblem at multiple sizes */}
            <div className="flex items-end gap-8">
              {[24, 32, 52, 200].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <span className="text-[#EAF1E7]">
                    <Emblem size={s} />
                  </span>
                  <span className="text-[#A9C3A6] text-[11px]">{s}px</span>
                </div>
              ))}
            </div>

            <SecurePill label="256-bit TLS" />
            <SecurePill label="IHMA · Davlat nazorat tizimi" />
          </div>
        </div>
      </section>

      {/* ── Emblem sizes (light bg) ────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          Emblem on light background
        </h2>
        <div className="flex items-end gap-8 bg-white rounded-[14px] p-6 shadow-dnp-sm">
          {[24, 32, 52, 200].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <span className="text-[#4F7B4E]">
                <Emblem size={s} />
              </span>
              <span className="text-[#6A7A6B] text-[11px]">{s}px</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Field states ──────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          Field — all states
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Field
            id="f-default"
            label="Default state"
            placeholder="Enter value…"
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
          />
          <Field
            id="f-password"
            label="Password (with eye toggle)"
            type="password"
            placeholder="Enter password…"
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
          />
          <Field
            id="f-error"
            label="Error state"
            placeholder="Wrong input"
            value="invalid@"
            onChange={() => {}}
            error="Bunday foydalanuvchi topilmadi"
          />
          <Field
            id="f-disabled"
            label="Disabled state"
            placeholder="Not editable"
            value="Read only value"
            onChange={() => {}}
            disabled
          />
        </div>
      </section>

      {/* ── PrimaryButton states ──────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          PrimaryButton — all states
        </h2>
        <div className="flex flex-wrap gap-4 max-w-2xl">
          <div className="w-64">
            <PrimaryButton onClick={simulateLoading} loading={loading} done={done}>
              {loading ? 'Yuklanmoqda…' : done ? 'Muvaffaqiyatli' : 'Tizimga kirish'}
            </PrimaryButton>
          </div>
          <div className="w-64">
            <PrimaryButton disabled>Disabled</PrimaryButton>
          </div>
          <div className="w-64">
            <PrimaryButton loading>Loading static</PrimaryButton>
          </div>
          <div className="w-64">
            <PrimaryButton done>Done static</PrimaryButton>
          </div>
        </div>
      </section>

      {/* ── Checkbox ─────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          Checkbox
        </h2>
        <div className="flex flex-col gap-4 bg-white rounded-[14px] p-6 shadow-dnp-sm max-w-sm">
          <Checkbox
            id="cb-off"
            checked={false}
            onChange={() => {}}
          >
            Unchecked label
          </Checkbox>
          <Checkbox
            id="cb-on"
            checked={true}
            onChange={() => {}}
          >
            Checked label
          </Checkbox>
          <Checkbox
            id="cb-interactive"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          >
            Interactive — click me
          </Checkbox>
        </div>
      </section>

      {/* ── InlineLink ────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          InlineLink
        </h2>
        <div className="flex items-center gap-4 bg-white rounded-[14px] p-6 shadow-dnp-sm max-w-sm">
          <span className="text-[#1C2A1E] text-sm">Parolni unutdingizmi?</span>
          <InlineLink onClick={() => alert('InlineLink clicked')}>
            Tiklash
          </InlineLink>
        </div>
      </section>

      {/* ── LangToggle ───────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          LangToggle
        </h2>
        <div className="flex items-center gap-6 bg-white rounded-[14px] p-6 shadow-dnp-sm max-w-sm">
          <LangToggle lang={lang} setLang={setLang} />
          <span className="text-[#6A7A6B] text-sm">Active: {lang}</span>
        </div>
      </section>

      {/* ── Spinner ──────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          Spinner — sizes
        </h2>
        <div className="flex items-center gap-8 bg-white rounded-[14px] p-6 shadow-dnp-sm max-w-sm">
          {[14, 17, 20, 28].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 text-[#4F7B4E]">
              <Spinner size={s} />
              <span className="text-[#6A7A6B] text-[11px]">{s}px</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Token reference ──────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-base font-semibold text-[#1C2A1E] mb-4">
          Color tokens
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['#4F7B4E', 'green'],
            ['#426B41', 'green-hover'],
            ['#385B37', 'green-press'],
            ['#2E5A36', 'panel-top'],
            ['#1B3A22', 'panel-bottom'],
            ['#EAF1E7', 'panel-ink'],
            ['#A9C3A6', 'panel-ink-dim'],
            ['#F4F1EA', 'bg'],
            ['#FFFFFF', 'card'],
            ['#1C2A1E', 'ink'],
            ['#6A7A6B', 'muted'],
            ['#93A293', 'faint'],
            ['#E2E0D6', 'border'],
            ['#FAFAF7', 'field-bg'],
            ['#D9D7CC', 'field-border'],
            ['#B5462F', 'danger'],
            ['#B57A1E', 'warning'],
            ['#2F6B7A', 'info'],
          ].map(([hex, name]) => (
            <div key={name} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-[6px] flex-shrink-0 border border-[#E2E0D6]"
                style={{ backgroundColor: hex }}
              />
              <div>
                <div className="text-[11px] font-semibold text-[#1C2A1E]">{name}</div>
                <div className="text-[10px] text-[#6A7A6B]">{hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
