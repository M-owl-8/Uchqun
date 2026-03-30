import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import tokens from '../../styles/tokens';
import { ListRow } from '../common/ListRow';

export function ChildRow({ child, selected, onPress }) {
  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} years old`;
  };

  const initials = `${child.firstName?.charAt(0) || ''}${child.lastName?.charAt(0) || ''}`;
  const age = getAge(child.dateOfBirth);

  const avatar = (
    <View style={styles.avatar} accessibilityLabel={`Avatar for ${child.firstName}`}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );

  return (
    <ListRow
      title={`${child.firstName || ''} ${child.lastName || ''}`}
      subtitle={age}
      leading={avatar}
      onPress={onPress}
      selected={selected}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 50,
    height: 50,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.accent.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.accent.blue,
  },
});
