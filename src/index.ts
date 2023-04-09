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
  logActivity,
  getUserLogs,
} from "./user-functions/account";
import {getSensorRecentData, getSensorHistoricalData, SensorParameter, generateReports} from "./sensor-data-functions/sensor";
import {AuthUserRecord} from "firebase-functions/lib/common/providers/identity";
import {CallableContext} from "firebase-functions/v1/https";

admin.initializeApp();

const firestore = admin.firestore();
const storage = admin.storage();

const myStorageFunction = functions.region("asia-southeast1");

const beforeSignIn = myStorageFunction.auth.user().beforeSignIn((user: AuthUserRecord) => {
  addUserLevelToClaims(firestore, user);
});

const signUp = myStorageFunction.https.onCall((data: User, context: CallableContext) => {
  return registerUser(firestore, data, context);
});

const listUsers = myStorageFunction.https.onCall((_: unknown, context: CallableContext) => {
  return getUsers(firestore, context);
});

const updateUser = myStorageFunction.https.onCall((data: User, context: CallableContext) => {
  return changeUserDetials(firestore, data, context);
});

const activationAndDeactivationOfUser = myStorageFunction.https.onCall((data: ActivationAndDeactivationPayload, context: CallableContext) => {
  return deactivateOrActivateUser(firestore, data, context);
});

const getProfile = myStorageFunction.https.onCall((_: unknown, context: CallableContext) => {
  return getInfo(firestore, context);
});

const updateUserInfo = myStorageFunction.https.onCall((data: User, context: CallableContext) => {
  return updateProfile(firestore, data, context);
});

const getSensorData = myStorageFunction.https.onCall(() => {
  return getSensorRecentData(firestore);
});

const getAllSensorData = myStorageFunction.https.onCall((data: SensorParameter) => {
  return getSensorHistoricalData(firestore, data);
});

const generateAllReports = myStorageFunction.runWith({
  timeoutSeconds: 300,
}).https.onCall(() => {
  return generateReports(firestore, storage);
});

const logUserActivity = myStorageFunction.https.onCall((data: {[key: string]: unknown}, context: CallableContext) => {
  return logActivity(firestore, data, context);
});

const getAllUserLogs = myStorageFunction.https.onCall((_: unknown, context: CallableContext) => {
  return getUserLogs(firestore, context);
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
  generateAllReports,
  logUserActivity,
  getAllUserLogs,
};
