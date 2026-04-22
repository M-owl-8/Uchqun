import React from 'react';
import { useNavigation } from '@react-navigation/native';
import FloatingAIButton from './floating-ai/FloatingAIButton';

export default function FloatingAI() {
  const navigation = useNavigation();

  return (
    <FloatingAIButton onPress={() => navigation.navigate('AIChat')} />
  );
}
