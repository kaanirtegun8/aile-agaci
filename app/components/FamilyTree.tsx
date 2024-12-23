import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const FamilyTree = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.nodeContainer}>
        <View style={styles.userContainer}>
          <Image
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.displayName || 'Kullanıcı'}</Text>
        </View>
        
        <View style={styles.parentButtons}>
          <TouchableOpacity style={styles.addParentButton}>
            <Text style={styles.addButtonText}>+ Anne</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addParentButton}>
            <Text style={styles.addButtonText}>+ Baba</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nodeContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  userName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  parentButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
  },
  addParentButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  userContainer: {
    alignItems: 'center',
  },
});

export default FamilyTree; 