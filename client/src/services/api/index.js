/**
 * client/src/services/api/index.js
 * Centralised export of all API service modules
 */

export * from "./booksApi";
export * from "./attendanceApi";
export * from "./authApi";
export * from "./coursesApi";

export { default as booksApi }        from "./booksApi";
export { default as searchApi }       from "./searchApi";
export { default as attendanceApi }   from "./attendanceApi";
export { default as authApi }         from "./authApi";
export { default as coursesApi }      from "./coursesApi";
