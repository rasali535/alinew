import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from './config';
export function getTenantCollection(orgId, collectionName) {
    return collection(db, 'organizations', orgId, collectionName);
}
export async function fetchTenantDocs(orgId, collectionName, ...constraints) {
    const colRef = getTenantCollection(orgId, collectionName);
    const q = query(colRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}
export async function createTenantDoc(orgId, collectionName, data) {
    const colRef = getTenantCollection(orgId, collectionName);
    const docRef = data.id ? doc(colRef, data.id) : doc(colRef);
    const now = new Date().toISOString();
    const payload = {
        ...data,
        id: docRef.id,
        orgId,
        createdAt: now,
        updatedAt: now
    };
    await setDoc(docRef, payload);
    return docRef.id;
}
export async function updateTenantDoc(orgId, collectionName, docId, data) {
    const docRef = doc(db, 'organizations', orgId, collectionName, docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
    });
}
export async function deleteTenantDoc(orgId, collectionName, docId) {
    const docRef = doc(db, 'organizations', orgId, collectionName, docId);
    await deleteDoc(docRef);
}
