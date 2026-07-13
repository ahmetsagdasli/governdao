import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  mine,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const VOTING_DELAY = 1;
const VOTING_PERIOD = 300;
const PROPOSAL_THRESHOLD = 0;
const QUORUM_FRACTION = 4;
const TIMELOCK_MIN_DELAY = 300;

enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed,
}

async function deployGovernanceFixture() {
  const [deployer, voter2, other] = await ethers.getSigners();

  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(deployer.address);

  const TimelockController = await ethers.getContractFactory(
    "TimelockController"
  );
  const timelock = await TimelockController.deploy(
    TIMELOCK_MIN_DELAY,
    [],
    [],
    deployer.address
  );

  const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
  const governor = await DAOGovernor.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    VOTING_DELAY,
    VOTING_PERIOD,
    PROPOSAL_THRESHOLD,
    QUORUM_FRACTION
  );

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(await timelock.getAddress());

  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  await timelock.grantRole(PROPOSER_ROLE, await governor.getAddress());
  await timelock.grantRole(CANCELLER_ROLE, await governor.getAddress());
  await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  await timelock.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);

  await token.connect(deployer).delegate(deployer.address);

  return {
    token,
    timelock,
    governor,
    treasury,
    deployer,
    voter2,
    other,
    roles: { PROPOSER_ROLE, CANCELLER_ROLE, EXECUTOR_ROLE, DEFAULT_ADMIN_ROLE },
  };
}

async function proposeStore(
  governor: any,
  treasury: any,
  proposer: any,
  newValue: number,
  description: string
) {
  const targets = [await treasury.getAddress()];
  const values = [0n];
  const calldatas = [treasury.interface.encodeFunctionData("store", [newValue])];

  const proposalId = await governor
    .connect(proposer)
    .propose.staticCall(targets, values, calldatas, description);

  await governor.connect(proposer).propose(targets, values, calldatas, description);

  const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

  return { targets, values, calldatas, descriptionHash, proposalId };
}

describe("Governance lifecycle", function () {
  it("wires roles exactly as in the deploy script", async function () {
    const { timelock, governor, deployer, roles } = await loadFixture(
      deployGovernanceFixture
    );

    expect(
      await timelock.hasRole(roles.PROPOSER_ROLE, await governor.getAddress())
    ).to.equal(true);
    expect(
      await timelock.hasRole(roles.EXECUTOR_ROLE, ethers.ZeroAddress)
    ).to.equal(true);
    expect(
      await timelock.hasRole(roles.DEFAULT_ADMIN_ROLE, deployer.address)
    ).to.equal(false);
  });

  it("Treasury.store() called directly by deployer reverts with OwnableUnauthorizedAccount", async function () {
    const { treasury, deployer } = await loadFixture(deployGovernanceFixture);
    await expect(treasury.connect(deployer).store(1))
      .to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount")
      .withArgs(deployer.address);
  });

  it("full lifecycle: propose -> active -> vote -> succeeded -> queue -> execute", async function () {
    const { governor, treasury, deployer } = await loadFixture(
      deployGovernanceFixture
    );

    const { targets, values, calldatas, descriptionHash, proposalId } =
      await proposeStore(governor, treasury, deployer, 42, "Set value to 42");

    expect(await governor.state(proposalId)).to.equal(ProposalState.Pending);

    await mine(VOTING_DELAY + 1);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Active);

    await governor.connect(deployer).castVote(proposalId, 1);

    await mine(VOTING_PERIOD + 1);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Succeeded);

    await governor.queue(targets, values, calldatas, descriptionHash);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Queued);

    await time.increase(TIMELOCK_MIN_DELAY + 1);

    await governor.execute(targets, values, calldatas, descriptionHash);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Executed);
    expect(await treasury.value()).to.equal(42);
  });

  it("Hardhat trial: 10 delegated accounts vote for a new proposal", async function () {
    const { token, governor, treasury, deployer } = await loadFixture(
      deployGovernanceFixture
    );
    const voters = (await ethers.getSigners()).slice(1, 11);
    const voterShare = ethers.parseUnits("10000", 18);

    for (const voter of voters) {
      await token.connect(deployer).transfer(voter.address, voterShare);
      await token.connect(voter).delegate(voter.address);
    }

    const { targets, values, calldatas, descriptionHash, proposalId } =
      await proposeStore(
        governor,
        treasury,
        deployer,
        101,
        "Hardhat trial proposal with 10 voters"
      );

    await mine(VOTING_DELAY + 1);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Active);

    for (const voter of voters) {
      await expect(governor.connect(voter).castVote(proposalId, 1))
        .to.emit(governor, "VoteCast")
        .withArgs(voter.address, proposalId, 1, voterShare, "");
      expect(await governor.hasVoted(proposalId, voter.address)).to.equal(true);
    }

    const [againstVotes, forVotes, abstainVotes] =
      await governor.proposalVotes(proposalId);
    expect(againstVotes).to.equal(0n);
    expect(forVotes).to.equal(voterShare * BigInt(voters.length));
    expect(abstainVotes).to.equal(0n);

    await mine(VOTING_PERIOD + 1);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Succeeded);

    await governor.queue(targets, values, calldatas, descriptionHash);
    await time.increase(TIMELOCK_MIN_DELAY + 1);
    await governor.execute(targets, values, calldatas, descriptionHash);

    expect(await governor.state(proposalId)).to.equal(ProposalState.Executed);
    expect(await treasury.value()).to.equal(101);
  });

  it("double vote reverts (GovernorAlreadyCastVote)", async function () {
    const { governor, treasury, deployer } = await loadFixture(
      deployGovernanceFixture
    );

    const { proposalId } = await proposeStore(
      governor,
      treasury,
      deployer,
      1,
      "Proposal double vote"
    );

    await mine(VOTING_DELAY + 1);
    await governor.connect(deployer).castVote(proposalId, 1);

    await expect(governor.connect(deployer).castVote(proposalId, 1))
      .to.be.revertedWithCustomError(governor, "GovernorAlreadyCastVote")
      .withArgs(deployer.address);
  });

  it("vote before Active reverts; vote after deadline reverts", async function () {
    const { governor, treasury, deployer } = await loadFixture(
      deployGovernanceFixture
    );

    const { proposalId } = await proposeStore(
      governor,
      treasury,
      deployer,
      1,
      "Proposal timing"
    );

    // Still Pending: voting before the snapshot must revert.
    await expect(governor.connect(deployer).castVote(proposalId, 1)).to.be
      .reverted;

    await mine(VOTING_DELAY + 1);
    await mine(VOTING_PERIOD + 1);
    // Deadline has passed: voting must revert.
    await expect(governor.connect(deployer).castVote(proposalId, 1)).to.be
      .reverted;
  });

  it("proposal with votes below 4% quorum ends Defeated; queue reverts", async function () {
    const { token, governor, treasury, deployer, voter2 } = await loadFixture(
      deployGovernanceFixture
    );

    // voter2 gets a tiny, insufficient sliver of voting power before the snapshot.
    await token.connect(deployer).transfer(voter2.address, ethers.parseUnits("10", 18));
    await token.connect(voter2).delegate(voter2.address);

    const { targets, values, calldatas, descriptionHash, proposalId } =
      await proposeStore(governor, treasury, voter2, 1, "Below quorum proposal");

    await mine(VOTING_DELAY + 1);
    await governor.connect(voter2).castVote(proposalId, 1);

    await mine(VOTING_PERIOD + 1);
    expect(await governor.state(proposalId)).to.equal(ProposalState.Defeated);

    await expect(
      governor.queue(targets, values, calldatas, descriptionHash)
    ).to.be.reverted;
  });

  it("execute before timelock delay elapses reverts", async function () {
    const { governor, treasury, deployer } = await loadFixture(
      deployGovernanceFixture
    );

    const { targets, values, calldatas, descriptionHash, proposalId } =
      await proposeStore(governor, treasury, deployer, 7, "Early execute");

    await mine(VOTING_DELAY + 1);
    await governor.connect(deployer).castVote(proposalId, 1);
    await mine(VOTING_PERIOD + 1);

    await governor.queue(targets, values, calldatas, descriptionHash);

    await expect(
      governor.execute(targets, values, calldatas, descriptionHash)
    ).to.be.reverted;
  });

  it("tokens acquired after the proposal snapshot grant zero voting power on that proposal", async function () {
    const { token, governor, treasury, deployer, voter2 } = await loadFixture(
      deployGovernanceFixture
    );

    const { proposalId } = await proposeStore(
      governor,
      treasury,
      deployer,
      1,
      "Snapshot timing proposal"
    );

    const snapshot = await governor.proposalSnapshot(proposalId);

    // voter2 acquires and delegates tokens AFTER the snapshot was taken.
    await mine(VOTING_DELAY + 1);
    await token.connect(deployer).transfer(voter2.address, ethers.parseUnits("5000", 18));
    await token.connect(voter2).delegate(voter2.address);

    expect(await token.getPastVotes(voter2.address, snapshot)).to.equal(0n);
  });

  it("castVoteWithReason emits VoteCast with the reason string", async function () {
    const { governor, treasury, deployer } = await loadFixture(
      deployGovernanceFixture
    );

    const { proposalId } = await proposeStore(
      governor,
      treasury,
      deployer,
      1,
      "Reasoned vote proposal"
    );

    await mine(VOTING_DELAY + 1);

    const votingPower = await governor.getVotes(
      deployer.address,
      await governor.proposalSnapshot(proposalId)
    );

    await expect(
      governor.connect(deployer).castVoteWithReason(proposalId, 1, "I agree")
    )
      .to.emit(governor, "VoteCast")
      .withArgs(deployer.address, proposalId, 1, votingPower, "I agree");
  });
});
