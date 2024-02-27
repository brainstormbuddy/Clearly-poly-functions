import { config, pubsub } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import {
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as express from "express";
import bodyParser = require("body-parser");
import * as _ from "lodash";
import {
  updateUnregisteredUserRoles,
  processUserRolesChange,
} from "./userRoles";
import {
  sendEventNotification,
  sendNotification,
  updateScheduledNotifications,
  sendQuestionNotification,
} from "./notifications";
import { handleEventChangeAnalytics, NewEventsNotifications } from "./events";
import { sendAdminEmail, sendEmail } from "./emailNotifcation";
//const cors = require('cors')({ origin: true });
// import { aggregateQuestionSetResponses } from './questionSets';
// import { updateNewEventsAnalytics, NewEventsNotifications, updateNotifications } from './new-event-notifications';
initializeApp(config());

export const app = express();

export const api = onRequest(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send(`Did this work?`);
});

////////////////////    User Roles    ///////////////////////////

exports.processUnregisteredUserRoles = pubsub
  .schedule("0,30 * * * *")
  // .schedule('every 5 minutes')
  .timeZone("America/Denver")
  .onRun(async () => {
    await updateUnregisteredUserRoles();
  });

app.get("/updateAdmins", async (req, res) => {
  await updateUnregisteredUserRoles();
  res.status(200).send("finished");
});

app.get("/updatePassword", async (req, res) => {
  // const user = '';
  // const newPassword = '';

  // admin.auth().updateUser(user, {password: newPassword}).then(() => {
  // Update successful.
  res.status(200).send("done");
  // }).catch(() => {
  //   res.status(200).send('broken');
  // });
});

export const orgAdminUpdated = onDocumentWritten(
  "organizations/{orgId}/userRoles/{docId}",
  async (event) => {
    const newUserData = event.data?.after;
    const oldUserData = event.data?.before;

    return processUserRolesChange(newUserData, oldUserData, event.params);
  }
);

////////////////////    Events    ///////////////////////////

export const eventUpdated = onDocumentWritten(
  "organizations/{orgId}/events/{docId}",
  async (event) => {
    const oldEvent = event.data?.before;
    const newEvent = event.data?.after;

    // console.log('before',JSON.stringify(oldEvent))
    // console.log('after',JSON.stringify(newEvent))

    await handleEventChangeAnalytics(event.params.orgId, oldEvent, newEvent);

    //    console.log('Event updated for org: '+context.params.orgId+', change: '+context.params.docId);
  }
);

// app.get('/test-new-event-notifications', async (req,res)=>{

//     await NewEventsNotifications('Daily');
//     res.status(200).send('finished');
// });

exports.dailyNotificationsPush = pubsub
  .schedule("0 20 * * *")
  .timeZone("America/Denver")
  .onRun(async () => {
    console.log("Daily New Events Notification");

    await NewEventsNotifications("Daily");
  });

exports.weeklyNotificationsPush = pubsub
  .schedule("0 20 * * 6")
  // .schedule('every 5 minutes')
  .timeZone("America/Denver")
  .onRun(async () => {
    console.log("Weekly New Events Notification");
    await NewEventsNotifications("Weekly");
  });

exports.monthlyNotificationsPush = pubsub
  .schedule("0 20 1 * *")
  // .schedule('every 5 minutes')
  .timeZone("America/Denver")
  .onRun(async () => {
    console.log("Monthly New Events Notification");
    await NewEventsNotifications("Monthly");
  });

////////////////////    Notifications    ///////////////////////////

exports.updateNotifications = pubsub
  .schedule("0,5,10,15,20,25,30,35,40,45,50,55 * * * *")
  // .schedule('every 5 minutes')
  .timeZone("America/Denver")
  .onRun(async () => {
    await updateScheduledNotifications();
  });

export const newNotification = onDocumentCreated(
  "organizations/{orgId}/notifications-sent/{docId}",
  async (event) => {
    const notification: any = event.data;
    const orgName =
      (
        await getFirestore()
          .collection("organizations")
          .doc(event.params.orgId)
          .get()
      ).get("name") || "";

    /* const users = await getFirestore().doc("organizations/{orgId}/users").get();
    console.log(users);
    let filteredUserToken: any = [];
    users.forEach(async (item: any) => {
      if (item.push_notification) {
        item.push_notification.interest.forEach(async (value: any) => {
          if (notification.interests == value.id) {
            let token = JSON.parse(item.push_notification.fcm_token);
            filteredUserToken.push(token);
          }
        });
      }
    }); */

    const notificationTopic = notification.attachedPostId
      ? `org-${event.params.orgId}-event-${notification.attachedPostId}`
      : `announcements-org-${event.params.orgId}`;
    const data = {
      orgId: event.params.orgId,
      id: notification.id,
      date: JSON.stringify(notification.date),
      title: notification.title,
      description: notification.description,
      htmlDescription: notification.htmlDescription,
    };
    return sendNotification(
      notificationTopic,
      orgName + ": " + notification.title,
      notification.description,
      data
    );
    //    console.log('notification updated for org: '+event.params.orgId+', change: '+event.params.docId);
  }
);

export const newPostNotification = onDocumentCreated(
  "organizations/{orgId}/posts/{docId}",
  async (event) => {
    const notification: any = event.data;

    /* const user = await getFirestore().doc("organizations/{orgId}/users").get();
    console.log(user); */
    /* let filteredUserToken: any = [];
    users.forEach(async (item: any) => {
      if (item.push_notification) {
        item.push_notification.interest.forEach(async (value: any) => {
          if (notification.interest == value.id) {
            let token = JSON.parse(item.push_notification.fcm_token);
            filteredUserToken.push(token);
          }
        });
      }
    }); */

    if (notification.isNotification) {
      const notificationTopic = notification.attachedPostId
        ? `org-${event.params.orgId}-post-${notification.attachedPostId}`
        : `announcements-org-${event.params.orgId}`;
      const data = {
        orgId: event.params.orgId,
        id: notification.id,
        type: "post",
      };
      return sendEventNotification(
        notificationTopic,
        "New Post Added",
        notification.title,
        data
      );
    }

    /* if (notification.isNotification) {
      const notificationTopic = notification.attachedPostId
        ? `org-${event.params.orgId}-event-${notification.attachedPostId}`
        : `announcements-org-${event.params.orgId}`;
      return sendEventNotification(
        notificationTopic,
        "New Event Added",
        notification.name
      );
    } */

    /* const notificationTopic = notification.attachedPostId
      ? `org-${event.params.orgId}-post-${notification.attachedPostId}`
      : `announcements-org-${event.params.orgId}`;
    return sendEventNotification(
      notificationTopic,
      "New Post Added",
      notification.title
    ); */
  }
);

export const sendPostMail = onDocumentCreated(
  "organizations/{orgId}/posts/{docId}",
  async (event) => {
    let details = event.data;
    let users;
    users = await getFirestore()
      .collection("organizations/" + event.params.orgId + "/users")
      .get();
    console.log("email", users.docs);

    let userData: any[] = [];
    let allEmails: any[] = [];
    userData = users.docs.map((doc) => doc.data());
    userData.forEach((item) => {
      allEmails.push(item.email);
    });
    console.log("email - list", allEmails);
    // returning result
    return sendEmail(details, allEmails, "New Post Created");
  }
);

export const sendEventMail = onDocumentCreated(
  "organizations/{orgId}/events/{docId}",
  async (event) => {
    let details = event.data;
    let users;
    users = await getFirestore()
      .collection("organizations/" + event.params.orgId + "/users")
      .get();
    console.log("email", users.docs);

    let userData: any[] = [];
    let allEmails: any[] = [];
    userData = users.docs.map((doc) => doc.data());
    userData.forEach((item) => {
      allEmails.push(item.email);
    });
    console.log("email - list", allEmails);
    // returning result
    return sendEmail(details, allEmails, "New Event Created");
  }
);

export const sendMessageAdminMail = onDocumentCreated(
  "organizations/{orgId}/messaging/{docId}",
  async (event) => {
    let details = event.data;
    let users;
    console.log("details", details);
    users = await getFirestore()
      .collection("organizations/" + event.params.orgId + "/userRoles")
      .get();
    console.log("email", users);

    let userData: any[] = [];
    let allEmails: any[] = [];
    userData = users.docs.map((doc) => doc.data());
    userData.forEach((item) => {
      allEmails.push(item.email);
    });
    console.log("email - list", allEmails);
    // returning result
    return sendAdminEmail(details, allEmails, "Message");
  }
);

export const sendReportAdminMail = onDocumentCreated(
  "organizations/{orgId}/reports/{docId}",
  async (event) => {
    let details = event.data;
    let users;
    console.log("details", details);
    users = await getFirestore()
      .collection("organizations/" + event.params.orgId + "/userRoles")
      .get();
    console.log("email", users);

    let userData: any[] = [];
    let allEmails: any[] = [];
    userData = users.docs.map((doc) => doc.data());
    userData.forEach((item) => {
      allEmails.push(item.email);
    });
    console.log("email - list", allEmails);
    // returning result
    return sendAdminEmail(details, allEmails, "Report");
  }
);

export const newEventNotification = onDocumentCreated(
  "organizations/{orgId}/events/{docId}",
  async (event) => {
    const notification: any = event.data;

    /* const users = (await getFirestore().collection('organizations').doc(event.params.orgId).get()).get('users').data();
    console.log(users)
    let filteredUserToken : any = []
    users.forEach(async (item: any) => {
      if (item.push_notification) {
        item.push_notification.interest.forEach(async (value: any) => {
          if (notification.interest == value.id) {
            let token = JSON.parse(item.push_notification.fcm_token)
            filteredUserToken.push(token);
          }
        })
      }
    }) */

    if (notification.isNotification) {
      const notificationTopic = notification.attachedPostId
        ? `org-${event.params.orgId}-event-${notification.attachedPostId}`
        : `announcements-org-${event.params.orgId}`;
      const data = {
        orgId: event.params.orgId,
        id: notification.id,
        type: "event",
      };
      console.log("notification data ===>", data);
      return sendEventNotification(
        notificationTopic,
        "New Event Added",
        notification.name,
        data
      );
    }
  }
);

export const newQuestionNotification = onDocumentCreated(
  "organizations/{orgId}/events/{docId}",
  async (event) => {
    const notification: any = event.data;
    notification.orgSelected.forEach(async (org: any) => {
      let users = await getFirestore()
        .collection("organizations/" + org + "/users")
        .get();
      let userData = users.docs.map((doc) => doc.data());
      userData.forEach((item) => {
        const data = {
          orgId: org,
          id: notification.id,
          type: notification.questionSetType,
        };
        const notificationTopic = notification.attachedQuestionId
          ? `org-${org}-question-${notification.attachedQuestionId}`
          : `announcements-org-${org}`;
        console.log("notification data ===>", data);
        return sendQuestionNotification(
          notificationTopic,
          "New " + notification.questionSetType + " Added",
          notification.title,
          data,
          item.push_notification.fcm_token
        );
      });
    });
  }
);
////////////////////    Question Sets    ///////////////////////////

// export const newQuestionSetResponse = onDocumentWritten(
//   "organizations/{orgId}/questionSetResults/{questionSetId}/userResponses/{responseUserId}",
//   async (event) => {
//     const oldResponse = event.data?.before;
//     const newResponse = event.data?.after;

//     await aggregateQuestionSetResponses(
//       questionSetId,
//       oldResponse,
//       newResponse
//     );
//   }
// );
