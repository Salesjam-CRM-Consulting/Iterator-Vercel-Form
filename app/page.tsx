"use client";

import Script from "next/script";
import { FormEvent, useEffect, useState } from "react";

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
  }
}

type Lang = "uk" | "ru" | "en";

const TEXTS: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    ticketLabel: string;
    ticketPlaceholder: string;
    buttonIdle: string;
    buttonLoading: string;
    ticketNumberRow: string;
    statusRow: string;
    emptyTicket: string;
    requestError: string;
    notFound: string;
    unknownError: string;
    captchaRequired: string;
  }
> = {
  uk: {
    title: "Перевірка статусу заявки",
    subtitle: "Введіть номер заявки, щоб отримати її поточний статус.",
    ticketLabel: "Номер заявки",
    ticketPlaceholder: "Наприклад, 10324",
    buttonIdle: "Перевірити",
    buttonLoading: "Перевіряємо...",
    ticketNumberRow: "Номер заявки",
    statusRow: "Статус",
    emptyTicket: "Введіть номер заявки",
    requestError: "Помилка запиту",
    notFound: "Заявку не знайдено",
    unknownError: "Невідома помилка",
    captchaRequired: "Підтвердіть, що ви не робот"
  },
  ru: {
    title: "Проверка статуса заявки",
    subtitle: "Введите номер заявки, чтобы получить ее текущий статус.",
    ticketLabel: "Номер заявки",
    ticketPlaceholder: "Например, 10324",
    buttonIdle: "Проверить",
    buttonLoading: "Проверяем...",
    ticketNumberRow: "Номер заявки",
    statusRow: "Статус",
    emptyTicket: "Введите номер заявки",
    requestError: "Ошибка запроса",
    notFound: "Заявка не найдена",
    unknownError: "Неизвестная ошибка",
    captchaRequired: "Подтвердите, что вы не робот"
  },
  en: {
    title: "Ticket Status Check",
    subtitle: "Enter your ticket number to see the current status.",
    ticketLabel: "Ticket number",
    ticketPlaceholder: "For example, 10324",
    buttonIdle: "Check status",
    buttonLoading: "Checking...",
    ticketNumberRow: "Ticket number",
    statusRow: "Status",
    emptyTicket: "Enter ticket number",
    requestError: "Request error",
    notFound: "Ticket not found",
    unknownError: "Unknown error",
    captchaRequired: "Please complete captcha"
  }
};

function normalizeLang(langValue: string | null): Lang {
  if (langValue === "ru" || langValue === "en") return langValue;
  return "uk";
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("uk");
  const t = TEXTS[lang];
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [ticketStatus, setTicketStatus] = useState<{
    ticketNumber: string;
    status: string;
    statusType: string;
  } | null>(null);

  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      setCaptchaToken(token);
    };

    const params = new URLSearchParams(window.location.search);
    setLang(normalizeLang(params.get("lang")));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setTicketStatus(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      ticketNumber: String(form.get("ticketNumber") || "").trim(),
      captchaToken,
      lang
    };

    if (!payload.ticketNumber) {
      setErrorMessage(t.emptyTicket);
      setLoading(false);
      return;
    }

    if (turnstileSiteKey && !payload.captchaToken) {
      setErrorMessage(t.captchaRequired);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/ticket-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as {
        message?: string;
        ticket?: {
          ticketNumber: string;
          status: string;
          statusType: string;
        };
      };

      if (!response.ok) {
        throw new Error(data.message || t.requestError);
      }

      if (!data.ticket) {
        throw new Error(t.notFound);
      }

      setTicketStatus(data.ticket);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.unknownError;
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      {Boolean(turnstileSiteKey) && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}
      <section className="card">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>

        <form onSubmit={onSubmit}>
          <label>
            {t.ticketLabel}
            <input
              name="ticketNumber"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t.ticketPlaceholder}
              required
            />
          </label>

          {turnstileSiteKey && (
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileSuccess" />
          )}

          <button type="submit" disabled={loading}>
            {loading ? t.buttonLoading : t.buttonIdle}
          </button>

          {errorMessage && <div className="err">{errorMessage}</div>}
          {ticketStatus && (
            <div className="result">
              <div className="row">
                <span className="rowLabel">{t.ticketNumberRow}</span>
                <span className="rowValue">{ticketStatus.ticketNumber}</span>
              </div>
              <div className="row">
                <span className="rowLabel">{t.statusRow}</span>
                <span className="rowValue">
                  <span className={ticketStatus.statusType.toLowerCase() === "closed" ? "badge closed" : "badge open"}>
                    {ticketStatus.status}
                  </span>
                </span>
              </div>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
