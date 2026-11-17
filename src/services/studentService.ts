import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { StudentRecord } from '../types';

const LOCAL_STORAGE_KEY_STUDENTS = 'proctored_exam_students_roster';

const RAW_DEFAULT_NAMES = [
  'Chaima Akendsi',
  'Essalka',
  'Fatma',
  'Mehdi',
  'Abdessamad',
  'Hamza Bougrine',
  'Wael',
  'Najlae',
  'Chaima Alktif',
  'Hassan',
  'Hamza Labiad',
  'Ismael',
  'Ilyass',
  'Brahim',
  'Othmane',
  'Lamia',
  'Olaya',
];

export function sortStudentsAlphabetically(students: StudentRecord[]): StudentRecord[] {
  return [...students].sort((a, b) =>
    a.name.trim().localeCompare(b.name.trim(), undefined, { sensitivity: 'base' })
  );
}

export const DEFAULT_STUDENTS: StudentRecord[] = sortStudentsAlphabetically(
  RAW_DEFAULT_NAMES.map((name, idx) => ({
    id: `student_${idx + 1}`,
    name: name.trim(),
  }))
);

function getLocalStudents(): StudentRecord[] {
  if (typeof window === 'undefined') return DEFAULT_STUDENTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_STUDENTS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
      return DEFAULT_STUDENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return sortStudentsAlphabetically(parsed);
    }
    return DEFAULT_STUDENTS;
  } catch {
    return DEFAULT_STUDENTS;
  }
}

function saveLocalStudents(students: StudentRecord[]): StudentRecord[] {
  const sorted = sortStudentsAlphabetically(students);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_STUDENTS, JSON.stringify(sorted));
    } catch (err) {
      console.error('Failed to save students to local storage:', err);
    }
  }
  return sorted;
}

export const StudentService = {
  /**
   * Fetch all students sorted alphabetically (Firestore with localStorage fallback)
   */
  async getStudents(): Promise<StudentRecord[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'students'));
        if (querySnapshot.empty) {
          await this.seedDefaultStudents();
          return DEFAULT_STUDENTS;
        }

        const students: StudentRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name && typeof data.name === 'string') {
            students.push({
              id: docSnap.id,
              name: data.name.trim(),
            });
          }
        });

        const sorted = sortStudentsAlphabetically(students);
        saveLocalStudents(sorted);
        return sorted;
      } catch (err) {
        console.warn('Firestore student fetch failed, falling back to local roster:', err);
        return getLocalStudents();
      }
    }
    return getLocalStudents();
  },

  /**
   * Add a new student and keep alphabetical order
   */
  async addStudent(name: string): Promise<StudentRecord> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Student name cannot be empty.');
    }

    const existing = await this.getStudents();
    const duplicate = existing.some(
      (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`"${cleanName}" is already in the student list.`);
    }

    const newId = 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newStudent: StudentRecord = { id: newId, name: cleanName };

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'students', newId);
        await setDoc(docRef, {
          name: cleanName,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Firestore addStudent error:', err);
      }
    }

    const current = getLocalStudents();
    saveLocalStudents([...current, newStudent]);

    return newStudent;
  },

  /**
   * Modify an existing student's name and re-sort alphabetically
   */
  async updateStudent(id: string, newName: string): Promise<void> {
    const cleanName = newName.trim();
    if (!cleanName) {
      throw new Error('Student name cannot be empty.');
    }

    const existing = await this.getStudents();
    const duplicate = existing.some(
      (s) => s.id !== id && s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`"${cleanName}" is already in the student list.`);
    }

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'students', id);
        await updateDoc(docRef, { name: cleanName });
      } catch (err) {
        console.error('Firestore updateStudent error:', err);
      }
    }

    const current = getLocalStudents();
    const idx = current.findIndex((s) => s.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], name: cleanName };
      saveLocalStudents(current);
    }
  },

  /**
   * Remove a student from the roster
   */
  async deleteStudent(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'students', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Firestore deleteStudent error:', err);
      }
    }

    const current = getLocalStudents();
    saveLocalStudents(current.filter((s) => s.id !== id));
  },

  /**
   * Seed the default 17 students into Firestore and localStorage
   */
  async seedDefaultStudents(): Promise<number> {
    if (isFirebaseConfigured() && db) {
      for (const s of DEFAULT_STUDENTS) {
        const docRef = doc(db, 'students', s.id);
        await setDoc(docRef, { name: s.name });
      }
    }
    saveLocalStudents(DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS.length;
  },
};
