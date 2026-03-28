/**
 * BookAddImport.jsx
 *
 * Router component used by BookModal.jsx when addMode is "import" or "lexora".
 * Delegates to the correct importer and forwards the ref so BookModal's footer
 * can call startImport() / reset() on whichever child is active.
 *
 * Place this file at:  src/components/books/BookAddImport.jsx
 */

import { forwardRef, useImperativeHandle, useRef } from "react";
import BookImport   from "./BookImport";
import LexoraImport from "./Lexoraimport";

const BookAddImport = forwardRef(function BookAddImport(
  { mode, onStepChange, onImportComplete },
  ref
) {
  const innerRef = useRef(null);

  // Forward the imperative handle so BookModal can call startImport() / reset()
  useImperativeHandle(ref, () => ({
    startImport: () => innerRef.current?.startImport(),
    reset:       () => innerRef.current?.reset(),
    get step()   { return innerRef.current?.step;   },
    get parsed() { return innerRef.current?.parsed; },
  }));

  if (mode === "lexora") {
    return (
      <LexoraImport
        ref={innerRef}
        onStepChange={onStepChange}
        onImportComplete={onImportComplete}
      />
    );
  }

  // default: "import"
  return (
    <BookImport
      ref={innerRef}
      onStepChange={onStepChange}
      onImportComplete={onImportComplete}
    />
  );
});

export default BookAddImport;