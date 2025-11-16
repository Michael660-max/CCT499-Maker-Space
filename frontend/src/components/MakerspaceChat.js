import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { apiRequest, API_URL } from "../config/api";

const MakerspaceChat = ({ makerspaces = [] }) => {
  const { user } = useAuth();
  
  // Check if chat is enabled for this user
  const chatEnabled = user?.user_metadata?.chat_enabled !== false;
  
  // Debug logging for production
  useEffect(() => {
    console.log('MakerspaceChat - Environment:', process.env.NODE_ENV);
    console.log('MakerspaceChat - API URL:', API_URL);
    console.log('MakerspaceChat - Enabled:', chatEnabled);
  }, [chatEnabled]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content:
        '👋 Hi! I can help you with makerspace questions like "Create me a lesson plan using sewing machines and a Toronto makerspace, for kids" or "Where can I learn 3D printing in Toronto?"',
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  const [conversationId, setConversationId] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const conversationInitialized = useRef(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const loadConversationMessages = async (convId, token) => {
      try {
        console.log('Loading conversation messages for:', convId);
        console.log('Using API URL:', API_URL);
        console.log('MakerspaceChat - Environment:', process.env.NODE_ENV);

        
        const response = await apiRequest(`/api/chat/conversation/${convId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('Conversation messages response status:', response.status);

        if (response.ok) {
          const existingMessages = await response.json();
          if (existingMessages && existingMessages.length > 0) {
            // Convert database messages to component format
            const formattedMessages = existingMessages.map(msg => ({
              type: msg.type,
              content: msg.content
            }));
            
            // Keep the initial welcome message and add existing messages
            setMessages(prev => [
              prev[0], // Keep welcome message
              ...formattedMessages
            ]);
            
            console.log('Loaded', existingMessages.length, 'existing messages');
            
            // Scroll to bottom after setting messages
            setTimeout(() => scrollToBottom(), 100);
          }
        } else {
          console.error('Failed to load conversation messages:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to load conversation messages:', error);
      }
    };

    const getOrCreateConversation = async () => {
      if (conversationLoading || conversationInitialized.current) return; // Prevent multiple calls
      
      conversationInitialized.current = true;
      setConversationLoading(true);
      
      try {
        const token = await supabase.auth.getSession();
        
        console.log('Getting or creating conversation for user:', user.id);
        console.log('Using API URL:', API_URL);
        
        const response = await apiRequest("/api/chat/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.data.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            title: 'Makerspace Chat'
          }),
        });

        console.log('Get/create conversation response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          setConversationId(data.id);
          console.log('Using conversation:', data.id);
          
          // Load existing messages if this is an existing conversation
          await loadConversationMessages(data.id, token.data.session?.access_token);
          
          // Scroll to bottom after loading messages
          setTimeout(() => scrollToBottom(), 100);
        } else {
          const errorData = await response.text();
          console.error('Failed to get/create conversation:', response.status, response.statusText, errorData);
          conversationInitialized.current = false; // Reset on failure
        }
      } catch (error) {
        console.error('Failed to get/create conversation:', error);
        conversationInitialized.current = false; // Reset on error
      } finally {
        setConversationLoading(false);
      }
    };

    if (user && !conversationId && !conversationLoading) {
      getOrCreateConversation();
    }
  }, [user, conversationId, conversationLoading]);

  // Format message content to handle markdown-like formatting
  const formatMessageContent = (content) => {
    let formatted = content.trim().replace(/\r\n/g, "\n");

    // Convert **text** to bold (only for makerspace names and safety warnings)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Convert bullet points with various formats (•, -, *) to proper HTML
    formatted = formatted.replace(
      /^[\s]*[•\-*]\s*(.+)$/gm,
      '<div class="bullet-item">• $1</div>'
    );

    // Convert URLs to clickable links - let ChatGPT provide the URLs naturally
    formatted = formatted.replace(/(https?:\/\/[^\s<>]+)/g, (url) => {
      // Clean up the URL (remove trailing punctuation that might not be part of URL)
      const cleanUrl = url.replace(/[.,;:!?]$/, "");
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline break-all" style="word-break: break-all; overflow-wrap: break-word;">${cleanUrl}</a>`;
    });

    // Handle line breaks
    formatted = formatted.replace(/\n\s*\n/g, "<br><br>");

    // Clean up any excessive <br> tags
    formatted = formatted.replace(/(<br>\s*){3,}/g, "<br><br>");

    return formatted;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setMessages((prev) => [...prev, { type: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Get the auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Sending message to chat API');
      console.log('Using API URL:', API_URL);
      console.log('User token available:', !!token);

      const response = await apiRequest("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: userMessage,
          user_metadata: {
            custom_instructions: user?.user_metadata?.custom_instructions,
            about_you: user?.user_metadata?.about_you,
          },
        }),
      });

      console.log('Chat API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Chat API error:', response.status, response.statusText, errorData);
        throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Chat API response:', data);

      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content:
            data.response || "Sorry, I had trouble processing that request.",
        },
      ]);

      if (user && conversationId && token) {
        console.log('Saving messages for conversation:', conversationId);
        
        // Save user message
        try {
          const userSaveResponse = await apiRequest("/api/chat/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversation_id: conversationId,
              type: "user",
              content: userMessage,
            }),
          });

          if (!userSaveResponse.ok) {
            const errorData = await userSaveResponse.json();
            console.error('Failed to save user message:', errorData);
          } else {
            const savedUser = await userSaveResponse.json();
            console.log('User message saved:', savedUser);
          }
        } catch (error) {
          console.error('Error saving user message:', error);
        }

        // Save bot response
        try {
          const botSaveResponse = await apiRequest("/api/chat/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              conversation_id: conversationId,
              type: "bot",
              content: data.response,
            }),
          });

          if (!botSaveResponse.ok) {
            const errorData = await botSaveResponse.json();
            console.error('Failed to save bot message:', errorData);
          } else {
            const savedBot = await botSaveResponse.json();
            console.log('Bot message saved:', savedBot);
          }
        } catch (error) {
          console.error('Error saving bot message:', error);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Don't render chat if disabled in user settings
  if (!chatEnabled) {
    return null;
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <span className="text-xl text-gray-600">{isOpen ? "✕" : "💬"}</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 bg-white rounded-3xl shadow-2xl border border-gray-100 z-40 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? "w-[750px] h-[80vh] max-w-[95vw]"
              : "w-96 max-w-[90vw] h-[80vh]"
          }`}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-100 shadow-sm z-10 flex items-center justify-between">
            <h3 className="text-m font-medium text-gray-900">
              Ask Me Anything About Makerspaces
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label={isExpanded ? "Minimize chat" : "Expand chat"}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {isExpanded ? (
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex text-left ${
                  message.type === "user" && "justify-end"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800 shadow-sm border border-gray-100"
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed formatted-content"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      maxWidth: "100%",
                    }}
                    dangerouslySetInnerHTML={{
                      __html:
                        message.type === "bot"
                          ? formatMessageContent(message.content)
                          : message.content,
                    }}
                  />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-white">
            {messages.length <= 1 && (
              <div className="flex items-center justify-center mb-3">
                <span className="text-xs text-gray-400 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-gray-300 mr-2"></span>
                  Powered by OpenAI
                </span>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center space-x-3 bg-gray-50 rounded-2xl p-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message..."
                className="flex-1 px-3 py-2 bg-transparent text-sm placeholder-gray-400 focus:outline-none"
                disabled={isLoading}
                maxLength={500}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MakerspaceChat;
