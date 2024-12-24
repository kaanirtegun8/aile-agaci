import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { router } from 'expo-router';
import { RelationType, relationLabels, multipleAllowedTypes, RelationSettings } from '../types/relations';
import { useFocusEffect } from '@react-navigation/native';

interface UserProfile {
  firstName: string;
  lastName: string;
  photoURL: string | null;
}

interface Relation {
  id: string;
  type: RelationType;
  firstName: string;
  lastName: string;
  photoURL?: string;
  birthDate?: string;
  notes?: string;
  customType?: string;
}

// Bağlantı kategorileri
const FamilyTree: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    photoURL: null
  });
  const [relations, setRelations] = useState<Relation[]>([]);
  const [relationCategories] = useState([
    {
      title: 'Eş/Sevgili',
      types: [RelationType.SPOUSE, RelationType.PARTNER]
    },
    {
      title: 'Ebeveynler',
      types: [RelationType.MOTHER, RelationType.FATHER]
    },
    {
      title: 'Büyükanne ve Büyükbabalar',
      types: [
        RelationType.GRANDMOTHER_MATERNAL,
        RelationType.GRANDMOTHER_PATERNAL,
        RelationType.GRANDFATHER_MATERNAL,
        RelationType.GRANDFATHER_PATERNAL
      ]
    },
    {
      title: 'Kardeşler',
      types: [RelationType.SISTER, RelationType.BROTHER]
    },
    {
      title: 'Amca, Dayı, Hala ve Teyzeler',
      types: [
        RelationType.AUNT_MATERNAL,
        RelationType.AUNT_PATERNAL,
        RelationType.UNCLE_MATERNAL,
        RelationType.UNCLE_PATERNAL
      ]
    },
    {
      title: 'Diğer Bağlantılar',
      types: [
        RelationType.COUSIN, 
        RelationType.FRIEND, 
        RelationType.OTHER_CUSTOM
      ]
    }
  ]);
  const [settings, setSettings] = useState<RelationSettings>({
    visibleTypes: Object.values(RelationType) // Başlangıçta hepsi görünür
  });

  // Settings'i yükle
  const loadSettings = async () => {
    try {
      if (user?.uid) {
        const settingsRef = doc(db, 'userSettings', user.uid);
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as RelationSettings);
        } else {
          // Varsayılan ayarları kaydet
          await setDoc(settingsRef, {
            visibleTypes: Object.values(RelationType)
          });
        }
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
      loadRelations();
      loadSettings();
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

  const loadRelations = async () => {
    try {
      if (user?.uid) {
        const relationsRef = collection(db, 'relations');
        const q = query(
          relationsRef, 
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const loadedRelations: Relation[] = [];
        querySnapshot.forEach((doc) => {
          loadedRelations.push({ id: doc.id, ...doc.data() } as Relation);
        });
        
        setRelations(loadedRelations);
      }
    } catch (error) {
      console.error('Bağlantılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const migrateOldRelations = async () => {
    try {
      if (user?.uid) {
        const relationsRef = collection(db, 'relations');
        const q = query(
          relationsRef, 
          where('userId', '==', user.uid),
          where('type', '==', 'OTHER')
        );
        
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
          const relationRef = doc.ref;
          batch.update(relationRef, {
            type: 'OTHER_CUSTOM',
            customType: 'Diğer'
          });
        });
        
        await batch.commit();
        loadRelations(); // Güncellemeden sonra yeniden yükle
      }
    } catch (error) {
      console.error('Migration hatası:', error);
    }
  };

  const handleAddRelation = (type: RelationType) => {
    router.push({
      pathname: '/(modal)/addRelation',
      params: { type }
    });
  };

  const handleRelationPress = (relation: Relation) => {
    const relationToSend = {
      ...relation,
      photoURL: relation.photoURL ? encodeURI(relation.photoURL) : ''
    };
    
    router.push({
      pathname: '/(modal)/relationDetail',
      params: { relation: JSON.stringify(relationToSend) }
    });
  };

  const getRelationsOfType = (type: RelationType) => {
    return relations.filter(r => r.type === type);
  };

  const shouldShowAddButton = (type: RelationType) => {
    if (multipleAllowedTypes.includes(type)) {
      return true; // Çoklu bağlantıya izin verilen tipler her zaman gösterilsin
    }
    return !relations.some(r => r.type === type); // Diğerleri sadece hiç yoksa gösterilsin
  };

  // Kategori görünürlüğünü kontrol et
  const isTypeVisible = (type: RelationType) => {
    return settings.visibleTypes.includes(type);
  };

  // Ayarlar butonunu ekleyelim
  const renderSettingsButton = () => (
    <TouchableOpacity 
      style={styles.settingsButton}
      onPress={() => router.push('/(modal)/relationSettings')}
    >
      <Ionicons name="settings-outline" size={22} color="#666" />
    </TouchableOpacity>
  );

  const relationTypes = [
    { type: RelationType.MOTHER, label: relationLabels[RelationType.MOTHER] },
    { type: RelationType.FATHER, label: relationLabels[RelationType.FATHER] },
    { type: RelationType.SISTER, label: relationLabels[RelationType.SISTER] },
    { type: RelationType.BROTHER, label: relationLabels[RelationType.BROTHER] },
    { type: RelationType.SPOUSE, label: relationLabels[RelationType.SPOUSE] },
    { type: RelationType.PARTNER, label: relationLabels[RelationType.PARTNER] },
    { type: RelationType.FRIEND, label: relationLabels[RelationType.FRIEND] },
    { type: RelationType.OTHER_CUSTOM, label: relationLabels[RelationType.OTHER_CUSTOM] },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.nodeContainer}>
          <View style={styles.userContainer}>
            <View style={styles.settingsButtonContainer}>
              {renderSettingsButton()}
            </View>
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
            <Text style={styles.userName}>
              {profile.firstName} {profile.lastName}
            </Text>
          </View>

          {relationCategories.map((category, index) => (
            <View key={index} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <View style={styles.relationGrid}>
                {category.types.filter(isTypeVisible).map((type) => {
                  const typeRelations = getRelationsOfType(type);
                  
                  return (
                    <React.Fragment key={type}>
                      {typeRelations.map((relation) => (
                        <TouchableOpacity 
                          key={relation.id}
                          style={styles.relationCard}
                          onPress={() => handleRelationPress(relation)}
                        >
                          <Image
                            source={
                              relation.photoURL && relation.photoURL !== '' 
                                ? { uri: relation.photoURL }
                                : { uri: 'https://api.dicebear.com/7.x/avataaars/png' }
                            }
                            style={styles.relationAvatar}
                          />
                          <Text style={styles.relationName}>
                            {relation.firstName} {relation.lastName}
                          </Text>
                          <Text style={styles.relationType}>
                            {type === RelationType.OTHER_CUSTOM 
                              ? relation.customType 
                              : relationLabels[type]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      
                      {shouldShowAddButton(type) && (
                        <TouchableOpacity 
                          style={styles.addRelationButton}
                          onPress={() => handleAddRelation(type)}
                        >
                          <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
                          <Text style={styles.addRelationText}>
                            {relationLabels[type]} Ekle
                          </Text>
                        </TouchableOpacity>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
  },
  nodeContainer: {
    width: '100%',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  userName: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  userContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    width: '100%',
    marginTop: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  relationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  relationCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  relationAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  relationName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  relationType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addRelationButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addRelationText: {
    color: '#4A90E2',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  settingsButtonContainer: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1,
  },
  settingsButton: {
    padding: 4,
    borderRadius: 22,
    backgroundColor: '#e8e9ed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default FamilyTree; 