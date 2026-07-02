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
  const [okMessage, setOkMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      setCaptchaToken(token);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setOkMessage("");
    setErrorMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      message: String(form.get("message") || ""),
      captchaToken
    };

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Ошибка отправки формы");
      }

      event.currentTarget.reset();
      setCaptchaToken("");
      setOkMessage("Заявка отправлена. Скоро свяжемся.");
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
        <h1>Форма заявки</h1>
        <p>Эту страницу можно вставить в Joomla через iframe.</p>

        <form onSubmit={onSubmit}>
          <label>
            Имя
            <input name="name" required />
          </label>

          <label>
            Email
            <input name="email" type="email" required />
          </label>

          <label>
            Телефон
            <input name="phone" />
          </label>

          <label>
            Сообщение
            <textarea name="message" required />
          </label>

          {captchaEnabled ? (
            <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileSuccess" />
          ) : (
            <div className="hint">
              Captcha отключена (можно включить позже через `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Отправка..." : "Отправить"}
          </button>

          {okMessage && <div className="ok">{okMessage}</div>}
          {errorMessage && <div className="err">{errorMessage}</div>}
        </form>
      </section>
    </main>
  );
}
