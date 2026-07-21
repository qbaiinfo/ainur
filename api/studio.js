export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  const fallbackJSON = {
    blog: { title: "Тақырып", body: "Толық психологиялық мәтін. Қазақ тілінде." },
    instagram: "Психолог кеңесі - өзіңіздің сұрақтарыңызға жауап. 🌿",
    tiktok: "Қысқа видео сценарийі психолог туралы.",
    facebook: "Психолог Айнұр: Онлайн және офлайн қабылдау.",
    hashtags: ["#психолог", "#терапия", "#wellbeing"],
    imageCaption: "Психологиялық қолдау",
    imageTheme: "lotus"
  };

  try {
    const { topic, tone } = req.body;
    if (!topic) return res.status(400).json({ error: "Missing topic" });

    // Try API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Өзіңіз тақырыбы: "${topic}". Стиль: ${tone}. Таза JSON бер.` }] }],
          generationConfig: { maxOutputTokens: 1500, responseMimeType: "application/json" }
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json.blog && json.blog.title) return res.status(200).json(json);
        } catch (e) {}
      }
    }

    // Fallback
    return res.status(200).json(fallbackJSON);
  } catch (err) {
    return res.status(200).json(fallbackJSON);
  }
}
