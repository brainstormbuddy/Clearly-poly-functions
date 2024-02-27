import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

import { updateEventCount } from "./analytics";
import { sendNotification } from "./notifications";
import { inDateRange, getStartTime, combinations } from "./shared";

export async function handleEventChangeAnalytics(
  orgId: any,
  oldEvent: any,
  newEvent: any
) {
  if (!oldEvent || oldEvent.endDate > new Date().getTime()) {
    const orgName =
      (await getFirestore().collection("organizations").doc(orgId).get()).get(
        "name"
      ) || "";

    if (!oldEvent && newEvent) {
      await updateEventCount(orgId, "Daily", "new", newEvent);
      await updateEventCount(orgId, "Weekly", "new", newEvent);
      await updateEventCount(orgId, "Monthly", "new", newEvent);
    } else if (!oldEvent.delete && newEvent.delete) {
      if (inDateRange("day", oldEvent.createdDate)) {
        await updateEventCount(orgId, "Daily", "removed", oldEvent);
      } else if (inDateRange("week", oldEvent.createdDate)) {
        await updateEventCount(orgId, "Weekly", "removed", oldEvent);
      } else if (inDateRange("month", oldEvent.createdDate)) {
        await updateEventCount(orgId, "Monthly", "removed", oldEvent);
      }

      await sendNotification(
        "org-" + orgId + "-event-" + newEvent.id,
        orgName + " Event Cancelled",
        "Event: " + oldEvent.name,
        {}
      );
    } else if (oldEvent.interest !== newEvent.interest) {
      if (inDateRange("day", oldEvent.createdDate)) {
        await updateEventCount(orgId, "Daily", "removed", oldEvent);
      } else if (inDateRange("week", oldEvent.createdDate)) {
        await updateEventCount(orgId, "Weekly", "removed", oldEvent);
      } else if (inDateRange("month", oldEvent.createdDate)) {
        await updateEventCount(orgId, "Monthly", "removed", oldEvent);
      }

      await updateEventCount(orgId, "Daily", "new", newEvent);
      await updateEventCount(orgId, "Weekly", "new", newEvent);
      await updateEventCount(orgId, "Monthly", "new", newEvent);

      await sendNotification(
        "org-" + orgId + "-event-" + newEvent.id,
        orgName + " Event Updated",
        "Event: " + oldEvent.name,
        {}
      );
    } else {
      await sendNotification(
        "org-" + orgId + "-event-" + newEvent.id,
        orgName + " Event Updated",
        "Event: " + oldEvent.name,
        {}
      );
    }
  }
}

export async function NewEventsNotifications(
  frequency: "Daily" | "Weekly" | "Monthly"
) {
  const orgs = await getFirestore()
    .collection("organizations")
    .where("active", "==", true)
    .get();

  orgs.forEach(async (orgData) => {
    const org = orgData.data();

    const newEvents = await getFirestore()
      .collection("organizations/" + orgData.id + "/events")
      .where("createdDate", ">=", getStartTime(frequency))
      .where("delete", "==", false)
      .get();

    if (newEvents.docs.length) {
      const interestTotals: any = {};

      newEvents.forEach((eventDoc) => {
        const event = eventDoc.data();

        if (event.hasOwnProperty("interest")) {
          if (interestTotals.hasOwnProperty(event.interest)) {
            interestTotals[event.interest]++;
          } else {
            interestTotals[event.interest] = 1;
          }
        }
      });

      if (Object.keys(interestTotals).length) {
        const interests = await (
          await getFirestore()
            .collection("organizations/" + orgData.id + "/settings")
            .doc("interests")
            .get()
        ).data();

        if (interests && interests.value && interests.value.length) {
          const interestCombinations = combinations(interests.value);

          interestCombinations.forEach(async (combination) => {
            let topic = "org-" + orgData.id + "-interests-";

            const body = combination.reduce(
              (notificationBody: string, interest: any) => {
                topic += interest.id + "-";

                if (interestTotals[interest.id]) {
                  if (notificationBody.length) {
                    notificationBody += ", ";
                  }
                  notificationBody +=
                    interestTotals[interest.id] +
                    " " +
                    interest.name +
                    " Event" +
                    (interestTotals[interest.id] > 1 ? "s" : "");
                }
                return notificationBody;
              },
              ""
            );

            if (body.length) {
              const notification = {
                topic: topic + frequency,
                notification: {
                  title: org.name + " Events Added",
                  body: body,
                },
              };

              await getMessaging()
                .send(notification)
                .catch((error) => {
                  console.log("Error sending message:", error);
                });
            }
          });
        }
      }
    }
  });
}
