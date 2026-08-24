# Translation Guide

Documentation for locale strings in this directory. Organized by section and feature.

## Header & Navigation

**greetingMorning, greetingAfternoon, greetingEvening**
- Time-based greetings shown in header/dashboard
- Emoji included in English; adapt or remove for other languages as culturally appropriate
- Used at page load; greeting type updates periodically

**viewSource**
- Links to GitHub repository
- Keep concise for header UI constraints

## Theme & Appearance

**toggle**
- Button labels for toggling theme and language
- Should be short and recognizable

**theme.system**
- Respects user's OS-level dark/light preference
- Important for accessibility; don't omit

## Board Controls

**flipBoard.label**
- Label for button that flips chess board 180°
- Used for piece visibility and training from both sides

## Dashboard Progress

**progress.trainingLabel, puzzleLabel**
- Section headers for progress cards
- Should be short labels

**dayStreakBest**
- Template: `Day streak · best {{best}}`
- `{{best}}` is replaced with number (e.g., "Day streak · best 15")
- Shows current and best streak together

**weakestOpening, trickiestMove**
- Labels for the two "Needs work" callout tiles on the dashboard
- `weakestOpening` = the user's single worst-performing opening (by whole-opening accuracy); `trickiestMove` = their single worst-performing specific move within an opening
- Short labels (used as a tile heading), not sentences

**moveAbbrev**
- Template: `move {{move}}`
- `{{move}}` = a move number (integer), e.g. "move 4"
- Used both in the trickiest-move tile and in the expanded weak-spot row list

**troubleSpotWrongMoveShort**
- Template: `often plays {{move}}`
- `{{move}}` = a chess move in UCI notation (e.g. "e2e4") — do not translate/reformat the move itself
- Shown under the trickiest-move tile's percentage

**troubleSpotItemWithWrongMove**
- Template: `move {{move}} · often plays {{wrongMove}}`
- `{{move}}` = move number (integer); `{{wrongMove}}` = UCI notation move, left untranslated
- Subtitle for a move-level row in the expanded weak-spot list

**wholeOpening**
- Subtitle for an opening-level row (as opposed to a move-level row) in the expanded weak-spot list

**seeAllWeakSpots**
- Template: `See all {{count}} weak spots →`
- `{{count}}` = total number of weak spots (openings + moves combined)
- Link/button that expands the full weak-spot list inline; keep the trailing arrow, translate only the words (flip direction/placement for RTL languages)

**seeLess**
- Label for the same button once expanded, to collapse the list back

**reviewDue**
- Template: `Review due ({{count}})`
- Shows number of positions needing review
- Count is always >= 1 when shown

**matches_one, matches_other**
- Pluralized: used for "X match" vs "X matches" in opening search
- Supports i18n pluralization rules (some languages have more than 2 forms)

**openingsToTrain_one, openingsToTrain_other**
- Pluralized message when opening has variations to train
- Example: "1 opening · pick one to train" or "5 openings · pick one to train"

**variationCount_one, variationCount_other**
- Pluralized: "X variation" vs "X variations" in opening details

## Openings (Training Mode)

**playAs, playAsWhite, playAsBlack**
- Buttons to select which side to play in training
- `playAs` may be a generic label; `playAsWhite/Black` are full button labels

**startLabel**
- Template: `Start {{name}}`
- `{{name}}` = opening name (e.g., "Start French Defense")
- Button text for beginning training session

**boardPreviewAfterPly**
- Template: `After ply {{ply}}`
- Shows position after N half-moves (ply) in line preview
- Ply = half-move; ply 1 = White's first move, ply 2 = Black's first move, etc.

## Training Controls

**whiteToMove, blackToMove**
- Whose turn it is in the current position
- Should be concise labels

**movePlaceholder**
- Text inside move input field (before user types)
- Example: "or type a move, e.g. e2e4"
- Should show format expected (algebraic notation)

**play**
- Generic button label for submitting a move or action

**jumpToLatest**
- Hint shown before submitting: tells user to return to latest position in line
- Usually means user has browsed backward and needs to return to the end

## Puzzles

**findBestMove**
- Instruction text in puzzle training
- Appears before user makes their first move

**correct**
- Success feedback emoji/text for correct puzzle solution
- English has ✅ emoji; adapt as needed

**incorrectFallback**
- Generic failure message if no specific hint is available
- Fallback when server doesn't return a specific hint

**rating**
- Template: `Rating ~{{rating}}`
- Chess puzzle difficulty rating (Lichess rating)
- `~` indicates it's approximate

**solved, streak**
- Template: `Solved: {{count}}` and `Streak: {{count}}`
- Session progress tracking

**streakBest**
- Template: ` · best {{best}}`
- Note: Leading space is intentional (appended to streak line)
- Example final text: "Streak: 5 · best 12"

## Authentication

**emailDisclaimer**
- Reassurance text in registration form
- Addresses user concern about email privacy

**passwordMismatch**
- Validation error when password confirmation doesn't match

**successMessage** (register)
- Template: `Registration successful! Check your inbox at <strong>{{email}}</strong> for a verification link before logging in.`
- Contains HTML `<strong>` tag; email is highlighted
- `{{email}}` is user's email address

**successSubtitleWithEmail, successSubtitleNoEmail** (verifyEmail)
- Shown after email verification succeeds
- Use `WithEmail` variant when email is known; `NoEmail` if email is unavailable

## Email

**instructions** (plain text)
- Used in plain-text email body

**instructionsHtml** (HTML)
- Used in HTML email body
- May use HTML formatting

**expires**
- Indicates verification link time limit
- Keep consistent with backend email link TTL (typically 24 hours)

## Settings

**resetConfirm**
- Confirmation dialog text before resetting all user settings
- Should clearly warn action is irreversible

**boardThemes, pieceSets**
- Names are proper nouns (design names); generally don't translate
- Exception: "Default", "Standard", "High contrast" are descriptive and should be translated

**boardOrientation heading**
- Section header
- Consider user preference from project memory (user wants "always keep Black on top" option)
- Variants: auto-flip, White-bottom, Black-bottom (orientation is from that side's perspective)
