import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9CoVWGcQMZm0g9i8p385VLYimqq1vpHk",
  authDomain: "lectralive.firebaseapp.com",
  projectId: "lectralive",
  storageBucket: "lectralive.firebasestorage.app",
  messagingSenderId: "145968401982",
  appId: "1:145968401982:web:d10f4ba3d32fb3f7de4b6f",
  measurementId: "G-MQWXDBFE9S",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);