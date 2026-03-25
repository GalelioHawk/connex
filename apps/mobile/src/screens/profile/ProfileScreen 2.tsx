import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth';
import { useTheme } from '../../hooks/useTheme';

export default function ProfileScreen() {
  const user      = useAuthStore((s) => s.user);
  const token     = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { colors } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (token) await authService.logout(token);
    } catch {
      // Best-effort logout; local session should still be cleared.
    } finally {
      clearAuth();
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.background} />
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>Profile</Text>
      </View>

      <View style={s.body}>
        <View style={[s.avatar, { backgroundColor: colors.avatarBg }]}>
          <Text style={s.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={[s.name, { color: colors.text }]}>{user?.name ?? 'User'}</Text>
        <Text style={[s.phone, { color: colors.textSecondary }]}>{user?.phone ?? ''}</Text>

        <TouchableOpacity
          style={[s.signOut, { borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.85}
          disabled={signingOut}
        >
          {signingOut
            ? <ActivityIndicator color={colors.text} />
            : <Text style={[s.signOutText, { color: colors.text }]}>Sign out</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title:       { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  body:        { flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 28, gap: 8 },
  avatar:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText:  { color: '#fff', fontSize: 32, fontWeight: '900' },
  name:        { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  phone:       { fontSize: 15 },
  signOut:     { marginTop: 32, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { fontSize: 15, fontWeight: '700' },
});
