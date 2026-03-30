import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyBaxQa-mu26BBVFRiojl-0h9y2GUvY6Hk4',
  authDomain: 'red-cross-app-5bbf3.firebaseapp.com',
  projectId: 'red-cross-app-5bbf3',
  storageBucket: 'red-cross-app-5bbf3.firebasestorage.app',
  messagingSenderId: '699577812381',
  appId: '1:699577812381:web:f706385fab3d0957d21b74',
};

export const app = initializeApp(firebaseConfig);