const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    // Récupération du compte déployeur
    const [deployer] = await ethers.getSigners();
    
    console.log("\n=== Déploiement du contrat TravelLog ===");
    console.log("Compte déployeur:", deployer.address);
    console.log("Solde du compte:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

    // Déploiement du contrat
    console.log("\nDéploiement en cours...");
    const TravelLog = await ethers.getContractFactory("TravelLog");
    const travelLog = await TravelLog.deploy();
    
    console.log("En attente de la confirmation...");
    await travelLog.deployed();

    console.log("\n✅ Contrat déployé avec succès !");
    console.log("Adresse du contrat:", travelLog.address);
    
    // Création du dossier frontend s'il n'existe pas
    const frontendDir = path.join(__dirname, "..", "frontend");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    
    // Sauvegarde de l'adresse du contrat pour le frontend
    const contractAddressPath = path.join(frontendDir, "contract-address.json");
    const contractData = {
      TravelLog: travelLog.address,
      network: "localhost",
      chainId: 31337,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      contractAddressPath,
      JSON.stringify(contractData, null, 2)
    );
    
    console.log(`\n📄 Adresse du contrat enregistrée dans: ${contractAddressPath}`);
    
    // Sauvegarde de l'ABI pour le frontend
    const contractArtifact = await hre.artifacts.readArtifact("TravelLog");
    const abiPath = path.join(frontendDir, "TravelLog.json");
    fs.writeFileSync(
      abiPath,
      JSON.stringify(contractArtifact.abi, null, 2)
    );
    
    console.log(`📄 ABI sauvegardé dans: ${abiPath}`);
    
    console.log("\n✨ Déploiement terminé avec succès !");
    
    return travelLog;
  } catch (error) {
    console.error("\n❌ Erreur lors du déploiement:", error);
    process.exit(1);
  }
}

// Exécution du déploiement
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deploy: main };
