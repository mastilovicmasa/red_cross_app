// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaxQa-mu26BBVFRiojl-0h9y2GUvY6Hk4",
  authDomain: "red-cross-app-5bbf3.firebaseapp.com",
  projectId: "red-cross-app-5bbf3",
  storageBucket: "red-cross-app-5bbf3.firebasestorage.app",
  messagingSenderId: "699577812381",
  appId: "1:699577812381:web:f706385fab3d0957d21b74"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});