import { DB_DATABASE } from '@/config';
import { CreateUserContactDto } from '@/dtos/users_contacts.dto';
import { HttpException } from '@/exceptions/HttpException';
import { SmallUser } from '@/interfaces/users.interface';
import { UserContact } from '@/interfaces/users_contacts.interface';
import { Users } from '@/models/users.model';
import { UsersContacts } from '@/models/users_contacts.model';
import { isEmpty } from '@/utils/util';
import { boolean } from 'boolean';
import knex from '@/databases';
import UserService from './users.service';

class UserContactService {
  public async findUserContactByUserIdAndContactId(userId: number, contactId: number): Promise<UserContact> {
    const findOne = await UsersContacts.query().whereNotDeleted().where({ userId: userId, contactId: contactId }).first();
    if (!findOne) throw new HttpException(404, 'Contact not found');

    return findOne;
  }

  public async findUserContactsExcludingBlockedUsersByUserId(
    userId: number,
    page: number = 1,
    count: number = 12,
    query: string | null = null,
    excludeUsersIds: Array<number> = [],
  ): Promise<{
    contacts: Array<SmallUser>;
    pagination: {
      page: number;
      size: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    const StoredProcedureName = `${DB_DATABASE}.GetContactsExcludingBlockedUsers`;
    const StoredProcedureNameNumberOfFriends = `${DB_DATABASE}.GetNumberContactsExcludingBlockedUsers`;

    // Converto l'array in una stringa con gli id separati da virgola
    let excludeUsersIdsString = excludeUsersIds.join(',');

    let offsetRows = (page - 1) * count;
    let limitRows = count;
    const results = await knex.raw(
      `CALL ${StoredProcedureName}(${userId}, ${limitRows}, ${offsetRows}, ${query ? "'" + query + "'" : null}, '${excludeUsersIdsString}')`,
    );
    const resultsNumber = await knex.raw(
      `CALL ${StoredProcedureNameNumberOfFriends}(${userId}, ${query ? "'" + query + "'" : null}, '${excludeUsersIdsString}')`,
    );

    let responseResults: Array<{
      id: number;
      username: string;
      fullName: string;
      isVerified: boolean;
      profilePictureUrl: string;
    }> = [];
    let responseResultsNumber: {
      numberOfContacts: number;
    } = {
      numberOfContacts: 0,
    };

    if (results.length > 0 && results[0].length > 0) {
      responseResults = results[0][0];
    }

    if (resultsNumber.length > 0 && resultsNumber[0].length > 0 && resultsNumber[0][0].length > 0) {
      responseResultsNumber = resultsNumber[0][0][0].numContacts
        ? {
            numberOfContacts: resultsNumber[0][0][0].numContacts,
          }
        : { numberOfContacts: 0 };
    }

    let contacts: Array<SmallUser> = [];

    if (responseResultsNumber.numberOfContacts > 0) {
      await Promise.all(
        responseResults.map(async r => {
          let profilePictureUrl: string = await new UserService().findUserProfilePictureUrlById(r.id);
          let user: SmallUser = {
            id: r.id,
            username: r.username,
            fullName: r.fullName,
            isVerified: boolean(r.isVerified),
            profilePictureUrl: profilePictureUrl,
          };

          contacts.push(user);
        }),
      );
    }

    return {
      contacts,
      pagination: {
        page: page,
        size: count,
        total: responseResultsNumber.numberOfContacts,
        hasMore: page * count < responseResultsNumber.numberOfContacts,
      },
    };
  }

  public async createUserContact(data: CreateUserContactDto): Promise<UserContact> {
    if (isEmpty(data)) throw new HttpException(400, "Data can't be empty");

    const findUser = await Users.query().whereNotDeleted().findById(data.userId);
    if (!findUser) throw new HttpException(404, 'User not found');

    const findContact = await Users.query().whereNotDeleted().findById(data.contactId);
    if (!findContact) throw new HttpException(404, 'Contact not found');

    const findOne = await UsersContacts.query().whereNotDeleted().where({ userId: data.userId, contactId: data.contactId }).first();
    if (findOne) throw new HttpException(409, 'Contact already exists');

    const createData: UserContact = await UsersContacts.query().insert(data);

    return createData;
  }
}

export default UserContactService;
