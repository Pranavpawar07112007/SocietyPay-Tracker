
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    "projectId": "societypay-tracker",
    "appId": "1:553240744713:web:bad8f0a7d25d55746d79d8",
    "storageBucket": "societypay-tracker.firebasestorage.app",
    "apiKey": "AIzaSyAHVpFoRNDWZatHy67d1rd7ZI-IZlu-aHM",
    "authDomain": "societypay-tracker.firebaseapp.com",
    "measurementId": "",
    "messagingSenderId": "553240744713"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== 'undefined') {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
}

// @ts-ignore
export { app, auth, db };
