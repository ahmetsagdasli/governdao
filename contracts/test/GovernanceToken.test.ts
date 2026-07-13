import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function deployTokenFixture() {
  const [deployer, holder, other] = await ethers.getSigners();
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(holder.address);
  return { token, deployer, holder, other };
}

describe("GovernanceToken", function () {
  it("mints 1,000,000e18 to initial holder", async function () {
    const { token, holder } = await loadFixture(deployTokenFixture);
    expect(await token.balanceOf(holder.address)).to.equal(
      ethers.parseUnits("1000000", 18)
    );
  });

  it("voting power is 0 before delegation", async function () {
    const { token, holder } = await loadFixture(deployTokenFixture);
    expect(await token.getVotes(holder.address)).to.equal(0n);
  });

  it("delegate(self) activates voting power equal to balance", async function () {
    const { token, holder } = await loadFixture(deployTokenFixture);
    await token.connect(holder).delegate(holder.address);
    expect(await token.getVotes(holder.address)).to.equal(
      await token.balanceOf(holder.address)
    );
  });

  it("transfer moves voting power via checkpoints (getPastVotes at previous block unchanged)", async function () {
    const { token, holder, other } = await loadFixture(deployTokenFixture);
    await token.connect(holder).delegate(holder.address);
    await token.connect(other).delegate(other.address);

    const blockBeforeTransfer = await ethers.provider.getBlockNumber();

    await token
      .connect(holder)
      .transfer(other.address, ethers.parseUnits("1000", 18));
    await ethers.provider.send("evm_mine", []);

    const pastVotesHolder = await token.getPastVotes(
      holder.address,
      blockBeforeTransfer
    );
    expect(pastVotesHolder).to.equal(ethers.parseUnits("1000000", 18));

    const currentVotesHolder = await token.getVotes(holder.address);
    expect(currentVotesHolder).to.equal(
      ethers.parseUnits("999000", 18)
    );
  });

  it("permit signature flow sets allowance without a transaction from the owner", async function () {
    const { token, holder, other } = await loadFixture(deployTokenFixture);

    const value = ethers.parseUnits("500", 18);
    const deadline = ethers.MaxUint256;
    const nonce = await token.nonces(holder.address);
    const network = await ethers.provider.getNetwork();

    const domain = {
      name: "GovernDAO Token",
      version: "1",
      chainId: network.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: holder.address,
      spender: other.address,
      value,
      nonce,
      deadline,
    };

    const signature = await holder.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature);

    await token.permit(
      holder.address,
      other.address,
      value,
      deadline,
      v,
      r,
      s
    );

    expect(await token.allowance(holder.address, other.address)).to.equal(
      value
    );
  });
});
