import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ElearningScreen from './src/screens/ElearningScreen';
import PlannerScreen from './src/screens/PlannerScreen';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('elearning'); // 'elearning' | 'planner'
  const userEmail = 'if24.hayyandapratama@mhs.ubpkarawang.ac.id';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {activeMenu === 'elearning' ? (
          <ElearningScreen />
        ) : (
          <PlannerScreen email={userEmail} />
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveMenu('elearning')}
        >
          <Ionicons
            name={activeMenu === 'elearning' ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={22}
            color={activeMenu === 'elearning' ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.navText, activeMenu === 'elearning' && styles.navTextActive]}>
            Auto-Absen
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveMenu('planner')}
        >
          <Ionicons
            name={activeMenu === 'planner' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={activeMenu === 'planner' ? '#2563EB' : '#64748B'}
          />
          <Text style={[styles.navText, activeMenu === 'planner' && styles.navTextActive]}>
            Jadwal & Tugas
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  navTextActive: { color: '#2563EB' }
});