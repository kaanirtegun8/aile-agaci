import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

interface UserProfile {
  firstName: string;
  lastName: string;
  birthDate: string;
  photoURL: string | null;
}

// Yaş hesaplama yardımcı fonksiyonu
const calculateAge = (birthDate: string): number => {
  const [day, month, year] = birthDate.split('.').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    birthDate: '',
    photoURL: null
  });

  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      if (user?.uid) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        }
      }
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Fotoğraf erişim izni gerekiyor');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLoading(true);
        try {
          const imageUri = result.assets[0].uri;
          
          const fetchResponse = await fetch(imageUri);
          const bytes = await fetchResponse.blob();
          
          if (!user?.uid) return;

          const fileName = `profile_${user.uid}.jpg`;
          const storageRef = ref(storage, `profilePhotos/${fileName}`);
          
          try {
            await uploadBytes(storageRef, bytes);
            console.log('Upload completed');
            
            const photoURL = await getDownloadURL(storageRef);
            console.log('Photo URL:', photoURL);
            
            await setDoc(doc(db, 'users', user.uid), {
              ...profile,
              photoURL
            }, { merge: true });

            setProfile(prev => ({ ...prev, photoURL }));
          } catch (uploadError: any) {
            console.error('Upload error:', uploadError);
            throw new Error('Fotoğraf yüklenemedi: ' + uploadError.message);
          }

        } catch (error: any) {
          console.error('Fotoğraf yükleme hatası:', error);
          Alert.alert(
            'Hata',
            'Fotoğraf yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'
          );
        }
      }
    } catch (error: any) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert(
        'Hata',
        'Fotoğraf seçilirken bir hata oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              {profile.photoURL ? (
                <Image 
                  source={{ uri: profile.photoURL }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#666" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.name}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={24} color="#666" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoText}>
                  {profile.birthDate || 'Doğum tarihi eklenmemiş'}
                </Text>
                {profile.birthDate && (
                  <Text style={styles.ageText}>
                    {calculateAge(profile.birthDate)} yaşında
                  </Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.editProfileButton} 
            onPress={() => router.push('/(modal)/editProfile')}
          >
            <Ionicons name="create-outline" size={24} color="#007AFF" />
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  ageText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 10,
  },
  editProfileText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 