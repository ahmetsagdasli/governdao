import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function deployTreasuryFixture() {
  const [deployer, timelockStandIn, other] = await ethers.getSigners();
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(timelockStandIn.address);
  return { treasury, deployer, timelockStandIn, other };
}

describe("Treasury", function () {
  it("owner is timelock", async function () {
    const { treasury, timelockStandIn } = await loadFixture(
      deployTreasuryFixture
    );
    expect(await treasury.owner()).to.equal(timelockStandIn.address);
  });

  it("non-owner store reverts", async function () {
    const { treasury, other } = await loadFixture(deployTreasuryFixture);
    await expect(treasury.connect(other).store(10))
      .to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
  });

  it("owner store succeeds and emits ValueChanged", async function () {
    const { treasury, timelockStandIn } = await loadFixture(
      deployTreasuryFixture
    );
    await expect(treasury.connect(timelockStandIn).store(99))
      .to.emit(treasury, "ValueChanged")
      .withArgs(99, timelockStandIn.address);
    expect(await treasury.value()).to.equal(99);
  });
});
