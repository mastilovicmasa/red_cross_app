type ErrorWithCode = {
  code?: string;
  message?: string;
};

const firebaseAuthMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Ova email adresa se već koristi.',
  'auth/invalid-email': 'Email adresa nije ispravna.',
  'auth/missing-email': 'Unesite email adresu.',
  'auth/weak-password': 'Lozinka je previše slaba.',
  'auth/user-not-found': 'Korisnik sa ovom email adresom ne postoji.',
  'auth/wrong-password': 'Uneta lozinka nije ispravna.',
  'auth/invalid-credential': 'Email adresa ili lozinka nisu ispravni.',
  'auth/user-disabled': 'Ovaj nalog je onemogućen.',
  'auth/too-many-requests':
    'Previše neuspešnih pokušaja. Pokušajte ponovo malo kasnije.',
  'auth/network-request-failed':
    'Došlo je do problema sa mrežom. Pokušajte ponovo.',
};

export function getFirebaseAuthErrorMessage(
  error: unknown,
  fallback = 'Došlo je do greške. Pokušajte ponovo.'
) {
  const code = (error as ErrorWithCode | undefined)?.code;

  if (code && firebaseAuthMessages[code]) {
    return firebaseAuthMessages[code];
  }

  return fallback;
}
