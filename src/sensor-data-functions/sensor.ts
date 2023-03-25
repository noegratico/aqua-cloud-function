import {DataSnapshot} from "firebase-admin/database";
import {Change, EventContext} from "firebase-functions/v1";
import {firestore} from "firebase-admin";
import {FieldValue, WriteResult} from "firebase-admin/firestore";

interface SensorData {
  value: string,
  datetime: Date
}

export interface SensorParameter {
  collectionName: string
}

/**
 * Add data to firestore
 * @param {firestore.Firestore} firestore - firestore instance
 * @param {Change<DataSnapshot>} snap - changed value
 * @param {EventContext} context - event context
 * @return {PromiseLike}
 */
export function addSensorDataToDatabase(firestore: firestore.Firestore, snap: Change<DataSnapshot>, context: EventContext): PromiseLike<WriteResult> {
  const key = snap.after.key != null ? snap.after.key : "";
  return firestore.collection("sesors").doc(key).set({
    value: snap.after.val(),
    timestamp: FieldValue.serverTimestamp(),
    eventType: context.eventType,
  });
}

/**
 * @param {firestore.Firestore} firestore
 */
export async function getSensorRecentData(firestore: firestore.Firestore) {
  return {
    acLevel: await findRecentSensorData(firestore, "ac_level"),
    humidity: await findRecentSensorData(firestore, "humidity"),
    lightResistance: await findRecentSensorData(firestore, "light_resistance"),
    phLevel: await findRecentSensorData(firestore, "ph_level"),
    snapA: await findRecentSensorData(firestore, "snap_a"),
    snapB: await findRecentSensorData(firestore, "snap_b"),
    temperature: await findRecentSensorData(firestore, "temperature"),
    waterLevel: await findRecentSensorData(firestore, "water_level"),
  };
}

/**
 * @param {firestore.Firestore} firestore
 * @param {SensorParameter} data
 */
export async function getSensorHistoricalData(firestore: firestore.Firestore, data: SensorParameter) {
  return {
    data: (await getSortedSensorData(firestore, data.collectionName).get()).docs.map((element) => mapDataToSensorData(element.data())),
  };
}

/**
 * @param {firestore.Firestore} firestore
 * @param {string} collectionName
 * @return {firestore.Query<firestore.DocumentData>}
 */
function getSortedSensorData(firestore: firestore.Firestore, collectionName: string): firestore.Query<firestore.DocumentData> {
  return firestore.collection(collectionName).orderBy("datetime", "desc");
}

/**
 * @param {firestore.Firestore} firestore
 * @param {string} collectionName
 * @return {Promise<SensorData | undefined>}
 */
async function findRecentSensorData(firestore: firestore.Firestore, collectionName: string): Promise<SensorData | undefined> {
  return mapDataToSensorData((await getSortedSensorData(firestore, collectionName).get()).docs.find(isNotNull)?.data());
}

/**
 * @param {firestore.QueryDocumentSnapshot<firestore.DocumentData>} element
 * @return {boolean}
 */
function isNotNull(element: firestore.QueryDocumentSnapshot<firestore.DocumentData>): boolean {
  return element.data() != null;
}

/**
 * @param {firestore.DocumentData} data
 * @return {SensorData | undefined}
 */
function mapDataToSensorData(data: firestore.DocumentData | undefined): SensorData | undefined {
  return data && {
    value: data.value,
    datetime: data.datetime,
  };
}
