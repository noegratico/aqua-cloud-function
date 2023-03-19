import {firestore, auth} from "firebase-admin";
import {logger} from "firebase-functions";
import {UserRecord} from "firebase-admin/auth";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";
import {CallableContext} from "firebase-functions/v1/https";
import * as functions from "firebase-functions";

export interface User {
  id?: string,
  email?: string,
  userLevel: string,
  name: string,
  password?: string,
}

// /**
//  * Creates a record to owned database
//  * @param {firestore.Firestore} firestore - firestore instance
//  * @param {UserRecord} user - user created during signup
//  */
// export async function addUserToFireStore(firestore: firestore.Firestore, user: UserRecord) {
//   const result: WriteResult = await firestore.collection("users").doc(user.uid).set({
//     isActive: user.emailVerified,
//     email: user.email,
//   });
//   logger.write({message: "User inserted", severity: "INFO", writeTime: result.writeTime.toDate()});
// }

/**
 * @param {firestore.Firestore} firestore - firestore instance
 * @param {AuthUserRecord} user - verified user object
 * @return {Promise<void>}
 */
export async function addUserLevelToClaims(firestore: firestore.Firestore, user: AuthUserRecord): Promise<void> {
  const userRef = firestore.collection("users").doc(user.uid);
  const doc = await userRef.get();
  logger.write({message: "User exsit", severity: "INFO", exist: doc.exists});
  if (doc.exists) {
    const userFromRecord = doc.data() as User;
    logger.write({message: "User exsit", severity: "INFO", userDetails: userFromRecord});
    const customClaims = userFromRecord.userLevel === "admin" ? {"admin": true} : {"member": true};
    return auth().setCustomUserClaims(user.uid, customClaims);
  } else {
    // TODO - insert to firestore as user
  }
}

/**
 *
 * @param {firestore.Firestore} firestore
 * @param {User} data
 * @param {CallableContext} context
 * @return {Promise<User>}
 */
export async function registerUser( firestore: firestore.Firestore, data: User, context: CallableContext): Promise<User> {
  if (context.auth?.token.admin) {
    const user:UserRecord = await auth().createUser({email: data.email, password: data.password});
    await firestore.collection("users").doc(user.uid).set({
      name: data.name,
      userLevel: data.userLevel,
    });
    return {
      id: user.uid,
      email: user.email,
      userLevel: data.userLevel,
      name: data.name,
    };
  }
  throw new functions.https.HttpsError("permission-denied", "Admin only access!");
}
