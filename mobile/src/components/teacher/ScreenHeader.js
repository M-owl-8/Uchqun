// Thin wrapper preserving the teacher-specific default of showBack=true.
// The common ScreenHeader defaults showBack=false (for dashboard screens).
import React from 'react';
import { ScreenHeader as CommonScreenHeader } from '../common/ScreenHeader';

export function ScreenHeader({ showBack = true, ...props }) {
  return <CommonScreenHeader showBack={showBack} {...props} />;
}
