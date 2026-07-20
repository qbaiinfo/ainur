// Vercel serverless функциясы — AI көмекшінің тірі сайтта жұмыс істеуі үшін.
// Файл орналасуы: жобаның түбіндегі  /api/chat.js
//
// ЖАСАУ ҚАДАМДАРЫ:
// 1) Vercel → жоба → Settings → Environment Variables → ANTHROPIC_API_KEY қосыңыз
//    (кілтті console.anthropic.com сайтынан аласыз).
// 2) index.html ішінде CONFIG.aiEndpoint мәнін "/api/chat" деп өзгертіңіз.
// 3) GitHub-қа жүктеңіз — Vercel автоматты деплой жасайды.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY орнатылмаған" });
  }

  try {
    const { model, max_tokens, system, messages } = req.body;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });

    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "AI сұрауы сәтсіз аяқталды" });
  }
}
