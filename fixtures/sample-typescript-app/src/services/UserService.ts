export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private users: Map<string, User> = new Map();

  constructor() {
    this.users = new Map();
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  public async createUser(name: string, email: string): Promise<User> {
    const user: User = { id: 'user-1', name, email };
    this.users.set(user.id, user);
    return user;
  }
}
