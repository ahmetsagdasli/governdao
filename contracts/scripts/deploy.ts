import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Governance parameters (see README for rationale / production values).
const VOTING_DELAY = 1; // blocks
const VOTING_PERIOD = 300; // blocks (~60 min on Sepolia)
const PROPOSAL_THRESHOLD = 0;
const QUORUM_FRACTION = 4; // percent
const TIMELOCK_MIN_DELAY = 300; // seconds

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);

  console.log("\n[1/7] Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("  GovernanceToken deployed:", tokenAddress);

  console.log("\n[2/7] Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory(
    "TimelockController"
  );
  const timelock = await TimelockController.deploy(
    TIMELOCK_MIN_DELAY,
    [],
    [],
    deployer.address
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("  TimelockController deployed:", timelockAddress);

  console.log("\n[3/7] Deploying DAOGovernor...");
  const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
  const governor = await DAOGovernor.deploy(
    tokenAddress,
    timelockAddress,
    VOTING_DELAY,
    VOTING_PERIOD,
    PROPOSAL_THRESHOLD,
    QUORUM_FRACTION
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("  DAOGovernor deployed:", governorAddress);

  console.log("\n[4/7] Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(timelockAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("  Treasury deployed:", treasuryAddress);

  console.log("\n[5/7] Wiring timelock roles (security-critical, exact order)...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  await (await timelock.grantRole(PROPOSER_ROLE, governorAddress)).wait();
  console.log("  Granted PROPOSER_ROLE to governor");

  await (await timelock.grantRole(CANCELLER_ROLE, governorAddress)).wait();
  console.log("  Granted CANCELLER_ROLE to governor");

  await (await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress)).wait();
  console.log("  Granted EXECUTOR_ROLE to address(0) (open execution)");

  await (
    await timelock.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address)
  ).wait();
  console.log("  Renounced DEFAULT_ADMIN_ROLE from deployer (backdoor removed)");

  console.log("\n[6/7] Self-delegating deployer's tokens...");
  await (await token.delegate(deployer.address)).wait();
  console.log("  Deployer delegated voting power to self");

  console.log("\n[7/7] Writing deployment record...");
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const blockNumber = await ethers.provider.getBlockNumber();

  const deployment = {
    network: network.name,
    chainId: Number(chainId),
    blockNumber,
    deployer: deployer.address,
    contracts: {
      GovernanceToken: tokenAddress,
      TimelockController: timelockAddress,
      DAOGovernor: governorAddress,
      Treasury: treasuryAddress,
    },
    parameters: {
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THRESHOLD,
      QUORUM_FRACTION,
      TIMELOCK_MIN_DELAY,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const outPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("  Deployment record written to", outPath);

  console.log("\nVerification commands:");
  console.log(
    `  npx hardhat verify --network ${network.name} ${tokenAddress} ${deployer.address}`
  );
  console.log(
    `  npx hardhat verify --network ${network.name} ${timelockAddress} ${TIMELOCK_MIN_DELAY} "[]" "[]" ${deployer.address}`
  );
  console.log(
    `  npx hardhat verify --network ${network.name} ${governorAddress} ${tokenAddress} ${timelockAddress} ${VOTING_DELAY} ${VOTING_PERIOD} ${PROPOSAL_THRESHOLD} ${QUORUM_FRACTION}`
  );
  console.log(
    `  npx hardhat verify --network ${network.name} ${treasuryAddress} ${timelockAddress}`
  );

  console.log("\nDeployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
