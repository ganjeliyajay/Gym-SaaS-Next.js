import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  isValidRole,
  ROLE_PERMISSIONS,
  type UserRole,
} from "./lib/auth/roles"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes
  const protectedRoutes = [
    "/super-admin",
    "/dashboard",
    "/members",
    "/products",
    "/calendar",
    "/check-in",
    "/billing",
    "/team",
    "/reports",
    "/settings",
    "/signup-forms",
    "/member",
  ]

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  )

  const isAuthRoute = pathname === "/login" || pathname === "/register"

  // --------------------------------------------------
  // MULTI-TENANT SUBDOMAIN & CUSTOM DOMAIN RESOLUTION
  // --------------------------------------------------
  const RESERVED_SUBDOMAINS = new Set([
    "www",
    "app",
    "admin",
    "api",
    "dashboard",
    "super-admin",
    "auth",
    "mail",
    "support",
  ])

  const host = request.headers.get("host") || ""
  const cleanHost = host.split(":")[0].toLowerCase()

  let detectedSubdomain: string | null = null
  if (cleanHost.endsWith(".thinkauric.com")) {
    const parts = cleanHost.split(".")
    if (parts.length >= 3) detectedSubdomain = parts[0]
  } else if (cleanHost.includes(".localhost")) {
    const parts = cleanHost.split(".")
    if (parts.length >= 2 && parts[0] !== "localhost") detectedSubdomain = parts[0]
  }

  const isCustom =
    !cleanHost.includes("localhost") &&
    !cleanHost.endsWith(".vercel.app") &&
    !cleanHost.endsWith("thinkauric.com")

  if (isCustom) {
    response.headers.set("x-custom-domain", host)
    response.headers.set("x-tenant-type", "custom_domain")
  } else if (detectedSubdomain && !RESERVED_SUBDOMAINS.has(detectedSubdomain)) {
    const validSlugRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
    if (validSlugRegex.test(detectedSubdomain)) {
      response.headers.set("x-tenant-slug", detectedSubdomain)
      response.headers.set("x-tenant-type", "subdomain")
    }
  }

  // --------------------------------------------------
  // NOT AUTHENTICATED
  // --------------------------------------------------

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // --------------------------------------------------
  // GET USER ROLE
  // --------------------------------------------------

  let userRole: UserRole | null = null

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role && isValidRole(profile.role)) {
      userRole = profile.role
    }
  }

  // --------------------------------------------------
  // AUTHENTICATED USER -> LOGIN / REGISTER REDIRECT
  // --------------------------------------------------

  if (isAuthRoute && user) {
    if (userRole === "member") {
      return NextResponse.redirect(new URL("/member", request.url))
    }

    if (userRole === "trainer") {
      return NextResponse.redirect(new URL("/calendar", request.url))
    }

    if (userRole === "super_admin") {
      return NextResponse.redirect(new URL("/super-admin", request.url))
    }

    if (userRole === "admin" || userRole === "manager") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return response
  }

  // --------------------------------------------------
  // IF USER IS LOGGED IN BUT ROLE IS INVALID / MISSING
  // --------------------------------------------------

  if (user && isProtectedRoute && !userRole) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // --------------------------------------------------
  // MEMBER PORTAL -> MEMBER ONLY
  // --------------------------------------------------

  const isMemberRoute =
    pathname === "/member" || pathname.startsWith("/member/")

  if (isMemberRoute && userRole !== "member" && userRole !== "super_admin") {
    if (userRole === "trainer") {
      return NextResponse.redirect(new URL("/calendar", request.url))
    }

    if (userRole === "admin" || userRole === "manager") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.redirect(new URL("/", request.url))
  }

  // --------------------------------------------------
  // ROUTE -> PERMISSION MAPPING
  // --------------------------------------------------

  const routePermissionMap = [
    {
      prefix: "/dashboard",
      permission: "dashboard",
    },
    {
      prefix: "/members",
      permission: "members",
    },
    {
      prefix: "/products",
      permission: "products",
    },
    {
      prefix: "/calendar",
      permission: "calendar",
    },
    {
      prefix: "/check-in",
      permission: "checkIn",
    },
    {
      prefix: "/billing",
      permission: "billing",
    },
    {
      prefix: "/team",
      permission: "team",
    },
    {
      prefix: "/reports",
      permission: "reports",
    },
    {
      prefix: "/settings",
      permission: "settings",
    },
    {
      prefix: "/signup-forms",
      permission: "signupForms",
    },
  ] as const

  // --------------------------------------------------
  // TEAM INVITE -> ADMIN ONLY
  // --------------------------------------------------

  const isTeamInviteRoute =
    pathname === "/team/invite" || pathname.startsWith("/team/invite/")

  if (isTeamInviteRoute && userRole !== "admin" && userRole !== "super_admin") {
    return NextResponse.redirect(new URL("/team", request.url))
  }

  // --------------------------------------------------
  // TEAM EDIT -> ADMIN ONLY
  // --------------------------------------------------

  const isTeamEditRoute =
    pathname.startsWith("/team/") && pathname.endsWith("/edit")

  if (isTeamEditRoute && userRole !== "admin" && userRole !== "super_admin") {
    return NextResponse.redirect(new URL("/team", request.url))
  }

  // --------------------------------------------------
  // SUPER ADMIN ACCESS
  // --------------------------------------------------
  if (pathname.startsWith("/super-admin") && userRole !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (userRole === "super_admin") {
    return response
  }

  const matchedRoute = routePermissionMap.find((route) =>
    pathname.startsWith(route.prefix),
  )

  if (matchedRoute && userRole) {
    const hasAccess = ROLE_PERMISSIONS[userRole][matchedRoute.permission]

    if (!hasAccess) {
      if (userRole === "member") {
        return NextResponse.redirect(new URL("/member", request.url))
      }

      if (userRole === "trainer") {
        return NextResponse.redirect(new URL("/calendar", request.url))
      }

      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/dashboard/:path*",
    "/members/:path*",
    "/products/:path*",
    "/calendar/:path*",
    "/check-in/:path*",
    "/billing/:path*",
    "/team/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/signup-forms/:path*",
    "/member/:path*",
    "/login",
    "/register",
    "/",
    "/signup/:path*",
  ],
}
