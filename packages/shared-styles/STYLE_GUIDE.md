# Theme style guide

Knight School's visual identity: warm, jewel-toned, distinct. Guidelines for
any theme work in `tokens.css`:

- **No green accents** — reserve green for game-state signals only (correct move, etc.), never as the brand accent.
- **Warm neutral base.**
- **One bold jewel-tone accent** (currently burnt orange `#b5482a`) instead of a flat corporate blue/green.
- Dark theme keeps its own identity (`--accent: #8a3f56`, mauve) — don't force parity with light theme's accent hue.

## File map

| File | Owns |
|---|---|
| `tokens.css` | Color/font/shadow custom properties only, both themes. No component rules. |
| `base.css` | Page shell, typography defaults (`h1`–`h6`, `p`, `code`). |
| `ui.css` | Generic reusable primitives: `.card`, `.btn`, `.title`, `.subtitle`. |
| `header.css`, `login.css`, `training.css`, `puzzles.css`, `dashboard.css`, `board.css` | Page/feature-scoped rules, prefixed to their page (see naming below). |

All files are loaded globally via `@import` in `react/src/index.css` — there is
no CSS-module scoping, so **every class name is a global**. Keep feature
prefixes on anything that isn't a shared primitive in `ui.css`/`base.css`.

## Design tokens: use them, extend them, don't hand-roll values

`tokens.css` defines color/font/shadow tokens but **not spacing or radius**, so
every feature file invents its own px values ad hoc (dashboard.css alone uses
`4, 6, 7, 8,9, 10, 11, 12, 14, 16, 18, 22, 28, 34px` for radius/gap/padding
interchangeably). Before writing a new value, check whether one of these
scales already covers it; if not, add to the scale rather than adding a
one-off:

```css
/* proposed additions to tokens.css */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;

--radius-sm: 8px;   /* buttons, chips, inputs */
--radius-md: 12px;  /* cards, panels */
--radius-lg: 16px;  /* .card, large surfaces */
--radius-pill: 999px;

--on-accent: #fff;  /* text/icon color sitting on top of --accent */
```

- Replace bare `#fff` used for text-on-accent (`ui.css` `.btn`, several
  `.selected`/`.active` states in `dashboard.css`) with `var(--on-accent)` —
  today it's a coincidence that white works on both `#b5482a` and `#8a3f56`;
  a token makes that an explicit contract instead of a coincidence.
- Fix/remove the stray `var(--accent, #6c8cff)` fallbacks in
  `dashboard.css` (`.mastery-bar-fill`, `.progress-review-btn:hover`) — that
  blue is exactly the corporate accent this guide says to avoid, and
  `--accent` is always defined, so the fallback is both dead code and a trap
  if it ever isn't.

## Component duplication to consolidate

Several near-identical "pill button" rulesets are redefined per-feature
instead of sharing one class: `.progress-review-btn`, `.ob-sort`,
`.ob-color-filter-btn`, `.ob-color-btn`, `.ob-showmore`, `.ply-btn` all repeat
the same shape (bordered, `--border`, radius, 600-weight text, pointer,
hover → `--accent-border`). Same with `.eco-chip` and `.variation-row .r-eco`,
which are byte-for-byte the same ruleset under two names. Promote the shared
shape into `ui.css`:

```css
.btn-outline { /* border/radius/hover base for ob-sort, ob-color-filter-btn, ply-btn, ob-showmore, progress-review-btn */ }
.chip-eco    { /* eco-chip + r-eco, currently duplicated verbatim */ }
```

Feature files then only add the delta (size, `.selected` background) instead
of re-declaring the whole box model. This is the highest-leverage cleanup —
it's the difference between changing a hover color in one place vs. six.

## Naming convention

Feature files use short prefixes per page/section (`ob-` opening browser,
`oc-` opening card, `pv-` preview, `vg-` variation group, `r-` row) plus BEM-
style modifiers (`.opening-card.selected`, `.progress-stat--mastery`). This is
fine and reads consistently *within* a file — the gap is it's undocumented,
so a new contributor has to reverse-engineer it. Keep doing it, but:
- One prefix per feature/page, declared in a header comment at the top of the file (dashboard.css already does this loosely with `/* ===== Section ===== */` comments — extend that to name the prefix too).
- Don't introduce a second modifier style (`--mastery` vs `.selected` vs `.active` are all "variant" in intent) — standardize on BEM `--modifier` for state that's a fixed variant, and a bare `.selected`/`.active`/`.disabled` class only for interactive/JS-toggled state.

## Inline styles

`style={{...}}` appears in `Dashboard.tsx`, `Login.tsx`, `Register.tsx`,
`VerifyEmail.tsx`, `FlipBoardButton.tsx`, `BoardPreview.tsx` — these bypass
tokens entirely (no `var(--...)`, so they silently break in dark theme or on
a future palette change). Reserve inline `style` for genuinely dynamic values
computed at runtime (e.g. a progress-bar width); anything static belongs in a
class in the relevant feature CSS file.

## `tokens.css` should only hold tokens

`html[data-theme="dark"] #social .button-icon { filter: invert(1)... }` at the
bottom of `tokens.css` is a component rule, not a token — `.social` styling
otherwise lives entirely in `header.css`. Move it there so `tokens.css` stays
a pure variable file (easier to diff/review theme changes without scrolling
past unrelated component CSS).

## Breakpoints

`1024px`, `980px`/`981px`, `600px` recur across files as bare numbers with no
shared name. Not worth a full custom-media polyfill, but at minimum comment
each with the layout reason (`/* tablet: opening browser drops to 1 column */`)
so the next resize isn't guesswork — `dashboard.css`'s `980`/`981` split
already shows how easy it is to drift by a pixel between the two halves of
one breakpoint.
