# Ticket Form for Vercel

Отдельная форма заявок на Next.js (Node), которую можно встроить в Joomla через `iframe`.

## Что внутри

- форма с JS-валидацией браузера;
- captcha через Cloudflare Turnstile (опционально);
- серверный API `/api/submit` с проверкой captcha;
- отправка заявки в `WEBHOOK_URL` (опционально, CRM/Telegram/Make/Zapier);
- zero-config режим: если `WEBHOOK_URL` не задан, заявки пишутся в Vercel Logs.

## Локальный запуск

1. Перейди в папку:
   - `cd ticket-form-vercel`
2. Установи зависимости:
   - `npm install`
3. (Опционально) создай `.env.local` по образцу `.env.example`
4. Запусти:
   - `npm run dev`

## Деплой на Vercel

1. Импортируй папку `ticket-form-vercel` как отдельный проект.
2. (Опционально) в Variables добавь:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `WEBHOOK_URL`
3. Deploy.

Можно деплоить и без переменных — форма будет работать, а заявки смотреть в Vercel Logs.

## Вставка в Joomla через iframe

Пример HTML-модуля:

```html
<iframe
  src="https://YOUR-PROJECT.vercel.app"
  width="100%"
  height="760"
  style="border:0; border-radius:12px; overflow:hidden;"
  loading="lazy"
></iframe>
```

Если админка/шаблон режет iframe, включи разрешение iframe в фильтрах редактора/модуля.
