import {SensorData, Table} from "../sensor-data-functions/sensor";

/**
 * @param {SensorData[]} data
 * @param {string} title
 * @param {string} subtitle
 * @return {Table}
 */
export function createTabularReport(data: SensorData[], title: string, subtitle: string): Table {
  const table = {
    title,
    subtitle,
    headers: [
      {label: "Value", property: "value", width: 60, renderer: null},
      {label: "Datetime", property: "convertedDatetime", width: 150, renderer: null},
    ],
    datas: data,
  };
  return table;
}
