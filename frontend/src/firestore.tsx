import { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { User, NGODetails, Project, Donation } from './types';

// User related functions
export const createUser = async (userData: Omit<User, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'users'), {
    ...userData,
    createdAt: serverTimestamp()
  });
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const userDoc = querySnapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() } as User;
};

// NGO related functions
export const createNGODetails = async (ngoDetails: Omit<NGODetails, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'ngos'), {
    ...ngoDetails,
    createdAt: serverTimestamp()
  });
};

export const getNGODetailsByEmail = async (email: string): Promise<NGODetails | null> => {
  const q = query(collection(db, 'ngos'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const ngoDoc = querySnapshot.docs[0];
  return { id: ngoDoc.id, ...ngoDoc.data() } as NGODetails;
};

export const getAllNGOs = async (): Promise<NGODetails[]> => {
  const querySnapshot = await getDocs(collection(db, 'ngos'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NGODetails));
};

export const updateNGOApprovalStatus = async (id: string, isApproved: boolean): Promise<void> => {
  await updateDoc(doc(db, 'ngos', id), { isApproved });
};

// Project related functions
export const createProject = async (project: Omit<Project, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'projects'), {
    ...project,
    createdAt: serverTimestamp()
  });
};

export const getProjectsByNGOEmail = async (email: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('ngoEmail', '==', email));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

export const getAllProjects = async (): Promise<Project[]> => {
  const querySnapshot = await getDocs(collection(db, 'projects'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

export const getApprovedProjects = async (): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('isApproved', '==', true));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

export const updateProjectApprovalStatus = async (id: string, isApproved: boolean): Promise<void> => {
  await updateDoc(doc(db, 'projects', id), { isApproved });
};

export const deleteProject = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', id));
};

// Get all verified NGOs
export const getAllVerifiedNGOs = async (): Promise<NGODetails[]> => {
  const q = query(collection(db, 'ngos'), where('isApproved', '==', true));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NGODetails));
};

// Verify NGO by code
export const verifyNGOByCode = async (code: string): Promise<{
  success: boolean;
  ngoId?: string;
  ngoName?: string;
  message?: string;
}> => {
  try {
    // Look for the NGO with this code
    const q = query(collection(db, 'ngos'), where('code', '==', code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { 
        success: false, 
        message: 'No NGO found with this verification code.'
      };
    }
    
    const ngoDoc = querySnapshot.docs[0];
    const ngoData = ngoDoc.data() as NGODetails;
    
    if (ngoData.isApproved) {
      return { 
        success: false, 
        message: 'This NGO has already been verified.'
      };
    }
    
    // Approve the NGO
    await updateDoc(doc(db, 'ngos', ngoDoc.id), { isApproved: true });
    
    return { 
      success: true, 
      ngoId: ngoDoc.id,
      ngoName: ngoData.name 
    };
  } catch (error) {
    console.error('Error verifying NGO:', error);
    return { 
      success: false, 
      message: 'An error occurred during verification. Please try again.' 
    };
  }
};

// Use Firestore to store document info instead of direct Storage
export const uploadNGODocument = async (userEmail: string, documentFile: File, File: { new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File; prototype: File; }, p0: string, p1: string, String: StringConstructor, file: File, ngoEmail: string): Promise<string> => {
  try {
    // 1. Convert file to base64 string
    const base64 = await readFileAsBase64(file);
    
    // 2. Save the document info to Firestore
    const docRef = await addDoc(collection(db, 'ngo_documents'), {
      ngoEmail: ngoEmail,
      fileName: file.name,
      fileType: file.type,
      fileContent: base64,
      uploadedAt: serverTimestamp()
    });
    
    // 3. Return the document ID as a reference
    console.log('Document uploaded to Firestore with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document. Please try again.');
  }
};

// Helper function to convert a file to base64
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Function to retrieve document from Firestore
export const getNGODocument = async (documentId: string): Promise<{
  fileName: string;
  fileType: string;
  fileContent: string;
}> => {
  try {
    const docSnap = await getDoc(doc(db, 'ngo_documents', documentId));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        fileName: data.fileName,
        fileType: data.fileType,
        fileContent: data.fileContent
      };
    } else {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('Error retrieving document:', error);
    throw error;
  }
};

// Modified function to get NGO details, including document data
export const getNGODetailsForAuthorizer = async (ngoId: string): Promise<NGODetails | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'ngos', ngoId));
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const ngoData = { id: docSnap.id, ...docSnap.data() } as NGODetails;
    
    // If there's a document reference, fetch the actual document data
    if (ngoData.documentURL) {
      try {
        const documentData = await getNGODocument(ngoData.documentURL);
        // Store the content directly in the NGO details for display
        ngoData.documentContent = documentData.fileContent;
        ngoData.documentName = documentData.fileName;
      } catch (err) {
        console.warn('Could not load document data:', err);
      }
    }
    
    return ngoData;
  } catch (error) {
    console.error('Error loading NGO details:', error);
    return null;
  }
};

// Update NGO wallet address
export const updateNGOWalletAddress = async (ngoId: string, walletAddress: string): Promise<void> => {
  await updateDoc(doc(db, 'ngos', ngoId), { walletAddress });
};

// Create donation record
export const createDonation = async (donation: Omit<Donation, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'donations'), {
    ...donation,
    createdAt: serverTimestamp()
  });
};

// Get donations by user wallet address
export const getUserDonations = async (walletAddress: string): Promise<Donation[]> => {
  // Using just 'where' without orderBy to avoid composite index requirements initially
  const q = query(
    collection(db, 'donations'), 
    where('donorAddress', '==', walletAddress)
  );
  
  const querySnapshot = await getDocs(q);
  // Sort in memory to avoid requiring a composite index
  const donations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation));
  return donations.sort((a, b) => b.timestamp - a.timestamp);
};

// Get donations for a specific NGO
export const getDonationsByNGOEmail = async (ngoEmail: string): Promise<Donation[]> => {
  // Using just 'where' without orderBy to avoid composite index requirements initially
  const q = query(
    collection(db, 'donations'), 
    where('ngoEmail', '==', ngoEmail)
  );
  
  const querySnapshot = await getDocs(q);
  // Sort in memory to avoid requiring a composite index
  const donations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation));
  return donations.sort((a, b) => b.timestamp - a.timestamp);
};

// Get all documents for an NGO by email
export const getNGODocumentsByEmail = async (email: string): Promise<any[]> => {
  const q = query(collection(db, 'ngo_documents'), where('ngoEmail', '==', email));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ...existing code...

/**
 * Fetches all donations associated with an NGO by email
 * @param ngoEmail The email of the NGO
 * @returns Array of donation objects
 */
export const fetchDonationsByNGO = async (ngoEmail: string): Promise<any[]> => {
  try {
    const donationsRef = collection(db, 'donations');
    const q = query(donationsRef, where('ngoEmail', '==', ngoEmail));
    const querySnapshot = await getDocs(q);
    
    const donations = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamp to JavaScript Date or use current date as fallback
      const timestamp = data.timestamp?.toDate ? 
        data.timestamp.toDate() : 
        data.createdAt?.toDate ? 
          data.createdAt.toDate() : 
          new Date();
      
      return {
        ...data,
        id: doc.id,
        timestamp: timestamp
      };
    });
    
    // Sort donations by timestamp (newest first)
    return donations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error fetching NGO donations:', error);
    throw error;
  }
};

/**
 * Updates a donation with evidence images and description
 * @param donationId The ID of the donation to update
 * @param images Array of image files to upload
 * @param description Text description of how the donation was used
 * @returns Promise that resolves when the update is complete
 */
export const updateDonationEvidence = async (
  donationId: string,
  images: File[],
  description: string
): Promise<void> => {
  try {
    // Reference to the donation document
    const donationRef = doc(db, 'donations', donationId);
    
    // Get existing donation data
    const donationDoc = await getDoc(donationRef);
    if (!donationDoc.exists()) {
      throw new Error('Donation not found');
    }
    
    const donationData = donationDoc.data();
    
    // Convert new images to base64
    const imagePromises = images.map(image => readFileAsBase64(image));
    const base64Images = await Promise.all(imagePromises);
    
    // Get existing evidence images or initialize empty array
    const existingImages = donationData.evidenceImages || [];
    
    // Combine existing and new images
    const updatedImages = [...existingImages, ...base64Images];
    
    // Update the donation document
    await updateDoc(donationRef, {
      evidenceImages: updatedImages,
      evidenceDescription: description,
      status: 'completed', // Update status when evidence is added
      lastUpdated: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error updating donation evidence:', error);
    throw error;
  }
};

// ...existing code...
