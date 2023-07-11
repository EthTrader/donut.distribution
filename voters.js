import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const voterList = []
const pollID = [
//    "0xb5798a57894b34a62b18d4fb66d46421c7deecdac1da814a02f9567bd3261e71"
]

const ROUND = 125
const LABEL = `round_${ROUND}`

const out = {label: LABEL}


marshallPolls();

async function marshallPolls() {
    for (const input of pollID) {
        const result = await showGraphQLData(input)
    }

    out.voters = voterList
    const newFileNameBase = `${__dirname}/out/voters_${LABEL}`
    fs.writeFileSync(`${newFileNameBase}.json`, JSON.stringify(out))
    fs.copyFileSync(`${newFileNameBase}.json`, `${__dirname}/docs/voters.json`)


    console.log(`total voters in Round ${ROUND}: ${voterList.length}`)
}

async function showGraphQLData(ID) {
    const query = `
        query {
            votes(
                first: 1000, 
                where: {
                    proposal: "${ID}"
                }) {
            voter
            }
        }
    `;

    const votes = await fetch("https://hub.snapshot.org/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            query
        })
    }).then(response => response.json());
    
    const voters = votes.data.votes;
    voters.forEach( c => {
        const address = Object.values(c).toString()
        const exists = voterList.some(obj => obj.address == address);
        if(!exists){
            const voter = {
                address,
                qty: 1
           }
           voterList.push(voter)
        } else {
            const index = voterList.findIndex(obj => obj.address == address);
            voterList[index].qty++
        }
    })
}
