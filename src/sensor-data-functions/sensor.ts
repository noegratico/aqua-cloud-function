/* eslint-disable @typescript-eslint/no-explicit-any */
import {DataSnapshot} from "firebase-admin/database";
import {Change, EventContext} from "firebase-functions/v1";
import {firestore, storage} from "firebase-admin";
import {FieldValue, WriteResult} from "firebase-admin/firestore";
import {isEmpty} from "lodash";
import PDFDocument from "pdfkit-table";
import {createTabularReport} from "../util/pdfUtiliy";

export interface SensorData {
  value: string,
  datetime: Date
}

export type Table = any;

interface ReportsFields {
  lastFileUploaded: string
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
    ecLevel: await findRecentSensorData(firestore, "ec_level"),
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
 * @param {storage.Storage} storage
 */
export function generateReports(firestore: firestore.Firestore, storage: storage.Storage) {
  // generate daily
  generateDaily(firestore, storage);
}

/**
 * @param {firestore.Firestore} firestore
 * @param {storage.Storage} storage
 */
async function generateDaily(firestore: firestore.Firestore, storage: storage.Storage) {
  const lastFileUploaded = ((await firestore.collection("reports").doc("daily").get()).data() as ReportsFields).lastFileUploaded;
  const startDate = (isEmpty(lastFileUploaded) ? getYesterdayDate() : getTommorrowDate(lastFileUploaded));
  const endDate = new Date();
  const dates: Date[] = [];

  while (startDate <= endDate) {
    dates.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 1);
  }
  Promise.resolve(dates.map(async (value) => {
    // get data from firestore
    const temperatures = await getSensorDataAsPerDate(firestore, "temperature", value);
    const ecLevel = await getSensorDataAsPerDate(firestore, "ec_level", value);
    const humidity = await getSensorDataAsPerDate(firestore, "humidity", value);
    const lightResistance = await getSensorDataAsPerDate(firestore, "light_resistance", value);
    const phLevel = await getSensorDataAsPerDate(firestore, "ph_level", value);
    const waterLevel = await getSensorDataAsPerDate(firestore, "water_level", value);
    const snapA = await getSensorDataAsPerDate(firestore, "snap_a", value);
    const snapB = await getSensorDataAsPerDate(firestore, "snap_b", value);
    const fileName = `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
    const fileRef = storage.bucket("daily-reports").file(fileName + ".pdf");
    const doc = new PDFDocument();
    await new Promise<void>((resolve, reject) => {
      const writeStream = fileRef.createWriteStream({
        resumable: false,
        contentType: "application/pdf",
      });
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (e) => reject(e));
      doc.pipe(writeStream);
      doc.table(createTabularReport(temperatures, "Temperature", `Records of Temperature for the day of ${fileName}`));
      doc.table(createTabularReport(ecLevel, "EC Level", `Records of EC Level for the day of ${fileName}`));
      doc.table(createTabularReport(humidity, "Humidity", `Records of Humidity for the day of ${fileName}`));
      doc.table(createTabularReport(lightResistance, "Light Resistance", `Records of Light Resistance for the day of ${fileName}`));
      doc.table(createTabularReport(phLevel, "PH Level", `PH Levels for ${fileName}`));
      doc.table(createTabularReport(waterLevel, "Water Level", `Records of Water Level for the day of ${fileName}`));
      doc.table(createTabularReport(snapA, "Snap A", `Records of Snap A for the day of ${fileName}`));
      doc.table(createTabularReport(snapB, "Snap B", `Records of Snap B for the day of ${fileName}`));
      doc.end();
    });
    // generate daily report
  })).then(() => {
    // update lastFileUploaded in daily collection
    const fileDate = dates[dates.length - 1];
    firestore.collection("reports").doc("daily").update({lastFileUploaded: `${fileDate.getFullYear()}-${fileDate.getMonth() + 1}-${fileDate.getDate()}`});
  });
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
/**
 * @return {Date}
 */
function getYesterdayDate(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/**
 * @param {string} date
 * @return {Date}
 */
function getTommorrowDate(date: string): Date {
  const tommorrow = new Date(date);
  tommorrow.setDate(tommorrow.getDate() + 1);
  return tommorrow;
}

/**
 * @param {firestore.Firestore} firestore
 * @param {string} collectionName
 * @param {Date} date
 */
async function getSensorDataAsPerDate(firestore: firestore.Firestore, collectionName: string, date: Date) {
  return (await firestore.collection(collectionName)
    .where("datetime", "<=", new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`))
    .orderBy("datetime", "desc").get()).docs.map((value) => value.data() as SensorData);
}
