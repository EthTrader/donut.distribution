const { expect } = require("chai");
const { BigNumber, utils } = require("ethers")
const {
  defaultAbiCoder,
  parseEther,
  hexlify,
  toUtf8Bytes,
  joinSignature,
  formatBytes32String,
  Interface,
  SigningKey
} = utils;

const l2_distribution = require("../out/round_94_l2.QmedzXbevX9cnP6njLFxHMA7D8BsPN9gDebYJU1wDytPQW.json")

const networkData = {
  xdai: {
    chainId: 100,
    tokenAddress: "0x524B969793a64a602342d89BC2789D43a016B13A",
    distributeAddress: "0xea0B2A9a711a8Cf9F9cAddA0a8996c0EDdC44B37",
    multisigAddress: "0x682b5664C2b9a6a93749f2159F95c23fEd654F0A"
  }
}
const NETWORK = networkData.xdai

const carlslarsonAddress = "0x95D9bED31423eb7d5B68511E0352Eae39a3CDD20"
let carlslarsonSigner, multisigSigner, account1, account2, token, distribute
const account1PrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

beforeEach(async function() {
  [account1, account2] = await ethers.getSigners()

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [NETWORK.multisigAddress]
  })
  multisigSigner = await ethers.provider.getSigner(NETWORK.multisigAddress)

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [carlslarsonAddress]
  })
  carlslarsonSigner = await ethers.provider.getSigner(carlslarsonAddress)
  // send some xDai to the impersonated multisig to fund tx
  await carlslarsonSigner.sendTransaction({to: NETWORK.multisigAddress, value: ethers.utils.parseEther("1")});

  token = await ethers.getContractAt("IERC20", NETWORK.tokenAddress);

  // const Distribute = await ethers.getContractFactory("Distribute")
  // distribute = await Distribute.deploy();
  distribute = await ethers.getContractAt("Distribute", NETWORK.distributeAddress);
})

describe("Distribute", function() {
  it("distribute", async function() {
    const MAX_BATCH_SIZE = 30
    const NUM_BATCHES = Math.ceil(l2_distribution.length/MAX_BATCH_SIZE)

    const batches = new Array(NUM_BATCHES)
    .fill()
    .map(_ => l2_distribution.splice(0, MAX_BATCH_SIZE))

    console.log(batches)
    batches.forEach((b,i)=>{
      console.log(`\n!!! BATCH ${i} !!!\n`)
      console.log(`["${b.map(a=>a.address).join('","')}"]`)
      console.log(`["${b.map(a=>parseEther(a.donut.toString()).toString()).join('","')}"]`)
    })


    // expect(l2_distribution.length).to.equal(recipientsBatch1.length+recipientsBatch2.length)
    // expect(l2_distribution.length).to.equal(amountsBatch1.length+amountsBatch2.length)
    // console.log(`# recipients: ${l2_distribution.length}`)

    // const recipients = [account1.address, account2.address]
    // const amounts = [parseEther("100"), parseEther("200")]

    let approveTx = await token.connect(multisigSigner).approve(distribute.address, ethers.constants.MaxUint256)
    // console.log(approveTx)

    let distributeTx1 = await distribute.connect(multisigSigner).distribute(batches[0].map(a=>a.address), batches[0].map(a=>parseEther(a.donut.toString())), token.address)
    console.log("gasUsed:", (await distributeTx1.wait()).gasUsed)

    expect(await token.balanceOf(batches[0].address)).to.equal(parseEther(batches[0].donut.toString()))
    // expect(await token.balanceOf(l2_distribution[l2_distribution.length-1].address)).to.equal(parseEther(l2_distribution[l2_distribution.length-1].donut.toString()))
  });
});
