## NGO Work Monitoring System
A blockchain-based platform for transparent and accountable charitable donations.

**Live Demo**: [https://ngoworkmonitoring.web.app](https://ngoworkmonitoring.web.app)

---

## Overview

The NGO Work Monitoring System is a comprehensive platform that connects donors, NGOs, and government agencies through a transparent blockchain-based donation tracking system.

The platform ensures accountability by allowing NGOs to provide evidence of how donations are utilized, while donors can track the impact of their contributions.

---

## Features

### For Donors
- Create an account and connect Ethereum wallet
- Browse verified NGO projects
- Make direct cryptocurrency donations
- Track donation history and evidence of fund utilization
- View transparent project outcomes with photographic evidence

### For NGOs
- Register organization with verification documents
- Create and manage projects once verified
- Receive direct donations through Ethereum blockchain
- Upload evidence of how donations are utilized
- Build donor trust through transparent reporting

### For Government Authorities
- Verify NGO registrations and approve projects
- Monitor donation flow and fund utilization
- Provide government grants through the platform
- Generate oversight reports
- Ensure compliance with regulations

---

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Web3 Integration**: ethers.js
- **Wallet Connection**: MetaMask

---

## Smart Contract

The system uses an Ethereum smart contract (`NGODonation.sol`) deployed on the Sepolia testnet to:
- Register and verify NGOs
- Process transparent donations
- Track all financial transactions
- Implement role-based access control

---

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MetaMask browser extension
- Sepolia testnet ETH (for transactions)

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/sathvikinguva/NGO-Work-Monitoring-System
cd ngo-work-monitoring
```

### 2. Install dependencies
```bash
cd frontend
npm install
```

### 3. Configure Firebase
Update the config.ts file with your Firebase project details:
```bash
// filepath: frontend/src/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
```

### 4. Configure Blockchain
Create or update the constants.ts file with your deployed smart contract address:
```bash
// filepath: frontend/src/constants.ts
export const NGO_CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

### 5. Start the development server
```bash
npm run dev
```
---

## Usage

### Sign Up/Login
- Create an account as a Donor, NGO, or Government Authorizer
- NGOs must go through a verification process

### Donors
- Connect your MetaMask wallet
- Browse verified projects
- Make donations in ETH
- Track your donation history and impact

### NGOs
- Complete verification process
- Create projects for funding
- Receive donations through blockchain
- Upload evidence of fund utilization

### Government Authorizers
- Review and verify NGO applications
- Monitor projects and donations
- Provide government funding
- View evidence of fund utilization

---

## Deployment
The application is deployed on Firebase Hosting.
To deploy your own instance:
```bash
npm run build
firebase deploy
```

---

## Security Features
- Email verification for all users
- Role-based access control
- Secure blockchain transactions
- Image upload verification
- Smart contract security checks

---

## Troubleshooting
- MetaMask Connection Issues: Ensure you're connected to the Sepolia testnet.
- Transaction Errors: Check if you have sufficient Sepolia ETH.
- Upload Problems: Verify that file sizes are under 5MB for evidence images.

---

## Contributing
Contributions are welcome!
Feel free to submit a Pull Request.

---

## Acknowledgements
- Ethereum Foundation
- Firebase
- React community
- TailwindCSS

---

## Contact
For questions or support, please contact:
sathvikinguva@gmail.com

---
