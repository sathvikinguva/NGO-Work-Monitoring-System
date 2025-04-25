import React, { useState, useEffect } from 'react';
import { Project, NGODetails, Donation, TransparencyData } from '../types';
import { 
  getApprovedProjects, 
  getAllVerifiedNGOs,
  getNGODetailsByEmail,
  createDonation,
  getUserDonations,
  getProjectsByNGOEmail,
  getDonationsByNGOEmail
} from '../firestore';
import { ethers } from 'ethers';

interface DonorDashboardProps {
  userWalletAddress?: string;
  userName?: string;
  evidenceImages?: string[] | boolean;
}

export default function DonorDashboard({ userWalletAddress: propWalletAddress, userName }: DonorDashboardProps) {
  const [localWalletAddress, setLocalWalletAddress] = useState<string | undefined>(propWalletAddress);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ngos, setNgos] = useState<NGODetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [view, setView] = useState<'projects' | 'donations' | 'transparency'>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('0.1');
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [transparencyData, setTransparencyData] = useState<TransparencyData>({
    ngo: null,
    projects: [],
    donations: []
  });
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<'checking' | 'registering' | 'donating' | 'direct-donating' | null>(null);
  
  // New states for evidence tracking
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  
  // Use effective wallet address - either from props or local state
  const effectiveWalletAddress = propWalletAddress || localWalletAddress;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data with wallet:", effectiveWalletAddress);
        const [approvedProjects, verifiedNgos] = await Promise.all([
          getApprovedProjects(),
          getAllVerifiedNGOs()
        ]);
        
        setProjects(approvedProjects);
        setNgos(verifiedNgos);
        
        // If user has wallet connected, fetch their donations
        if (effectiveWalletAddress) {
          try {
            const userDonationsData = await getUserDonations(effectiveWalletAddress);
            setMyDonations(userDonationsData);
          } catch (error) {
            console.error('Error fetching user donations:', error);
            // Don't fail the whole initialization if donations can't be fetched
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [effectiveWalletAddress]); // Use the effective wallet address in dependency array
  
  // Listen for MetaMask account changes
  useEffect(() => {
    const { ethereum } = window as any;
    
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('MetaMask accounts changed:', accounts);
        if (accounts.length === 0) {
          // User has disconnected their wallet
          setLocalWalletAddress(undefined);
          console.log('Wallet disconnected');
        } else {
          // User has switched accounts
          setLocalWalletAddress(accounts[0]);
          console.log('Wallet switched to:', accounts[0]);
        }
      };
      
      // Subscribe to accounts change
      ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Clean up
      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);
  
  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    const { ethereum } = window as any;
    return Boolean(ethereum && ethereum.isMetaMask);
  };
  
  // Check if already connected to MetaMask
  const checkWalletConnection = async () => {
    try {
      const { ethereum } = window as any;
      if (ethereum) {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setLocalWalletAddress(accounts[0]);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking wallet connection:", error);
      return false;
    }
  };
  
  // Effect to check wallet connection on component mount
  useEffect(() => {
    if (!effectiveWalletAddress) {
      checkWalletConnection();
    }
  }, [effectiveWalletAddress]);
  
  const connectMetaMask = async () => {
    setWalletConnecting(true);
    try {
      const { ethereum } = window as any;
      if (ethereum) {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          // Update local state instead of reloading the page
          setLocalWalletAddress(accounts[0]);
          
          // Fetch user donations right after connecting
          try {
            const userDonationsData = await getUserDonations(accounts[0]);
            setMyDonations(userDonationsData);
          } catch (error) {
            console.error('Error fetching user donations after connect:', error);
          }
          
          console.log(`Connected to wallet: ${accounts[0]}`);
        }
      } else {
        throw new Error('MetaMask not detected');
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      alert('Failed to connect to MetaMask. Please make sure it is installed and unlocked.');
    } finally {
      setWalletConnecting(false);
    }
  };
  
  const handleDonate = (project: Project) => {
    if (!effectiveWalletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    setSelectedProject(project);
    setDonating(true);
  };
  
  // Generate a random tracking ID
  const generateTrackingId = () => {
    // Create a random string of 8 alphanumeric characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Function to view evidence details
  const viewEvidenceDetails = (donation: Donation) => {
    setSelectedDonation(donation);
    setEvidenceModalOpen(true);
  };
  
  // Function to close evidence modal
  const closeEvidenceModal = () => {
    setSelectedDonation(null);
    setEvidenceModalOpen(false);
  };
  
  // Updated submitDonation function with improved donorName handling
  const submitDonation = async () => {
    if (!selectedProject || !effectiveWalletAddress) return;
    
    setIsSubmitting(true);
    setProcessingStep('checking');
    
    try {
      const amount = parseFloat(donationAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid donation amount');
      }
      
      // Find the NGO details
      const ngo = ngos.find(n => n.email === selectedProject.ngoEmail);
      
      if (!ngo || !ngo.walletAddress) {
        throw new Error('NGO wallet address not found');
      }
      
      console.log(`Preparing donation of ${donationAmount} ETH to ${ngo.walletAddress} for project ${selectedProject.id || ''}`);
      
      // Skip contract methods entirely and do a direct ETH transfer
      let tx;
      
      setProcessingStep('direct-donating');
      console.log("Using direct ETH transfer for donation...");
      
      try {
        // Get provider and signer directly to avoid any contract issues
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        
        // Convert amount from ETH to wei
        const amountInWei = ethers.parseEther(donationAmount);
        
        // Pure direct transfer - no contract interaction
        tx = await signer.sendTransaction({
          to: ngo.walletAddress,
          value: amountInWei,
          gasLimit: 100000 // Add explicit gas limit
        });
        
        await tx.wait();
        console.log('Direct donation transaction confirmed!');
      } catch (directError) {
        console.error("Direct donation failed:", directError);
        throw new Error("Donation failed. Please check your wallet and try again.");
      }
      
      // Generate a donor name that's never undefined
      let donorDisplayName = "Anonymous Donor";
      
      // Try multiple fallbacks to get a valid name
      if (userName && userName.trim() !== "") {
        donorDisplayName = userName.trim();
      } else if (effectiveWalletAddress) {
        // Use a shortened wallet address as the donor name
        donorDisplayName = `${effectiveWalletAddress.substring(0, 6)}...${effectiveWalletAddress.substring(effectiveWalletAddress.length - 4)}`;
      }
      
      console.log("Using donor name:", donorDisplayName);
      
      // Generate a tracking ID for evidence
      const evidenceTrackingId = generateTrackingId();
      
      // Record the donation in Firestore - FIX: Handle undefined userName
      try {
        // Create donation object with guaranteed non-undefined fields
        const donationData = {
          donorAddress: effectiveWalletAddress,
          donorName: donorDisplayName, // Using our verified donor name
          ngoEmail: selectedProject.ngoEmail,
          ngoName: selectedProject.ngoName,
          projectId: selectedProject.id || '',
          projectTitle: selectedProject.title,
          amount: donationAmount,
          timestamp: Date.now(),
          transactionHash: tx.hash,
          isDirect: true,
          isGovFunding: false, // Add missing required property
          currency: 'ETH',
          evidenceTrackingId: evidenceTrackingId, // Add tracking ID for evidence
          evidenceDescription: "", // Add missing required property
          evidenceImages: false // Initialize as boolean like in other places
        };
        
        // Log the donation data for debugging
        console.log("Creating donation with data:", donationData);
        
        await createDonation(donationData);
        console.log("Donation successfully recorded in Firestore");
        
        // Show tracking ID to user
        alert(`Donation successful! Your evidence tracking ID is: ${evidenceTrackingId}\n\nYou can use this ID to track when the NGO uploads evidence of how your donation was used.`);
      } catch (firestoreError) {
        console.error("Failed to record donation in Firestore:", firestoreError);
        // Don't fail the whole process because of Firestore issues
        // The blockchain transaction was successful
        alert('Donation successful! Thank you for your support.');
      }
      
      // Update donation history
      try {
        const userDonationsData = await getUserDonations(effectiveWalletAddress);
        setMyDonations(userDonationsData);
      } catch (error) {
        console.error("Failed to update donation history:", error);
        // Don't fail if we can't update the history
      }
      
      // Reset state
      setDonating(false);
      setSelectedProject(null);
      setDonationAmount('0.1');
      setProcessingStep(null);
      
      // Switch to donations view
      setView('donations');
    } catch (error) {
      console.error('Error donating:', error);
      alert(`Donation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      setProcessingStep(null);
    }
  };
  
  const viewTransparency = async (ngoEmail: string) => {
    setLoading(true);
    try {
      const [ngo, ngoProjects, ngoDonations] = await Promise.all([
        getNGODetailsByEmail(ngoEmail),
        getProjectsByNGOEmail(ngoEmail),
        getDonationsByNGOEmail(ngoEmail)
      ]);
      
      setTransparencyData({
        ngo,
        projects: ngoProjects,
        donations: ngoDonations
      });
      
      setView('transparency');
    } catch (error) {
      console.error('Error fetching transparency data:', error);
      alert('Failed to load transparency data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!effectiveWalletAddress) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-6">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          To make donations to NGOs and track your contribution history, please connect your Ethereum wallet.
        </p>
        
        <button
          onClick={connectMetaMask}
          disabled={walletConnecting || !isMetaMaskInstalled()}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center mx-auto"
        >
          {walletConnecting ? (
            <>
              <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
              Connecting...
            </>
          ) : (
            <>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                alt="MetaMask" 
                className="h-5 w-5 mr-2" 
              />
              Connect MetaMask
            </>
          )}
        </button>
        
        {!isMetaMaskInstalled() && (
          <div className="mt-4 text-sm text-yellow-600">
            MetaMask not detected. Please{" "}
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noreferrer" 
              className="underline"
            >
              install MetaMask
            </a>{" "}
            to connect your wallet.
          </div>
        )}
      </div>
    );
  }
  
  if (donating && selectedProject) {
    // Updated donation modal that matches the image with cancel button
    return (
      <>
        {/* Modal Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Modal Content */}
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-2">Donate Here</h2>
            <p className="text-gray-600 mb-6">
            Make a direct donation to support the cause you care about.
            </p>
            
            {/* Selected Organization */}
            <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center mb-6">
              <div>
                <div className="text-sm text-gray-600">Selected Organization</div>
                <div className="font-bold text-lg">{selectedProject.ngoName}</div>
              </div>
              <button 
                onClick={() => setDonating(false)} 
                className="text-blue-600 hover:text-blue-800"
                disabled={isSubmitting}
              >
                Change
              </button>
            </div>
            
            {/* Donation Amount */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">
                Donation Amount (ETH)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="w-full p-3 border rounded focus:ring focus:ring-blue-200 pr-14"
                  disabled={isSubmitting}
                />
                <span className="absolute right-3 top-3 text-gray-500">ETH</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Minimum donation: 0.0001 ETH
              </p>
            </div>
            
            {/* Processing Status */}
            {isSubmitting && processingStep && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                  <span className="text-blue-800">
                    {processingStep === 'checking' && 'Checking NGO details...'}
                    {processingStep === 'direct-donating' && 'Sending ETH transfer...'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 pl-6">
                  {processingStep === 'direct-donating' && 'Please confirm the transaction in your wallet.'}
                </p>
              </div>
            )}
            
            {/* Donate and Cancel Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setDonating(false);
                  setSelectedProject(null);
                }}
                className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={submitDonation}
                disabled={isSubmitting}
                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  'Donate Now'
                )}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  if (view === 'transparency' && transparencyData.ngo) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{transparencyData.ngo.name} Transparency</h1>
          <button
            onClick={() => setView('projects')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Projects
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">About the NGO</h2>
          <p className="text-gray-600 mb-4">{transparencyData.ngo.description}</p>
          
          {transparencyData.ngo.website && (
            <p className="text-sm mb-2">
              <span className="font-medium">Website:</span>{" "}
              <a 
                href={transparencyData.ngo.website} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {transparencyData.ngo.website}
              </a>
            </p>
          )}
          
          {transparencyData.ngo.walletAddress && (
            <p className="text-sm font-mono break-all">
              <span className="font-medium not-font-mono">Wallet Address:</span>{" "}
              {transparencyData.ngo.walletAddress}
            </p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Projects</h2>
          
          {transparencyData.projects.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No projects created yet.</p>
          ) : (
            <div className="space-y-4">
              {transparencyData.projects.map(project => (
                <div key={project.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium">{project.title}</h3>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                  
                  <div className="flex justify-end mt-3">
                    {project.isApproved && (
                      <button
                        onClick={() => handleDonate(project)}
                        className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Donate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Donation History</h2>
          
          {transparencyData.donations.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No donations received yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donor</th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transparencyData.donations.map((donation, idx) => (
                    <tr key={donation.id || idx}>
                      <td className="py-3 px-2 whitespace-nowrap text-sm">
                        {new Date(donation.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-sm font-mono">
                        {donation.donorAddress.slice(0, 6)}...{donation.donorAddress.slice(-4)}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {donation.projectTitle}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-sm font-medium">
                        {donation.amount} ETH
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex justify-between items-center">
          <div className="flex border-b pb-3">
            <button
              onClick={() => setView('projects')}
              className={`px-4 py-2 rounded-md mr-2 ${
                view === 'projects' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setView('donations')}
              className={`px-4 py-2 rounded-md ${
                view === 'donations' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              My Donations
            </button>
          </div>
          
          {/* Display connected wallet address */}
          <div className="text-sm text-gray-600 flex items-center">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md mr-2">
              Wallet Connected
            </span>
            <span className="font-mono">
              {effectiveWalletAddress.substring(0, 6)}...{effectiveWalletAddress.substring(effectiveWalletAddress.length - 4)}
            </span>
          </div>
        </div>
      </div>

      {view === 'projects' && (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-600 py-4">No approved projects available yet.</p>
            </div>
          ) : (
            projects.map(project => (
              <div key={project.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{project.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      By {project.ngoName} • 
                      <button 
                        onClick={() => viewTransparency(project.ngoEmail)} 
                        className="ml-1 text-blue-600 hover:underline"
                      >
                        View Transparency
                      </button>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDonate(project)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Donate
                  </button>
                </div>
                
                <p className="text-gray-600">{project.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'donations' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6">My Donation History</h2>
          
          {myDonations.length === 0 ? (
            <p className="text-center text-gray-600 py-4">
              You have not made any donations yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NGO</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidence</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myDonations.map((donation, idx) => (
                    <tr key={donation.id || idx}>
                      <td className="py-4 px-4 whitespace-nowrap text-sm">
                        {new Date(donation.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <button 
                          onClick={() => viewTransparency(donation.ngoEmail)} 
                          className="text-blue-600 hover:underline"
                        >
                          {donation.ngoName}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-sm">{donation.projectTitle}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-medium">
                        {donation.amount} ETH
                        {donation.isDirect && <span className="ml-1 text-xs text-gray-500">(Direct)</span>}
                      </td>
                      <td className="py-4 px-4 text-sm font-mono">
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${donation.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {donation.transactionHash.substring(0, 7)}...
                        </a>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {donation.evidenceTrackingId ? (
                          <>
                            {donation.evidenceImages && 
                             ((Array.isArray(donation.evidenceImages) && donation.evidenceImages.length > 0) ||
                              donation.evidenceImages === true) ? (
                              <button 
                                onClick={() => viewEvidenceDetails(donation)}
                                className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center text-xs"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View Evidence
                              </button>
                            ) : (
                              <div className="flex items-center">
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Pending</span>
                                <button 
                                  onClick={() => viewEvidenceDetails(donation)}
                                  className="ml-2 text-blue-600 hover:underline text-xs"
                                >
                                  {donation.evidenceTrackingId}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">Not available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Evidence Modal */}
      {evidenceModalOpen && selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Donation Evidence</h3>
                <button 
                  onClick={closeEvidenceModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Project:</span> {selectedDonation.projectTitle}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">NGO:</span> {selectedDonation.ngoName}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Amount:</span> {selectedDonation.amount} {selectedDonation.currency || 'ETH'}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Date:</span> {new Date(selectedDonation.timestamp).toLocaleDateString()}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Tracking ID:</span> {selectedDonation.evidenceTrackingId}
                </p>
              </div>
              
              {selectedDonation.evidenceDescription && (
                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2">Description</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded">{selectedDonation.evidenceDescription}</p>
                </div>
              )}
              
              {selectedDonation.evidenceImages && Array.isArray(selectedDonation.evidenceImages) && selectedDonation.evidenceImages.length > 0 ? (
                <div>
                  <h4 className="text-md font-medium mb-2">Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedDonation.evidenceImages.map((imageUrl, index) => (
                      <div key={index} className="overflow-hidden rounded border border-gray-200">
                        <a href={imageUrl} target="_blank" rel="noreferrer">
                          <img 
                            src={imageUrl} 
                            alt={`Evidence ${index + 1}`}
                            className="h-40 w-full object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedDonation.evidenceImages === true ? (
                <div className="p-4 bg-yellow-50 text-yellow-700 rounded">
                  <p>Evidence has been provided but image URLs are not available in this format.</p>
                  <p className="text-sm mt-2">Please contact the NGO for more details.</p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 text-gray-600 rounded">
                  <p>No evidence images have been uploaded yet.</p>
                  <p className="text-sm mt-2">The NGO will upload evidence of how your donation was used.</p>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeEvidenceModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-300"
                >
                  Close
                </button>
                <a
                  href={`https://sepolia.etherscan.io/tx/${selectedDonation.transactionHash}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Transaction
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}