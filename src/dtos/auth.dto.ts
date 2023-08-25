import { MulterUploadFile } from '@/interfaces/auth.interface';

export class LogInDto {
  usernameOrPhoneNumber: string;
  phoneNumberVerificationCode: string; // Codice di verifica del numero di telefono

  fromSignUp: boolean; // Se true ignora la verifica del codice di verifica del numero di telefono
}

export class SignUpDto {
  sessionId: string;
  file: MulterUploadFile;
}

export class LogInPhoneNumberDto {
  phoneNumber: string;
}

export class LogInWithAuthTokenDto {
  authToken: string;
}

export class AuthDto {
  fullName: string;
  username: string; // Sarà sempre presente
  phoneNumberVerificationCode: string; // Codice di verifica del numero di telefono
  phoneNumber?: string;

  yearOfBirth?: number;
  monthOfBirth?: number;
  dayOfBirth?: number;
}
