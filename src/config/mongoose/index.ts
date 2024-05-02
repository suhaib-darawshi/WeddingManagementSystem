// @tsed/cli do not edit
import defaultConfig from "./default.config";

export default [
  defaultConfig,
  {id: "backup",
  url: process.env.BACKUP_URL!,
  connectionOptions: { }}
];
