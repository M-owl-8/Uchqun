import { validationResult } from 'express-validator';
import { sendMessageValidator, markReadValidator } from '../validators/chatValidator.js';

const runValidators = async (validators, body) => {
  const req = { body };
  for (const v of validators) {
    await v.run(req);
  }
  return validationResult(req);
};

describe('chatValidator — conversationId format (V5-CRIT-01)', () => {
  it('sendMessageValidator accepts parent:UUID conversationId (V5-CRIT-01)', async () => {
    const result = await runValidators(sendMessageValidator, {
      conversationId: 'parent:550e8400-e29b-41d4-a716-446655440000',
      content: 'hello',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('markReadValidator accepts parent:UUID conversationId (V5-CRIT-01)', async () => {
    const result = await runValidators(markReadValidator, {
      conversationId: 'parent:550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('sendMessageValidator rejects bare UUID (not the DB format)', async () => {
    const result = await runValidators(sendMessageValidator, {
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'hello',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('sendMessageValidator rejects empty conversationId', async () => {
    const result = await runValidators(sendMessageValidator, {
      conversationId: '',
      content: 'hello',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('sendMessageValidator rejects missing content', async () => {
    const result = await runValidators(sendMessageValidator, {
      conversationId: 'parent:550e8400-e29b-41d4-a716-446655440000',
      content: '',
    });
    expect(result.isEmpty()).toBe(false);
  });

  it('sendMessageValidator rejects content over 10000 chars', async () => {
    const result = await runValidators(sendMessageValidator, {
      conversationId: 'parent:550e8400-e29b-41d4-a716-446655440000',
      content: 'x'.repeat(10001),
    });
    expect(result.isEmpty()).toBe(false);
  });
});
