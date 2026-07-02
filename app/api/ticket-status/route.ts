type RequestPayload = {
  ticketNumber: string;
  captchaToken?: string;
  lang?: string;
};

type TicketResult = {
  ticketNumber: string;
  status: string;
  statusType: string;
};

const DEFAULT_API_URL =
  "https://www.zohoapis.eu/crm/v7/functions/sj_oye_zh_desk_get_ticket_status/actions/execute?auth_type=apikey&zapikey=1003.2df8c0349a5c22f9dfd33c013bf88fd4.790b652d19a7366cbbccfd2f232491bc";

type Lang = "uk" | "ru" | "en";

const MESSAGES: Record<
  Lang,
  {
    emptyTicket: string;
    captchaRequired: string;
    captchaFailed: string;
    captchaConfigError: string;
    apiRequestFailed: string;
    notFound: string;
    invalidResponse: string;
    requestError: string;
  }
> = {
  uk: {
    emptyTicket: "Введіть номер заявки",
    captchaRequired: "Підтвердіть, що ви не робот",
    captchaFailed: "Captcha не пройдена.",
    captchaConfigError: "Captcha не налаштована. Повідомте адміністратора.",
    apiRequestFailed: "Помилка запиту до API",
    notFound: "Заявку не знайдено",
    invalidResponse: "Помилка відповіді сервера",
    requestError: "Помилка сервера."
  },
  ru: {
    emptyTicket: "Введите номер заявки",
    captchaRequired: "Подтвердите, что вы не робот",
    captchaFailed: "Captcha не пройдена.",
    captchaConfigError: "Captcha не настроена. Сообщите администратору.",
    apiRequestFailed: "Ошибка запроса к API",
    notFound: "Заявка не найдена",
    invalidResponse: "Ошибка ответа сервера",
    requestError: "Ошибка сервера."
  },
  en: {
    emptyTicket: "Enter ticket number",
    captchaRequired: "Please complete captcha",
    captchaFailed: "Captcha verification failed.",
    captchaConfigError: "Captcha is not configured. Contact administrator.",
    apiRequestFailed: "API request failed",
    notFound: "Ticket not found",
    invalidResponse: "Invalid server response",
    requestError: "Server error."
  }
};

function normalizeLang(langValue?: string): Lang {
  if (langValue === "ru" || langValue === "en") return langValue;
  return "uk";
}

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

async function verifyTurnstile(secretKey: string, token: string, ip: string | null): Promise<boolean> {
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secretKey);
  body.set("response", token);
  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

function parseTicketFromApi(apiData: unknown, messages: (typeof MESSAGES)[Lang]): { ticket: TicketResult | null; errorMessage?: string } {
  const payload = apiData as {
    code?: string;
    message?: string;
    details?: { output?: string };
  };

  if (!payload || payload.code !== "success" || !payload.details?.output) {
    return { ticket: null, errorMessage: payload?.message || messages.notFound };
  }

  let inner: any;
  try {
    inner = JSON.parse(payload.details.output);
  } catch {
    return { ticket: null, errorMessage: messages.invalidResponse };
  }

  if (!inner || inner.success !== true) {
    return { ticket: null, errorMessage: inner?.message || messages.notFound };
  }

  return {
    ticket: {
      ticketNumber: String(inner.ticketNumber || ""),
      status: String(inner.status || ""),
      statusType: String(inner.statusType || "")
    }
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RequestPayload;
    const lang = normalizeLang(payload.lang);
    const messages = MESSAGES[lang];
    const ticketNumber = String(payload.ticketNumber || "").trim();

    if (!ticketNumber) {
      return Response.json({ message: messages.emptyTicket }, { status: 400 });
    }

    if (!payload.captchaToken) {
      return Response.json({ message: messages.captchaRequired }, { status: 400 });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || "";
    if (!turnstileSecret) {
      return Response.json({ message: messages.captchaConfigError }, { status: 500 });
    }
    const ip = getClientIp(request);
    const captchaValid = await verifyTurnstile(turnstileSecret, payload.captchaToken, ip);

    if (!captchaValid) {
      return Response.json({ message: messages.captchaFailed }, { status: 400 });
    }

    const apiUrl = process.env.TICKET_STATUS_API_URL || DEFAULT_API_URL;
    const separator = apiUrl.includes("?") ? "&" : "?";
    const requestUrl = `${apiUrl}${separator}ticketNumber=${encodeURIComponent(ticketNumber)}`;

    const apiResponse = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "User-Agent": "ticket-form-vercel"
      },
      cache: "no-store"
    });

    if (!apiResponse.ok) {
      return Response.json({ message: messages.apiRequestFailed }, { status: 502 });
    }

    const rawData = (await apiResponse.json()) as unknown;
    const parsed = parseTicketFromApi(rawData, messages);

    if (!parsed.ticket) {
      return Response.json({ message: parsed.errorMessage || messages.notFound }, { status: 404 });
    }

    return Response.json({ ticket: parsed.ticket });
  } catch {
    return Response.json({ message: MESSAGES.uk.requestError }, { status: 500 });
  }
}
