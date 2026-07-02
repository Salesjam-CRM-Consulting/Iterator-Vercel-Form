type RequestPayload = {
  ticketNumber: string;
  captchaToken?: string;
};

type TicketResult = {
  ticketNumber: string;
  status: string;
  statusType: string;
};

const DEFAULT_API_URL =
  "https://www.zohoapis.eu/crm/v7/functions/sj_oye_zh_desk_get_ticket_status/actions/execute?auth_type=apikey&zapikey=1003.2df8c0349a5c22f9dfd33c013bf88fd4.790b652d19a7366cbbccfd2f232491bc";

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

function parseTicketFromApi(apiData: unknown): { ticket: TicketResult | null; errorMessage?: string } {
  const payload = apiData as {
    code?: string;
    message?: string;
    details?: { output?: string };
  };

  if (!payload || payload.code !== "success" || !payload.details?.output) {
    return { ticket: null, errorMessage: payload?.message || "Заявку не знайдено" };
  }

  let inner: any;
  try {
    inner = JSON.parse(payload.details.output);
  } catch {
    return { ticket: null, errorMessage: "Помилка відповіді сервера" };
  }

  if (!inner || inner.success !== true) {
    return { ticket: null, errorMessage: inner?.message || "Заявку не знайдено" };
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
    const ticketNumber = String(payload.ticketNumber || "").trim();

    if (!ticketNumber) {
      return Response.json({ message: "Введіть номер заявки" }, { status: 400 });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    const captchaEnabled = Boolean(turnstileSecret);

    if (captchaEnabled) {
      const ip = getClientIp(request);
      const captchaValid = await verifyTurnstile(turnstileSecret as string, payload.captchaToken || "", ip);

      if (!captchaValid) {
        return Response.json({ message: "Captcha не пройдена." }, { status: 400 });
      }
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
      return Response.json({ message: "Помилка запиту до API" }, { status: 502 });
    }

    const rawData = (await apiResponse.json()) as unknown;
    const parsed = parseTicketFromApi(rawData);

    if (!parsed.ticket) {
      return Response.json({ message: parsed.errorMessage || "Заявку не знайдено" }, { status: 404 });
    }

    return Response.json({ ticket: parsed.ticket });
  } catch {
    return Response.json({ message: "Ошибка сервера." }, { status: 500 });
  }
}
