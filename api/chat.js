export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log("Anthropic status:", response.status);
    console.log("Anthropic response:", JSON.stringify(data));
    res.status(200).json(data);
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
