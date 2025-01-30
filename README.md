# Centic Automates Complete Quests

This bot will automatically get user information and complete daily quests to earn Centric Points (CTP).

## Bot Features
- Automatically Get Account Information
- Automatically Claim Quest & Daily Reward
- Support Proxy
- Support Multiple Accounts

## Prerequisites
- Make sure you have Node.js installed on your machine
- `accounts.txt` file containing private_key
- `proxy.txt` file containing your proxy lists

## Installation
1. Clone the repostory:
```
git clone https://github.com/rinkashimee/centic-bot.git
```
```
cd centic-bot
```
2. Install the required dependencies:
```
npm install
```
3. Input your private_key in `accounts.txt` file, one user per line:
```
nano accounts.txt
```
4. Optional, you can use proxy:
- Input your proxy lists in `proxy.txt` file, Format `http://username:password@ip:port` || `socks5://username:password@ip:port`
```
nano proxy.txt
```
5. Run the script:
```
npm run start
```
## License: MIT
This project uses the MIT License, details of which can be found in the LICENSE file.
