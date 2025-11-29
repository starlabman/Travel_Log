async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const TravelLog = await ethers.getContractFactory("TravelLog");
  const travel = await TravelLog.deploy();
  await travel.deployed();

  console.log("TravelLog deployed to:", travel.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
