import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

import { db } from '@/firebase/firestore';
import { Competency } from '@/models/Competency';

/* ---------- GET ALL ---------- */

export async function getAllCompetencies(): Promise<Competency[]> {
  const snapshot = await getDocs(collection(db, 'competencies'));

  return snapshot.docs.map(doc => doc.data() as Competency);
}

/* ---------- SEED (za razvoj) ---------- */

export async function seedCompetencies() {
  const competencies: Competency[] = [
    // FIRST AID
    {
      id: 'fa_basic',
      program: 'FIRST_AID',
      level: 'Osnovna obuka',
    },
    {
      id: 'fa_advanced',
      program: 'FIRST_AID',
      level: 'Napredna obuka',
    },
    {
      id: 'fa_peer',
      program: 'FIRST_AID',
      level: 'Vršnjački edukator',
    },
    {
      id: 'fa_lecturer',
      program: 'FIRST_AID',
      level: 'Predavač',
    },

    // OSTALI PROGRAMI (samo osnovna)
    {
      id: 'phv_basic',
      program: 'PHV',
      level: 'Osnovna obuka',
    },
    {
      id: 'drr_basic',
      program: 'DRR',
      level: 'Osnovna obuka',
    },
    {
      id: 'antitrafficking_basic',
      program: 'ANTITRAFFICKING',
      level: 'Osnovna obuka',
    },
    {
      id: 'health_basic',
      program: 'HEALTH',
      level: 'Osnovna obuka',
    },
    {
      id: 'lifesaving_basic',
      program: 'LIFESAVING',
      level: 'Osnovna obuka',
    },
    {
      id: 'dun_basic',
      program: 'DUN',
      level: 'Osnovna obuka',
    },
  ];

  for (const competency of competencies) {
    const ref = doc(db, 'competencies', competency.id);
    await setDoc(ref, competency);
  }

  console.log('Competencies seeded!');
}