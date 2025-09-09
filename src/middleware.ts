import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip middleware for static assets and specific paths
  const skipPaths = [
    "/_next/",
    "/public/",
    "/assets/",
    "/static/",
    "/pdfjs/",
    "/api/auth/",
  ];

  if (skipPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Protected API routes that need authentication
  const protectedApiPaths = [
    "/api/topics",
    "/api/subtopics",
    "/api/simulations",
    "/api/exercises",
    "/api/user",
  ];
  const isProtectedApiPath = protectedApiPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Paths that should allow unauthenticated access but add user headers if authenticated
  const publicPathsWithAuth = ["/dashboard"];

  // Check if this is a subject-based route (e.g., /matematica/teoria, /fisica/simulazioni)
  const subjectBasedRoutePattern =
    /^\/[^\/]+\/(teoria|simulazioni|statistiche|tutor|pit)/;
  const isSubjectBasedRoute = subjectBasedRoutePattern.test(pathname);

  const shouldAddUserHeaders =
    publicPathsWithAuth.some((path) => pathname.startsWith(path)) ||
    isSubjectBasedRoute;

  // Allow public paths and subject-based routes
  if (!isProtectedApiPath) {
    // For paths that should have user headers, add user info if available
    if (
      shouldAddUserHeaders &&
      req.auth &&
      req.auth.user &&
      req.auth.user.id &&
      req.auth.user.email
    ) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", req.auth.user.id);
      requestHeaders.set("x-user-email", req.auth.user.email);
      if (req.auth.user.name) {
        requestHeaders.set("x-user-name", req.auth.user.name);
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  }

  // Check authentication for protected API routes only
  if (!req.auth?.user) {
    if (isProtectedApiPath) {
      // For API routes, return 401 Unauthorized
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // Add user info to headers for both pages and API routes to access
  const requestHeaders = new Headers(req.headers);
  if (req.auth?.user?.id) {
    requestHeaders.set("x-user-id", req.auth.user.id);
  }
  if (req.auth?.user?.email) {
    requestHeaders.set("x-user-email", req.auth.user.email);
  }
  if (req.auth?.user?.name) {
    requestHeaders.set("x-user-name", req.auth.user.name);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Auth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - pdfjs/ (PDF.js worker files)
     * - public folder
     * Also exclude:
     * - Static assets and resources
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public|assets|static|pdfjs).*)",
  ],
};
