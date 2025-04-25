import React, { useState, useEffect, useRef } from 'react';
import { fetchDonationsByNGO, updateDonationEvidence } from '../firestore';

interface Donation {
  id: string;
  donorEmail?: string;
  donorAddress?: string;
  donorName?: string;
  amount: number | string;
  ngoEmail: string;
  ngoName: string;
  projectId?: string;
  projectTitle?: string;
  timestamp: number | Date;
  transactionHash: string;
  currency: string;
  status?: 'pending' | 'completed' | 'rejected';
  isDirect?: boolean;
  isGovFunding?: boolean;
  evidenceImages?: string[] | boolean;
  evidenceDescription?: string;
}

interface NGODonationsProps {
  userEmail: string;
}

export default function NGODonations({ userEmail }: NGODonationsProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDonations = async () => {
      try {
        setLoading(true);
        const donationsList = await fetchDonationsByNGO(userEmail);
        // Sort donations by timestamp, newest first
        donationsList.sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : Number(a.timestamp);
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : Number(b.timestamp);
          return timeB - timeA;
        });
        setDonations(donationsList);
      } catch (error) {
        console.error('Error loading donations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      loadDonations();
    }
  }, [userEmail]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newSelectedImages = [...selectedImages];
    const newImagePreviewUrls = [...imagePreviewUrls];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Only accept image files
      if (!file.type.match('image.*')) continue;
      
      newSelectedImages.push(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        newImagePreviewUrls.push(reader.result as string);
        setImagePreviewUrls([...newImagePreviewUrls]);
      };
      reader.readAsDataURL(file);
    }
    
    setSelectedImages(newSelectedImages);
  };

  const removeImage = (index: number) => {
    const newSelectedImages = [...selectedImages];
    const newImagePreviewUrls = [...imagePreviewUrls];
    
    newSelectedImages.splice(index, 1);
    newImagePreviewUrls.splice(index, 1);
    
    setSelectedImages(newSelectedImages);
    setImagePreviewUrls(newImagePreviewUrls);
  };

  const openDonationEvidence = (donation: Donation) => {
    setSelectedDonation(donation);
    setEvidenceDescription(donation.evidenceDescription || '');
    setSelectedImages([]);
    setImagePreviewUrls([]);
  };

  const closeDonationEvidence = () => {
    setSelectedDonation(null);
    setEvidenceDescription('');
    setSelectedImages([]);
    setImagePreviewUrls([]);
  };

  const submitEvidence = async () => {
    if (!selectedDonation) return;
    
    try {
      setUploading(true);
      
      // Upload images and update donation with evidence
      await updateDonationEvidence(
        selectedDonation.id,
        selectedImages,
        evidenceDescription
      );
      
      // Refresh donations list
      const updatedDonations = await fetchDonationsByNGO(userEmail);
      updatedDonations.sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : Number(a.timestamp);
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : Number(b.timestamp);
        return timeB - timeA;
      });
      setDonations(updatedDonations);
      
      // Close the dialog
      closeDonationEvidence();
    } catch (error) {
      console.error('Error submitting evidence:', error);
      alert('Failed to submit evidence. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (timestamp: number | Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDonorDisplayName = (donation: Donation) => {
    if (donation.donorName && donation.donorName !== "Anonymous") {
      return donation.donorName;
    }
    
    if (donation.isGovFunding) {
      return "Government Grant";
    }
    
    if (donation.donorAddress) {
      return `${donation.donorAddress.substring(0, 6)}...${donation.donorAddress.substring(donation.donorAddress.length - 4)}`;
    }
    
    if (donation.donorEmail) {
      return donation.donorEmail;
    }
    
    return "Anonymous";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-4 text-gray-700">Loading donations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">All Donations</h2>
      
      {donations.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-600">No donations received yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {donations.map((donation) => {
            const hasEvidence = donation.evidenceImages && 
              (Array.isArray(donation.evidenceImages) ? 
                donation.evidenceImages.length > 0 : 
                donation.evidenceImages === true);
            
            const status = donation.status || 'pending';
            
            return (
              <div key={donation.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">
                        {donation.amount} {donation.currency}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        status === 'completed' ? 'bg-green-100 text-green-800' :
                        status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                      
                      {donation.isDirect && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          Direct Transfer
                        </span>
                      )}
                      
                      {donation.isGovFunding && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                          Government Grant
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mt-1">
                      From: {getDonorDisplayName(donation)}
                    </p>
                    
                    <p className="text-gray-600 text-sm">
                      Date: {formatDate(donation.timestamp)}
                    </p>
                    
                    {donation.projectTitle && (
                      <p className="text-gray-600 text-sm">
                        Project: {donation.projectTitle}
                      </p>
                    )}
                    
                    {donation.transactionHash && (
                      <p className="text-gray-600 text-xs mt-2 font-mono">
                        TX: {donation.transactionHash.substring(0, 10)}...{donation.transactionHash.substring(donation.transactionHash.length - 10)}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => openDonationEvidence(donation)}
                    className={`px-4 py-2 ${hasEvidence ? 'bg-blue-600' : 'bg-green-600'} text-white rounded hover:${hasEvidence ? 'bg-blue-700' : 'bg-green-700'}`}
                  >
                    {hasEvidence ? 'View/Edit Evidence' : 'Add Evidence'}
                  </button>
                </div>
                
                {/* Evidence preview if exists */}
                {donation.evidenceImages && Array.isArray(donation.evidenceImages) && donation.evidenceImages.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium text-sm text-gray-700 mb-2">Evidence:</p>
                    <div className="flex flex-wrap gap-2">
                      {donation.evidenceImages.map((imageUrl, index) => (
                        <img 
                          key={index}
                          src={imageUrl} 
                          alt={`Evidence ${index + 1}`}
                          className="h-16 w-16 object-cover rounded border border-gray-200"
                        />
                      ))}
                    </div>
                    {donation.evidenceDescription && (
                      <p className="mt-2 text-sm text-gray-600">{donation.evidenceDescription}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Evidence Upload Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Donation Evidence</h3>
                <button 
                  onClick={closeDonationEvidence}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Amount:</span> {selectedDonation.amount} {selectedDonation.currency}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">From:</span> {getDonorDisplayName(selectedDonation)}
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Date:</span> {formatDate(selectedDonation.timestamp)}
                </p>
                {selectedDonation.projectTitle && (
                  <p className="text-gray-600 text-sm">
                    <span className="font-medium">Project:</span> {selectedDonation.projectTitle}
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full p-2 border rounded focus:ring focus:ring-blue-200"
                  rows={4}
                  placeholder="Describe how this donation was used..."
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Upload Images
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Select Images
                </button>
                
                {/* Selected image previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={url} 
                          alt={`Selected image ${index + 1}`}
                          className="h-24 w-full object-cover rounded border border-gray-200" 
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Existing images */}
                {selectedDonation.evidenceImages && Array.isArray(selectedDonation.evidenceImages) && selectedDonation.evidenceImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Existing Evidence:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedDonation.evidenceImages.map((imageUrl, index) => (
                        <img 
                          key={index}
                          src={imageUrl} 
                          alt={`Evidence ${index + 1}`}
                          className="h-24 w-full object-cover rounded border border-gray-200" 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={closeDonationEvidence}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEvidence}
                  disabled={uploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {uploading ? (
                    <>
                      <span className="inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></span>
                      Uploading...
                    </>
                  ) : (
                    'Save Evidence'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}