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

    const prompt = `Тақырып: "${topic}"
Стиль: ${tone}

Осы тақырыпқа қазақ тілінде толық мазмұн жаса. Кем дегенде 5-6 сөйлемдік блог, әр әлеуметтік желі үшін жеке мәтін.

Барлық мәтіндер қазақ тілінде болсын, психология тақырыбында жылы, кәсіби, диагноз қоймай.

Instagram посты үшін де қысқа, вертикалды жазба сурет мәтінін (imageCaption) жаса — 3-5 сөзден аспасын, эмоционалды әрі шабыттандырушы.

Жауап тек төмендегі JSON форматында болсын, басқа сөз, түсіндірме, markdown жоқ:

{"blog":{"title":"мақала тақырыбы","body":"толық мәтін"},"instagram":"Instagram посты","imageCaption":"суреттегі қысқа мәтін","tiktok":"TikTok сценарийі","facebook":"Facebook посты","hashtags":["#хэштег1","#хэштег2","#хэштег3"],"imageTheme":"lotus|eye|nature|heart|book|sun|water"}

imageTheme мәні мына тізімнен ғана: lotus (тыныштық, медитация), eye (EMDR, назар), nature (өсу, даму), heart (сүйіспеншілік, өзін-өзі бағалау), book (білім, оқу), sun (үміт, жарық), water (эмоция, ағыс). Тақырыпқа ең жақынын таңда.`;

    const payload = {
      systemInstruction: { 
        parts: [{ text: system + "\n\nҚАТАҢ ЕРЕЖЕ: Жауапты ТЕК JSON форматында бер. Ешқандай кіріспе, түсіндірме, markdown жазба." }] 
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
      return res.status(500).json({ error: "Empty response" });
    }

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (e) {
      return res.status(500).json({ error: "Invalid JSON: " + e.message, raw: text.substring(0, 500) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
