export class AppError extends Error { constructor(message: string, public code: "invalid" | "forbidden" | "not_found" | "conflict" = "invalid") { super(message); } }
export const invalid = (m: string) => new AppError(m, "invalid");
export const forbidden = (m = "You can't do that from this role.") => new AppError(m, "forbidden");
export const notFound = (m = "Request not found.") => new AppError(m, "not_found");
export const conflict = (m = "Someone else changed this request. Reload and try again.") => new AppError(m, "conflict");
