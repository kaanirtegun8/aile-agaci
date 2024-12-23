import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence } from 'firebase/auth/react-native';

const firebaseConfig = {
    apiKey: "AIzaSyCd48j6-bLqCMmkPUnorST1RZKEyPJd5uw",
    authDomain: "aile-agaci-34334.firebaseapp.com",
    projectId: "aile-agaci-34334",
    storageBucket: "aile-agaci-34334.firebasestorage.app",
    messagingSenderId: "32109056657",
    appId: "1:32109056657:web:8a3de726fb5cc15207a530",
    measurementId: "G-PLKJYKC8ER"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

const storage = getStorage(app);

export { auth, db, storage };
export default { auth, db, storage }; 