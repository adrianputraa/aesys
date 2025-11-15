type UserRole = 'ADMIN' | 'MERCHANT' | 'USER';
type UserSchema = {
  id: number;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};
