import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import { useToast } from '../../shared/context/ToastContext';

const AIChat = () => {
  const { t, i18n } = useTranslation();
  const { error: showErrorToast } = useToast();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('aiChat.welcomeMessage') || "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const historyForRequest = [...messages, newUserMessage].slice(-8);
      const response = await api.post('/parent/ai/chat', {
        message: userMessage,
        lang: i18n.language,
        messages: historyForRequest.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      });

      if (response.data.success) {
        const aiMessage = {
          role: 'assistant',
          content: response.data.data.response,
          timestamp: response.data.data.timestamp,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: t('aiChat.errorMessage') || 'I apologize, but I encountered an error. Please try again in a moment.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showErrorToast(t('aiChat.errorToast') || 'Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary-500 to-primary-400 rounded-2xl p-6 md:p-8 shadow-xl border-0">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-6 h-6 text-white" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {t('aiChat.title') || 'AI Assistant'}
          </h1>
        </div>
        <p className="text-white/90 text-sm md:text-base">
          {t('aiChat.subtitle') || 'Get advice on caring for your child at home'}
        </p>
      </Card>

      {/* Chat Container */}
      <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[420px] md:h-auto md:min-h-[500px] -mb-16 lg:mb-0 bg-white/95 backdrop-blur-sm shadow-xl">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-white/50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm md:text-base whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === 'user'
                      ? 'text-primary-100'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('aiChat.inputPlaceholder') || 'Ask a question about caring for your child...'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-12 h-12 inline-flex items-center justify-center bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              aria-label={t('aiChat.send') || 'Send'}
              title={t('aiChat.send') || 'Send'}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {t('aiChat.footer') || 'AI responses are for informational purposes only.'}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AIChat;

