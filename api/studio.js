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

ҚАЗАҚ ТІЛІНДЕ толық мазмұн жаса. ТЕК таза JSON бер.

FORMAT (МІНДЕТТІ):
{
  "blog": {
    "title": "мақала тақырыбы (10 сөз max)",
    "body": "толық мақала (200-300 сөз)"
  },
  "instagram": "Instagram мәтіні (150 сөз max)",
  "tiktok": "TikTok сценарийі (100 сөз max)",
  "facebook": "Facebook мәтіні (150 сөз max)",
  "hashtags": ["#хэштег1", "#хэштег2", "#хэштег3"],
  "imageCaption": "суреттің қысқа мәтіні (5-10 сөз)",
  "imageTheme": "lotus"
}

ЕРЕЖЕ: Жауап ТІЛДІ JSON болсын, барлығы қазақ, ешқандай английс сөз жоқ.`;

    const payload = {
      systemInstruction: { 
        parts: [{ 
          text: system + "\n\nМІНДЕТТІ: Жауап ТЕК таза JSON болсын. Ешқандай markdown,説明, кіріспе. ДӘЛІК JSON ҒАНА." 
        }] 
      },
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
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || `API ${response.status}` });
    }
    
    let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    
    if (!text) {
      return res.status(500).json({ error: "Empty response from Gemini" });
    }

    // Aggressive cleanup
    text = text
      .replace(/^```json\s*/gi, '')
      .replace(/^```\s*/gi, '')
      .replace(/```\s*$/gi, '')
      .trim();

    // Remove any leading/trailing junk
    text = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

    // Try to parse
    let json;
    try {
      json = JSON.parse(text);
    } catch (e1) {
      // Try to extract JSON object
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(500).json({ error: "No JSON found in response", raw: text.substring(0, 200) });
      }

      try {
        json = JSON.parse(match[0]);
      } catch (e2) {
        // Last attempt: clean up common issues
        let cleaned = match[0];
        
        // Fix unescaped quotes inside strings
        cleaned = cleaned.replace(/([^\\])"([^"]*)"([^\\])/g, '$1\\"$2\\"$3');
        
        // Fix newlines
        cleaned = cleaned.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        
        try {
          json = JSON.parse(cleaned);
        } catch (e3) {
          return res.status(500).json({ 
            error: "Invalid JSON: " + e2.message,
            sample: match[0].substring(0, 300)
          });
        }
      }
    }

    // Ensure all required fields
    if (!json.blog) json.blog = { title: topic, body: "Жүктеліп жатыр..." };
    if (!json.blog.title) json.blog.title = topic;
    if (!json.blog.body) json.blog.body = "";
    if (!json.instagram) json.instagram = json.blog.body.substring(0, 150);
    if (!json.tiktok) json.tiktok = json.blog.body.substring(0, 100);
    if (!json.facebook) json.facebook = json.blog.body.substring(0, 150);
    if (!json.hashtags) json.hashtags = ["#психолог", "#терапия", "#EMDR"];
    if (!json.imageCaption) json.imageCaption = json.blog.title;
    if (!json.imageTheme) json.imageTheme = "lotus";

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
