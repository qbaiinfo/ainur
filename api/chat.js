// Vercel serverless функциясы — Gemini API арасындағы прокси
// Файл орналасуы: жобаның түбіндегі /api/chat.js
//
// ЖАСАУ ҚАДАМДАРЫ:
// 1) Vercel → жоба → Settings → Environment Variables:
//    GEMINI_API_KEY = "AQ.Ab8RN6K..." (Gemini key)
// 2) Дәл ғана, CI/CD автоматты деплой жасайды.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY орнатылмаған" });
  }

  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Жарамсыз сұрау" });
    }

    const payload = {
      systemInstruction: { parts: [{ text: system || "Көмекші" }] },
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      generationConfig: { maxOutputTokens: 1000 }
    };

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await r.json();
    const reply = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
