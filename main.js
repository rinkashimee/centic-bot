import banner from "./utils/banner.js";
import log from "./utils/logger.js";
import { delay, readFile, checkMainIP } from "./utils/function.js";
import CenticConnection from "./utils/centic.js";
import chalk from "chalk";

async function main() {
  log.info(banner());
  await delay(2);

  const proxies = await readFile("proxy.txt");
  const accounts = await readFile("accounts.txt");

  if (accounts.length === 0) {
    log.error("No accounts found. Program terminated.");
    return;
  }
  if (proxies.length === 0) {
    log.warn(
      "No proxies detected in proxy.txt. Running without proxy support."
    );
  }

  log.info("Initializing program with all Accounts:", accounts.length);

  while (true) {
    for (let i = 0; i < accounts.length; i++) {
      const privateKey = accounts[i % accounts.length];
      const proxy = proxies[Math.floor(Math.random() * proxies.length)] || null;
      try {
        const centic = new CenticConnection(proxy, privateKey);
        const wallet = centic.getWallet();

        let proxyHost;
        if (proxy) {
          const proxyUrl = new URL(proxy);
          proxyHost = proxyUrl.hostname;
        } else {
          proxyHost = await checkMainIP();
        }

        log.info("-".repeat(100));
        log.debug(
          `Currently processing account: [${i + 1}/${accounts.length}]`
        );

        log.info(
          `Processing wallet address: ${centic.hideAccount(
            wallet.address
          )} with proxy:`,
          proxyHost
        );
        await centic.processAccounts();

        log.warn(`Waiting 1 seconds before processing next account...`);
        await delay(1);
      } catch (error) {
        log.error(`Error Processing account:`, error.message);
      }
    }
    log.info("-".repeat(100));

    let seconds = 86400;
    while (seconds > 0) {
      const centic = new CenticConnection();
      const formattedTime = centic.formatSeconds(seconds);
      process.stdout.write(
        `${chalk.cyan(
          `Waiting for ${formattedTime} hours before fetching tasks again...`
        )}\r`
      );
      await delay(1);
      seconds--;
    }
  }
}

main();
