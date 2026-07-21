export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const { topic, tone, system } = req.body;
    if (!topic || !system) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const jsonSchema = {
      blog: { title: "мақала тақырыбы", body: "толық мәтін" },
      instagram: "Instagram мәтіні",
      imageCaption: "суреттегі мәтін (қысқа)",
      tiktok: "TikTok сценарийі",
      facebook: "Facebook мәтіні",
      hashtags: ["#хэштег1", "#хэштег2"],
      imageTheme: "lotus"
    };

    const prompt = `Тақырып: "${topic}"
Стиль: ${tone}

Осы тақырыпқа қазақ тілінде толық мазмұн жаса.

ДӘЛІК ЖАУАП ФОРМАТЫ (JSON SCHEMA):
${JSON.stringify(jsonSchema, null, 2)}

Барлық мәтіндер қазақ тілінде болсын, психология тақырыбында жылы, кәсіби, диагноз қоймай.

imageTheme мәні: lotus, eye, nature, heart, book, sun, water ішінен ТЕК біреу таңда.

МАҢЫЗДЫ: Жауап ТЕК таза JSON болсын. Басқа сөз, түсіндірме, markdown ('''\`\`\`), кірісінеме жоқ. ТАМАША JSON ҒАНА.`;

    const payload = {
      systemInstruction: { 
        parts: [{ 
          text: system + "\n\nҚАТІ ЕРЕЖЕ: ЖАУАП ТЕК ТАЗА JSON БОЛСЫН. ЕШҚАНДАЙ КІРІСПЕ, ТҮСІНДІРМЕ, MARKDOWN. ДӘЛІК JSON ҒАНА." 
        }] 
      },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: { 
        maxOutputTokens: 3000,
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    };

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await r.json();
    
    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || `API ${r.status}` });
    }
    
    let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    
    if (!text) {
      return res.status(500).json({ error: "Empty response from API" });
    }

    // Cleanup markdown wrappers
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    
    // Extract JSON object
    let json;
    try {
      json = JSON.parse(text);
    } catch (e1) {
      // Try finding braces
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const candidate = text.substring(firstBrace, lastBrace + 1);
        try {
          json = JSON.parse(candidate);
        } catch (e2) {
          return res.status(500).json({ 
            error: "Invalid JSON from API: " + e2.message,
            raw: text.substring(0, 300)
          });
        }
      } else {
        return res.status(500).json({ error: "No JSON object found in response" });
      }
    }

    // Ensure required fields exist
    if (!json.blog) json.blog = { title: "", body: "" };
    if (!json.instagram) json.instagram = "";
    if (!json.tiktok) json.tiktok = "";
    if (!json.facebook) json.facebook = "";
    if (!json.hashtags) json.hashtags = [];
    if (!json.imageCaption) json.imageCaption = json.blog.title || "";
    if (!json.imageTheme) json.imageTheme = "lotus";

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
