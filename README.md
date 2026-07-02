# Ticket Status Form for Vercel

Отдельная форма проверки статуса заявки на Next.js (Node), которую можно встроить в Joomla через `iframe`.

## Что внутри

- форма ввода номера заявки;
- captcha через Cloudflare Turnstile (включена всегда, только с реальными ключами);
- серверный API `/api/ticket-status` с проверкой captcha;
- прокси-запрос к API статусов тикетов (как в модуле `mod_ticketstatus`);
- вывод результата `Номер заявки + Статус`;
- язык через параметр `?lang=uk|ru|en` без смешивания текстов.

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
2. В Variables обязательно добавь:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `TICKET_STATUS_API_URL`
3. Deploy.

Если `TICKET_STATUS_API_URL` не задан, используется URL по умолчанию из старого модуля.

## Вставка в Joomla через iframe

Пример HTML-модуля:

```html
<iframe
  src="https://YOUR-PROJECT.vercel.app/?lang=uk"
  width="100%"
  height="760"
  style="border:0; border-radius:12px; overflow:hidden;"
  loading="lazy"
></iframe>
```

Поддерживаемые значения `lang`:
- `uk` — украинский
- `ru` — русский
- `en` — английский

Если админка/шаблон режет iframe, включи разрешение iframe в фильтрах редактора/модуля.
