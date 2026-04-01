import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { teacherService } from '../../services/teacherService';
import Card from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import tokens from '../../styles/tokens';

export function ParentDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { parentId = null } = route?.params || {};
  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState(null);

  // Bottom nav height + safe area + padding
  const BOTTOM_NAV_HEIGHT = 75;
  const bottomPadding = BOTTOM_NAV_HEIGHT + insets.bottom + 16;

  if (!parentId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title={t('parentsPage.parentDetail', { defaultValue: 'Parent Detail' })} showBack />
        <View style={styles.content}>
          <Card>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.semantic.error} />
              <Text style={styles.errorText}>Missing parentId parameter</Text>
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    if (parentId) {
      loadParent();
    }
  }, [parentId]);

  const loadParent = async () => {
    try {
      setLoading(true);
      const data = await teacherService.getParentById(parentId);
      setParent(data);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading parent:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!parent) {
    return <EmptyState message={t('parentsPage.notFound', { defaultValue: 'Parent not found' })} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={`${parent.firstName ?? '\u2014'} ${parent.lastName ?? ''}`} showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Card style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {parent.firstName?.charAt(0)}
                {parent.lastName?.charAt(0)}
              </Text>
            </View>
            {parent.group && (
              <View style={styles.groupBadge}>
                <Ionicons name="school-outline" size={14} color={tokens.colors.accent.blue} />
                <Text style={styles.groupBadgeText}>{parent.group.name}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('parentsPage.parentInfo') || 'Parent Information'}</Text>

          {/* Name */}
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={18} color={tokens.colors.text.secondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.label}>{t('parentsPage.name') || 'Name'}</Text>
              <Text style={styles.value}>
                {parent.firstName ?? '\u2014'} {parent.lastName ?? ''}
              </Text>
            </View>
          </View>

          {/* Email */}
          {parent.email && (
            <TouchableOpacity style={styles.infoRow} onPress={() => handleEmail(parent.email)}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={18} color={tokens.colors.accent.blue} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.label}>{t('parentsPage.email') || 'Email'}</Text>
                <Text style={[styles.value, styles.linkValue]}>{parent.email}</Text>
              </View>
              <View style={styles.actionButton}>
                <Ionicons name="send-outline" size={16} color={tokens.colors.accent.blue} />
              </View>
            </TouchableOpacity>
          )}

          {/* Phone */}
          {parent.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={() => handleCall(parent.phone)}>
              <View style={styles.iconContainer}>
                <Ionicons name="call-outline" size={18} color={tokens.colors.semantic.success} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.label}>{t('parentsPage.phone') || 'Phone'}</Text>
                <Text style={[styles.value, styles.phoneValue]}>{parent.phone}</Text>
              </View>
              <View style={[styles.actionButton, styles.callActionButton]}>
                <Ionicons name="call" size={16} color={tokens.colors.text.white} />
              </View>
            </TouchableOpacity>
          )}

          {/* Address */}
          {parent.address && (
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="location-outline" size={18} color={tokens.colors.text.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.label}>{t('parentsPage.address') || 'Address'}</Text>
                <Text style={styles.value}>{parent.address}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Children Card */}
        {parent.children && Array.isArray(parent.children) && parent.children.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={tokens.colors.accent.blue} />
              <Text style={styles.sectionTitle}>{t('parentsPage.children') || 'Children'}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{parent.children.length}</Text>
              </View>
            </View>

            {parent.children.map((child, index) => (
              <TouchableOpacity
                key={child?.id || index}
                style={[styles.childItem, index < parent.children.length - 1 && styles.childItemBorder]}
                onPress={() => navigation.navigate('ChildProfile', { childId: child.id, childData: child })}
                activeOpacity={0.7}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {child.firstName?.charAt(0)}
                    {child.lastName?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.childContent}>
                  <Text style={styles.childName}>
                    {child.firstName ?? '\u2014'} {child.lastName ?? ''}
                  </Text>

                  {/* Child Details Grid */}
                  <View style={styles.childDetails}>
                    {child.dateOfBirth && (
                      <View style={styles.childDetailItem}>
                        <Ionicons name="calendar-outline" size={12} color={tokens.colors.text.secondary} />
                        <Text style={styles.childDetailText}>
                          {new Date(child.dateOfBirth).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {child.gender && (
                      <View style={styles.childDetailItem}>
                        <Ionicons
                          name={child.gender === 'male' ? 'male-outline' : 'female-outline'}
                          size={12}
                          color={tokens.colors.text.secondary}
                        />
                        <Text style={styles.childDetailText}>{child.gender}</Text>
                      </View>
                    )}

                    {child.school && (
                      <View style={styles.childDetailItem}>
                        <Ionicons name="school-outline" size={12} color={tokens.colors.text.secondary} />
                        <Text style={styles.childDetailText}>{child.school}</Text>
                      </View>
                    )}

                    {child.class && (
                      <View style={styles.childDetailItem}>
                        <Ionicons name="book-outline" size={12} color={tokens.colors.text.secondary} />
                        <Text style={styles.childDetailText}>{child.class}</Text>
                      </View>
                    )}

                    {child.teacher && (
                      <View style={styles.childDetailItem}>
                        <Ionicons name="person-outline" size={12} color={tokens.colors.text.secondary} />
                        <Text style={styles.childDetailText}>{child.teacher}</Text>
                      </View>
                    )}
                  </View>

                  {/* Disability Type */}
                  {child.disabilityType && (
                    <View style={styles.disabilityBadge}>
                      <Ionicons
                        name="medical-outline"
                        size={12}
                        color={tokens.colors.semantic.warning}
                      />
                      <Text style={styles.disabilityText}>{child.disabilityType}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={tokens.colors.text.muted} style={{ alignSelf: 'center' }} />
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background.primary,
  },
  content: {
    padding: tokens.space.xl,
  },
  card: {
    marginBottom: tokens.space.lg,
  },
  errorContainer: {
    padding: tokens.space.xl,
    alignItems: 'center',
  },
  errorText: {
    marginTop: tokens.space.md,
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.secondary,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.accent.blue + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.type.h2.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.accent.blue,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent[50],
    paddingHorizontal: tokens.space.md,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: tokens.space.sm,
    gap: 6,
  },
  groupBadgeText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.accent.blue,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.md,
    gap: tokens.space.sm,
  },
  sectionTitle: {
    fontSize: tokens.type.bodyLarge.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
    flex: 1,
  },
  countBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: tokens.type.sub.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.white,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.space.md,
    paddingBottom: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
    marginBottom: 2,
  },
  value: {
    fontSize: tokens.type.body.fontSize,
    color: tokens.colors.text.primary,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  linkValue: {
    color: tokens.colors.accent.blue,
  },
  phoneValue: {
    color: tokens.colors.semantic.success,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  callActionButton: {
    backgroundColor: tokens.colors.semantic.success,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: tokens.space.md,
  },
  childItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.light,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.space.md,
  },
  childAvatarText: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.accent.blue,
  },
  childContent: {
    flex: 1,
  },
  childName: {
    fontSize: tokens.type.body.fontSize,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
  },
  childDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  childDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childDetailText: {
    fontSize: tokens.type.sub.fontSize,
    color: tokens.colors.text.secondary,
  },
  disabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.semantic.warning + '15',
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: tokens.space.sm,
    gap: 4,
  },
  disabilityText: {
    fontSize: tokens.type.caption.fontSize,
    color: tokens.colors.semantic.warning,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
