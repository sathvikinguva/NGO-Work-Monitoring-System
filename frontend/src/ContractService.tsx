import { getNGODonationContract } from './constants';
import { ethers } from 'ethers';

export const contractService = {
  // Register an NGO
  async registerNGO(
    ngoAddress: string,
    name: string,
    description: string,
    email: string
  ) {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = await getNGODonationContract();
      
      // Use getFunction to access the contract method by name
      const tx = await contract.connect(signer).getFunction("registerNGO")(
        ngoAddress, 
        name, 
        description, 
        email,
        { gasLimit: 500000 } // Increase gas limit for registration
      );
      
      await tx.wait(); // Wait for transaction to be mined
      return tx;
    } catch (error) {
      console.error("Error registering NGO:", error);
      throw error;
    }
  },

  // True direct ETH transfer that bypasses the contract completely
  async directDonate(ngoAddress: string, amount: string) {
    try {
      console.log(`Direct donating ${amount} ETH to ${ngoAddress}`);
      
      // Get connected provider and signer
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // Convert amount from ETH to wei
      const amountInWei = ethers.parseEther(amount);
      console.log(`Amount in wei: ${amountInWei.toString()}`);
      
      // Pure direct transfer - no contract interaction at all
      const tx = await signer.sendTransaction({
        to: ngoAddress,
        value: amountInWei,
        gasLimit: 100000 // Add explicit gas limit
      });
      
      console.log(`Direct transaction hash: ${tx.hash}`);
      return tx;
    } catch (error) {
      console.error("Error with direct donation:", error);
      throw error;
    }
  },

  // Don't use the contract donate method - redirect to direct donate
  async donate(ngoAddress: string, amount: string, projectId: string = "") {
    console.log(`Redirecting donation to direct transfer: ${amount} ETH to ${ngoAddress}`);
    // Skip the contract method and go straight to direct donation
    return this.directDonate(ngoAddress, amount);
  },

  // Get NGO details by wallet address
  async getNGODetailsByWalletAddress(ngoAddress: string) {
    try {
      const contract = await getNGODonationContract();
      
      try {
        // Use getFunction to access the contract method by name
        const ngoDetails = await contract.getFunction("getNGODetails")(ngoAddress);
        
        // Return details in a structured format matching the simplified contract
        return {
          name: ngoDetails[0],
          description: ngoDetails[1],
          totalDonations: ngoDetails[2],
          registrationTime: ngoDetails[3]
        };
      } catch (error) {
        // Handle potential non-existent NGO gracefully
        throw new Error("NGO not found or contract issue");
      }
    } catch (error) {
      console.error("Error getting NGO details:", error);
      throw error;
    }
  },
  
  // Get NGO address by email
  async getNGOAddressByEmail(email: string) {
    try {
      const contract = await getNGODonationContract();
      
      // Use getFunction to access the contract method by name
      const address = await contract.getFunction("getNGOAddressByEmail")(email);
      return address;
    } catch (error) {
      console.error("Error getting NGO address by email:", error);
      throw error;
    }
  }
};