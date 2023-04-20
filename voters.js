import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const voterList = []
const pollID = [
    "0x6a278d5d0c8e5fe5df366c9519e6f75e1ca6167696e9b736ec9ae3750b3ccfce",
    "0x9fc2f1e4d6907ea60406937bfe79439c4d8d379a699d4a22a0efdedc06114f54"
]

const ROUND = 122
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