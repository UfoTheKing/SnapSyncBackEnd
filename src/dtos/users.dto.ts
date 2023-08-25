export class CreateUserDto {
  username: string;
  password: string; // Sarà in plaintext, verrà poi criptata
  confirmPassword: string; // Sarà in plaintext, verrà poi criptata
  phoneNumber: string; // In formato internazionale, esempio: +393401234567
  phoneNumberVerificationCode: string; // Codice di verifica del numero di telefono
  dateOfBirth: Date; // Data di nascita
}
