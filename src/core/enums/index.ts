export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  GLOBAL_USER = 'GLOBAL_USER',
}

export enum CefrLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export enum TaskType {
  READING = 'READING',
  WRITING = 'WRITING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  GRAMMAR = 'GRAMMAR',
  VOCABULARY = 'VOCABULARY',
  TEST = 'TEST',
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AchievementType {
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  TEST_PASSED = 'TEST_PASSED',
  STREAK_7_DAYS = 'STREAK_7_DAYS',
  PERFECT_SCORE = 'PERFECT_SCORE',
}

export enum NotificationType {
  PAYMENT = 'PAYMENT',
  ASSIGNMENT = 'ASSIGNMENT',
  SYSTEM = 'SYSTEM',
  ACHIEVEMENT = 'ACHIEVEMENT',
  GENERAL = 'GENERAL',
}

export const allGroupsForSwaggerEnum = () => {
  let GroupScalarFieldEnum


  return GroupScalarFieldEnum
}
