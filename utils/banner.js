import figlet from "figlet";
import chalk from "chalk";

const banner = () => {
  const textBanner = figlet.textSync("Centic Bot", {
    font: "ANSI Shadow",
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 100,
  });

  let output = [];
  output.push("\x1b[2J\x1b[H");
  output.push(`${chalk.magenta(textBanner)}`);
  output.push(`${chalk.cyanBright("Telegram: https://t.me/rinkashi_me")}\n\n`);

  return output.join("\n");
};

export default banner;
