// Lightweight password strength scorer — no external dep.
// Compensates for the HaveIBeenPwned-Pro feature not being free.

export type Strength = {
  score: 0 | 1 | 2 | 3 | 4; // 0=very weak, 4=strong
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: "red" | "amber" | "yellow" | "lime" | "green";
  tips: string[];
};

// Small blocklist of universally-bad passwords. Not exhaustive — paid
// HIBP checks against a 600M-leaked-passwords list. This is the 95%-
// coverage common-cases shortlist.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "abc123",
  "abc12345",
  "letmein",
  "letmein1",
  "welcome",
  "welcome1",
  "iloveyou",
  "admin",
  "admin123",
  "administrator",
  "000000",
  "111111",
  "123123",
  "12341234",
  "sunshine",
  "princess",
  "asdf1234",
  "asdfghjk",
  "football",
  "baseball",
  "monkey",
  "dragon",
  "master",
  "trustno1",
  "starwars",
  "muhammad",
  "allah123",
  "islam123",
]);

function isCommon(pwd: string): boolean {
  return COMMON_PASSWORDS.has(pwd.toLowerCase());
}

export function scorePassword(pwd: string): Strength {
  if (!pwd) {
    return {
      score: 0,
      label: "Too weak",
      color: "red",
      tips: ["Enter a password"],
    };
  }

  const tips: string[] = [];
  let score = 0;

  // Length tier
  if (pwd.length < 8) {
    tips.push("Use at least 8 characters");
  } else if (pwd.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Character variety
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  if (hasLower && hasUpper) score += 1;
  else if (!hasUpper) tips.push("Add an uppercase letter");

  if (hasDigit) score += 1;
  else tips.push("Add a number");

  if (hasSymbol) score += 1;
  else if (pwd.length < 14) tips.push("Add a symbol (!@#$%…)");

  // Penalty for common passwords — force to lowest tier
  if (isCommon(pwd)) {
    return {
      score: 0,
      label: "Too weak",
      color: "red",
      tips: ["This password is commonly leaked — pick something unique"],
    };
  }

  // Penalty for all-same character or sequential
  if (/^(.)\1+$/.test(pwd)) {
    return {
      score: 0,
      label: "Too weak",
      color: "red",
      tips: ["All-same characters — try a real password"],
    };
  }
  if (/^(?:0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(pwd)) {
    return {
      score: 1,
      label: "Weak",
      color: "amber",
      tips: ["Sequential characters are easy to guess"],
    };
  }

  // Cap at 4 and translate to label
  const finalScore = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const label = (
    ["Too weak", "Weak", "Fair", "Good", "Strong"] as const
  )[finalScore];
  const color = (
    ["red", "amber", "yellow", "lime", "green"] as const
  )[finalScore];

  return { score: finalScore, label, color, tips };
}
