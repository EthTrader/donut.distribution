import fs from "fs"
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const voterList = []
const pollID = [
    "0xde6d1cd369cf31fb206d3a31c66791990be4f688e0fafea55be5fd5cd05bf6c8"
]

const ROUND = 130
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
