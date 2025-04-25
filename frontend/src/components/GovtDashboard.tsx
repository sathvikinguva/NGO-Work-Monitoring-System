import React, { useState, useEffect } from 'react';
import { NGODetails, Project, Donation } from '../types';
import { 
  getAllVerifiedNGOs, 
  verifyNGOByCode, 
  getAllProjects,
  updateProjectApprovalStatus,
  getNGODetailsForAuthorizer,
  getProjectsByNGOEmail,
  getDonationsByNGOEmail,
  createDonation
} from '../firestore';
import { ethers } from 'ethers';

export default function GovtDashboard() {
  const [ngos, setNgos] = useState<NGODetails[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [viewingNGO, setViewingNGO] = useState(false);
  const [selectedNGO, setSelectedNGO] = useState<NGODetails | null>(null);
  const [ngoProjects, setNgoProjects] = useState<Project[]>([]);
  const [ngoDonations, setNgoDonations] = useState<Donation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [tab, setTab] = useState<'ngos' | 'projects' | 'verify'>('ngos');
  
  // New state for funding modal
  const [fundingModalOpen, setFundingModalOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('0.1');
  const [fundingInProgress, setFundingInProgress] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [fundingSuccess, setFundingSuccess] = useState(false);

  // New state for evidence viewing
  const [viewingEvidence, setViewingEvidence] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allNgos, allProjects] = await Promise.all([
          getAllVerifiedNGOs(),
          getAllProjects()
        ]);
        
        setNgos(allNgos);
        setProjects(allProjects);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleVerifyNGO = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) return;
    
    setVerifying(true);
    setVerificationResult(null);
    
    try {
      const result = await verifyNGOByCode(verificationCode.trim());
      
      if (result.success) {
        setVerificationResult({
          success: true,
          message: `Successfully verified ${result.ngoName}. The NGO can now create projects.`
        });
        
        // If we have an NGO ID, fetch and view its details
        if (result.ngoId) {
          await viewNGODetails(result.ngoId);
        }
        
        setVerificationCode('');
        
        // Refresh the NGO list
        const updatedNgos = await getAllVerifiedNGOs();
        setNgos(updatedNgos);
      } else {
        setVerificationResult({
          success: false,
          message: result.message || 'Verification failed.'
        });
      }
    } catch (error) {
      console.error('Error verifying NGO:', error);
      setVerificationResult({
        success: false,
        message: 'An error occurred. Please try again.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleApproveProject = async (projectId: string) => {
    setLoadingProjects(true);
    try {
      await updateProjectApprovalStatus(projectId, true);
      
      // Update local projects list
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) return { ...p, isApproved: true };
        return p;
      }));
      
      // If viewing an NGO, also update its projects
      if (viewingNGO && selectedNGO) {
        setNgoProjects(prev => prev.map(p => {
          if (p.id === projectId) return { ...p, isApproved: true };
          return p;
        }));
      }
    } catch (error) {
      console.error('Error approving project:', error);
      alert('Failed to approve project. Please try again.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const viewNGODetails = async (ngoId: string) => {
    setLoading(true);
    
    try {
      // Use the enhanced function that fetches document content
      const ngo = await getNGODetailsForAuthorizer(ngoId);
      
      if (!ngo) {
        throw new Error('NGO not found');
      }
      
      const [ngoProjectsData, ngoDonationsData] = await Promise.all([
        getProjectsByNGOEmail(ngo.email),
        getDonationsByNGOEmail(ngo.email)
      ]);
      
      setSelectedNGO(ngo);
      setNgoProjects(ngoProjectsData);
      setNgoDonations(ngoDonationsData);
      setViewingNGO(true);
    } catch (error) {
      console.error('Error fetching NGO details:', error);
      alert('Failed to load NGO details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get blockchain explorer URL based on transaction hash
  const getExplorerUrl = (txHash: string) => {
    // Assuming Sepolia testnet
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  // Calculate total funds
  const calculateTotalFunds = () => {
    if (!ngoDonations || ngoDonations.length === 0) return { total: 0, govFunds: 0, publicFunds: 0 };
    
    const totals = ngoDonations.reduce((acc, donation) => {
      // Convert donation amount to number
      const amount = parseFloat(donation.amount.toString());
      if (!isNaN(amount)) {
        // Increment total
        acc.total += amount;
        
        // Separate gov and public funding
        if (donation.isGovFunding) {
          acc.govFunds += amount;
        } else {
          acc.publicFunds += amount;
        }
      }
      return acc;
    }, { total: 0, govFunds: 0, publicFunds: 0 });
    
    return totals;
  };

  // New function to open the funding modal
  const openFundingModal = () => {
    setFundAmount('0.1');
    setFundingError(null);
    setFundingSuccess(false);
    setFundingModalOpen(true);
  };

  // New function to close the funding modal
  const closeFundingModal = () => {
    setFundingModalOpen(false);
  };

  // New function to open evidence modal
  const openEvidenceModal = (donation: Donation) => {
    setSelectedDonation(donation);
    setViewingEvidence(true);
  };

  // New function to close evidence modal
  const closeEvidenceModal = () => {
    setSelectedDonation(null);
    setViewingEvidence(false);
  };

  // New function to handle funding an NGO
  const handleFundNGO = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNGO || !selectedNGO.walletAddress) {
      setFundingError('NGO wallet address not found');
      return;
    }

    try {
      setFundingInProgress(true);
      setFundingError(null);
      
      const amount = parseFloat(fundAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid donation amount');
      }

      // Check if MetaMask is installed
      if (!(window as any).ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Connect to wallet
      try {
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        throw new Error('Failed to connect to wallet. Please make sure MetaMask is unlocked.');
      }

      // Get provider and signer
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Convert amount from ETH to wei
      const amountInWei = ethers.parseEther(fundAmount);
      
      // Direct ETH transfer
      const tx = await signer.sendTransaction({
        to: selectedNGO.walletAddress,
        value: amountInWei,
        gasLimit: 100000 // Add explicit gas limit
      });
      
      // Wait for transaction to be mined
      await tx.wait();
      console.log('Gov Fund transaction confirmed!', tx);
      
      // Record the donation in Firestore
      await createDonation({
        donorAddress: signerAddress,
        donorName: 'Government Grant', // Mark as government funding
        ngoEmail: selectedNGO.email,
        ngoName: selectedNGO.name,
        projectId: '',
        projectTitle: 'Government Grant Funding',
        amount: fundAmount,
        timestamp: Date.now(),
        transactionHash: tx.hash,
        isDirect: true,
        isGovFunding: true, // Mark as government funding
        currency: 'ETH',
        evidenceDescription: "",
        evidenceImages: false,
        evidenceTrackingId: false
      });
      
      // Update donations list
      const updatedDonations = await getDonationsByNGOEmail(selectedNGO.email);
      setNgoDonations(updatedDonations);
      
      // Show success message
      setFundingSuccess(true);
      
      // Close modal after a delay
      setTimeout(() => {
        setFundingModalOpen(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error funding NGO:', error);
      setFundingError(error instanceof Error ? error.message : 'Failed to fund NGO');
    } finally {
      setFundingInProgress(false);
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

  if (viewingNGO && selectedNGO) {
    const fundingTotals = calculateTotalFunds();
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{selectedNGO.name}</h1>
          <div className="flex space-x-4">
            <button
              onClick={openFundingModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Fund this NGO
            </button>
            <button
              onClick={() => setViewingNGO(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
        
        {/* New Total Funds Display */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Total Funding Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-700 mb-1">Total Funds Received</h3>
              <p className="text-2xl font-bold text-blue-800">{fundingTotals.total.toFixed(4)} ETH</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="text-sm font-medium text-green-700 mb-1">Government Grants</h3>
              <p className="text-2xl font-bold text-green-800">{fundingTotals.govFunds.toFixed(4)} ETH</p>
              <p className="text-xs text-green-600 mt-1">
                {fundingTotals.total > 0 
                  ? `${((fundingTotals.govFunds / fundingTotals.total) * 100).toFixed(1)}% of total funding` 
                  : '0% of total funding'}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="text-sm font-medium text-purple-700 mb-1">Public Donations</h3>
              <p className="text-2xl font-bold text-purple-800">{fundingTotals.publicFunds.toFixed(4)} ETH</p>
              <p className="text-xs text-purple-600 mt-1">
                {fundingTotals.total > 0 
                  ? `${((fundingTotals.publicFunds / fundingTotals.total) * 100).toFixed(1)}% of total funding` 
                  : '0% of total funding'}
              </p>
            </div>
          </div>
          
          {ngoDonations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">Funding Distribution</h3>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                {fundingTotals.total > 0 && (
                  <div className="flex h-full">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${(fundingTotals.govFunds / fundingTotals.total) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-purple-500 h-full" 
                      style={{ width: `${(fundingTotals.publicFunds / fundingTotals.total) * 100}%` }}
                    ></div>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-500 mr-1 rounded-sm"></span>
                  Government Grants
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-purple-500 mr-1 rounded-sm"></span>
                  Public Donations
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">NGO Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>{" "}
              <span>{selectedNGO.email}</span>
            </div>
            
            {selectedNGO.website && (
              <div>
                <span className="text-gray-500">Website:</span>{" "}
                <a
                  href={selectedNGO.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {selectedNGO.website}
                </a>
              </div>
            )}
            
            {selectedNGO.contactPhone && (
              <div>
                <span className="text-gray-500">Phone:</span>{" "}
                <span>{selectedNGO.contactPhone}</span>
              </div>
            )}
            
            {selectedNGO.address && (
              <div className="col-span-full">
                <span className="text-gray-500">Address:</span>{" "}
                <span>{selectedNGO.address}</span>
              </div>
            )}

            {selectedNGO.walletAddress && (
              <div className="col-span-full">
                <span className="text-gray-500">Wallet Address:</span>{" "}
                <span className="font-mono text-xs">{selectedNGO.walletAddress}</span>
              </div>
            )}
            
            {/* Document display section */}
            {selectedNGO.documentContent && (
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-2">Registration Document</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedNGO.documentName || 'Verification Document'}
                  </p>
                  
                  {selectedNGO.documentContent.startsWith('data:application/pdf') ? (
                    <div className="h-96 border rounded bg-white">
                      <iframe 
                        src={selectedNGO.documentContent}
                        className="w-full h-full border-0"
                        title="NGO Verification Document"
                      />
                    </div>
                  ) : selectedNGO.documentContent.startsWith('data:image') ? (
                    <div className="flex justify-center">
                      <img 
                        src={selectedNGO.documentContent}
                        alt="NGO Verification Document"
                        className="max-w-full h-auto max-h-96 rounded shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-4 rounded text-center">
                      <p>Document preview not available</p>
                      <a 
                        href={selectedNGO.documentContent}
                        download={selectedNGO.documentName || "document"}
                        className="text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Download Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Fallback for old document URLs */}
            {!selectedNGO.documentContent && selectedNGO.documentURL && (
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-2">Registration Document</h3>
                <p className="text-sm text-gray-600">
                  Document content could not be loaded directly. This may be due to a legacy format.
                </p>
                <a 
                  href={selectedNGO.documentURL} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-blue-50 text-blue-600 p-3 rounded-lg inline-flex items-center mt-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  Attempt to View Document
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Projects</h2>
          
          {ngoProjects.length === 0 ? (
            <p className="text-gray-600 text-center py-4">This NGO has not created any projects yet.</p>
          ) : (
            <div className="space-y-4">
              {ngoProjects.map(project => (
                <div key={project.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium">{project.title}</h3>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm">
                      Status:{' '}
                      <span className={
                        project.isApproved 
                          ? 'text-green-600 font-medium' 
                          : 'text-yellow-600 font-medium'
                      }>
                        {project.isApproved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>
                    
                    {!project.isApproved && (
                      <button
                        onClick={() => handleApproveProject(project.id!)}
                        disabled={loadingProjects}
                        className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {loadingProjects ? 'Approving...' : 'Approve Project'}
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
          
          {ngoDonations.length === 0 ? (
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
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                    <th className="py-3 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ngoDonations.map((donation, idx) => (
                    <tr key={donation.id || idx}>
                      <td className="py-3 px-2 whitespace-nowrap text-sm">
                        {new Date(donation.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-sm">
                        {donation.isGovFunding ? (
                          <span className="font-semibold text-green-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Government Grant
                          </span>
                        ) : (
                          <>
                            {donation.donorAddress && 
                              <span className="font-mono">
                                {`${donation.donorAddress.slice(0, 6)}...${donation.donorAddress.slice(-4)}`}
                              </span>
                            }
                            {donation.donorName && !donation.donorAddress && donation.donorName}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {donation.isGovFunding 
                          ? "Government Grant Funding" 
                          : (donation.projectTitle || "General Donation")}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-sm font-medium">
                        {donation.amount} {donation.currency || 'ETH'}
                        {donation.isDirect && !donation.isGovFunding && (
                          <span className="ml-1 text-xs text-blue-500">(Direct)</span>
                        )}
                        {donation.isGovFunding && (
                          <span className="ml-1 text-xs text-green-500">(Gov Fund)</span>
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-sm text-blue-600 font-mono">
                        {donation.transactionHash ? (
                          <a 
                            href={getExplorerUrl(donation.transactionHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {`${donation.transactionHash.slice(0, 7)}...`}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-sm">
                        {donation.evidenceImages && 
                        ((Array.isArray(donation.evidenceImages) && donation.evidenceImages.length > 0) || 
                         donation.evidenceImages === true) ? (
                          <button
                            onClick={() => openEvidenceModal(donation)}
                            className="bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 text-xs flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Evidence
                          </button>
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
        
        {/* Funding Modal */}
        {fundingModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Fund {selectedNGO.name}</h3>
                <button 
                  onClick={closeFundingModal} 
                  className="text-gray-500 hover:text-gray-700"
                  disabled={fundingInProgress}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {fundingSuccess ? (
                <div className="text-center py-4">
                  <div className="bg-green-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-4 text-lg font-medium text-green-800">Funding successful!</p>
                  <p className="mt-1 text-gray-600">
                    You have successfully provided government funding to {selectedNGO.name}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFundNGO}>
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">
                      Amount (ETH)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        className="w-full p-3 border rounded focus:ring focus:ring-blue-200 pr-14"
                        disabled={fundingInProgress}
                      />
                      <span className="absolute right-3 top-3 text-gray-500">ETH</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      This funding will be recorded as a government grant.
                    </p>
                  </div>
                  
                  {fundingError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                      {fundingError}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeFundingModal}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-300"
                      disabled={fundingInProgress}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={fundingInProgress}
                      className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
                      {fundingInProgress ? (
                        <>
                          <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                          Processing...
                        </>
                      ) : (
                        'Send Funds'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Evidence Modal */}
        {viewingEvidence && selectedDonation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                    <span className="font-medium">Amount:</span> {selectedDonation.amount} {selectedDonation.currency || 'ETH'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">From:</span> {selectedDonation.donorName || 'Anonymous'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Date:</span> {new Date(selectedDonation.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Project:</span> {selectedDonation.projectTitle || 'General Donation'}
                  </p>
                  
                  {selectedDonation.transactionHash && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">Transaction:</span>{' '}
                      <a 
                        href={getExplorerUrl(selectedDonation.transactionHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {selectedDonation.transactionHash}
                      </a>
                    </p>
                  )}
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-lg mb-3">Evidence</h4>
                  
                  {selectedDonation.evidenceDescription && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        {selectedDonation.evidenceDescription}
                      </div>
                    </div>
                  )}
                  
                  {selectedDonation.evidenceImages && Array.isArray(selectedDonation.evidenceImages) && selectedDonation.evidenceImages.length > 0 ? (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Images</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedDonation.evidenceImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={imageUrl} 
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-48 object-cover rounded-md shadow-sm" 
                            />
                            <a 
                              href={imageUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No evidence images available
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeEvidenceModal}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex border-b pb-3">
          <button
            onClick={() => setTab('ngos')}
            className={`px-4 py-2 rounded-md mr-2 ${
              tab === 'ngos' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            NGO List
          </button>
          <button
            onClick={() => setTab('projects')}
            className={`px-4 py-2 rounded-md mr-2 ${
              tab === 'projects' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setTab('verify')}
            className={`px-4 py-2 rounded-md ${
              tab === 'verify' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Verify NGO
          </button>
        </div>
      </div>

      {tab === 'ngos' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Verified NGOs</h2>
          
          {ngos.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No verified NGOs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ngos.map(ngo => (
                    <tr key={ngo.id}>
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">{ngo.name}</td>
                      <td className="py-4 px-6 text-sm text-gray-500">{ngo.email}</td>
                      <td className="py-4 px-6 text-sm">
                        <button
                          onClick={() => viewNGODetails(ngo.id!)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'projects' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">All Projects</h2>
          
          {projects.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No projects created yet.</p>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div key={project.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-medium">{project.title}</h3>
                    <span className="text-sm text-gray-500">{project.ngoName}</span>
                  </div>
                  
                  <p className="text-gray-600 mt-1 mb-3">{project.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      Status:{' '}
                      <span className={
                        project.isApproved 
                          ? 'text-green-600 font-medium' 
                          : 'text-yellow-600 font-medium'
                      }>
                        {project.isApproved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const ngo = ngos.find(n => n.email === project.ngoEmail);
                          if (ngo) viewNGODetails(ngo.id!);
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        View NGO
                      </button>
                      
                      {!project.isApproved && (
                        <button
                          onClick={() => handleApproveProject(project.id!)}
                          disabled={loadingProjects}
                          className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {loadingProjects ? 'Approving...' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'verify' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Verify NGO</h2>
          
          <form onSubmit={handleVerifyNGO} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Enter Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
              />
            </div>
            
            <button
              type="submit"
              disabled={verifying || !verificationCode.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify NGO'}
            </button>
          </form>
          
          {verificationResult && (
            <div className={`mt-4 p-4 rounded ${
              verificationResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {verificationResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}