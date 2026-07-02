type SubmitPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  captchaToken: string;
};

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return false;
  }

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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SubmitPayload;

    if (!payload.name || !payload.email || !payload.message) {
      return Response.json({ message: "Заполни обязательные поля." }, { status: 400 });
    }

    if (!payload.captchaToken) {
      return Response.json({ message: "Пройди captcha." }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for");
    const captchaValid = await verifyTurnstile(payload.captchaToken, ip);

    if (!captchaValid) {
      return Response.json({ message: "Captcha не пройдена." }, { status: 400 });
    }

    const webhookUrl = process.env.WEBHOOK_URL;

    if (webhookUrl) {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone || "",
          message: payload.message,
          source: "ticket-form-vercel",
          createdAt: new Date().toISOString()
        })
      });

      if (!webhookResponse.ok) {
        return Response.json({ message: "Не удалось отправить данные в webhook." }, { status: 502 });
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "Ошибка сервера." }, { status: 500 });
  }
}
