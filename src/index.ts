import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {addUserLevelToClaims, registerUser, User} from "./user-functions/account";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";
import {CallableContext} from "firebase-functions/v1/https";

admin.initializeApp();

const firestore = admin.firestore();

const beforeSignIn = functions.auth.user().beforeSignIn((user: AuthUserRecord) => {
  addUserLevelToClaims(firestore, user);
});

const signUp = functions.https.onCall((data: User, context: CallableContext) => {
  registerUser(firestore, data, context);
});


export {beforeSignIn, signUp};
