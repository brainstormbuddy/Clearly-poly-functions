import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
export async function processUserRolesChange(
  newUser: any,
  oldUser: any,
  params: any
) {
  if (newUser && newUser.email) {
    await getAuth()
      .getUserByEmail(newUser.email)
      .then(async (data) => {
        if (data.emailVerified) {
          if (params.docId === data.uid) {
            const org: any = { id: params.orgId, role: newUser.role };

            await getFirestore()
              .collection(`admins/${data.uid}/myOrganizations`)
              .doc(params.orgId)
              .set(org, { merge: true });
          } else {
            newUser.id = data.uid;
            await getFirestore()
              .collection(`organizations/${params.orgId}/userRoles`)
              .doc(data.uid)
              .set(newUser, { merge: true });
            await getFirestore()
              .collection(`organizations/${params.orgId}/userRoles`)
              .doc(params.docId)
              .delete()
              .catch(() => {});
          }
        }
      })
      .catch(async (e) => {
        console.log("email not found:", e);
        // if(e.message.indexOf('no user record') != -1){
        newUser.orgId = params.orgId;
        await getFirestore()
          .collection(`organizations/${params.orgId}/userRoles-unregistered/`)
          .doc(params.docId)
          .set(newUser, { merge: true });
        // }
      });
  } else {
    await getAuth()
      .getUserByEmail(oldUser.email)
      .then(async (data) => {
        if (params.docId === data.uid) {
          await getFirestore()
            .collection(`admins/${data.uid}/myOrganizations`)
            .doc(params.orgId)
            .delete()
            .catch(() => {});
        } else {
          await getFirestore()
            .collection(`organizations/${params.orgId}/userRoles-unregistered/`)
            .doc(params.docId)
            .delete()
            .catch(() => {});
        }
      });
  }
}

export async function updateUnregisteredUserRoles() {
  return getFirestore()
    .collectionGroup("userRoles-unregistered")
    .get()
    .then(async (querySnapshot) => {
      await querySnapshot.forEach(async (doc) => {
        const user = doc.data();
        await getAuth()
          .getUserByEmail(user.email)
          .then(async (userAuth) => {
            if (userAuth.emailVerified) {
              const org: any = { id: user.orgId, role: user.role };
              user.id = userAuth.uid;

              await getFirestore()
                .collection(`admins/${userAuth.uid}/myOrganizations`)
                .doc(user.orgId)
                .set(org, { merge: true });
              await getFirestore()
                .collection(`organizations/${user.orgId}/userRoles`)
                .doc(userAuth.uid)
                .set(user, { merge: true });
              await getFirestore()
                .collection(`organizations/${user.orgId}/userRoles`)
                .doc(doc.id)
                .delete()
                .catch(() => {});
              await getFirestore()
                .collection(
                  `organizations/${user.orgId}/userRoles-unregistered`
                )
                .doc(doc.id)
                .delete()
                .catch(() => {});
            }
          })
          .catch(async (e) => console.log("email not found:", e));
        // console.log('unregistered users',doc.id,JSON.stringify(doc.data()));
      });
    });
}
