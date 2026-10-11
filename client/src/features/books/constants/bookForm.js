/**
 * features/books/constants/bookForm.js
 *
 * Empty form shape for the book modal. Extracted from the module scope of
 * the former pages/Books.jsx.
 *
 * NOTE: the previous `FORM_ONLY_FIELDS` / `toApiPayload` pair was removed —
 * `toApiPayload` was never called anywhere (mutations send the form
 * directly), and stripping form-only keys belongs in the API layer if the
 * server ever needs it.
 */

export const EMPTY_FORM = {
  title:"", subtitle:"", authors:"", author:"", edition:"",
  lccn:"", isbn:"", issn:"",
  materialType:"Book", subtype:"Hardcover",
  authorName:"", authorDates:"",
  place:"", publisher:"", date:"", year:"",
  extent:"", otherDetails:"", size:"",
  genre:"", description:"", status:"Available",
  cover:null, quantity:1,
  accessionNumber:"", callNumber:"", volume:"",
  shelf:"", pages:"", collection:"",
  sublocation:"",
  copies: [],
  _mode:"manual",
};
