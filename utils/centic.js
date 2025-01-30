import { getAgent, delay } from "./function.js";
import { Wallet } from "ethers";
import log from "./logger.js";
import chalk from "chalk";
import axios from "axios";
import fakeUserAgent from "fake-useragent";

class CenticConnection {
  constructor(proxy = null, privateKey = null) {
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Host: "develop.centic.io",
      Origin: "https://centic.io",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent": fakeUserAgent(),
    };
    this.proxy = proxy;
    this.axiosConfig = {
      ...(this.proxy && { httpsAgent: getAgent(this.proxy) }),
      timeout: 60000,
    };
    this.wallet = privateKey && new Wallet(privateKey);
  }

  getWallet() {
    return this.wallet;
  }

  formatSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    seconds = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  generateNonce() {
    return Math.floor(Math.random() * (999999 - 10000 + 1)) + 10000;
  }

  async generatePayload(nonce) {
    try {
      const wallet = this.getWallet();
      const address = wallet.address;

      const message = `I am signing my one-time nonce: ${nonce}.\n\nNote: Sign to log into your Centic account. This is free and will not require a transaction.`;
      const signature = await wallet.signMessage(message);

      return { address, signature };
    } catch (error) {
      return { address: null, signature: null };
    }
  }

  hideAccount(account) {
    return `${account.slice(0, 3)}***${account.slice(-3)}`;
  }

  async sendRequest(method, url, config = {}, retries = 10) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config,
        });
        return response;
      } catch (error) {
        if (i === retries - 1) {
          log.error(`Max retries reached - Request failed:`, error.message);
          if (this.proxy) {
            log.error(`Failed proxy: ${this.proxy}`, error.message);
          }
          return null;
        }

        process.stdout.write(
          chalk.yellow(
            `request failed: ${error.message} => Retrying... (${
              i + 1
            }/${retries})\r`
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return null;
  }

  async userLogin(address, nonce, signature) {
    const url = "https://develop.centic.io/dev/v3/auth/login";
    const data = { address, nonce, signature };
    const headers = {
      ...this.headers,
      "Content-Type": "application/json",
      "x-Apikey": "dXoriON31OO1UopGakYO9f3tX2c4q3oO7mNsjB2nJsKnW406",
    };

    const response = await this.sendRequest("post", url, {
      data: JSON.stringify(data),
      headers: headers,
    });

    return response.data.apiKey;
  }

  async userInfo(apikey) {
    const url = "https://develop.centic.io/ctp-api/centic-points/user-info";
    const headers = {
      ...this.headers,
      "x-Apikey": apikey,
    };

    const response = await this.sendRequest("get", url, {
      headers: headers,
    });

    return response.data;
  }

  async userTasks(apikey) {
    const url = "https://develop.centic.io/ctp-api/centic-points/tasks";
    const headers = {
      ...this.headers,
      "x-Apikey": apikey,
    };

    const response = await this.sendRequest("get", url, {
      headers: headers,
    });

    return response.data;
  }

  async claimTasks(apikey, task) {
    const url = "https://develop.centic.io/ctp-api/centic-points/claim-tasks";
    const headers = {
      ...this.headers,
      "x-Apikey": apikey,
    };

    try {
      const response = await this.sendRequest("post", url, {
        data: task,
        headers: headers,
      });
      log.info(`Claimed task Response:`, response.data.message);
    } catch (error) {
      log.error(`Error claiming task:`, error.message);
    }
  }

  async processAccounts() {
    const nonce = this.generateNonce();
    const { address, signature } = await this.generatePayload(nonce);

    if (!address || !signature) {
      log.error(
        `Account ${this.hideAccount(address)} Failed to generate payload...`
      );
      return;
    }

    log.debug(`Logging in...`);
    const apikey = await this.userLogin(address, nonce, signature);
    if (!apikey) {
      log.error(`Account ${this.hideAccount(address)} Failed to gET apikey...`);
      return;
    }

    log.debug(`Retrieving user information...`);
    const user = await this.userInfo(apikey);
    if (user) {
      const balance = user.totalPoint || 0;
      log.info(
        `Account ${this.hideAccount(address)} Total CTP Balance:`,
        balance
      );
    } else {
      log.error(`Account ${this.hideAccount(address)} Data is empty...`);
    }

    await delay(1);
    log.debug(`Retrieving user tasks...`);
    const taskResponse = await this.userTasks(apikey);

    if (taskResponse) {
      const unclaimedTasks = [];
      const categories = [
        "Daily Tasks",
        "Daily login",
        "Social Tasks",
        "Special Tasks",
        "Bonus Reward",
      ];

      categories.forEach((category) => {
        const tasks = taskResponse[category];
        if (Array.isArray(tasks)) {
          tasks.forEach((task) => {
            if (!task.claimed) {
              unclaimedTasks.push({ taskId: task._id, point: task.point });
            }
          });
        } else if (tasks && typeof tasks === "object") {
          if (!tasks.claimed) {
            unclaimedTasks.push({ taskId: tasks._id, point: tasks.point });
          }
        }
      });

      if (unclaimedTasks.length === 0) {
        log.warn(`No unclaimed tasks available...`);
        return;
      }

      log.info(`Unclaimed tasks:`, unclaimedTasks.length);

      for (const task of unclaimedTasks) {
        log.info(`Claiming task:`, task.taskId);
        await this.claimTasks(apikey, task);
      }

      log.success(`All tasks have been completed!`);
    } else {
      log.error(`Task data not found`);
    }
  }
}

export default CenticConnection;
