const { expect } = require("chai");
const { BigNumber, utils, Contract } = require("ethers")
const {
  defaultAbiCoder,
  parseEther,
  hexlify,
  toUtf8Bytes,
  joinSignature,
  formatBytes32String,
  Interface,
  SigningKey,
  keccak256
} = utils;
const aclABI = require("../abi/ACL.json")
const kernelABI = require("../abi/Kernel.json")

const distribution = require("../out/aggDist_2021-03-29_proofs.QmSK2S8cAHBRJW1BkKianGZazaTZdMqgHKLDmu123XzNKu.json")

const networkData = {
  mainnet: {
    chainId: 1,
    token0Address: "0xbe1fffB262a2C3e65c5eb90f93caf4eDC7d28c8d",  // $contrib
    token1Address: "0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9",  // $donut
    tokenManager0: "0x98566E0E6209Fd4C76a55F56F4F93fbE18214e98",
    tokenManager1: "0x3D361F670C3099627e7e9Ae9c3d6644B0DDF8f69",
    merkleTwoDropAddress: "0xEbE1645A82ecEfA9375F6E329f5ce664864981FA",
    multisigAddress: "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E",
    acl: "0xBcb2bd7Bf0Bc88890c1FB76bD22D50286E665506",
    kernel: "0x57EBE61f5f8303AD944136b293C1836B3803b4c0"
  }
}
const NETWORK = networkData.mainnet
const MINT_ROLE = keccak256(toUtf8Bytes("MINT_ROLE"))

const deployerAddress = "0x459f5ad95D9faD4034c5623D5FaA59E456d1c4ed"
const carlslarsonAddress = "0x95D9bED31423eb7d5B68511E0352Eae39a3CDD20"
let carlslarsonSigner, multisigSigner, deployerSigner, account1, account2, token0, token1, merkleTwoDrop, acl, kernel
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

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [deployerAddress]
  })
  deployerSigner = await ethers.provider.getSigner(deployerAddress)
  // send some xDai to the impersonated multisig to fund tx
  await carlslarsonSigner.sendTransaction({to: NETWORK.multisigAddress, value: ethers.utils.parseEther("1")});

  token0 = await ethers.getContractAt("IERC20", NETWORK.token0Address);
  token1 = await ethers.getContractAt("IERC20", NETWORK.token1Address);

  acl = new Contract(NETWORK.acl, aclABI, deployerSigner)
  kernel = new Contract(NETWORK.kernel, kernelABI, deployerSigner)

  // const MerkleTwoDrop = await ethers.getContractFactory("MerkleTwoDrop")
  // merkleTwoDrop = await MerkleTwoDrop.deploy();
  merkleTwoDrop = await ethers.getContractAt("MerkleTwoDrop", NETWORK.merkleTwoDropAddress);
})

describe("MerkleTwoDrop", function() {
  // it("initialize", async function() {
  //   await merkleTwoDrop.initialize(NETWORK.tokenManager0, NETWORK.tokenManager1, NETWORK.multisigAddress)
  //
  //   expect(await merkleTwoDrop.startAuth()).to.equal(NETWORK.multisigAddress)
  // });

  // it("grant", async function() {
  //   await acl.grantPermission(merkleTwoDrop.address, NETWORK.tokenManager0, MINT_ROLE)
  //   await acl.grantPermission(merkleTwoDrop.address, NETWORK.tokenManager1, MINT_ROLE)
  //
  //   let hasPermission = await kernel.hasPermission(merkleTwoDrop.address, NETWORK.tokenManager0, MINT_ROLE, "0x")
  //
  //   expect(hasPermission).to.be.true
  // });
  //
  // it("start", async function() {
  //   await merkleTwoDrop.initialize(NETWORK.tokenManager0, NETWORK.tokenManager1, NETWORK.multisigAddress)
  //   await merkleTwoDrop.connect(multisigSigner).start(distribution.root)
  //
  //   expect(await merkleTwoDrop.airdrops(1)).to.equal(distribution.root)
  // });

  it("claim", async function() {
    // await merkleTwoDrop.initialize(NETWORK.tokenManager0, NETWORK.tokenManager1, NETWORK.multisigAddress)
    // await acl.grantPermission(merkleTwoDrop.address, NETWORK.tokenManager0, MINT_ROLE)
    // await acl.grantPermission(merkleTwoDrop.address, NETWORK.tokenManager1, MINT_ROLE)
    await merkleTwoDrop.connect(multisigSigner).start(distribution.root)
    const balStart = await token0.balanceOf(carlslarsonAddress)

    const award = distribution.awards.find(a=>a.username==="u/carlslarson")

    await merkleTwoDrop.award(1, award.address, award.amount0, award.amount1, award.proof)

    const balEnd = await token0.balanceOf(carlslarsonAddress)

    expect(balStart.add(award.amount0)).to.equal(balEnd)
  });
});
