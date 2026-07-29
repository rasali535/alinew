import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  CollectionReference,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';

export function getTenantCollection<T = DocumentData>(
  orgId: string,
  collectionName: string
): CollectionReference<T> {
  return collection(db, 'organizations', orgId, collectionName) as CollectionReference<T>;
}

export async function fetchTenantDocs<T>(
  orgId: string,
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const colRef = getTenantCollection<T>(orgId, collectionName);
  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as T));
}

export async function createTenantDoc<T extends { id?: string }>(
  orgId: string,
  collectionName: string,
  data: T
): Promise<string> {
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

export async function updateTenantDoc(
  orgId: string,
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteTenantDoc(
  orgId: string,
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId, collectionName, docId);
  await deleteDoc(docRef);
}
