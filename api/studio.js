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

    const prompt = `Тақырып: "${topic}". Стиль: ${tone}.

Осы тақырыпқа қазақ тілінде толық мазмұн жаса.

МАҢЫЗДЫ: Жауапты ТЕК JSON форматында бер. Формат:
{"blog":{"title":"...","body":"..."},"instagram":"...","tiktok":"...","facebook":"...","hashtags":["#tag1","#tag2"]}`;

    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: { 
        maxOutputTokens: 2000,
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
      return res.status(r.status).json({ 
        error: data.error?.message || `API ${r.status}`
      });
    }
    
    let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    
    if (!text) {
      return res.status(500).json({ error: "Empty response" });
    }

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    
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
