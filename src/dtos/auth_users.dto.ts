export class CreateAuthUserDto {
  sessionId: string;
}

export class UpdateAuthUserDto {
  fullName: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  isPhoneNumberVerified: boolean;
  username: string | null;
}
