
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

function initializeFirebase() {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
}

if (typeof window !== 'undefined') {
    initializeFirebase();
}


export function getFirebaseAuth() {
    if (!auth) {
        initializeFirebase();
    }
    return auth;
}

export { app, auth, db };
