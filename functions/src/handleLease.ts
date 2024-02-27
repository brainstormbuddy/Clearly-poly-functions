import { getFirestore } from "firebase-admin/firestore";

const leaseTime = 60 * 1000; // 60s

export async function shouldSendWithLease(ref: any) {
  return getFirestore().runTransaction((transaction: any) => {
    return transaction.get(ref).then((emailDoc: any) => {
      if (emailDoc.exists && emailDoc.data().recorded) {
        return false;
      }
      if (emailDoc.exists && new Date() < emailDoc.data().lease) {
        return Promise.reject("Lease already taken, try later.");
      }
      transaction.set(ref, {
        lease: new Date(new Date().getTime() + leaseTime),
      });
      return true;
    });
  });
}
