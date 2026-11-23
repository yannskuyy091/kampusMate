import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Ganti IP Wi-Fi laptop jika perlu saat testing di HP
const LOCAL_WIFI_IP = '192.168.18.95';
const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000/api/elearning'
    : `http://${LOCAL_WIFI_IP}:3000/api/elearning`;

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ElearningScreen() {
  const [email, setEmail] = useState('if24.hayyandapratama@mhs.ubpkarawang.ac.id');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [courses, setCourses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('courses');

  const [syncing, setSyncing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSavedCourses();
    fetchLogs();
  }, []);

  const fetchSavedCourses = async () => {
    if (!email) return;
    try {
      const res = await fetch(`${API_BASE_URL}/courses?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.success) setCourses(json.data);
    } catch (err) {
      console.log('Info koneksi backend:', err.message);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/logs`);
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.log('Gagal memuat log:', err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSavedCourses(), fetchLogs()]);
    setRefreshing(false);
  };

  const handleSyncAccount = async () => {
    if (!email || !password) {
      showAlert('Data Kurang', 'Masukkan email kampus dan password SIPT2 terlebih dahulu.');
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sync-courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();

      if (json.success) {
        showAlert('Berhasil Terhubung', `${json.total} mata kuliah berhasil disinkronkan!`);
        setPassword('');
        fetchSavedCourses();
      } else {
        showAlert('Gagal Sinkronisasi', json.message || 'Terjadi kesalahan saat login SSO.');
      }
    } catch (err) {
      showAlert('Koneksi Gagal', 'Pastikan server backend menyala di port 3000.');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleCourse = async (courseId, currentValue) => {
    const newValue = currentValue ? 0 : 1;
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, autoAbsenEnabled: newValue } : c))
    );

    try {
      await fetch(`${API_BASE_URL}/courses/${courseId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: Boolean(newValue) })
      });
    } catch (err) {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, autoAbsenEnabled: currentValue } : c))
      );
      showAlert('Error', 'Gagal memperbarui pengaturan mata kuliah.');
    }
  };

  const handleRunNow = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_BASE_URL}/run-now`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showAlert(
          'Bot Berjalan',
          'Worker auto-absen sedang mengecek semua mata kuliah aktif. Cek tab Riwayat Log dalam ~15 detik.'
        );
      }
    } catch (err) {
      showAlert('Error', 'Gagal memicu worker auto-absen.');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>KampusMate</Text>
          <Text style={styles.headerSubtitle}>Auto-Absen E-Learning UBP Karawang</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
            <Text style={styles.cardTitle}>Akun SSO SIPT2</Text>
          </View>
          <Text style={styles.helperText}>
            Kredensial dienkripsi dengan AES-256-GCM sebelum disimpan ke server.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email Kampus (@mhs.ubpkarawang.ac.id)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password SIPT2"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, syncing && styles.buttonDisabled]}
            onPress={handleSyncAccount}
            disabled={syncing}
          >
            {syncing ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryButtonText}>  Menembus SSO & Memindai Matkul...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Sinkronkan Mata Kuliah</Text>
            )}
          </TouchableOpacity>
        </View>

        {courses.length > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRunNow}
            disabled={triggering}
          >
            <Ionicons name="flash" size={18} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>
              {triggering ? 'Memicu Bot...' : 'Jalankan Cek Presensi Sekarang'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'courses' && styles.tabActive]}
            onPress={() => setActiveTab('courses')}
          >
            <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>
              Mata Kuliah ({courses.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'logs' && styles.tabActive]}
            onPress={() => {
              setActiveTab('logs');
              fetchLogs();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>
              Riwayat Log ({logs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'courses' ? (
          courses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Belum ada mata kuliah tersimpan. Masukkan password SIPT2 di atas lalu tekan Sinkronkan.
              </Text>
            </View>
          ) : (
            courses.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{course.courseName}</Text>
                  <Text style={styles.courseStatus}>
                    {course.autoAbsenEnabled ? '🟢 Auto-Absen Aktif' : '⚪ Nonaktif'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(course.autoAbsenEnabled)}
                  onValueChange={() => handleToggleCourse(course.id, course.autoAbsenEnabled)}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={course.autoAbsenEnabled ? '#2563EB' : '#F8FAFC'}
                />
              </View>
            ))
          )
        ) : logs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Belum ada riwayat pengecekan presensi.</Text>
          </View>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logCourse}>{log.course_name}</Text>
                <View
                  style={[
                    styles.badge,
                    log.status === 'SUCCESS'
                      ? styles.badgeSuccess
                      : log.status === 'ERROR'
                      ? styles.badgeError
                      : styles.badgeNeutral
                  ]}
                >
                  <Text style={styles.badgeText}>{log.status}</Text>
                </View>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              <Text style={styles.logTime}>{log.checked_at}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16, marginTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginLeft: 6 },
  helperText: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    marginBottom: 14
  },
  passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  eyeIcon: { paddingHorizontal: 12 },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingVertical: 11,
    marginBottom: 16
  },
  secondaryButtonText: { color: '#1D4ED8', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12
  },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A' },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  courseInfo: { flex: 1, paddingRight: 10 },
  courseName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  courseStatus: { fontSize: 12, color: '#64748B', marginTop: 4 },
  logCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logCourse: { fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeError: { backgroundColor: '#FEE2E2' },
  badgeNeutral: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  logMessage: { fontSize: 12, color: '#475569', marginBottom: 4 },
  logTime: { fontSize: 11, color: '#94A3B8' },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 13, lineHeight: 20 }
});