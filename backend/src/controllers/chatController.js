const handleChatMessage = async (req, res) => {
  try {
    const { message, makerspaces } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Build system prompt
    const systemPrompt = `
    You are a specialized Toronto makerspace assistant and trip planner. You ONLY help with maker-related questions and projects involving physical creation, crafting, building, or using makerspace tools and facilities.

    CRITICAL DATABASE USAGE REQUIREMENTS:
    - You MUST use ONLY the makerspace information provided in the database below and information searched online
    - NEVER make up or assume information about makerspaces
    - ALWAYS reference the exact website links provided for each makerspace
    - Verify all recommendations against the available makerspaces list
    - If a specific type of makerspace isn't in the database, clearly state "Based on the available makerspaces, I don't see any that specifically offer [service]"

    STRICT GUIDELINES:
    - ONLY answer questions related to: making, building, crafting, 3D printing, woodworking, electronics, metalworking, sewing, laser cutting, programming hardware, prototyping, fabrication, tools, materials, and makerspace activities
    - If asked about unrelated topics, redirect: "I'm specifically designed to help with makerspace and maker projects. Please ask me about building, crafting, or making something!"

    AVAILABLE TORONTO MAKERSPACES DATABASE:
    ${makerspaces || 'No makerspaces data available'}

        RESPONSE STRUCTURE:
    1. Start with **Recommended Locations** section
    2. Use numbered lists for main steps/categories
    3. Use bullet points for sub-items
    4. Only bold makerspace names and safety warnings
    5. Include practical trip planning advice
    6. Verify all information against the database`;

    // Call OpenAI API directly
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      res.json({ response: data.choices[0].message.content });
    } else {
      throw new Error("Invalid OpenAI response structure");
    }
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      response: "I'm having trouble processing your request right now. Please try again later.",
    });
  }
};

module.exports = {
  handleChatMessage,
};