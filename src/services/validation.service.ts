import { Users } from '@/models/users.model';
import {
  MAX_BIO_LENGTH,
  MAX_FULL_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_FULL_NAME_LENGTH,
  MIN_USERNAME_LENGTH,
  REGEX_FULL_NAME,
  REGEX_USERNAME,
} from '@/utils/validation';

class ValidationService {
  public async validateUsername(username: string): Promise<{
    isValid: boolean;
    message: string;
  }> {
    if (username.length < MIN_USERNAME_LENGTH) {
      return {
        isValid: false,
        message: `Username must be at least ${MIN_USERNAME_LENGTH} characters long`,
      };
    }

    if (username.length > MAX_USERNAME_LENGTH) {
      return {
        isValid: false,
        message: `Username must be at most ${MAX_USERNAME_LENGTH} characters long`,
      };
    }

    if (!username.match(REGEX_USERNAME)) {
      return {
        isValid: false,
        message: 'Username must only contain letters, numbers and underscores',
      };
    }

    const user = await Users.query().whereNotDeleted().where('username', username.toLocaleLowerCase().trim()).first();
    if (user) {
      return {
        isValid: false,
        message: 'Username is already taken',
      };
    }

    return {
      isValid: true,
      message: 'ok',
    };
  }

  public async validateFullName(fullName: string): Promise<{
    isValid: boolean;
    message: string;
  }> {
    if (fullName.length < MIN_FULL_NAME_LENGTH) {
      return {
        isValid: false,
        message: `Full name must be at least ${MIN_FULL_NAME_LENGTH} characters long`,
      };
    }

    if (fullName.length > MAX_FULL_NAME_LENGTH) {
      return {
        isValid: false,
        message: `Full name must be at most ${MAX_FULL_NAME_LENGTH} characters long`,
      };
    }

    if (!fullName.match(REGEX_FULL_NAME)) {
      return {
        isValid: false,
        message: 'Full name must only contain letters and spaces',
      };
    }

    return {
      isValid: true,
      message: 'ok',
    };
  }

  public async validateBio(bio: string | null): Promise<{
    isValid: boolean;
    message: string;
  }> {
    if (bio && bio.length > MAX_BIO_LENGTH) {
      return {
        isValid: false,
        message: `Bio must be at most ${MAX_BIO_LENGTH} characters long`,
      };
    }

    return {
      isValid: true,
      message: 'ok',
    };
  }
}

export default ValidationService;
