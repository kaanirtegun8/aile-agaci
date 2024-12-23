import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RelationType, relationLabels } from '../types/relations';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function AddRelationModal() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: new Date(),
    notes: '',
    type: params.type as RelationType,
    photoURL: '',
    customType: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [uploading, setUploading] = useState(false);
  

  const handleSave = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return;

      const relationsRef = collection(db, 'relations');
      const newRelationRef = doc(relationsRef);
      
      await setDoc(newRelationRef, {
        userId: user.uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        birthDate: formData.birthDate.toLocaleDateString('tr-TR'),
        notes: [],
        type: formData.type,
        photoPath: `relations/${user?.uid}/${Date.now()}.jpg`,
        customType: formData.customType,
        createdAt: new Date(),
      });

      router.back();
    } catch (error) {
      console.error('Bağlantı eklenirken hata:', error);
      Alert.alert('Hata', 'Bağlantı eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, birthDate: selectedDate }));
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
        setUploading(true);
        try {
          const imageUri = result.assets[0].uri;
          const response = await fetch(imageUri);
          const blob = await response.blob();

          const fileName = `relations/${user?.uid}/${Date.now()}.jpg`;
          const storageRef = ref(storage, fileName);
          
          await uploadBytes(storageRef, blob);

          setFormData(prev => ({ ...prev, photoPath: fileName }));
        } catch (error) {
          console.error('Fotoğraf yükleme hatası:', error);
          Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {relationLabels[formData.type]} Ekle
      </Text>

      <View style={styles.form}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {formData.photoURL ? (
            <Image
              source={{ uri: formData.photoURL }}
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={40} color="#666" />
              <Text style={styles.photoPlaceholderText}>Fotoğraf Ekle</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ad"
          value={formData.firstName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
        />

        <TextInput
          style={styles.input}
          placeholder="Soyad"
          value={formData.lastName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
        />

        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>Doğum Tarihi:</Text>
          {Platform.OS === 'android' && (
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
            >
              <Text style={styles.dateButtonText}>
                {formData.birthDate.toLocaleDateString('tr-TR')}
              </Text>
            </TouchableOpacity>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={formData.birthDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
        </View>

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notlar"
          value={formData.notes}
          onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
          multiline
        />

        {formData.type === RelationType.OTHER_CUSTOM && (
          <TextInput
            style={styles.input}
            placeholder="Bağlantı Türü (örn: Kuzen, Komşu)"
            value={formData.customType}
            onChangeText={(text) => setFormData(prev => ({ ...prev, customType: text }))}
          />
        )}

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateLabel: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minWidth: 120,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 