// Meal photo -> macros with Gemini. Set GEMINI_API_KEY (Google AI Studio) in .env.local; without it this returns 501
// and the Eat tab falls back to its demo estimate.

const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "GEMINI_API_KEY not set" }, { status: 501 });

  const file = (await req.formData()).get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8e6)
    return Response.json({ error: "Send one image under 8 MB as 'photo'" }, { status: 400 });

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } },
        { text: "Identify this meal and estimate the whole plate's calories and macros. It is most likely from an APU campus cafeteria stall: Western, Indian, Malaysian, Arabic, Japanese, Kopitiam, Chinese or Burger. Short dish name." },
      ] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { name: { type: "STRING" }, kcal: { type: "NUMBER" }, p: { type: "NUMBER" }, c: { type: "NUMBER" }, f: { type: "NUMBER" } },
          required: ["name", "kcal", "p", "c", "f"],
        },
      },
    }),
  });
  if (!r.ok) return Response.json({ error: `Gemini ${r.status}` }, { status: 502 });

  try {
    const m = JSON.parse((await r.json()).candidates[0].content.parts[0].text);
    const n = (x: unknown) => Math.max(0, Math.round(Number(x) || 0));
    return Response.json({ name: String(m.name).slice(0, 60), kcal: n(m.kcal), p: n(m.p), c: n(m.c), f: n(m.f) });
  } catch {
    return Response.json({ error: "Couldn't read Gemini's answer" }, { status: 502 });
  }
}
