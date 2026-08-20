# Internationalization (i18n)

This directory contains all translation files for Knight School in multiple languages.

## Structure

- **locales/** — JSON translation files for each supported language
- **locales.test.ts** — Test suite that validates all locale files have consistent keys and no missing translations

## Supported Languages

The app includes translations for:

- English variants: en-US (standard), en-GB (British), en-AU (Australian)
- Major languages: Spanish, French, German, Italian, Portuguese (pt, pt-BR), Dutch, Russian, Polish, Ukrainian, Swedish, Finnish, Danish
- Asian languages: Japanese, Chinese (Simplified), Korean, Vietnamese, Hindi, Indonesian, Malaysian
- European languages: Czech, Romanian, Turkish, Greek, Hebrew, Norwegian, Slovak, Hungarian
- Klingon (en-x-klingon) and Pirate English (en-x-pirate) — fun experimental locales

## Adding a New Key

When adding new text to the UI:

1. Add the key to **en-US.json** with English text
2. Run the test suite (`npm run test -- --run`) to identify missing keys in other locales
3. Use translation agents (Haiku 4.5 subagents) to generate translations for all missing keys
4. Update all locale files with the translated values
5. Ensure all tests pass

Example workflow:
```bash
# After adding new keys to en-US.json:
npm run test -- locales.test.ts  # See which locales are missing keys
# Use subagents to translate the new keys into all languages
# Then update all locale files
npm run test -- --run  # Verify all keys are present and complete
```

## Translation Keys Structure

Keys follow a hierarchical dot-notation pattern:
- `auth.register.passwordLabel` — a field label in the registration form
- `auth.register.passwordMismatch` — an error message for the password field

Keep related translations grouped under meaningful parent keys to maintain clarity.

## Testing

The test suite (locales.test.ts) ensures:
- All locale files expose the same set of keys as en-US.json
- No locale file has empty translation values
- No [TODO] stubs remain in any locale

Run tests with:
```bash
npm run test -- --run
```
