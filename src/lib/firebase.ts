// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "societypay-tracker",
  "appId": "1:553240744713:web:bad8f0a7d25d55746d79d8",
  "storageBucket": "societypay-tracker.firebasestorage.app",
  "apiKey": "AIzaSyAHVpFoRNDWZatHy67d1rd7ZI-IZlu-aHM",
  "authDomain": "societypay-tracker.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "553240744713"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: any;
let db: any;

if (typeof window !== 'undefined') {
    auth = getAuth(app);
    db = getFirestore(app);
}

export { app, auth, db };
