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

МАҢЫЗДЫ: Жауапты ТЕК JSON форматында бер, басқа ешнәрсе жазба. Формат:
{"blog":{"title":"...","body":"..."},"instagram":"...","tiktok":"...","facebook":"...","hashtags":["#tag1","#tag2"]}`;

    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: { 
        maxOutputTokens: 2000,
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    };

    // Try both endpoints for compatibility
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
    ];

    let lastError = null;
    let data = null;

    for (const url of endpoints) {
      try {
        // Try header-based auth first
        let r = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(payload),
        });

        // If that fails, try query parameter auth
        if (!r.ok && r.status === 401) {
          r = await fetch(url + `?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        data = await r.json();

        if (r.ok) {
          break; // Success, exit loop
        } else {
          lastError = data.error?.message || `API ${r.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!data || data.error) {
      return res.status(500).json({ 
        error: lastError || "All endpoints failed",
        details: data 
      });
    }
    
    let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    
    if (!text) {
      return res.status(500).json({ 
        error: "Empty response",
        details: data 
      });
    }

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (e) {
      return res.status(500).json({ 
        error: "Invalid JSON: " + e.message, 
        raw: text.substring(0, 500) 
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
