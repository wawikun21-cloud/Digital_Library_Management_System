/**
 * client/src/services/api/index.js
 * Centralised export of all API service modules
 */

export * from "./booksApi";
export * from "./transactionsApi";
export * from "./attendanceApi";
export * from "./studentsApi";
export * from "./authApi";
export * from "./analyticsApi";

export { default as booksApi }        from "./booksApi";
export { default as searchApi }       from "./searchApi";
export { default as transactionsApi } from "./transactionsApi";
export { default as attendanceApi }   from "./attendanceApi";
export { default as studentsApi }     from "./studentsApi";
export { default as authApi }         from "./authApi";
export { default as analyticsApi }    from "./analyticsApi";