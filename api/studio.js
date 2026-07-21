
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

    const prompt = `Taqyrыp: "${topic}". Стиль: ${tone}. Осы тақырыпқа толық мазмұн жаса.`;

    const payload = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: { maxOutputTokens: 1500 }
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
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    
    if (!text) {
      return res.status(500).json({ error: "Empty response from API" });
    }

    // Try to parse as JSON
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: "Invalid JSON from API", raw: text });
    }

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
