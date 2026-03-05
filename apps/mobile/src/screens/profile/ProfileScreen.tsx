import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const user      = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <View style={s.body}>
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={s.name}>{user?.name ?? 'User'}</Text>
        <Text style={s.phone}>{user?.phone ?? ''}</Text>

        {/* Sign out */}
        <TouchableOpacity style={s.signOut} onPress={clearAuth} activeOpacity={0.85}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#111111' },
  header:       { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  title:        { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 },
  body:         { flex: 1, alignItems: 'center', paddingTop: 48, paddingHorizontal: 28, gap: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText:   { color: '#fff', fontSize: 32, fontWeight: '900' },
  name:         { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  phone:        { fontSize: 15, color: '#8E8E93' },
  signOut:      { marginTop: 32, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, borderWidth: 1.5, borderColor: '#2C2C2E' },
  signOutText:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
