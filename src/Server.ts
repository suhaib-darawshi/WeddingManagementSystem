import {join} from "path";
import {Configuration, Inject} from "@tsed/di";
import {PlatformApplication} from "@tsed/common";
import "@tsed/platform-express"; // /!\ keep this import
import "@tsed/ajv";
import "@tsed/mongoose";
import {config} from "./config/index";
import * as rest from "./controllers/rest/index";
import { CustomSocketService } from "./services/CustomSocketService";
import { BackupService } from "./services/BackupService";

@Configuration({
  ...config,
  acceptMimes: ["application/json"],
  httpPort: parseInt(process.env.PORT!),
  httpsPort: false, // CHANGE
  disableComponentsScan: true,
  mount: {
    "/rest": [
      ...Object.values(rest)
    ],
    "/socket":[CustomSocketService]
  },
  middlewares: [
    "cors",
    "cookie-parser",
    "compression",
    "method-override",
    "json-parser",
    { use: "urlencoded-parser", options: { extended: true }}
  ],
  socketIO: {
    path: "/socket.io",
    serveClient: true,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
  },
  views: {
    root: join(process.cwd(), "../views"),
    extensions: {
      ejs: "ejs"
    }
  },
  exclude: [
    "**/*.spec.ts"
  ],
  statics: {
    "/public": join(process.cwd(), "./public"),
  },
  // multer: {
  //   dest: join(process.cwd(), "./public/uploads"),
  // },
})
export class Server {
  @Inject()
  protected app: PlatformApplication;
  @Inject() backup:BackupService
  @Configuration()
  protected settings: Configuration;
  async $onInit(): Promise<void>{
    
  }
}
