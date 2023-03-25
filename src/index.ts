import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  addUserLevelToClaims,
  registerUser,
  deactivateOrActivateUser,
  getProfile as getInfo,
  listUsers as getUsers,
  updateUser as changeUserDetials,
  User,
  ActivationAndDeactivationPayload,
  updateProfile,
} from "./user-functions/account";
import {getSensorRecentData, getSensorHistoricalData, SensorParameter} from "./sensor-data-functions/sensor";
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
  return changeUserDetials(firestore, data, context);
});

const activationAndDeactivationOfUser = functions.https.onCall((data: ActivationAndDeactivationPayload, context: CallableContext) => {
  return deactivateOrActivateUser(firestore, data, context);
});

const getProfile = functions.https.onCall((_: unknown, context: CallableContext) => {
  return getInfo(firestore, context);
});

const updateUserInfo = functions.https.onCall((data: User, context: CallableContext) => {
  return updateProfile(firestore, data, context);
});

const getSensorData = functions.https.onCall(() => {
  return getSensorRecentData(firestore);
});

const getAllSensorData = functions.https.onCall((data: SensorParameter) => {
  return getSensorHistoricalData(firestore, data);
});

export {
  beforeSignIn,
  signUp,
  listUsers,
  updateUser,
  activationAndDeactivationOfUser,
  getProfile,
  updateUserInfo,
  getSensorData,
  getAllSensorData,
};
