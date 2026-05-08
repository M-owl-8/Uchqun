import logger from '../utils/logger.js';

export const getAIAdvice = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const requestedLang = (req.body?.lang || '').toLowerCase();
    const acceptLanguage = req.headers['accept-language'] || '';
    const langCode = (requestedLang || acceptLanguage.split(',')[0]?.split('-')[0] || 'en').toLowerCase();
    const languageName = { uz: 'Uzbek', ru: 'Russian', en: 'English' }[langCode] || 'English';

    const systemPrompt = `You are a helpful AI assistant specialized in supporting teachers who work with children with special needs and disabilities.
You provide practical, empathetic, and evidence-based advice about:
- Teaching strategies for children with special needs
- Classroom management techniques
- Individual education plans (IEPs)
- Communication with parents
- Activity planning and adaptation
- Behavioral support strategies
- Progress tracking and assessment
- Self-care and teacher wellbeing

Always respond in a warm, supportive, and professional manner.
Keep responses concise (2-4 sentences) in ${languageName}. If ${languageName} is Russian, respond in Cyrillic Russian. If ${languageName} is Uzbek, respond in Uzbek. Never answer in English unless ${languageName} is English.`;

    const userPrompt = `Teacher: ${req.user.firstName} ${req.user.lastName}

Question: ${message.trim()}

Please provide helpful, practical advice.`;

    const incomingMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const sanitizedHistory = incomingMessages
      .filter(m => m && m.role && m.content)
      .slice(-8)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) }));

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...(sanitizedHistory.length ? sanitizedHistory : [{ role: 'user', content: userPrompt }]),
    ];

    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
    if (!hasOpenAIKey) return res.status(503).json({ error: 'AI service is not configured' });

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });

    const chatCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: openaiMessages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiMessage = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ success: true, response: aiMessage, usage: chatCompletion.usage });
  } catch (error) {
    logger.error('Teacher AI chat error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get AI response' });
  }
};
