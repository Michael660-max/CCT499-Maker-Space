const { supabase } = require('../config/supabase');

// Fetch makerspaces from Supabase
const fetchMakerspaces = async () => {
  try {
    const { data, error } = await supabase.rpc('makerspaces_scraped_geojson');
    
    if (error) {
      console.error('Error fetching makerspaces:', error);
      return null;
    }
    
    if (!data || !data.features) {
      return null;
    }
    
    // Convert GeoJSON features to text format for AI
    const makerspaceText = data.features
      .map((space) => {
        const props = space.properties;
        return `
        Name: ${props.name || "Unknown"}
        Description: ${props.description || "No description available"}
        Address: ${props.address || "No address listed"}
        Email: ${props.email || "No email listed"}
        Phone: ${props.phone_number || "No phone listed"}
        Hours: ${props.hours_of_operation ? JSON.stringify(props.hours_of_operation) : "Contact for hours"}
        Age Range: ${props.age || "Not specified"}
        Cost: ${props.cost || "Contact for pricing"}
        Equipment: ${props.equipment || "Various maker equipment"}
        AI Services: ${props.ai ? "Yes" : "No"}
        Sustainability Focus: ${props.sustainability ? "Yes" : "No"}
        Guidance Available: ${props.guidance || "Contact for details"}
        Training Required: ${props.training_required || "Contact for details"}
        Difficulty Level: ${props.difficulty_level || "Various levels"}
        Website: ${props.website || "No website listed"}
        Additional Notes: ${props.notes || "No additional notes"}
        ---`;
      })
      .join("\n");
    
    return makerspaceText;
  } catch (error) {
    console.error('Error in fetchMakerspaces:', error);
    return null;
  }
};

// Ask a question
const handleChatMessage = async (req, res) => {
  try {
    const { message, user_metadata } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    // Fetch makerspaces from Supabase instead of receiving from frontend
    console.log('Fetching makerspaces from Supabase...');
    const makerspaces = await fetchMakerspaces();
    
    if (!makerspaces) {
      console.warn('Failed to fetch makerspaces, proceeding without data');
    } else {
      console.log('Successfully fetched makerspaces data, length:', makerspaces.length);
    }

    // Build personalization context
    let personalizationContext = '';
    if (user_metadata?.custom_instructions) {
      personalizationContext += `\n\nUSER'S CUSTOM INSTRUCTIONS:\n${user_metadata.custom_instructions}\n`;
    }
    if (user_metadata?.about_you) {
      personalizationContext += `\nABOUT THE USER:\n${user_metadata.about_you}\n`;
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
    ${makerspaces || "No makerspaces data available"}
    ${personalizationContext}

    RESPONSE STRUCTURE:
    1. Start with **Recommended Locations** section
    2. Use numbered lists for main steps/categories
    3. Use bullet points for sub-items
    4. Only bold makerspace names and safety warnings
    5. Include practical trip planning advice
    6. Verify all information against the database

    WEBSITE LINK FORMATTING:
    - When mentioning websites, always format them as complete URLs starting with https://
    - Links should always be the actual website link found online
    - Never use shortened text like "visit their website" - always include the actual URL`;

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
      throw new Error(
        `OpenAI API error: ${response.status} - ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      res.json({ response: data.choices[0].message.content });
    } else {
      throw new Error("Invalid OpenAI response structure");
    }
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      response:
        "I'm having trouble processing your request right now. Please try again later.",
    });
  }
};

// Save a message
const saveMessage = async (req, res) => {
  try {
    const { conversation_id, type, content } = req.body;
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ 
        conversation_id, 
        type, 
        content 
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get conversation history
const getConversation = async (req, res) => {
  try {
    const { conversation_id } = req.params;
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new conversation OR get existing one
const createConversation = async (req, res) => {
  try {
    const { user_id, title = 'Makerspace Chat' } = req.body;
    
    console.log('Getting or creating conversation for user:', user_id);
    
    // First, try to get existing conversation
    const { data: existingConversation, error: selectError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user_id)
      .single();
    
    // If conversation exists, return it
    if (!selectError && existingConversation) {
      console.log('Found existing conversation:', existingConversation.id);
      res.json(existingConversation);
      return;
    }
    
    // If no conversation exists (selectError will be present), create new one
    console.log('No existing conversation found, creating new one...');
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ 
        user_id, 
        title 
      })
      .select()
      .single();
    
    if (error) {
      // If insert fails due to unique constraint violation, try to get the conversation again
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        console.log('Unique constraint violation, getting existing conversation...');
        
        const { data: retryConversation, error: retryError } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('user_id', user_id)
          .single();
        
        if (!retryError && retryConversation) {
          console.log('Found conversation after constraint violation:', retryConversation.id);
          res.json(retryConversation);
          return;
        }
      }
      
      console.error('Create conversation error:', error);
      throw error;
    }
    
    console.log('Created new conversation:', data.id);
    res.json(data);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user's conversations
const getConversations = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  handleChatMessage,
  saveMessage,
  getConversation,
  createConversation,
  getConversations
};
