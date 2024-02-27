import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export async function sendNotification(
  topic: any,
  title: any,
  body: any,
  data: any
) {
  if (body.length) {
    const notification = {
      topic: topic,
      notification: {
        title: title,
        body: body,
      },
      data: data,
      // Apple specific settings
      apns: {
        payload: {
          aps: {
            badge: 0,
            sound: "default",
          },
        },
      },
      // Android specific settings
      android: {
        notification: {
          sound: "default",
        },
      },
    };

    await getMessaging()
      .send(notification)
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  }
}

export async function updateScheduledNotifications() {
  const now = new Date().getTime() + 5;
  return await getFirestore()
    .collectionGroup("notifications-scheduled")
    .where("date", "<=", now)
    .get()
    .then(async (querySnapshot) => {
      await querySnapshot.forEach(async (doc) => {
        const notification = doc.data();

        if (notification.orgId) {
          notification.status = "sent";
          notification.updateDate = now;
          await getFirestore()
            .collection(
              "organizations/" + notification.orgId + "/notifications-scheduled"
            )
            .doc(notification.id)
            .delete();
          await getFirestore()
            .collection(
              "organizations/" + notification.orgId + "/notifications-sent"
            )
            .doc(notification.id)
            .set(notification);
        }
      });
    });
}

export async function sendEventNotification(
  topic: any,
  title: any,
  body: any,
  data: any
) {
  // if (body.length) {

  const payLoad = {
    topic: topic,
    notification: {
      title: title,
      body: body,
    },
    data: data,
    // Apple specific settings
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
    // Android specific settings
    android: {
      notification: {
        sound: "default",
      },
    },
  };

  await getMessaging()
    .send(payLoad)
    .catch((error) => {
      console.log("Error sending message:", error);
    });
  /* await getMessaging().sendToDevice("fYOcD54LakitperGgNRNvp:APA91bEuDO-OQwf7oBrcA2t-QV4qWy4Eh4XlmCLD9Fucd6oMM_pHyvuPmzYhRsjS6tfEoqfZjokbjJmPDTQUg9Yq_lxcM7hMDtGR9_6HFoS1o_byGFlHaXWrvPwwFZW_U6ANQvgiDf37", payLoad); */
  //}
}

export async function sendQuestionNotification(
  topic: any,
  title: any,
  body: any,
  data: any,
  token: any
) {
  // if (body.length) {

  const payLoad = {
    topic: topic,
    notification: {
      title: title,
      body: body,
    },
    data: data,
    // Apple specific settings
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
    // Android specific settings
    android: {
      notification: {
        sound: "default",
      },
    },
  };

  /* await getMessaging().send(payLoad).catch((error) => {
        console.log('Error sending message:', error);
    }); */
  await getMessaging().sendToDevice(token, payLoad);
}
