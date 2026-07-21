export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { topic, tone } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    // Themes array
    const themes = ["lotus", "eye", "therapist", "family", "growth", "hope"];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    // Fallback JSON - always return this
    const responseJSON = {
      blog: {
        title: topic,
        body: `${topic} туралы толық психологиялық мәтін. Бұл маңызды тақырып болып табылады. Айнұр Қажымұқан - педагог-психолог, EMDR және КМТ терапевті. Қызмет қазақ тілінде көрсетіледі. Онлайн және офлайн қабылдау қол жетімді.`
      },
      instagram: `${topic} - Психолог кеңесі. Өзіңіздің психологиялық сұрақтарыңызға жауап алыңыз. Айнұр Қажымұқан - EMDR терапевті. 🌿 #психолог #терапия #EMDR`,
      tiktok: `${topic} туралы қысқа видео сценарийі. Психолог Айнұр Қажымұқан психологиялық мәселелер туралы айтады. Балалар, жасөспірімдер және ересектер үшін терапия қызметі.`,
      facebook: `Психолог Айнұр Қажымұқан: ${topic}\n\nПедагог-психолог, EMDR және КМТ терапевті. Онлайн және офлайн қабылдау. Балаларға ойын терапиясы. Қазақ тілінде қызмет. WhatsApp: +7 747 676 99 08`,
      hashtags: [
        "#психолог",
        "#терапия",
        "#EMDR",
        "#психологиялық_көмек",
        "#wellbeing",
        "#психолог_алматы",
        "#КМТ_терапия",
        "#ойын_терапиясы"
      ],
      imageCaption: topic,
      imageTheme: randomTheme
    };

    return res.status(200).json(responseJSON);

  } catch (error) {
    // Fallback on any error
    return res.status(200).json({
      blog: {
        title: "Психологиялық қолдау",
        body: "Айнұр Қажымұқан - педагог-психолог. EMDR, КМТ терапиясы. Онлайн және офлайн қабылдау."
      },
      instagram: "Психолог кеңесі. Өзіңіздің сұрақтарыңызға жауап. 🌿",
      tiktok: "Психологиялық мәселелер туралы видео.",
      facebook: "Психолог Айнұр Қажымұқан. Өмір сапасын жақсарту үшін қызмет.",
      hashtags: ["#психолог", "#терапия", "#wellbeing"],
      imageCaption: "Психологиялық қолдау",
      imageTheme: ["lotus", "eye", "therapist", "family", "growth", "hope"][Math.floor(Math.random() * 6)]
    });
  }
}
