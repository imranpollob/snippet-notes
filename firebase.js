// Firebase configuration with safe standalone local-first fallback
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig";

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Failed to initialize Firebase:", error);
  }
}

// Safe wrapper for onAuthStateChanged
const safeOnAuthStateChanged = (authInstance, callback) => {
  if (!authInstance) {
    if (typeof callback === "function") {
      callback(null);
    }
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
};

export {
  auth,
  db,
  isFirebaseConfigured,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  safeOnAuthStateChanged as onAuthStateChanged,
};
