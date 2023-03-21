/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {firestore, auth} from "firebase-admin";
import {logger} from "firebase-functions";
import {UserRecord} from "firebase-admin/auth";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";
import {CallableContext} from "firebase-functions/v1/https";
import * as functions from "firebase-functions";
import lodash from "lodash";

export interface User {
  id?: string,
  email?: string,
  userLevel: string,
  name: string,
  password?: string,
}

export interface UserList {
  users: User[]
}

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
export async function registerUser(firestore: firestore.Firestore, data: User, context: CallableContext): Promise<User> {
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

/**
 * @param {firestore.Firestore} firestore
 * @param {CallableContext} context
 * @return {Promise<User>}
 */
export async function listUsers(firestore: firestore.Firestore, context: CallableContext): Promise<UserList> {
  if (context.auth?.token.admin) {
    const userRecords = await auth().listUsers();
    const userRef = await firestore.collection("users").get();
    const users = userRecords.users.map((userRecord: UserRecord) => {
      const user = userRef.docs.find((doc) => doc.id === userRecord.uid)?.data() as User;
      return {
        id: userRecord.uid,
        email: userRecord.email,
        userLevel: user.userLevel,
        name: user.name,
      };
    });
    return {users};
  }
  throw new functions.https.HttpsError("permission-denied", "Admin only access!");
}

/**
 * @param {firestore.Firestore} firestore
 * @param {User} data
 * @param {CallableContext} context
 */
export async function updateUser(firestore: firestore.Firestore, data: User, context: CallableContext) {
  validateUserPayload(data);
  if (context.auth?.token.admin) {
    const userDetails = {
      ...data.name != null && {name: data.name},
      ...data.userLevel != null && {userLevel: data.userLevel},
    };

    if (!lodash.isEmpty(userDetails)) {
      const userRef = await firestore.collection("users").doc(data.id!);
      await userRef.update({});
    }

    const userCredentials = {
      ...data.email != null && {email: data.email},
      ...data.password != null && {password: data.password},
    };

    if (!lodash.isEmpty(userCredentials)) {
      await auth().updateUser(data.id!, userCredentials);
    }
  }
  throw new functions.https.HttpsError("permission-denied", "Admin only access!");
}

/**
 * @param {User} payload - User payload
 */
function validateUserPayload(payload: User): void | never {
  if (payload.id != null) {
    return;
  }
  throw new functions.https.HttpsError("invalid-argument", "Please pass valid payload!");
}
