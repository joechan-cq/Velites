import { Command } from "./base";
import * as WebdriverIO from "webdriverio";

/**
 * 启动应用命令类
 */
export class LaunchAppCommand extends Command {
  name: string = "launch_app";
  description: string = "启动指定的应用";

  /**
   * 应用ID
   * @type {string}
   */
  app_id: string;

  constructor(params: { app_id: string }) {
    super(params);
    this.app_id = params.app_id;
    this.validate();
  }

  validate(): void {
    if (!this.app_id) {
      throw new Error("launch_app command must have a valid app_id parameter");
    }
  }

  async execute(driver: WebdriverIO.Browser): Promise<any> {
    return await driver.activateApp(this.app_id);
  }
}
