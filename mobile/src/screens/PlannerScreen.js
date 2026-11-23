import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOCAL_WIFI_IP = '192.168.18.95';
const PLANNER_API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000/api/planner'
    : `http://${LOCAL_WIFI_IP}:3000/api/planner`;

const DAYS = [
  { id: 1, label: 'Sen' },
  { id: 2, label: 'Sel' },
  { id: 3, label: 'Rab' },
  { id: 4, label: 'Kam' },
  { id: 5, label: 'Jum' },
  { id: 6, label: 'Sab' }
];

const showAlert = (title, message) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export default function PlannerScreen({ email }) {
  const [subTab, setSubTab] = useState('schedules'); // 'schedules' | 'tasks'
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Form Jadwal
  const [courseName, setCourseName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:30');
  const [room, setRoom] = useState('');

  // Form Tugas
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourse, setTaskCourse] = useState('');
  const [dueDatetime, setDueDatetime] = useState('2026-11-25 23:59');

  useEffect(() => {
    if (email) {
      fetchSchedules();
      fetchTasks();
    }
  }, [email]);

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${PLANNER_API_URL}/schedules?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.success) setSchedules(json.data);
    } catch (e) {}
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${PLANNER_API_URL}/tasks?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } catch (e) {}
  };

  const handleAddSchedule = async () => {
    if (!courseName || !startTime || !endTime) {
      showAlert('Data Kurang', 'Isi nama mata kuliah, jam mulai, dan jam selesai.');
      return;
    }
    try {
      const res = await fetch(`${PLANNER_API_URL}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, courseName, dayOfWeek, startTime, endTime, room })
      });
      const json = await res.json();
      if (json.success) {
        setCourseName('');
        setRoom('');
        fetchSchedules();
      } else {
        showAlert('Gagal', json.message);
      }
    } catch (e) {
      showAlert('Error', 'Gagal menyimpan jadwal.');
    }
  };

  const handleDeleteSchedule = async (id) => {
    await fetch(`${PLANNER_API_URL}/schedules/${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  const handleAddTask = async () => {
    if (!taskTitle || !taskCourse || !dueDatetime) {
      showAlert('Data Kurang', 'Isi judul tugas, mata kuliah, dan batas waktu.');
      return;
    }
    try {
      const res = await fetch(`${PLANNER_API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, title: taskTitle, courseName: taskCourse, dueDatetime })
      });
      const json = await res.json();
      if (json.success) {
        setTaskTitle('');
        setTaskCourse('');
        fetchTasks();
      } else {
        showAlert('Gagal', json.message);
      }
    } catch (e) {
      showAlert('Error', 'Gagal menyimpan tugas.');
    }
  };

  const handleToggleTask = async (id, current) => {
    await fetch(`${PLANNER_API_URL}/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !current })
    });
    fetchTasks();
  };

  const handleDeleteTask = async (id) => {
    await fetch(`${PLANNER_API_URL}/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.switchRow}>
        <TouchableOpacity
          style={[styles.switchBtn, subTab === 'schedules' && styles.switchActive]}
          onPress={() => setSubTab('schedules')}
        >
          <Text style={[styles.switchText, subTab === 'schedules' && styles.switchTextActive]}>
            Jadwal Kuliah ({schedules.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, subTab === 'tasks' && styles.switchActive]}
          onPress={() => setSubTab('tasks')}
        >
          <Text style={[styles.switchText, subTab === 'tasks' && styles.switchTextActive]}>
            Daftar Tugas ({tasks.filter((t) => !t.is_completed).length})
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'schedules' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tambah Jadwal Kuliah</Text>
            <View style={styles.dayRow}>
              {DAYS.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.dayPill, dayOfWeek === d.id && styles.dayPillActive]}
                  onPress={() => setDayOfWeek(d.id)}
                >
                  <Text style={[styles.dayText, dayOfWeek === d.id && styles.dayTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nama Mata Kuliah (misal: Sistem Terdistribusi)"
              value={courseName}
              onChangeText={setCourseName}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 6 }]}
                placeholder="Mulai (08:00)"
                value={startTime}
                onChangeText={setStartTime}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 6 }]}
                placeholder="Selesai (10:30)"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ruangan / Link Zoom (misal: Gedung B - R.302)"
              value={room}
              onChangeText={setRoom}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddSchedule}>
              <Text style={styles.primaryBtnText}>+ Simpan Jadwal & Aktifkan Notif</Text>
            </TouchableOpacity>
          </View>

          {schedules.map((s) => (
            <View key={s.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.badgeDay}>
                  {DAYS.find((d) => d.id === s.day_of_week)?.label} • {s.start_time} - {s.end_time}
                </Text>
                <Text style={styles.itemTitle}>{s.course_name}</Text>
                <Text style={styles.itemSub}>📍 {s.room}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteSchedule(s.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tambah Pengingat Tugas</Text>
            <TextInput
              style={styles.input}
              placeholder="Judul Tugas (misal: Laporan KP Bab 3)"
              value={taskTitle}
              onChangeText={setTaskTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Mata Kuliah (misal: Manajemen Proyek)"
              value={taskCourse}
              onChangeText={setTaskCourse}
            />
            <TextInput
              style={styles.input}
              placeholder="Deadline (YYYY-MM-DD HH:MM)"
              value={dueDatetime}
              onChangeText={setDueDatetime}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddTask}>
              <Text style={styles.primaryBtnText}>+ Tambah Tugas</Text>
            </TouchableOpacity>
          </View>

          {tasks.map((t) => (
            <View key={t.id} style={styles.itemCard}>
              <TouchableOpacity
                onPress={() => handleToggleTask(t.id, t.is_completed)}
                style={{ marginRight: 12 }}
              >
                <Ionicons
                  name={t.is_completed ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={t.is_completed ? '#10B981' : '#64748B'}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.itemTitle,
                    t.is_completed && { textDecorationLine: 'line-through', color: '#94A3B8' }
                  ]}
                >
                  {t.title}
                </Text>
                <Text style={styles.itemSub}>
                  📚 {t.course_name} • ⏳ {t.due_datetime}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteTask(t.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  switchRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 4, marginBottom: 14 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  switchActive: { backgroundColor: '#FFFFFF' },
  switchText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  switchTextActive: { color: '#0F172A' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dayPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F1F5F9' },
  dayPillActive: { backgroundColor: '#2563EB' },
  dayText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  dayTextActive: { color: '#FFFFFF' },
  rowInputs: { flexDirection: 'row' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10
  },
  primaryBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  badgeDay: { fontSize: 11, fontWeight: '700', color: '#2563EB', marginBottom: 2 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 3 }
});