import { CreateAuthUserDto, UpdateAuthUserDto } from '@/dtos/auth_users.dto';
import { HttpException } from '@/exceptions/HttpException';
import { AuthUser } from '@/interfaces/auth_users.interface';
import { AuthUsers } from '@/models/auth_users.model';
import { Users } from '@/models/users.model';
import { isEmpty } from '@/utils/util';
import phone from 'phone';

class AuthUserService {
  public async findAuthUserBySessionId(sessionId: string): Promise<AuthUser> {
    const authUser = await AuthUsers.query().whereNotDeleted().where({ sessionId }).first();
    if (!authUser) throw new HttpException(404, 'Auth user not found');

    return authUser;
  }

  public async createAuthUser(data: CreateAuthUserDto): Promise<AuthUser> {
    if (isEmpty(data)) throw new HttpException(400, 'Missing data');

    const findAuthUser = await AuthUsers.query().whereNotDeleted().where({ sessionId: data.sessionId }).first();
    if (findAuthUser) throw new HttpException(409, `Auth user already exists with sessionId: ${data.sessionId}`);

    const authUser = await AuthUsers.query().insert(data);
    return authUser;
  }

  public async updateAuthUser(id: number, data: UpdateAuthUserDto, skipPhoneNumberControl: boolean = false): Promise<AuthUser> {
    if (isEmpty(data)) throw new HttpException(400, 'Missing data');

    const findAuthUser = await AuthUsers.query().whereNotDeleted().where({ id }).first();
    if (!findAuthUser) throw new HttpException(404, 'Auth user not found');

    if (data.dateOfBirth) {
      // TODO: Controllore che la data di nascita sia valida e che rispetti il minimum age
    }

    if (data.phoneNumber) {
      const phoneResults = phone(data.phoneNumber);
      if (!phoneResults.isValid) throw new HttpException(422, 'Phone number is not valid');

      if (!skipPhoneNumberControl) {
        const findUser = await Users.query().whereNotDeleted().where({ phoneNumber: phoneResults.phoneNumber }).first();
        if (findUser) throw new HttpException(409, `User already exists with phoneNumber: ${phoneResults.phoneNumber}`);
      }
    }

    if (data.username) {
      const findUser = await Users.query().whereNotDeleted().where({ username: data.username.toLocaleLowerCase().trim() }).first();
      if (findUser) throw new HttpException(409, `User already exists with username: ${data.username}`);
    }

    const authUser = await AuthUsers.query().patchAndFetchById(id, {
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      phoneNumber: data.phoneNumber,
      isPhoneNumberVerified: data.isPhoneNumberVerified,
      username: data.username ? data.username.toLocaleLowerCase().trim() : null,
    });

    return authUser;
  }

  public async deleteAuthUser(id: number): Promise<void> {
    await AuthUsers.query().deleteById(id);
  }
}

export default AuthUserService;
