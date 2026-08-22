// Bridge for Rails I18n into Stimulus controllers. The layout serializes the
// "js" subtree of config/locales/en.yml (flattened to dot-path keys, see
// ApplicationHelper#js_translations) into a <script id="i18n-strings"> JSON
// blob; this just reads it once and does %{var} interpolation. English-only
// for now, but adding a locale means editing YAML, not this file.
let strings = {}
try {
  const el = document.getElementById("i18n-strings")
  strings = el ? JSON.parse(el.textContent) : {}
} catch {
  strings = {}
}

export function t(key, vars = {}) {
  let str = strings[key]
  if (str == null) return key
  for (const [name, value] of Object.entries(vars)) {
    str = str.replace(new RegExp(`%\\{${name}\\}`, "g"), value)
  }
  return str
}
