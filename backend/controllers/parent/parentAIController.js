import Child from '../../models/Child.js';
import logger from '../../utils/logger.js';

export const getAIAdvice = async (req, res) => {
  try {
    const { message, childInfo: _childInfo } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
    }

    // Get parent's children info for context
    const children = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'specialNeeds'],
      limit: 1,
    });

    const child = children.length > 0 ? children[0] : null;

    // Prepare context for AI
    const context = {
      parentName: `${req.user.firstName} ${req.user.lastName}`,
      child: child ? {
        name: `${child.firstName} ${child.lastName}`,
        age: child.dateOfBirth ? Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        gender: child.gender,
        disabilityType: child.disabilityType,
        specialNeeds: child.specialNeeds,
      } : null,
      message: message.trim(),
    };

    // Determine preferred language from headers (fallback to en)
    const acceptLanguage = req.headers['accept-language'] || '';
    const requestedLang = (req.body?.lang || '').toLowerCase();
    const langCode = (requestedLang || acceptLanguage.split(',')[0]?.split('-')[0] || 'en').toLowerCase();
    const languageName = {
      uz: 'Uzbek',
      ru: 'Russian',
      en: 'English',
    }[langCode] || 'English';

    // Build prompts once (used for primary call and free-model fallback)
    const systemPrompt = `You are a helpful, conversational AI assistant specialized in providing advice to parents of children with special needs and disabilities.
You provide practical, empathetic, and evidence-based advice about:
- How to care for children with disabilities at home
- Daily routines and activities
- Nutrition and meal planning
- Communication strategies
- Behavioral support
- Emotional support for both children and parents
- Safety considerations
- Educational activities at home

Always respond in a warm, supportive, and professional manner. If the parent mentions their child's specific disability type or special needs, incorporate that into your advice.
Keep responses concise (2-4 sentences) in ${languageName}. You may ask one brief follow-up question if it helps clarify, but stay short. Do not switch languages. If ${languageName} is Russian, respond in Cyrillic Russian. If ${languageName} is Uzbek, respond in Uzbek. Never answer in English unless ${languageName} is English.`;

    const userPrompt = child
      ? `Parent: ${context.parentName}
Child: ${context.child.name} (${context.child.age} years old, ${context.child.gender})
Disability Type: ${context.child.disabilityType || 'Not specified'}
Special Needs: ${context.child.specialNeeds || 'None specified'}

Parent's Question: ${context.message}

Please provide helpful, practical advice.`
      : `Parent: ${context.parentName}

Parent's Question: ${context.message}

Please provide helpful, practical advice about caring for children with special needs.`;

    // Build chat history (if provided) to enable conversation
    const incomingMessages = Array.isArray(req.body?.messages) ? req.body.messages : null;
    const sanitizedHistory = (incomingMessages || [])
      .filter(m => m && m.role && m.content)
      .slice(-8) // keep last 8 exchanges
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 4000), // guard length
      }));

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...(sanitizedHistory.length
        ? sanitizedHistory
        : [{ role: 'user', content: userPrompt }]),
    ];

    // Try to use OpenAI/OpenRouter API if available
    let aiResponse;
    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
    const isOpenRouter = process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes('openrouter.ai');

    logger.info('AI chat request', {
      parentId: req.user.id,
      hasOpenAIKey,
      isOpenRouter,
      messageLength: message.trim().length,
    });

    if (hasOpenAIKey) {
      try {
        const OpenAI = (await import('openai')).default;
        const openaiConfig = {
          apiKey: process.env.OPENAI_API_KEY,
        };

        // If OpenRouter base URL is provided, use it
        if (isOpenRouter) {
          openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
          // OpenRouter requires HTTP headers
          openaiConfig.defaultHeaders = {
            'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production-2d8a.up.railway.app',
            'X-Title': 'Uchqun Parent Portal',
          };
        }

        const openai = new OpenAI(openaiConfig);

        // Determine model to use
        let modelToUse = process.env.OPENAI_MODEL;

        // If using OpenRouter and no specific model set, use a free model
        if (isOpenRouter && !modelToUse) {
          // Try free models available on OpenRouter
          modelToUse = 'qwen/qwen-2.5-7b-instruct:free';
        }

        const completion = await openai.chat.completions.create({
          model: modelToUse,
          messages: openaiMessages,
          temperature: 0.7,
          max_tokens: 500,
        });

        aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

        logger.info('OpenAI API response generated successfully', {
          parentId: req.user.id,
          messageLength: context.message.length,
          responseLength: aiResponse.length,
          model: modelToUse,
        });
      } catch (openaiError) {
        logger.error('OpenAI API error', {
          error: openaiError.message,
          stack: openaiError.stack,
          parentId: req.user.id,
          isOpenRouter,
        });

        // If OpenRouter and insufficient credits or model not found, try to get available models
        if (isOpenRouter && (openaiError.message.includes('402') || openaiError.message.includes('404') || openaiError.message.includes('credits'))) {
          // Try to fetch available models from OpenRouter API
          try {
            logger.info('Fetching available models from OpenRouter');
            const response = await fetch('https://openrouter.ai/api/v1/models', {
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production-2d8a.up.railway.app',
                'X-Title': 'Uchqun Parent Portal',
              },
            });

            if (response.ok) {
              const modelsData = await response.json();
              const freeModels = modelsData.data
                ?.filter(model => model.pricing?.prompt === '0' || model.id.includes(':free'))
                ?.map(model => model.id)
                ?.slice(0, 5) || [];

              logger.info(`Found ${freeModels.length} free models on OpenRouter`, { models: freeModels });

              // Try free models
              for (const freeModel of freeModels) {
                try {
                  logger.info(`Trying free OpenRouter model: ${freeModel}`);
                  const OpenAI = (await import('openai')).default;
                  const openaiFree = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                    baseURL: process.env.OPENAI_BASE_URL,
                    defaultHeaders: {
                      'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production-2d8a.up.railway.app',
                      'X-Title': 'Uchqun Parent Portal',
                    },
                  });

                  const freeCompletion = await openaiFree.chat.completions.create({
                    model: freeModel,
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_tokens: 500,
                  });

                  aiResponse = freeCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

                  logger.info('Free OpenRouter model response generated successfully', {
                    parentId: req.user.id,
                    responseLength: aiResponse.length,
                    model: freeModel,
                  });
                  break; // Success, exit loop
                } catch (freeModelError) {
                  logger.warn(`Free model ${freeModel} failed`, {
                    error: freeModelError.message,
                  });
                  // Continue to next model
                }
              }

              // If no free models worked, use fallback
              if (!aiResponse || aiResponse === 'I apologize, but I could not generate a response. Please try again.') {
                logger.warn('No free models worked, using fallback');
                aiResponse = generateFallbackResponse(context);
              }
            } else {
              logger.warn('Could not fetch OpenRouter models, using fallback');
              aiResponse = generateFallbackResponse(context);
            }
          } catch (fetchError) {
            logger.error('Error fetching OpenRouter models', { error: fetchError.message });
            // Fallback to rule-based response
            aiResponse = generateFallbackResponse(context);
          }
        } else {
          // Fallback to rule-based response
          aiResponse = generateFallbackResponse(context);
        }
      }
    } else {
      // Fallback to rule-based response if OpenAI is not configured
      aiResponse = generateFallbackResponse(context);
    }

    res.json({
      success: true,
      data: {
        message: context.message,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get AI advice error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get AI advice' });
  }
};

/**
 * Generate fallback response when OpenAI is not available
 */
function generateFallbackResponse(context) {
  const message = context.message.toLowerCase();
  const _child = context.child;

  // Basic keyword-based responses
  if (message.includes('uy') || message.includes('home') || message.includes('qanday qarash') || message.includes('care')) {
    return `Uyda bolangizni parvarish qilish uchun quyidagi maslahatlarni amalga oshirishingiz mumkin:

1. **Kun tartibi yarating**: Har kuni bir xil vaqtda uyg'onish, ovqatlanish va uxlash vaqtlarini belgilang. Bu bolangizga tushunish va kutilishni o'rgatadi.

2. **Xavfsiz muhit yarating**: Uy atrofida xavfsizlikni ta'minlang - burchaklar, o'tkir narsalar va xavfli materiallarni olib tashlang.

3. **Muloqotni rag'batlantiring**: Bolangiz bilan muntazam ravishda gaplashing, ertak o'qing va qo'shiq aytib bering. Bu til rivojlanishiga yordam beradi.

4. **Faol o'yinlar**: Bolangizning yoshiga va qobiliyatlariga mos o'yinlar va mashg'ulotlar tashkil qiling.

5. **Sabr va muhabbat**: Eng muhimi - bolangizga sabr va muhabbat bilan yondashing. Har bir kichik yutuqni nishonlang.

Agar bolangizning maxsus ehtiyojlari bo'lsa, ularni hisobga oling va tegishli mutaxassislar bilan maslahatlashing.`;
  }

  if (message.includes('nogiron') || message.includes('disability') || message.includes('maxsus')) {
    return `Nogironligi bor bolani parvarish qilishda quyidagilarni yodda tuting:

1. **Individual yondashuv**: Har bir bola boshqacha, shuning uchun bolangizning ehtiyojlariga mos yondashuvni toping.

2. **Professional yordam**: Mutaxassislar (logoped, psixolog, fizioterapevt) bilan muntazam aloqada bo'ling.

3. **Mashg'ulotlar**: Uyda professional tavsiyalar asosida mashg'ulotlar o'tkazing.

4. **Oilaviy qo'llab-quvvatlash**: Barcha oila a'zolari bolangizni qo'llab-quvvatlashda ishtirok etishi kerak.

5. **O'z-o'ziga g'amxo'rlik**: O'zingizga ham vaqt ajrating - dam oling va qo'llab-quvvatlovchi oila a'zolari yoki do'stlar bilan aloqada bo'ling.

6. **Muvaffaqiyatlarni nishonlash**: Kichik yutuqlarni ham katta muvaffaqiyat sifatida qabul qiling.

Agar aniq savollaringiz bo'lsa, mutaxassislar bilan maslahatlashing.`;
  }

  if (message.includes('ovqat') || message.includes('meal') || message.includes('nutrition') || message.includes('parvarish')) {
    return `Bolangizning ovqatlanishi uchun maslahatlar:

1. **Muntazam ovqatlanish**: Kuniga 3-4 marta muntazam ovqat berish bolangizning sog'lig'i uchun muhim.

2. **Balanslangan ovqat**: Meva, sabzavot, protein va karbohidratlarni muvozanatlashtiring.

3. **Maxsus ehtiyojlar**: Agar bolangizning allergiyasi yoki maxsus dietasi bo'lsa, uni qat'iy rioya qiling.

4. **Sabr**: Ba'zi bolalar ovqatlanishda qiyinchiliklarga duch kelishi mumkin. Sabr bilan yondashing.

5. **Ijodkorlik**: Ovqatni qiziqarli va jozibali qilib taqdim eting - rangli idishlar, qiziqarli shakllar.

Agar ovqatlanish bilan bog'liq muammolaringiz bo'lsa, dietolog yoki pediatr bilan maslahatlashing.`;
  }

  // Default response
  return `Rahmat, savolingizni qabul qildim. Bolangizni uyda parvarish qilish haqida quyidagi umumiy maslahatlarni berishim mumkin:

1. **Muntazam kun tartibi**: Har kuni bir xil vaqtda uyg'onish, ovqatlanish va uxlash vaqtlarini belgilang.

2. **Xavfsiz muhit**: Uy atrofida xavfsizlikni ta'minlang va bolangizning yoshiga mos o'yinchoqlar va materiallar tayyorlang.

3. **Muloqot va o'yin**: Bolangiz bilan muntazam ravishda gaplashing, ertak o'qing va o'yinlar o'tkazing.

4. **Professional yordam**: Mutaxassislar bilan muntazam aloqada bo'ling va ularning tavsiyalarini amalga oshiring.

5. **Sabr va muhabbat**: Eng muhimi - bolangizga sabr va muhabbat bilan yondashing.

Agar aniq savollaringiz bo'lsa, iltimos, batafsilroq yozing va men sizga yanada aniq maslahat beraman.`;
}
