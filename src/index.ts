import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {addUserLevelToClaims, registerUser, listUsers as getUsers, updateUser as changeUserDetials, User} from "./user-functions/account";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";
import {CallableContext} from "firebase-functions/v1/https";

admin.initializeApp();

const firestore = admin.firestore();

const beforeSignIn = functions.auth.user().beforeSignIn((user: AuthUserRecord) => {
  addUserLevelToClaims(firestore, user);
});

const signUp = functions.https.onCall((data: User, context: CallableContext) => {
  return registerUser(firestore, data, context);
});

const listUsers = functions.https.onCall((_: unknown, context: CallableContext) => {
  return getUsers(firestore, context);
});

const updateUser = functions.https.onCall((data: User, context: CallableContext) => {
  changeUserDetials(firestore, data, context);
});


export {beforeSignIn, signUp, listUsers, updateUser};
