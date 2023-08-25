export class CreatePendingFriendDto {
    userId: number;
    friendId: number;
}

export class AcceptPendingFriendDto {
    userId: number;
    friendId: number;
}

export class DenyPendingFriendDto {
    userId: number;
    friendId: number;
}
