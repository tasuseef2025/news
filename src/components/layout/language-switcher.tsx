"use client";

import { Languages } from "lucide-react";
import Script from "next/script";
import { useEffect, useState } from "react";

const languages = [
  ["en", "English"],
  ["ur", "Urdu"],
  ["ar", "Arabic"],
  ["hi", "Hindi"],
  ["bn", "Bengali"],
  ["pa", "Punjabi"],
  ["fa", "Persian"],
  ["tr", "Turkish"],
  ["fr", "French"],
  ["de", "German"],
  ["es", "Spanish"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["ru", "Russian"],
  ["zh-CN", "Chinese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["id", "Indonesian"],
  ["ms", "Malay"],
  ["th", "Thai"],
  ["vi", "Vietnamese"],
  ["nl", "Dutch"],
  ["sv", "Swedish"],
  ["no", "Norwegian"],
  ["da", "Danish"],
  ["fi", "Finnish"],
  ["pl", "Polish"],
  ["uk", "Ukrainian"],
  ["el", "Greek"],
  ["he", "Hebrew"],
  ["sw", "Swahili"]
] as const;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (options: Record<string, unknown>, elementId: string) => void;
      };
    };
  }
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

function clearTranslateCookies() {
  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function currentLanguage() {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )googtrans=\/en\/([^;]+)/);
  return match?.[1] || "en";
}

export function LanguageSwitcher() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    setLanguage(currentLanguage());
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: languages.map(([code]) => code).join(","),
          autoDisplay: false
        },
        "google_translate_element"
      );
    };
  }, []);

  function changeLanguage(value: string) {
    setLanguage(value);
    if (value === "en") {
      clearTranslateCookies();
    } else {
      setCookie("googtrans", `/en/${value}`);
      setCookie("googtrans", `/en/${value}`);
    }
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-background/80 px-2 py-1 text-xs font-bold">
      <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="afterInteractive" />
      <div id="google_translate_element" className="hidden" />
      <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
      <label htmlFor="language-select" className="sr-only">Language</label>
      <select
        id="language-select"
        value={language}
        onChange={(event) => changeLanguage(event.target.value)}
        className="max-w-[92px] bg-transparent text-xs font-black outline-none"
        aria-label="Select language"
      >
        {languages.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}
