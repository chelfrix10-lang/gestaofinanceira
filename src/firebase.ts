/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Client-side Firebase configuration loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Verify if the config is filled with at least a project ID and an API Key and that they are real, valid credentials
const hasFirebaseEnvVars = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.startsWith('AIzaSy') && 
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'undefined' &&
  firebaseConfig.projectId.trim() !== '' &&
  !firebaseConfig.projectId.includes('placeholder') &&
  !firebaseConfig.projectId.includes('your-')
);

let appInstance: any = null;
let dbInstance: any = null;
let authInstance: any = null;

if (hasFirebaseEnvVars) {
  try {
    appInstance = initializeApp(firebaseConfig);
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  } catch (error) {
    console.error("Erro na inicialização do Firebase app/firestore:", error);
    appInstance = null;
    dbInstance = null;
    authInstance = null;
  }
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;

export const isFirebaseConfigured = !!(app && db);

export async function saveToFirebase(data: any): Promise<boolean> {
  if (!db) return false;
  try {
    const savePromise = (async () => {
      await setDoc(doc(db, 'financial', 'user_budget'), data);
      return true;
    })();

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn("Firebase saveToFirebase timed out safely after 2.5s.");
        resolve(false);
      }, 2500);
    });

    return await Promise.race([savePromise, timeoutPromise]);
  } catch (error) {
    console.error("Erro ao salvar no Firebase Firestore:", error);
    return false;
  }
}

export async function loadFromFirebase(): Promise<any | null> {
  if (!db) return null;
  try {
    const fetchPromise = (async () => {
      const docSnap = await getDoc(doc(db, 'financial', 'user_budget'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    })();

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn("Firebase loadFromFirebase timed out safely after 2.5s.");
        resolve(null);
      }, 2500);
    });

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.error("Erro ao carregar do Firebase Firestore:", error);
  }
  return null;
}

export { firebaseConfig };

