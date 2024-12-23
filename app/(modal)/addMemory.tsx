import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Memory, MemoryLocation } from '../types/memories';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToTurkish } from '../utils/date-utils';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function AddMemoryModal() {
  const params = useLocalSearchParams();
  const relationId = params.relationId as string;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MemoryLocation | null>(null);
  const [region, setRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    })();
  }, []);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setMemoryDate(selectedDate);
    }
  };

  const handleConfirmDate = () => {
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Hata', 'Lütfen başlık ve anı içeriğini doldurun');
      return;
    }

    try {
      const relationRef = doc(db, 'relations', relationId);
      const relationDoc = await getDoc(relationRef);
      
      if (relationDoc.exists()) {
        const newMemory: Memory = {
          id: Date.now().toString(),
          title: title.trim(),
          content: content.trim(),
          memoryDate: memoryDate.getTime(),
          relationId,
          location: selectedLocation || undefined,
        };

        const currentMemories = relationDoc.data().memories || [];
        const updatedMemories = [...currentMemories, newMemory];
        
        await updateDoc(relationRef, {
          memories: updatedMemories
        });

        // Güncel veriyi tekrar çek
        const updatedDoc = await getDoc(relationRef);
        
        router.replace({
          pathname: '/relationDetail',
          params: { relation: JSON.stringify(updatedDoc.data()) }
        });
      }
    } catch (error) {
      console.error('Anı ekleme hatası:', error);
      Alert.alert('Hata', 'Anı eklenirken bir hata oluştu');
    }
  };

  const searchLocation = async (searchText: string) => {
    try {
      const fullSearchText = `${searchText}, Turkey`;
      const results = await Location.geocodeAsync(fullSearchText);
      
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        
        // Harita bölgesini güncelle
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        setRegion(newRegion);
        setSelectedLocation({
          latitude,
          longitude,
          name: searchText
        });

        // Bulunan konumun adresini al
        try {
          const reverseResults = await Location.reverseGeocodeAsync({
            latitude,
            longitude
          });
          if (reverseResults.length > 0) {
            const address = reverseResults[0];
            const locationName = [
              address.street,
              address.district,
              address.subregion,
              address.city
            ].filter(Boolean).join(', ');
            
            setSelectedLocation(prev => ({
              ...prev!,
              name: locationName
            }));
          }
        } catch (error) {
          console.error('Adres çözümleme hatası:', error);
        }
      } else {
        Alert.alert('Hata', 'Konum bulunamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Konum araması başarısız oldu');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          <TextInput
            style={styles.titleInput}
            placeholder="Anı Başlığı"
            value={title}
            onChangeText={setTitle}
          />

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonLabel}>Anı Tarihi</Text>
            <Text style={styles.dateText}>
              {formatDateToTurkish(memoryDate)}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' ? (
            <Modal
              animationType="slide"
              transparent={true}
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity 
                      style={styles.datePickerButton} 
                      onPress={handleConfirmDate}
                    >
                      <Text style={styles.datePickerButtonText}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={memoryDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    locale="tr-TR"
                  />
                </View>
              </View>
            </Modal>
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={memoryDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
                locale="tr-TR"
              />
            )
          )}

          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={styles.locationButtonLabel}>Konum Ekle</Text>
            {selectedLocation ? (
              <Text style={styles.locationText}>{selectedLocation.name}</Text>
            ) : (
              <Text style={styles.locationPlaceholder}>Konum se��ilmedi</Text>
            )}
          </TouchableOpacity>

          <Modal
            visible={showLocationPicker}
            animationType="slide"
            onRequestClose={() => setShowLocationPicker(false)}
          >
            <SafeAreaView style={styles.locationPickerContainer}>
              <View style={styles.locationPickerHeader}>
                <Text style={styles.locationPickerTitle}>Konum Seç</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowLocationPicker(false)}
                >
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Konum adı girin..."
                  value={selectedLocation?.name || ''}
                  onChangeText={(text) => {
                    setSelectedLocation(prev => prev ? { ...prev, name: text } : {
                      latitude: region.latitude,
                      longitude: region.longitude,
                      name: text
                    });
                  }}
                  onSubmitEditing={(event) => {
                    const searchText = event.nativeEvent.text;
                    if (searchText.trim()) {
                      searchLocation(searchText);
                    }
                  }}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setSelectedLocation({
                    latitude,
                    longitude,
                    name: selectedLocation?.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                  });
                }}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title={selectedLocation.name}
                  />
                )}
              </MapView>

              <View style={styles.locationPickerButtons}>
                <TouchableOpacity 
                  style={[styles.confirmButton, { marginBottom: Platform.OS === 'ios' ? 10 : 0 }]}
                  onPress={() => setShowLocationPicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Konumu Seç</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>

          <TextInput
            style={styles.contentInput}
            placeholder="Anınızı yazın..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
      
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    minHeight: 200,
  },
  bottomContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  dateButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 16,
  },
  datePickerButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  locationButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  locationPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  locationPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#4A90E2',
    fontSize: 16,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
  },
  map: {
    flex: 1,
  },
  locationPickerButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 