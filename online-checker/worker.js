// Cloudflare Worker: secure AI answer-checking proxy for A/L Smart Study.
// Configure secrets/vars in Cloudflare: OPENAI_API_KEY (secret), OPENAI_MODEL (var).
// Deploy this Worker separately, then paste its https://...workers.dev URL into the app.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "A/L Smart Study answer checker" });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
      return json({ error: "Server is not configured. Add OPENAI_API_KEY and OPENAI_MODEL." }, 503);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const { subject, lesson, question, answer, reference_points, language } = body || {};
    if (![subject, lesson, question, answer].every(v => typeof v === "string" && v.trim())) {
      return json({ error: "subject, lesson, question and answer are required." }, 400);
    }
    if (answer.length > 12000 || !Array.isArray(reference_points) || reference_points.length > 30) {
      return json({ error: "Input is too long or invalid." }, 413);
    }
    const rubric = reference_points.map((p, i) => `${i + 1}. ${String(p).slice(0, 1200)}`).join("\n");
    const instructions = [
      "You are a careful Sri Lankan GCE A/L tutor.",
      "Assess the student's answer against the supplied reference points, not against invented facts.",
      "Reply in Sinhala. Be kind, precise and educational.",
      "Give an indicative score out of 10, list correct points, missing/incorrect points, explain how to improve, and provide a short model answer.",
      "Do not claim the score is an official examination mark or official marking-scheme result.",
      "If the reference points are insufficient to judge something, say so clearly."
    ].join(" ");
    const input = `විෂය: ${subject}\nපාඩම: ${lesson}\nප්‍රශ්නය: ${question}\nශිෂ්‍ය පිළිතුර: ${answer}\nපාඩමේ යොමු කරුණු:\n${rubric}\nභාෂාව: ${language || "si"}`;
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          instructions,
          input,
          max_output_tokens: 1200,
          store: false
        })
      });
      const data = await response.json();
      if (!response.ok) return json({ error: "AI provider request failed", details: data.error?.message || response.statusText }, 502);
      const feedback = (data.output || [])
        .filter(item => item.type === "message")
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n");
      if (!feedback) return json({ error: "No assessment text returned." }, 502);
      return json({ feedback, indicative: true, official_mark: false });
    } catch {
      return json({ error: "Could not reach AI provider." }, 502);
    }
  }
};
