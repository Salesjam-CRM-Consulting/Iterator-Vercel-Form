"use client";

import Script from "next/script";
import { FormEvent, useEffect, useState } from "react";

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
  }
}

export default function HomePage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const captchaEnabled = Boolean(turnstileSiteKey);
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
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setTicketStatus(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      ticketNumber: String(form.get("ticketNumber") || "").trim(),
      captchaToken
    };

    if (!payload.ticketNumber) {
      setErrorMessage("Введіть номер заявки");
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
        throw new Error(data.message || "Помилка запиту");
      }

      if (!data.ticket) {
        throw new Error("Заявку не знайдено");
      }

      setTicketStatus(data.ticket);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      {captchaEnabled && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <section className="card">
        <h1>Перевірка статусу заявки</h1>
        <p>Введіть номер заявки, щоб отримати її поточний статус.</p>

        <form onSubmit={onSubmit}>
          <label>
            Номер заявки
            <input
              name="ticketNumber"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Наприклад, 10324"
              required
            />
          </label>

          {captchaEnabled ? (
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileSuccess" />
          ) : (
            <div className="hint">
              Captcha отключена (можно включить позже через `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Перевіряємо..." : "Перевірити"}
          </button>

          {errorMessage && <div className="err">{errorMessage}</div>}
          {ticketStatus && (
            <div className="result">
              <div className="row">
                <span className="rowLabel">Номер заявки</span>
                <span className="rowValue">{ticketStatus.ticketNumber}</span>
              </div>
              <div className="row">
                <span className="rowLabel">Статус</span>
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
