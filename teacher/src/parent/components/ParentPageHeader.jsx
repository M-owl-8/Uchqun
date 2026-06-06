// PP-CHROME-LAYOUT — parent portal letterhead header.
//
// Single component for every parent page header. Locks the convention so
// per-page chrome can't drift back into ghost (white-on-light) or
// teacher-slate styles. Uses the parent design-system tokens (p-ink,
// p-sepia, p-brand, font-serif) — same vocabulary Dashboard/Therapy/
// ChildIRR have been using since the PARENT-DESIGN re-skin.
//
// Props
//   eyebrow   — short uppercase label above the title (optional, e.g.
//               'Bugun', a section name).
//   title     — required string; rendered with the serif display font.
//   subtitle  — optional one-liner explaining the page's purpose from the
//               parent perspective.
//   count     — optional number; appended in parens to the title when the
//               page is listing entities (per the brief).
//   actions   — optional JSX rendered to the right on >= sm screens
//               (button, switcher, etc.); stacks below on small screens.
//
// Layout
//   Stacks vertically on mobile; row-flex on sm+. The title block always
//   has the leading hierarchy slot; actions stay tight to the right.
//   Container/grid discipline is enforced by the page wrapper, not here.

const ParentPageHeader = ({ eyebrow, title, subtitle, count, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[.12em] font-medium text-p-sepia-500 mb-1">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-[22px] sm:text-[24px] leading-tight font-semibold text-p-ink">
        {title}
        {typeof count === 'number' && (
          <span className="ml-2 text-[14px] font-normal text-p-sepia-500 align-middle">
            ({count})
          </span>
        )}
      </h1>
      {subtitle && (
        <p className="text-[13px] text-p-sepia-500 mt-0.5">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2 shrink-0 sm:mt-0">
        {actions}
      </div>
    )}
  </div>
);

export default ParentPageHeader;
