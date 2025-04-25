import React, { useState, useEffect, useRef } from 'react';
import { NGODetails, Project } from '../types';
import { 
  getNGODetailsByEmail, 
  createNGODetails, 
  createProject, 
  getProjectsByNGOEmail,
  uploadNGODocument,
  updateNGOWalletAddress
} from '../firestore';
import NGODonations from './NGODonations';

interface NGODashboardProps {
  userEmail: string;
}

export default function NGODashboard({ userEmail }: NGODashboardProps) {
  const [ngoDetails, setNGODetails] = useState<NGODetails | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    contactPhone: '',
    contactEmail: userEmail,
    address: '',
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add active tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'donations'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching NGO data for email:', userEmail);
        const ngo = await getNGODetailsByEmail(userEmail);
        console.log('NGO data received:', ngo);
        
        setNGODetails(ngo);
        setShowSetup(!ngo);
        
        if (ngo) {
          try {
            const userProjects = await getProjectsByNGOEmail(userEmail);
            setProjects(userProjects);
            
            if (ngo.walletAddress) {
              setWalletAddress(ngo.walletAddress);
            }
          } catch (err) {
            console.error('Error fetching projects:', err);
            setProjects([]);
          }
        }
      } catch (error) {
        console.error('Error fetching NGO data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userEmail) {
      fetchData();
    } else {
      setLoading(false);
      setShowSetup(true);
    }
  }, [userEmail]);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    const { ethereum } = window as any;
    return Boolean(ethereum && ethereum.isMetaMask);
  };

  // Connect to MetaMask
  const connectMetaMask = async () => {
    setWalletConnecting(true);
    try {
      const { ethereum } = window as any;
      if (ethereum) {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          
          // If NGO is already set up, update the wallet address
          if (ngoDetails?.id) {
            await updateNGOWalletAddress(ngoDetails.id, address);
          }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    
    if (file) {
      setDocumentFile(file);
      
      // Create preview for PDFs or images
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleNGOSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Validate form data
      if (!formData.name || !formData.description) {
        throw new Error('Name and description are required');
      }
      
      // First upload the document if provided
      let documentURL = '';
      if (documentFile) {
        setUploading(true);
        try {
          // Pass all required parameters to match the function signature in firestore.tsx
          documentURL = await uploadNGODocument(
            userEmail,            // userEmail
            documentFile,         // documentFile
            File,                 // File constructor
            "NGO",                // p0 - document type
            "Registration",       // p1 - document name
            String,               // String constructor
            documentFile,         // file - the actual file object
            userEmail             // ngoEmail
          );
        } catch (error) {
          console.error('Error uploading document:', error);
        } finally {
          setUploading(false);
        }
      }
      
      // Generate a unique verification code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create the NGO record
      const newNGO: NGODetails = {
        name: formData.name,
        description: formData.description,
        website: formData.website,
        contactPhone: formData.contactPhone,
        email: userEmail,
        address: formData.address,
        code,
        isApproved: false,
        documentURL,
        walletAddress: walletAddress || undefined,
        isVerified: false,
        UserEmail: userEmail
      };
  
      // Create the NGO and get the returned ID
      await createNGODetails(newNGO);
      setNGODetails({...newNGO, id: 'pending'});  // Give it a temporary ID until refresh
      setShowSetup(false);
      console.log('NGO setup complete, code:', code);
    } catch (error) {
      console.error('Error creating NGO:', error);
      alert('Failed to set up NGO. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ngoDetails) return;
    
    setLoading(true);
    try {
      const project: Project = {
        ngoEmail: userEmail,
        ngoName: ngoDetails.name,
        title: newProject.title,
        description: newProject.description,
        isApproved: false,
      };

      await createProject(project);
      const updatedProjects = await getProjectsByNGOEmail(userEmail);
      setProjects(updatedProjects);
      setNewProject({ title: '', description: '' });
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Show NGO setup form
  if (showSetup) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">NGO Setup</h2>
        <form onSubmit={handleNGOSetup} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">NGO Name</label>
              <input
                type="text"
                required
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                required
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Website</label>
              <input
                type="url"
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                placeholder="https://yourwebsite.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Contact Phone</label>
              <input
                type="tel"
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Address</label>
              <textarea
                className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">
                Upload Registration Document (PDF)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Select File
                </button>
                <span className="ml-3 text-gray-600">
                  {documentFile ? documentFile.name : "No file selected"}
                </span>
              </div>
              {documentPreview && (
                <div className="mt-2 p-3 border rounded bg-gray-50">
                  {documentFile?.type.includes('pdf') ? (
                    <div className="flex items-center text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      PDF Document Selected
                    </div>
                  ) : (
                    <img 
                      src={documentPreview} 
                      alt="Document preview" 
                      className="h-32 object-contain" 
                    />
                  )}
                </div>
              )}
            </div>
            
            <div className="border-t pt-4">
              <label className="block text-gray-700 mb-2">
                Connect Wallet (Optional)
              </label>
              <div className="space-y-2">
                {walletAddress ? (
                  <div className="p-3 border rounded bg-green-50 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-green-700">Wallet Connected</p>
                      <p className="text-xs font-mono text-gray-600">
                        {`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={connectMetaMask}
                      className="text-blue-600 text-sm hover:text-blue-700"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={connectMetaMask}
                    disabled={walletConnecting || !isMetaMaskInstalled()}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 flex items-center"
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
                )}
                {!isMetaMaskInstalled() && (
                  <div className="text-sm text-yellow-600">
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
            </div>
          </div>
          
          <div className="text-center">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Uploading Document..." : submitting ? "Submitting..." : "Submit Registration"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Show pending approval state with verification code
  if (ngoDetails && !ngoDetails.isApproved) {
    return (
      <div className="text-center p-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          
          <h2 className="text-2xl font-bold mb-4">Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your NGO registration is pending approval. Please share this code with
            your government authorizer:
          </p>
          
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-4 rounded-lg mb-6">
            <p className="text-xl font-mono text-center font-bold tracking-widest">
              {ngoDetails?.code || "CODE GENERATING..."}
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            Once your code is verified by an authorizer, your NGO will be activated
            and you'll be able to create projects and receive donations.
          </div>
        </div>
      </div>
    );
  }

  // Default view for approved NGOs - now with tabs
  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800">{ngoDetails?.name}</h2>
        <p className="text-gray-600 mt-2">{ngoDetails?.description}</p>
        
        {ngoDetails?.website && (
          <p className="mt-2 text-sm">
            Website: <a href={ngoDetails.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{ngoDetails.website}</a>
          </p>
        )}
        
        {ngoDetails && !ngoDetails.walletAddress && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-medium text-yellow-700">Connect Your Wallet</h3>
            <p className="text-sm text-yellow-600 mb-3">
              Connect your wallet to receive donations through MetaMask
            </p>
            <button
              onClick={connectMetaMask}
              disabled={walletConnecting || !isMetaMaskInstalled()}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 flex items-center"
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
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('donations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'donations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Donations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">NGO Details</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Name</h3>
              <p>{ngoDetails?.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p>{ngoDetails?.email}</p>
            </div>
            {ngoDetails?.contactPhone && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contact Phone</h3>
                <p>{ngoDetails.contactPhone}</p>
              </div>
            )}
            {ngoDetails?.address && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p>{ngoDetails.address}</p>
              </div>
            )}
            {ngoDetails?.walletAddress && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Wallet Address</h3>
                <p className="font-mono text-sm">{ngoDetails.walletAddress}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <>
          <div>
            <h2 className="text-2xl font-bold mb-6">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Project Title</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                  value={newProject.title}
                  onChange={(e) =>
                    setNewProject({ ...newProject, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  required
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                  rows={4}
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Create Project
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Your Projects</h2>
            <div className="grid gap-6">
              {projects.length === 0 ? (
                <p className="text-gray-600 text-center">No projects yet</p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white p-6 rounded-lg shadow-md"
                  >
                    <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    <div className="text-sm text-gray-500">
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          project.isApproved ? 'text-green-600' : 'text-yellow-600'
                        }`}
                      >
                        {project.isApproved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Donations Tab */}
      {activeTab === 'donations' && (
        <NGODonations userEmail={userEmail} />
      )}
    </div>
  );
}