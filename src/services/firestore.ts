'use server';
import { db } from '@/lib/firebase';
import { Member, Payment } from '@/types';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

export async function getMembers(): Promise<Member[]> {
    const membersCol = collection(db, 'members');
    const memberSnapshot = await getDocs(membersCol);
    const memberList = memberSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
    return memberList;
}

export async function getPayments(): Promise<Payment[]> {
    const paymentsCol = collection(db, 'payments');
    const paymentSnapshot = await getDocs(paymentsCol);
    const paymentList = paymentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    return paymentList;
}

export async function addMember(member: Omit<Member, 'id'>): Promise<Member> {
    const docRef = await addDoc(collection(db, 'members'), member);
    return { id: docRef.id, ...member };
}

export async function updateMember(id: string, member: Partial<Member>): Promise<void> {
    const memberDoc = doc(db, 'members', id);
    await updateDoc(memberDoc, member);
}

export async function deleteMember(id: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete the member document
    const memberDoc = doc(db, 'members', id);
    batch.delete(memberDoc);

    // Find and delete all payments associated with the member
    const paymentsQuery = query(collection(db, 'payments'), where('memberId', '==', id));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    paymentsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
}


export async function addPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const docRef = await addDoc(collection(db, 'payments'), payment);
    return { id: docRef.id, ...payment };
}

export async function updatePayment(id: string, payment: Partial<Payment>): Promise<void> {
    const paymentDoc = doc(db, 'payments', id);
    await updateDoc(paymentDoc, payment);
}

export async function deletePayment(id: string): Promise<void> {
    const paymentDoc = doc(db, 'payments', id);
    await deleteDoc(paymentDoc);
}
