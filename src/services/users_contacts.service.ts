import { CreateUserContactDto } from '@/dtos/users_contacts.dto';
import { HttpException } from '@/exceptions/HttpException';
import { UserContact } from '@/interfaces/users_contacts.interface';
import { Users } from '@/models/users.model';
import { UsersContacts } from '@/models/users_contacts.model';
import { isEmpty } from '@/utils/util';

class UserContactService {
  public async findUserContactByUserIdAndContactId(userId: number, contactId: number): Promise<UserContact> {
    const findOne = await UsersContacts.query().whereNotDeleted().where({ userId: userId, contactId: contactId }).first();
    if (!findOne) throw new HttpException(404, 'Contact not found');

    return findOne;
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

  public async deleteUserContactsByUserIdAndNotInContactIds(userId: number, contactIds: Array<number>): Promise<void> {
    await UsersContacts.query().whereNotDeleted().where('userId', userId).whereNotIn('id', contactIds).delete();
  }
}

export default UserContactService;
