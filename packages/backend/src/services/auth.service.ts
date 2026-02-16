import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, type NewUser } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import type { RegisterInput, LoginInput, AuthResponse } from '../types/auth.types';

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, this.SALT_ROUNDS);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        name: input.name,
      })
      .returning();

    // Generate tokens
    const token = generateToken({ userId: newUser.id, email: newUser.email });
    const refreshToken = generateRefreshToken({ userId: newUser.id, email: newUser.email });

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      token,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    // Generate tokens
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      refreshToken,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
