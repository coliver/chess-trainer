const fs = require("fs");
const path = require("path");

const translations = {
  "fr": {"passwordConfirmLabel": "Confirmer le mot de passe", "passwordMismatch": "Les mots de passe ne correspondent pas"},
  "es": {"passwordConfirmLabel": "Confirmar contraseña", "passwordMismatch": "Las contraseñas no coinciden"},
  "de": {"passwordConfirmLabel": "Passwort bestätigen", "passwordMismatch": "Passwörter stimmen nicht überein"},
  "it": {"passwordConfirmLabel": "Conferma password", "passwordMismatch": "Le password non coincidono"},
  "pt": {"passwordConfirmLabel": "Confirmar senha", "passwordMismatch": "As senhas não coincidem"},
  "pt-BR": {"passwordConfirmLabel": "Confirmar senha", "passwordMismatch": "As senhas não coincidem"},
  "nl": {"passwordConfirmLabel": "Wachtwoord bevestigen", "passwordMismatch": "Wachtwoorden komen niet overeen"},
  "ru": {"passwordConfirmLabel": "Подтвердите пароль", "passwordMismatch": "Пароли не совпадают"},
  "pl": {"passwordConfirmLabel": "Potwierdź hasło", "passwordMismatch": "Hasła się nie zgadzają"},
  "uk": {"passwordConfirmLabel": "Підтвердіть пароль", "passwordMismatch": "Паролі не збігаються"},
  "sv": {"passwordConfirmLabel": "Bekräfta lösenord", "passwordMismatch": "Lösenorden matchar inte"},
  "fi": {"passwordConfirmLabel": "Vahvista salasana", "passwordMismatch": "Salasanat eivät täsmää"},
  "da": {"passwordConfirmLabel": "Bekræft adgangskode", "passwordMismatch": "Adgangskoderne stemmer ikke overens"},
  "ja": {"passwordConfirmLabel": "パスワード確認", "passwordMismatch": "パスワードが一致しません"},
  "zh-CN": {"passwordConfirmLabel": "确认密码", "passwordMismatch": "密码不匹配"},
  "ko": {"passwordConfirmLabel": "비밀번호 확인", "passwordMismatch": "비밀번호가 일치하지 않습니다"},
  "ar": {"passwordConfirmLabel": "تأكيد كلمة المرور", "passwordMismatch": "كلمات المرور غير متطابقة"},
  "hi": {"passwordConfirmLabel": "पासवर्ड की पुष्टि करें", "passwordMismatch": "पासवर्ड मेल नहीं खाते"},
  "vi": {"passwordConfirmLabel": "Xác nhận mật khẩu", "passwordMismatch": "Mật khẩu không khớp"},
  "cs": {"passwordConfirmLabel": "Potvrďte heslo", "passwordMismatch": "Hesla se neshodují"},
  "ro": {"passwordConfirmLabel": "Confirmați parola", "passwordMismatch": "Parolele nu se potrivesc"},
  "tr": {"passwordConfirmLabel": "Şifreyi Onayla", "passwordMismatch": "Şifreler eşleşmiyor"},
  "id": {"passwordConfirmLabel": "Konfirmasi sandi", "passwordMismatch": "Sandi tidak cocok"},
  "ms": {"passwordConfirmLabel": "Sahkan kata laluan", "passwordMismatch": "Kata laluan tidak sepadan"},
  "el": {"passwordConfirmLabel": "Επιβεβαίωση κωδικού πρόσβασης", "passwordMismatch": "Οι κωδικοί πρόσβασης δεν ταιριάζουν"},
  "hu": {"passwordConfirmLabel": "Jelszó megerősítése", "passwordMismatch": "A jelszavak nem egyeznek"},
  "sk": {"passwordConfirmLabel": "Potvrdenie hesla", "passwordMismatch": "Heslá sa nezhodujú"},
  "he": {"passwordConfirmLabel": "אישור סיסמה", "passwordMismatch": "הסיסמאות לא תואמות"},
  "no": {"passwordConfirmLabel": "Bekreft passord", "passwordMismatch": "Passordene samsvarer ikke"},
  "kl": {"passwordConfirmLabel": "qapla' password", "passwordMismatch": "passwords not honor"}
};

const localesDir = "src/i18n/locales";
fs.readdirSync(localesDir).forEach(file => {
  if (!file.endsWith(".json")) return;
  const baseName = file.replace(".json", "");
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const trans = translations[baseName] || {passwordConfirmLabel: "Confirm password", passwordMismatch: "Passwords do not match"};
  if (data.auth?.register) {
    data.auth.register.passwordConfirmLabel = trans.passwordConfirmLabel;
    data.auth.register.passwordMismatch = trans.passwordMismatch;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log("✓ " + file);
  }
});
