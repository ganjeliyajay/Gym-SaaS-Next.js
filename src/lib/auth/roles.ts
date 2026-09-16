export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  TRAINER: "trainer",
  MEMBER: "member",
} as const

export type UserRole =
  (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  trainer: "Trainer",
  member: "Member",
}

export const ROLE_PERMISSIONS = {
  super_admin: {
    dashboard: true,
    members: true,
    products: true,
    signupForms: true,
    waivers: true,
    calendar: true,
    checkIn: true,
    billing: true,
    team: true,
    reports: true,
    settings: true,
    invite: true,
    removeTeamMember: true,
  },

  admin: {
    dashboard: true,
    members: true,
    products: true,
    signupForms: true,
    waivers: true,
    calendar: true,
    checkIn: true,
    billing: true,
    team: true,
    reports: true,
    settings: true,
    invite: true,
    removeTeamMember: true,
  },

  manager: {
    dashboard: true,
    members: true,
    products: true,
    signupForms: true,
    waivers: true,
    calendar: true,
    checkIn: true,
    billing: true,
    team: true,
    reports: true,
    settings: true,
    invite: false,
    removeTeamMember: false,
  },

  trainer: {
    dashboard: false,
    members: false,
    products: false,
    signupForms: false,
    waivers: false,
    calendar: true,
    checkIn: false,
    billing: false,
    team: false,
    reports: false,
    settings: true,
    invite: false,
    removeTeamMember: false,
  },

  member: {
    dashboard: false,
    members: false,
    products: false,
    signupForms: false,
    waivers: false,
    calendar: true,
    checkIn: false,
    billing: true,
    team: false,
    reports: false,
    settings: true,
    invite: false,
    removeTeamMember: false,
  },
} satisfies Record<
  UserRole,
  Record<string, boolean>
>

export type Permission =
  keyof (typeof ROLE_PERMISSIONS)["admin"]

export function hasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role][permission]
}

export function isValidRole(
  value: unknown,
): value is UserRole {
  return (
    value === ROLES.SUPER_ADMIN ||
    value === ROLES.ADMIN ||
    value === ROLES.MANAGER ||
    value === ROLES.TRAINER ||
    value === ROLES.MEMBER
  )
}