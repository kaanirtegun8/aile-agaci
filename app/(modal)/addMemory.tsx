import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Memory } from '../types/memories';

export default function AddMemoryModal() {
  const params = useLocalSearchParams();
  const relationId = params.relationId as string;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

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
          createdAt: new Date(),
          relationId
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
}); 