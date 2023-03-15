import {firestore, auth} from "firebase-admin";
import {logger} from "firebase-functions";
import {UserRecord} from "firebase-admin/auth";
import {WriteResult} from "firebase-admin/firestore";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";

interface User {
  email: string,
  userLevel: string
}

/**
 * Creates a record to owned database
 * @param {firestore.Firestore} firestore - firestore instance
 * @param {UserRecord} user - user created during signup
 */
export async function addUserToFireStore(firestore: firestore.Firestore, user: UserRecord) {
  const result: WriteResult = await firestore.collection("users").doc(user.uid).set({
    isActive: user.emailVerified,
    email: user.email,
  });
  logger.write({message: "User inserted", severity: "INFO", writeTime: result.writeTime.toDate()});
}

/**
 * @param {firestore.Firestore} firestore - firestore instance
 * @param {AuthUserRecord} user - verified user object
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
