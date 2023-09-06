import Promise from "bluebird"
import snoowrap from "snoowrap"
import csv from "csvtojson"
import jsonexport from "jsonexport"
import fs from "fs"
import ipfsClient from "ipfs-http-client"
import fetch from "node-fetch"
import merklize from "./merklize.js"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inactive = []

const LABEL = `round_127`
const FILE = `${LABEL}.csv`
const DATE = Math.floor(Date.now() / 1000) - 5184000 

const credentials = {
  userAgent: 'Read Bot 1.0 by u/EthTraderCommunity',
  clientId: process.env.REDDIT_SCRIPT_CLIENT_ID,
  clientSecret: process.env.REDDIT_SCRIPT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
}

const reddit = new snoowrap(credentials)
const banList = (await reddit.getSubreddit('ethtrader').getBannedUsers({limit: Infinity}).map(({ name }) => name))

main()

async function main(){
    /* 
    If we need to fetch the entire Users list uncomment both lines below
    Processing via Reddit API will take quite a long time. 
    */

    // const users = await fetch("https://ethtrader.github.io/donut.distribution/users.json").then(res=>res.json())
    // const names = users.map(({ username }) => username)
    
    const distributionCSV = await csv().fromFile(`${__dirname}/in/${FILE}`)    
    const namesDistribution = distributionCSV.map(({ username }) => username.replace(new RegExp('^u/'),""))

    const tipCSV = (await fetch(`https://ethtrader.github.io/community-mod/donut_upvote_rewards_${LABEL}.json`).then(res=>res.json())).rewards
    const namesTips = tipCSV.map(({ username }) => username)
    
    let names = [...namesDistribution, ...namesTips].filter(e => e)
    names = [...new Set(names)];
    
    const removedList = await Promise.mapSeries(names, checkAccounts)
    
    const cleanList = removedList.filter(element => {
      return element !== null;
    });

    const newFileNameBase = `${__dirname}/out/ineligible_${LABEL}`
    fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(cleanList, null, 2))
    fs.copyFileSync(`${newFileNameBase}.json`, `${__dirname}/docs/ineligible.json`)
    const csvOut = await jsonexport(cleanList)
    fs.writeFileSync(`${newFileNameBase}.csv`, csvOut)
}


async function checkAccounts(name){
  await wait(2500)
  console.log(`checking ${name}`)
  let user, newUser, newPoster, deletedUser, suspendedUser, bannedUser, removalReason

  if(name == "[deleted]") {
    deletedUser = true
    removalReason = 'deleted'
    console.log(`removed  ${name}: account deleted`)
  }

  if (banList.includes(name)) {
    bannedUser = true
    removalReason = 'banned'
    console.log(`removed  ${name}: account banned`)
  }

  try {
    user = await reddit.getUser(name).fetch()
    let karma = user.link_karma + user.comment_karma
    if (user.is_suspended) {
      suspendedUser = true
      removalReason = 'suspended'
      console.log(`removed  ${name}: account suspended`)
    } else if(karma < 1000) {
      newPoster = true
      removalReason = 'karma'
      console.log(`removed  ${name}: karma < 1000`)
    } else if (user.created > DATE) {
      newUser = true
      removalReason = 'age'
      console.log(`removed  ${name}: account age < 60 days`)
    }
  } catch(e){
    if (e.statusCode = 404) {
      deletedUser = true
      removalReason = 'deleted'
      console.log(`removed  ${name}: account deleted`)
    } else {
      console.log(e.error)
    }
  }
  
  if(newUser || newPoster || deletedUser || bannedUser || suspendedUser) {
    var removedUser = {
      username: name, 
      removal: removalReason
    }
    return removedUser
  } else return null
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
