/*
 ============================================================================
 FIREBASE FIRESTORE CONFIGURATION (QUESTION BANK ONLY)
 ============================================================================
 To connect to your live Firebase Firestore project:
 1. Go to https://console.firebase.google.com/ and create or open your project.
 2. Add a Web App in Project Settings.
 3. Replace the placeholder values in FIREBASE_CONFIG below with your credentials.
 4. Enable Cloud Firestore in "Test mode" or set security rules for /questions:
      match /questions/{document=**} {
        allow read, write: if true;
      }
 ============================================================================
*/

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

export function isFirebaseConfigured(): boolean {
  return (
    Boolean(FIREBASE_CONFIG.apiKey) &&
    !FIREBASE_CONFIG.apiKey.includes('YOUR_FIREBASE') &&
    Boolean(FIREBASE_CONFIG.projectId) &&
    !FIREBASE_CONFIG.projectId.includes('YOUR_FIREBASE')
  );
}

let dbInstance: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    dbInstance = getFirestore(app);
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
}

export const db = dbInstance;
