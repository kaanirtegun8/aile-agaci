import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { RelationType, relationLabels } from '../types/relations';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Memory } from '../types/memories';
import { formatDate } from '../utils/date-utils';

interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

interface RelationData {
  id: string;
  type: RelationType;
  firstName: string;
  lastName: string;
  photoURL?: string;
  birthDate?: string;
  notes?: Note[];
  memories?: Memory[];
  customType?: string;
}

export default function RelationDetailModal() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const [relation, setRelation] = useState<RelationData>(() => {
    const parsedRelation = JSON.parse(params.relation as string);
    return {
      ...parsedRelation,
      notes: parsedRelation.notes || [],
      memories: parsedRelation.memories || [],
      photoURL: parsedRelation.photoURL || ''
    };
  });
  const [uploading, setUploading] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [memoriesExpanded, setMemoriesExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const loadRelationData = async () => {
      if (!relation?.id) return;
      
      try {
        setIsLoading(true);
        const relationRef = doc(db, 'relations', relation.id);
        const relationDoc = await getDoc(relationRef);
        
        if (relationDoc.exists()) {
          const data = relationDoc.data();
          setRelation(prev => ({
            ...prev,
            ...data,
            id: relation.id,
            memories: data.memories || [],
            notes: data.notes || [],
            photoURL: data.photoURL || prev.photoURL || ''
          }));
        }
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRelationData();
  }, [relation?.id, lastUpdate]);

  const handleDelete = async () => {
    Alert.alert(
      'Bağlantıyı Sil',
      'Bu bağlantıyı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.uid) return;
              await deleteDoc(doc(db, 'relations', relation.id));
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Silme hatası:', error);
              Alert.alert('Hata', 'Bağlantı silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
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
          const photoURL = await getDownloadURL(storageRef);
          
          // Firestore'da fotoğraf URL'sini güncelle
          const relationRef = doc(db, 'relations', relation.id);
          await updateDoc(relationRef, { photoURL });

          // Yerel state'i güncelle
          setRelation(prev => ({ ...prev, photoURL } as typeof relation));
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

  const handleAddNote = async () => {
    try {
      if (!noteText.trim()) return;

      const newNote = {
        id: Date.now().toString(),
        text: noteText,
        createdAt: new Date()
      };

      const updatedNotes = [...(relation.notes || []), newNote];
      const relationRef = doc(db, 'relations', relation.id);
      await updateDoc(relationRef, { notes: updatedNotes });
      
      setRelation(prev => ({ ...prev, notes: updatedNotes }));
      setNoteText('');
      setIsAddingNote(false);
    } catch (error) {
      Alert.alert('Hata', 'Not eklenirken bir hata oluştu');
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    try {
      const updatedNotes = relation.notes?.map(note => 
        note.id === noteId ? { ...note, text: noteText } : note
      );

      const relationRef = doc(db, 'relations', relation.id);
      await updateDoc(relationRef, { notes: updatedNotes });
      
      setRelation(prev => ({ ...prev, notes: updatedNotes }));
      setNoteText('');
      setEditingNoteId(null);
    } catch (error) {
      Alert.alert('Hata', 'Not güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const updatedNotes = relation.notes?.filter(note => note.id !== noteId);
      const relationRef = doc(db, 'relations', relation.id);
      await updateDoc(relationRef, { notes: updatedNotes });
      
      setRelation(prev => ({ ...prev, notes: updatedNotes }));
    } catch (error) {
      Alert.alert('Hata', 'Not silinirken bir hata oluştu');
    }
  };

  const getNotesCount = () => {
    if (!relation.notes) return 0;
    if (!Array.isArray(relation.notes)) return 0;
    return relation.notes.length;
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={pickImage}
          >
            <Image
              source={
                relation.photoURL && relation.photoURL !== '' 
                  ? { uri: relation.photoURL }
                  : { uri: 'https://api.dicebear.com/7.x/avataaars/png' }
              }
              style={[
                styles.avatar,
                { backgroundColor: '#f0f0f0' }
              ]}
            />
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>
            {relation.firstName} {relation.lastName}
          </Text>
          <Text style={styles.relationType}>
            {relation.type === RelationType.OTHER_CUSTOM
              ? relation.customType
              : relationLabels[relation.type as RelationType]}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={24} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Doğum Tarihi</Text>
              <Text style={styles.infoText}>{relation.birthDate || 'Belirtilmemiş'}</Text>
            </View>
          </View>

          <View style={styles.notesContainer}>
            <TouchableOpacity 
              style={styles.notesHeader}
              onPress={() => setNotesExpanded(!notesExpanded)}
            >
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Notlar</Text>
                <Text style={styles.noteCount}>
                  {getNotesCount()} not
                </Text>
              </View>
              <Ionicons 
                name={notesExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>

            {notesExpanded && (
              <View style={styles.notesContent}>
                <TouchableOpacity 
                  style={styles.addNoteButton}
                  onPress={() => setIsAddingNote(true)}
                >
                  <View style={styles.addNoteContent}>
                    <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                    <Text style={styles.addNoteText}>Yeni Not Ekle</Text>
                  </View>
                </TouchableOpacity>

                {isAddingNote && (
                  <View style={styles.newNoteContainer}>
                    <TextInput
                      style={styles.noteInput}
                      value={noteText}
                      onChangeText={setNoteText}
                      multiline
                      placeholder="Notunuzu yazın..."
                      autoFocus
                    />
                    <View style={styles.noteInputButtons}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => {
                          setNoteText('');
                          setIsAddingNote(false);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.saveButton}
                        onPress={handleAddNote}
                      >
                        <Text style={styles.saveButtonText}>Kaydet</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.notesList}>
                  {Array.isArray(relation.notes) && relation.notes.length > 0 ? (
                    relation.notes.map((note, index) => (
                      <View key={`note-${note.id}-${index}`} style={styles.noteItem}>
                        {editingNoteId === note.id ? (
                          <View key={`edit-${note.id}`} style={styles.noteInputContainer}>
                            <TextInput
                              style={styles.noteInput}
                              value={noteText}
                              onChangeText={setNoteText}
                              multiline
                              autoFocus
                            />
                            <View key={`buttons-${note.id}`} style={styles.noteInputButtons}>
                              <TouchableOpacity 
                                style={styles.cancelButton}
                                onPress={() => {
                                  setNoteText('');
                                  setEditingNoteId(null);
                                }}
                              >
                                <Text style={styles.cancelButtonText}>İptal</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.saveButton}
                                onPress={() => handleUpdateNote(note.id)}
                              >
                                <Text style={styles.saveButtonText}>Kaydet</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            <Text key={`text-${note.id}`} style={styles.noteText}>{note.text}</Text>
                            <View key={`actions-${note.id}`} style={styles.noteActions}>
                              <TouchableOpacity 
                                onPress={() => {
                                  setNoteText(note.text);
                                  setEditingNoteId(note.id);
                                }}
                              >
                                <Ionicons name="create-outline" size={20} color="#4A90E2" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleDeleteNote(note.id)}
                              >
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyNotesText}>Henüz not eklenmemiş</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.memoriesContainer}>
            <TouchableOpacity 
              style={styles.memoriesHeader}
              onPress={() => setMemoriesExpanded(!memoriesExpanded)}
            >
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Anılar</Text>
                <Text style={styles.memoryCount}>
                  {relation.memories?.length || 0} anı
                </Text>
              </View>
              <Ionicons 
                name={memoriesExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>

            {memoriesExpanded && (
              <View style={styles.memoriesContent}>
                {isLoading ? (
                  <ActivityIndicator color="#4A90E2" />
                ) : (
                  <>
                    <TouchableOpacity 
                      style={styles.addMemoryButton}
                      onPress={() => router.push({
                        pathname: '/addMemory',
                        params: { relationId: relation.id }
                      })}
                    >
                      <View style={styles.addMemoryContent}>
                        <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                        <Text style={styles.addMemoryText}>Yeni Anı Ekle</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.memoriesList}>
                      {relation.memories && relation.memories.length > 0 ? (
                        relation.memories.map((memory) => (
                          <TouchableOpacity
                            key={memory.id}
                            style={styles.memoryItem}
                            onPress={() => router.push({
                              pathname: '/memoryDetail',
                              params: { memory: JSON.stringify(memory) }
                            })}
                          >
                            <Text style={styles.memoryTitle}>{memory.title}</Text>
                            <Text style={styles.memoryDate}>
                              {formatDate(memory.memoryDate)}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.emptyMemoriesText}>Henüz anı eklenmemiş</Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Bağlantıyı Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#4A90E2',
    backgroundColor: '#f0f0f0',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  relationType: {
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  notesContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addNoteButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addNoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  addNoteText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  noteInputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    padding: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noteText: {
    fontSize: 16,
    color: '#333',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteCount: {
    fontSize: 14,
    color: '#666',
  },
  notesContent: {
    padding: 16,
  },
  emptyNotesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
    fontStyle: 'italic',
  },
  newNoteContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesList: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  bottomContainer: {
    padding: Platform.OS === 'ios' ? 16 : 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  memoriesContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  memoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  memoriesContent: {
    padding: 16,
  },
  addMemoryButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addMemoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  addMemoryText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  memoriesList: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  memoryItem: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 12,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memoryDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyMemoriesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
    fontStyle: 'italic',
  },
  memoryCount: {
    fontSize: 14,
    color: '#666',
  },
}); 