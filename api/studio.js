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

    // Fallback JSON (eger API fail olursa)
    const fallbackJSON = {
      blog: {
        title: topic,
        body: `${topic} туралы толық мәтін. Бұл тақырып өте маңызды және психологиялық сұрақтарға әке болуы мүмкін. Біз сіздің сұрақтарыңызға жауап беруге дайын.`
      },
      instagram: `${topic} - өзіңіздің психологиялық сұрақтарыңызға жауап алыңыз. Қызмет қазақ тілінде. 🌿`,
      tiktok: `${topic} туралы қысқа видео сценарийі. Психолог кеңесінде берсі.`,
      facebook: `Психолог Айнұр: ${topic} туралы. Онлайн және офлайн қабылдау. Хабарласыңыз!`,
      hashtags: ["#психолог", "#терапия", "#психологияльқ_көмек", "#EMDR", "#wellbeing"],
      imageCaption: topic,
      imageTheme: ["lotus", "eye", "therapist", "family", "growth", "hope"][Math.floor(Math.random() * 6)]
    };

    try {
      const payload = {
        systemInstruction: { 
          parts: [{ 
            text: system + "\n\nЖауап МІНДЕТТІ түрде таза JSON болсын. Ешқандай markdown немесе өзге сөз." 
          }] 
        },
        contents: [{
          parts: [{ text: `Тақырып: "${topic}"\nСтиль: ${tone}\n\nТАЗА JSON бер:` }]
        }],
        generationConfig: { 
          maxOutputTokens: 1500,
          temperature: 0.7,
          topP: 1,
          topK: 40
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

      if (!response.ok) {
        console.log("API error, using fallback");
        return res.status(200).json(fallbackJSON);
      }

      const data = await response.json();
      let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

      if (!text) {
        console.log("Empty response, using fallback");
        return res.status(200).json(fallbackJSON);
      }

      // Cleanup
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log("No JSON found, using fallback");
        return res.status(200).json(fallbackJSON);
      }

      let json;
      try {
        json = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log("Parse error, using fallback:", e.message);
        return res.status(200).json(fallbackJSON);
      }

      // Ensure all fields
      if (!json.blog) json.blog = fallbackJSON.blog;
      if (!json.blog.title) json.blog.title = topic;
      if (!json.blog.body) json.blog.body = fallbackJSON.blog.body;
      if (!json.instagram) json.instagram = fallbackJSON.instagram;
      if (!json.tiktok) json.tiktok = fallbackJSON.tiktok;
      if (!json.facebook) json.facebook = fallbackJSON.facebook;
      if (!json.hashtags) json.hashtags = fallbackJSON.hashtags;
      if (!json.imageCaption) json.imageCaption = fallbackJSON.imageCaption;
      if (!json.imageTheme) json.imageTheme = fallbackJSON.imageTheme;

      return res.status(200).json(json);
    } catch (innerErr) {
      console.log("Inner error, fallback:", innerErr.message);
      return res.status(200).json(fallbackJSON);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
