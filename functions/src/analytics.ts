import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export async function updateEventCount(
  orgId: any,
  type: "Daily" | "Weekly" | "Monthly",
  changeType: "new" | "reset" | "removed" | "updated",
  event: any
) {
  const ref = await getFirestore()
    .collection("organizations/" + orgId + "/analytics")
    .doc("newEvents" + type);
  const change: any = {};

  switch (changeType) {
    case "reset":
      change[event.interest] = 0;
      break;
    case "new":
      change[event.interest] = admin.firestore.FieldValue.increment(1);
      // eventCount += 1;
      break;
    case "removed":
      change[event.interest] = admin.firestore.FieldValue.increment(-1);
      break;
  }

  // console.log('event change: '+orgId+', '+ JSON.stringify(event));
  return ref.set(change, { merge: true });
}
