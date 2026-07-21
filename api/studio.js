export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { topic, tone } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic required" });
    }

    const themes = ["lotus", "eye", "therapist", "family", "growth", "hope"];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    const prompt = `Сен - Айнұр Қажымұқан психолог-кеңесшінің мазмұн көмекшісі. "${topic}" тақырыбы бойынша қазақ тілінде толық мазмұн жаса.

МІНДЕТТІ ФОРМАТ - ТАЗА JSON:
{
  "blog": {
    "title": "тақырыбы (қысқа)",
    "body": "толық мәтін 200-300 сөз"
  },
  "instagram": "Instagram мәтіні",
  "tiktok": "TikTok сценарийі",
  "facebook": "Facebook мәтіні",
  "hashtags": ["#tag1", "#tag2"],
  "imageCaption": "суреттің мәтіні",
  "imageTheme": "lotus"
}

Барлық мәтін ҚАЗАҚ ТІЛ ІНДЕ. Диагноз ұсынба. Ғылыми negіздеуі бар.`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.8,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response");
    }

    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    let json = JSON.parse(text);
    
    // Ensure all fields exist
    if (!json.blog) json.blog = { title: topic, body: "Мәтін" };
    if (!json.instagram) json.instagram = topic;
    if (!json.tiktok) json.tiktok = topic;
    if (!json.facebook) json.facebook = topic;
    if (!json.hashtags) json.hashtags = ["#психолог"];
    if (!json.imageCaption) json.imageCaption = topic;
    if (!json.imageTheme) json.imageTheme = theme;

    return res.status(200).json(json);

  } catch (error) {
    console.error("AI error:", error.message);
    
    // Fallback only if AI fails
    const themes = ["lotus", "eye", "therapist", "family", "growth", "hope"];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    
    return res.status(200).json({
      blog: {
        title: req.body?.topic || "Психологиялық қолдау",
        body: "Айнұр Қажымұқан - педагог-психолог. EMDR және КМТ терапевті. Балалар, жасөспірімдер және ересектерге қызмет көрсетеді. Онлайн және офлайн қабылдау."
      },
      instagram: "Психолог кеңесі",
      tiktok: "Психологиялық мәселелер",
      facebook: "Психолог Айнұр Қажымұқан",
      hashtags: ["#психолог", "#терапия"],
      imageCaption: req.body?.topic || "Психологиялық қолдау",
      imageTheme: theme
    });
  }
}
