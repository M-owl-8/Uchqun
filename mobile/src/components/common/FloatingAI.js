import React, { useState } from 'react';
import FloatingAIButton from './floating-ai/FloatingAIButton';
import AIChatModal from './floating-ai/AIChatModal';

export default function FloatingAI({ contextHint = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <FloatingAIButton onPress={() => setIsOpen(true)} />
      <AIChatModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        contextHint={contextHint}
      />
    </>
  );
}
