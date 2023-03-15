import {DataSnapshot} from "firebase-admin/database";
import {Change, EventContext} from "firebase-functions/v1";
import {firestore} from "firebase-admin";
import {FieldValue, WriteResult} from "firebase-admin/firestore";


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
