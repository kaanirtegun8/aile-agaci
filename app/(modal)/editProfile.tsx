import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserProfile {
  firstName: string;
  lastName: string;
  birthDate: string;
}

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    birthDate: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('tr-TR');
      setProfile(prev => ({ ...prev, birthDate: formattedDate }));
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
      router.back();
    } catch (error) {
      console.error('Profil kaydedilirken hata:', error);
      alert('Profil kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad</Text>
              <TextInput
                style={styles.input}
                value={profile.firstName}
                onChangeText={(text) => setProfile({...profile, firstName: text})}
                placeholder="Adınız"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Soyad</Text>
              <TextInput
                style={styles.input}
                value={profile.lastName}
                onChangeText={(text) => setProfile({...profile, lastName: text})}
                placeholder="Soyadınız"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Doğum Tarihi</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {profile.birthDate || 'Doğum tarihi seçin'}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={profile.birthDate ? new Date(profile.birthDate.split('.').reverse().join('-')) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  iosDatePicker: {
    width: '100%',
    height: 200,
    marginBottom: 20
  },
}); 