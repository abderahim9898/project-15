import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKZpHRAm1W6lQddnArZo6Onxiwfngty6Y",
  authDomain: "secteur-1.firebaseapp.com",
  projectId: "secteur-1",
  storageBucket: "secteur-1.firebasestorage.app",
  messagingSenderId: "568304445766",
  appId: "1:568304445766:web:274405f81b2f432b80dd47",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface Worker {
  id: string;
  nom: string;
  cin: string;
  age: number;
  dateEntree: string;
  dateSortie: string;
  statut: "actif" | "inactif";
  fermeId: string;
  secteur: string;
  chambre: string;
  sexe: string;
  telephone: string;
  matricule: string;
  dateNaissance: string;
  motif: string;
  supervisorId: string;
  returnCount: number;
  totalWorkDays: number;
  allocatedItems?: Record<string, boolean>;
  workHistory?: WorkHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkHistoryItem {
  id: string;
  fermeId: string;
  dateEntree: string;
  chambre: string;
  secteur: string;
}

export interface Farm {
  id: string;
  nom: string;
  totalOuvriers: number;
  totalChambres: number;
  admins: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getWorkers(): Promise<Worker[]> {
  try {
    const workersCol = collection(db, "workers");
    const snapshot = await getDocs(workersCol);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Worker[];
  } catch (error) {
    // Return empty array if error occurs (including AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug("getWorkers request was aborted");
    } else {
      console.error("Error fetching workers:", error);
    }
    return [];
  }
}

export async function getActiveWorkers(): Promise<Worker[]> {
  try {
    const workersCol = collection(db, "workers");
    const q = query(workersCol, where("statut", "==", "actif"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Worker[];
  } catch (error) {
    // Return empty array if error occurs (including AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug("getActiveWorkers request was aborted");
    } else {
      console.error("Error fetching active workers:", error);
    }
    return [];
  }
}

export async function getWorkersEntering(days: number = 30): Promise<Worker[]> {
  try {
    const workers = await getWorkers();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return workers.filter((worker) => {
      if (!worker.dateEntree) return false;
      const entryDate = new Date(worker.dateEntree);
      return entryDate >= cutoffDate;
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug("getWorkersEntering request was aborted");
    } else {
      console.error("Error fetching workers entering:", error);
    }
    return [];
  }
}

export async function getWorkersLeaving(days: number = 30): Promise<Worker[]> {
  try {
    const workers = await getWorkers();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return workers.filter((worker) => {
      if (!worker.dateSortie) return false;
      const exitDate = new Date(worker.dateSortie);
      return exitDate >= cutoffDate;
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug("getWorkersLeaving request was aborted");
    } else {
      console.error("Error fetching workers leaving:", error);
    }
    return [];
  }
}

export async function getFarms(): Promise<Farm[]> {
  try {
    const farmesCol = collection(db, "fermes");
    const snapshot = await getDocs(farmesCol);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Farm[];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug("getFarms request was aborted");
    } else {
      console.error("Error fetching farms:", error);
    }
    return [];
  }
}

export async function getWorkersByFarm(farmId: string): Promise<Worker[]> {
  try {
    const workersCol = collection(db, "workers");
    const q = query(workersCol, where("fermeId", "==", farmId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Worker[];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug("getWorkersByFarm request was aborted");
    } else {
      console.error("Error fetching workers by farm:", error);
    }
    return [];
  }
}

export async function getSupervisorById(supervisorId: string): Promise<{ id: string; nom: string } | null> {
  try {
    const supervisorsCol = collection(db, "supervisors");
    const q = query(supervisorsCol, where("id", "==", supervisorId));
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        nom: doc.data().nom || supervisorId,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching supervisor:", error);
    return null;
  }
}

export async function getAllSupervisors(): Promise<Array<{ id: string; nom: string }>> {
  try {
    const supervisorsCol = collection(db, "supervisors");
    const snapshot = await getDocs(supervisorsCol);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      nom: doc.data().nom || doc.id,
    }));
  } catch (error) {
    console.error("Error fetching supervisors:", error);
    return [];
  }
}

export async function getDashboardSummary() {
  try {
    // Use Promise.allSettled instead of Promise.all to handle individual failures gracefully
    const results = await Promise.allSettled([
      getActiveWorkers(),
      getFarms(),
      getWorkersEntering(30),
      getWorkersLeaving(30),
    ]);

    const workers = results[0].status === 'fulfilled' ? results[0].value : [];
    const farms = results[1].status === 'fulfilled' ? results[1].value : [];
    const entering = results[2].status === 'fulfilled' ? results[2].value : [];
    const leaving = results[3].status === 'fulfilled' ? results[3].value : [];

    return {
      totalWorkers: workers.length,
      totalFarms: farms.length,
      workersEntering: entering.length,
      workersLeaving: leaving.length,
      farms,
      workers,
    };
  } catch (error) {
    // If all promises fail, return empty data structure
    console.error("Error in getDashboardSummary:", error);
    return {
      totalWorkers: 0,
      totalFarms: 0,
      workersEntering: 0,
      workersLeaving: 0,
      farms: [],
      workers: [],
    };
  }
}
