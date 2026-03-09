import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "./firebase.js";
import { createUserProfile } from "./users.js";

export async function registerUser({ email, password, displayName, role }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Create profile in Firestore
    await createUserProfile(cred.user.uid, {
        email,
        displayName,
        role, // "student" or "teacher"
    });

    return cred.user;
}

export async function loginUser({ email, password }) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export async function logoutUser() {
    await signOut(auth);
}

export function onAuth(callback) {
    return onAuthStateChanged(auth, callback);
}