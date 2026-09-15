// preid.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function verifyPremiumId(inputId) {
  const cleanId = inputId.trim().toUpperCase();
  
  if (cleanId.length !== 8) {
    return { valid: false, message: "Invalid ID format. Must be exactly 8 characters." };
  }

  try {
    const q = query(collection(db, 'premium_ids'), where('premiumId', '==', cleanId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { valid: false, message: "Premium ID not found in our database." };
    }

    const docData = querySnapshot.docs[0].data();

    if (!docData.isActive) {
      return { valid: false, message: "This Premium ID has been disabled by the administrator." };
    }

    return { 
      valid: true, 
      message: "Premium ID verified successfully!", 
      userData: { name: docData.name, age: docData.age } 
    };
  } catch (error) {
    console.error("Error verifying Premium ID:", error);
    return { valid: false, message: "An error occurred during verification. Please try again." };
  }
}
