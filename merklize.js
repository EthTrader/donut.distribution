const MerkleTree = require("merkle-tree-solidity").default
const { bufferToHex, keccak256, setLengthLeft, setLengthRight, toBuffer } = require("ethereumjs-util")
const csv = require('csvtojson')
const BigNumber = require('bignumber.js')

const decimals = new BigNumber(10).pow(18)

module.exports = function(data, addressField, amount0Field, amount1Field, include) {
  const awards = data.reduce((prev, curr)=>{
    const address = curr[addressField]
    const existing = prev.find(u=>u.address===address)
    const amount0 = new BigNumber(curr[amount0Field])
    const amount1 = new BigNumber(curr[amount1Field])
    if(existing) {
      existing.amount0 = existing.amount0 ? existing.amount0.plus(amount0) : amount0
      existing.amount1 = existing.amount1 ? existing.amount1.plus(amount1) : amount1
    } else {
      const award = {address, amount0, amount1}
      if(Array.isArray(include)) include.forEach(f=>award[f]=curr[f])
      prev.push(award)
    }
    return prev
  }, [])

  const awardHashBuffers = awards.map(r=>{
    r.amount0 = r.amount0.times(decimals)
    r.amount1 = r.amount1.times(decimals)
    const addressBuffer = toBuffer(r.address)
    const amount0Buffer = setLengthLeft(toBuffer("0x"+r.amount0.toString(16)), 32)
    const amount1Buffer = setLengthLeft(toBuffer("0x"+r.amount1.toString(16)), 32)
    const hashBuffer = keccak256(Buffer.concat([addressBuffer, amount0Buffer, amount1Buffer]))
    const hash = bufferToHex(hashBuffer)
    r.amount0 = r.amount0.toFixed()
    r.amount1 = r.amount1.toFixed()

    return hashBuffer
  })

  const merkleTree = new MerkleTree(awardHashBuffers)

  const root = bufferToHex(merkleTree.getRoot())

  awards.forEach((award,idx)=>{
    award.proof = merkleTree.getProof(awardHashBuffers[idx]).map(p=>bufferToHex(p))
    return award
  })

  console.log(`root:`, root)

  return {root, awards}
}
