import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { parentService } from '../../services/parentService';
import tokens from '../../styles/tokens';
import Screen from '../../components/layout/Screen';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

export function ParentsListScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);

  // Get parent navigator to access stack screens
  const parentNavigation = navigation?.getParent?.();

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const data = await parentService.getChildren();
      setChildren(Array.isArray(data) ? data : []);
    } catch (error) {
      if (__DEV__) console.error('Error loading children:', error);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to navigate to stack screens safely
  const navigateToChildProfile = (childId) => {
    try {
      if (!childId) {
        if (__DEV__) console.error('[ParentsListScreen] Invalid childId');
        return;
      }
      if (parentNavigation) {
        parentNavigation.navigate('ChildProfile', { childId });
      } else {
        // Fallback: try direct navigation
        if (navigation?.navigate) {
          navigation.navigate('ChildProfile', { childId });
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Navigation error to ChildProfile:', error);
    }
  };

  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
    return `${age} years old`;
  };

  const header = (
    <View style={styles.topBar}>
      <View style={styles.placeholder} />
      <Text style={styles.topBarTitle} allowFontScaling={true}>My Children</Text>
      <View style={styles.placeholder} />
    </View>
  );

  return (
    <Screen scroll={true} padded={true} header={header}>
      {loading ? (
        <>
          <Card style={styles.card}>
            <Skeleton width="100%" height={80} />
          </Card>
          <Card style={styles.card}>
            <Skeleton width="100%" height={80} />
          </Card>
        </>
      ) : children.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="people-outline"
            title="No children found"
            description="Contact your school to link your children to your account"
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {(Array.isArray(children) ? children : []).map((item) => {
            const initials = `${item.firstName?.charAt(0) || ''}${item.lastName?.charAt(0) || ''}`;
            const age = getAge(item.dateOfBirth);
            return (
              <Card key={item.id?.toString() || Math.random()} style={styles.card}>
                <Pressable
                  onPress={() => navigateToChildProfile(item.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <View style={styles.childContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName} allowFontScaling={true}>
                        {item.firstName} {item.lastName}
                      </Text>
                      {age && (
                        <Text style={styles.childAge} allowFontScaling={true}>
                          {age}
                        </Text>
                      )}
                    </View>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={tokens.colors.text.muted} 
                    />
                  </View>
                </Pressable>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.md,
    backgroundColor: 'transparent',
  },
  placeholder: {
    width: 44,
  },
  topBarTitle: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.type.h2.fontWeight,
    color: tokens.colors.text.primary,
  },
  list: {
    gap: tokens.space.md,
  },
  card: {
    marginBottom: tokens.space.sm,
  },
  emptyCard: {
    marginTop: tokens.space.xl,
  },
  pressed: {
    opacity: 0.7,
  },
  childContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: tokens.radius.pill,
    backgroundColor: `${tokens.colors.accent.blue}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  avatarText: {
    fontSize: tokens.type.h3.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.accent.blue,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.type.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs / 2,
  },
  childAge: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.type.sub.fontWeight,
    color: tokens.colors.text.secondary,
  },
});
