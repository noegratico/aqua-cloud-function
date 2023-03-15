import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import {DataSnapshot} from "firebase-admin/database";
// import {Change, EventContext} from "firebase-functions/v1";
import {UserRecord} from "firebase-admin/auth";
import {addUserLevelToClaims, addUserToFireStore} from "./user-functions/account";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";
// import {addSensorDataToDatabase} from "./realtime-data-functions/sensor";

admin.initializeApp();

const firestore = admin.firestore();

const signUp = functions.auth.user().onCreate((user: UserRecord) => {
  addUserToFireStore(firestore, user);
});

const beforeSignIn = functions.auth.user().beforeSignIn((user: AuthUserRecord) => {
  addUserLevelToClaims(firestore, user);
});

// const realtimeSensorData = functions.database.ref("/sensors").onWrite((snap: Change<DataSnapshot>, contex: EventContext) => {
//   addSensorDataToDatabase(firestore, snap, contex);
// });

export {signUp, beforeSignIn};
