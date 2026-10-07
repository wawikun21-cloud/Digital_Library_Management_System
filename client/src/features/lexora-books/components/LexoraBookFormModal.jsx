import { useState, useEffect, useCallback, useRef } from "react"
import {
  AlertCircle, ArrowDown, ArrowUp, BookOpen, Check, ChevronDown, FileText,
  Globe, Image as ImageIcon, Loader2, Lock, Plus, Trash2, Upload, X,
} from "lucide-react"
import {
  fetchCategories, createCategory, setBookCategories,
  fetchTags, createTag, setBookTags,
  uploadBookPdf, removeBookPdf, uploadBookCover, removeBookCover, uploadBookThumbnail, uploadBookPages,
  createLexoraBook, updateLexoraBook,
  fetchBookPages, deleteBookPage, reorderBookPages, replaceBookPage,
} from "../../../services/api/lexoraBooksApi"

const EMPTY_FORM = {
  title: "", short_description: "", author: "", source_type: "",
  pdf_url: "", thumbnail_url: "", cover_url: "", download_url: "",
  publish_on: "", isbn10: "", isbn13: "", total_pages: "", length: "",
  dimensions: "", file_size: "", publisher: "", co_publisher: "", translator: "",
  asin: "", doi: "", llcn: "", weight_value: "", weight_unit: "",
  edition: "", status: "draft", visibility: "public",
  source: "", year: "", resource_type: "", format: "",
  subject_course: "", program: "", collection: "Lexora",
  table_of_contents: [],
  category_ids: [], tag_ids: [],
}

const ADVANCED_FIELDS = ["isbn10", "isbn13", "asin", "doi", "llcn", "co_publisher", "translator",
  "dimensions", "length", "weight_value", "weight_unit", "download_url"]

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "cover", label: "Cover" },
  { id: "details", label: "Details" },
  { id: "contents", label: "Table of contents" },
  { id: "organize", label: "Categories & tags" },
  { id: "publish", label: "Visibility" },
]

const inputCls = (err) =>
  `w-full rounded-lg border bg-[color:var(--bg-primary)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:ring-2 focus:ring-[rgba(238,162,58,0.3)] ${
    err ? "border-red-400" : "border-[color:var(--border)] focus:border-[color:var(--accent-amber)]"}`

export default function LexoraBookFormModal({ isOpen, onClose, book, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [draftBook, setDraftBook] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [pdfFile, setPdfFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null)
  const [pageFiles, setPageFiles] = useState([])
  const [existingPages, setExistingPages] = useState([])
  const [pageActionId, setPageActionId] = useState(null)
  const [pageFilePreviews, setPageFilePreviews] = useState([])
  const [removePdfPending, setRemovePdfPending] = useState(false)
  const [removeCoverPending, setRemoveCoverPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [activeSection, setActiveSection] = useState("basics")
  const scrollRef = useRef(null)
  const initialRef = useRef("")
  const closeRef = useRef(onClose)

  const existingBook = book || draftBook
  const isEdit = !!existingBook?.id
  const dirty = isOpen && (JSON.stringify(form) !== initialRef.current ||
    !!(pdfFile || coverFile || thumbnailFile || pageFiles.length))

  const requestClose = () => {
    if (saving || uploading) return
    if (dirty && !window.confirm("Discard your unsaved changes?")) return
    onClose()
  }
  closeRef.current = requestClose

  useEffect(() => {
    if (!isOpen) return
    const tableOfContents = parseTableOfContents(book?.table_of_contents)
    const next = book
      ? { ...EMPTY_FORM, ...book,
          table_of_contents: tableOfContents,
          category_ids: book.categories?.map((c) => c.id) || [],
          tag_ids: book.tags?.map((t) => t.id) || [] }
      : { ...EMPTY_FORM }
    setDraftBook(null)
    setForm(next)
    initialRef.current = JSON.stringify(next)
    setShowMore(!!book && ADVANCED_FIELDS.some((f) => next[f]))
    setActiveSection("basics")
    setErrors({})
    setPdfFile(null)
    setCoverFile(null)
    setThumbnailFile(null)
    setPageFiles([])
    setExistingPages(book?.source_type === "images" ? book.pages || [] : [])
    setRemovePdfPending(false)
    setRemoveCoverPending(false)
    loadExtras()
    if (book?.id && book.source_type === "images") {
      fetchBookPages(book.id).then((result) => {
        if (result.success) setExistingPages(result.data || [])
        else setErrors((prev) => ({ ...prev, pages: result.error || "Could not load book pages" }))
      })
    }
  }, [isOpen, book])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === "Escape") closeRef.current() }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!coverFile) { setCoverPreviewUrl(null); return }
    const url = URL.createObjectURL(coverFile)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  useEffect(() => {
    if (!thumbnailFile) { setThumbnailPreviewUrl(null); return }
    const url = URL.createObjectURL(thumbnailFile)
    setThumbnailPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [thumbnailFile])

  useEffect(() => {
    const previews = pageFiles.map((file) => URL.createObjectURL(file))
    setPageFilePreviews(previews)
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [pageFiles])

  async function loadExtras() {
    const [catsRes, tagsRes] = await Promise.all([fetchCategories(), fetchTags()])
    if (catsRes.success) setCategories(catsRes.data || [])
    if (tagsRes.success) setTags(tagsRes.data || [])
  }

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }, [])

  const handlePdfSelection = async (file) => {
    setPdfFile(file)
    if (!file) return
    updateField("file_size", file.size)
    setErrors((prev) => ({ ...prev, pdf: undefined, pageCount: undefined }))
    const objectUrl = URL.createObjectURL(file)
    let pdfDocument
    try {
      const { loadPdf } = await import("../flipbook/utils/pdfRenderer")
      pdfDocument = await loadPdf(objectUrl)
      updateField("total_pages", pdfDocument.numPages)
    } catch {
      setErrors((prev) => ({ ...prev, pageCount: "We couldn't read the page count from this PDF. Check it opens correctly." }))
    } finally {
      if (pdfDocument) await pdfDocument.destroy()
      URL.revokeObjectURL(objectUrl)
    }
  }

  const makeCreator = (create, setList, key) => async (name) => {
    const res = await create(name)
    if (!res.success) return false
    setList((prev) => [...prev, res.data])
    setForm((prev) => ({ ...prev, [key]: [...prev[key], res.data.id] }))
    return true
  }
  const handleCreateCategory = makeCreator(createCategory, setCategories, "category_ids")
  const handleCreateTag = makeCreator(createTag, setTags, "tag_ids")

  const movePage = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= existingPages.length || !existingBook?.id) return
    const reordered = [...existingPages]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setPageActionId("reorder")
    try {
      const result = await reorderBookPages(existingBook.id, reordered.map((page) => page.id))
      if (!result.success) throw new Error(result.error || "Could not reorder pages")
      setExistingPages(reordered.map((page, i) => ({ ...page, page_number: i + 1 })))
    } catch (error) {
      setErrors((prev) => ({ ...prev, pages: error.message }))
    } finally {
      setPageActionId(null)
    }
  }

  const removePage = async (page) => {
    if (!window.confirm(`Delete page ${page.page_number}?`)) return
    setPageActionId(page.id)
    try {
      const result = await deleteBookPage(page.id)
      if (!result.success) throw new Error(result.error || "Could not delete page")
      const remaining = existingPages.filter((item) => item.id !== page.id)
      setExistingPages(remaining)
      updateField("total_pages", remaining.length)
    } catch (error) {
      setErrors((prev) => ({ ...prev, pages: error.message }))
    } finally {
      setPageActionId(null)
    }
  }

  const replacePageImage = async (page, file) => {
    if (!file || !existingBook?.id) return
    setPageActionId(page.id)
    try {
      const result = await replaceBookPage(existingBook.id, page.id, file)
      if (!result.success) throw new Error(result.error || "Could not replace page image")
      setExistingPages((prev) => prev.map((item) => (item.id === page.id ? result.data : item)))
    } catch (error) {
      setErrors((prev) => ({ ...prev, pages: error.message }))
    } finally {
      setPageActionId(null)
    }
  }

  const handleRemovePdf = () => {
    if (!existingBook?.id || !window.confirm("Remove the uploaded PDF?")) return
    setRemovePdfPending(true)
    updateField("pdf_url", "")
    updateField("source_type", "")
    updateField("total_pages", "")
    updateField("file_size", "")
    setPdfFile(null)
  }

  const handleRemoveCover = () => {
    if (!existingBook?.id || !window.confirm("Remove the book cover?")) return
    setRemoveCoverPending(true)
    updateField("cover_url", "")
    setCoverFile(null)
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = "Enter a title for this book."
    if (!form.source_type && !removePdfPending) errs.source_type = "Choose whether this book is a PDF or a set of page images."
    if (form.source_type === "pdf" && !form.pdf_url && !pdfFile && !removePdfPending) errs.pdf = "Upload the PDF file."
    if (form.source_type === "images" && pageFiles.length + existingPages.length === 0) {
      errs.pages = "Add at least one page image."
    }
    const invalidContents = form.table_of_contents.some((entry) => {
      const page = Number(entry.page_number)
      return !entry.title?.trim() || !Number.isSafeInteger(page) || page < 1 ||
        (Number(form.total_pages) > 0 && page > Number(form.total_pages))
    })
    if (invalidContents) {
      errs.table_of_contents = Number(form.total_pages) > 0
        ? `Enter a title and a page number between 1 and ${form.total_pages} for every entry.`
        : "Enter a title and a positive whole page number for every entry."
    }
    setErrors(errs)
    if (Object.keys(errs).length) {
      setTimeout(() => scrollRef.current?.querySelector("[data-field-error]")
        ?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
    }
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let savedBook
      if (isEdit) {
        const payload = removePdfPending ? { ...form, pdf_url: existingBook.pdf_url } : { ...form }
        if (removeCoverPending) payload.cover_url = existingBook.cover_url
        const res = await updateLexoraBook(existingBook.id, payload)
        if (!res.success) throw new Error(res.error)
        savedBook = res.data
      } else {
        const res = await createLexoraBook(form)
        if (!res.success) throw new Error(res.error)
        savedBook = res.data
        setDraftBook(savedBook)
      }

      setUploading(true)
      try {
        if (removePdfPending && savedBook.id) {
          const result = await removeBookPdf(savedBook.id)
          if (!result.success) throw new Error(result.error || "Could not remove PDF")
          savedBook = result.data
        }
        if (removeCoverPending && savedBook.id) {
          const result = await removeBookCover(savedBook.id)
          if (!result.success) throw new Error(result.error || "Could not remove cover")
          savedBook = result.data
        }
        if (pdfFile && savedBook.id) {
          const result = await uploadBookPdf(savedBook.id, pdfFile)
          if (!result.success) throw new Error(result.error || "PDF upload failed")
          savedBook = { ...savedBook, ...result.data }
        }
        if (coverFile && savedBook.id) {
          const result = await uploadBookCover(savedBook.id, coverFile)
          if (!result.success) throw new Error(result.error || "Cover upload failed")
          savedBook = { ...savedBook, ...result.data }
        }
        if (thumbnailFile && savedBook.id) {
          const result = await uploadBookThumbnail(savedBook.id, thumbnailFile)
          if (!result.success) throw new Error(result.error || "Thumbnail upload failed")
          savedBook = { ...savedBook, ...result.data }
        }
        if (pageFiles.length > 0 && savedBook.id) {
          const result = await uploadBookPages(savedBook.id, pageFiles)
          if (!result.success) throw new Error(result.error || "Page image upload failed")
          savedBook = {
            ...savedBook,
            pages: [...existingPages, ...(result.data || [])],
            total_pages: existingPages.length + (result.data || []).length,
          }
        }
      } finally {
        setUploading(false)
      }

      if (savedBook.id) {
        await setBookCategories(savedBook.id, form.category_ids)
        await setBookTags(savedBook.id, form.tag_ids)
      }

      onSaved?.(savedBook)
      setRemovePdfPending(false)
      setRemoveCoverPending(false)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  const goTo = (id) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveSection(id)
  }

  const onScroll = (e) => {
    const top = e.currentTarget.scrollTop + 120
    let current = SECTIONS[0].id
    for (const s of SECTIONS) {
      const el = document.getElementById(`sec-${s.id}`)
      if (el && el.offsetTop <= top) current = s.id
    }
    setActiveSection(current)
  }

  if (!isOpen) return null

  const busy = saving || uploading
  const errorCount = ["title", "source_type", "pdf", "pages", "table_of_contents"].filter((k) => errors[k]).length
  const done = {
    basics: !!form.title.trim() && !!form.source_type &&
      (form.source_type === "pdf" ? !!(form.pdf_url || pdfFile) : pageFiles.length + existingPages.length > 0),
    cover: !!(form.cover_url || coverFile),
    organize: form.category_ids.length + form.tag_ids.length > 0,
  }
  const statusText = saving ? "Saving book…" : uploading ? "Uploading files…"
    : errorCount ? `${errorCount} ${errorCount === 1 ? "field needs" : "fields need"} attention`
    : dirty ? "Unsaved changes" : "No changes yet"

  const text = (field, label, o = {}) => (
    <Field label={label} id={`bf-${field}`} required={o.required} hint={o.hint} error={errors[field]} className={o.className}>
      <input id={`bf-${field}`} type={o.type || "text"} value={form[field] ?? ""}
        onChange={(e) => updateField(field, e.target.value)} placeholder={o.placeholder}
        aria-invalid={!!errors[field]} list={o.list} className={inputCls(errors[field])} />
    </Field>
  )

  const auto = (id, label, value, placeholder) => (
    <Field label={<>{label} <span className="ml-1 rounded bg-[rgba(238,162,58,0.12)] px-1.5 py-0.5 text-[10px] text-[color:var(--accent-amber)]">Auto</span></>} id={id}>
      <input id={id} readOnly value={value} placeholder={placeholder} className={`${inputCls()} cursor-default opacity-70`} />
    </Field>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="bf-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] sm:max-h-[calc(100dvh-3rem)]">

        {/* Header */}
        <div className="shrink-0 border-b border-[color:var(--border)] px-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(238,162,58,0.12)] text-[color:var(--accent-amber)]">
                <BookOpen size={20} />
              </span>
              <div className="min-w-0">
                <h2 id="bf-title" className="text-lg font-bold text-[color:var(--text-primary)]">
                  {isEdit ? "Edit book" : "Create new book"}
                </h2>
                <p className="truncate text-xs text-[color:var(--text-muted)]">
                  {isEdit ? form.title || "Untitled book" : "New books are saved as drafts. You can publish them from the book list."}
                </p>
              </div>
            </div>
            <button type="button" onClick={requestClose} aria-label="Close"
              className="rounded-lg p-1.5 text-[color:var(--text-muted)] transition hover:bg-[rgba(255,255,255,0.06)]">
              <X size={18} />
            </button>
          </div>
          <nav aria-label="Form sections" className="-mb-px mt-3 flex gap-1 overflow-x-auto">
            {SECTIONS.map((s) => {
              const on = activeSection === s.id
              return (
                <button key={s.id} type="button" onClick={() => goTo(s.id)} aria-current={on ? "true" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                    on ? "border-[color:var(--accent-amber)] text-[color:var(--accent-amber)]"
                       : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"}`}>
                  {done[s.id] && <Check size={13} className="text-emerald-400" />}
                  {s.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Body */}
        <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <form id="lexora-book-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            <Section id="basics" title="Basics" desc="What the book is and where its content comes from.">
              {text("title", "Title", { required: true, className: "md:col-span-2", placeholder: "e.g. Introduction to Aviation Law" })}
              {text("author", "Author", { className: "md:col-span-2" })}
              <Field label="Book source" id="bf-source_type" required error={errors.source_type} className="md:col-span-2">
                <Segmented id="bf-source_type" value={form.source_type}
                  onChange={(v) => { updateField("source_type", v); setPdfFile(null); setThumbnailFile(null); setPageFiles([]) }}
                  options={[{ value: "pdf", label: "PDF file", icon: FileText }, { value: "images", label: "Page images", icon: ImageIcon }]} />
              </Field>

              {!form.source_type && (
                <p className="rounded-lg border border-dashed border-[color:var(--border)] px-3 py-4 text-center text-xs text-[color:var(--text-muted)] md:col-span-2">
                  Choose a book source to see the upload options.
                </p>
              )}

              {form.source_type === "pdf" && (
                <>
                  <Field label="PDF file" id="bf-pdf" required error={errors.pdf} hint="PDF only. Page count and file size are filled in for you.">
                    <Dropzone id="bf-pdf" accept=".pdf,application/pdf" file={pdfFile} onChange={handlePdfSelection}
                      existingUrl={form.pdf_url} icon={FileText} title="Drop a PDF here or browse" />
                    {form.pdf_url && !pdfFile && (
                      <button type="button" onClick={handleRemovePdf}
                        className="flex w-fit items-center gap-1 text-xs font-medium text-red-400 hover:underline">
                        <Trash2 size={12} /> Remove uploaded PDF
                      </button>
                    )}
                    {errors.pageCount && (
                      <p className="flex items-start gap-1 text-[11px] text-amber-500"><AlertCircle size={12} className="mt-0.5 shrink-0" />{errors.pageCount}</p>
                    )}
                  </Field>
                  <Field label="Thumbnail" id="bf-thumb" hint="Optional. Shown in lists and search results.">
                    <div className="flex gap-3">
                      <Thumb src={thumbnailPreviewUrl || form.thumbnail_url} alt="Thumbnail preview" className="h-24 w-[4.5rem] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Dropzone id="bf-thumb" accept=".jpg,.jpeg,.png,.webp" file={thumbnailFile} onChange={setThumbnailFile}
                          existingUrl={form.thumbnail_url} icon={ImageIcon} title="Drop an image or browse" compact />
                      </div>
                    </div>
                  </Field>
                </>
              )}

              {form.source_type === "images" && (
                <Field label="Page images" id="bf-pages" required error={errors.pages} className="md:col-span-2"
                  hint="JPG, PNG or WebP. Pages follow the order shown. Saved pages can be reordered here.">
                  {existingPages.length > 0 && (
                    <ol className="flex flex-col gap-2">
                      {existingPages.map((page, index) => (
                        <li key={page.id} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-primary)] p-2">
                          <img src={page.image_url} alt={`Page ${index + 1}`} className="h-16 w-12 rounded object-cover" />
                          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">Page {index + 1}</span>
                          {pageActionId === page.id && <Loader2 size={14} className="animate-spin text-[color:var(--text-muted)]" />}
                          <IconBtn label={`Move page ${index + 1} up`} disabled={index === 0 || pageActionId !== null} onClick={() => movePage(index, -1)}><ArrowUp size={15} /></IconBtn>
                          <IconBtn label={`Move page ${index + 1} down`} disabled={index === existingPages.length - 1 || pageActionId !== null} onClick={() => movePage(index, 1)}><ArrowDown size={15} /></IconBtn>
                          <label title="Replace page image" aria-label={`Replace page ${index + 1}`}
                            className="cursor-pointer rounded-md p-2 text-[color:var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.06)]">
                            <Upload size={15} />
                            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" disabled={pageActionId !== null}
                              onChange={(ev) => { replacePageImage(page, ev.target.files?.[0]); ev.target.value = "" }} />
                          </label>
                          <IconBtn label={`Delete page ${index + 1}`} danger disabled={pageActionId !== null} onClick={() => removePage(page)}><Trash2 size={15} /></IconBtn>
                        </li>
                      ))}
                    </ol>
                  )}
                  {pageFiles.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-[color:var(--text-secondary)]">{pageFiles.length} new {pageFiles.length === 1 ? "image" : "images"} ready to upload</p>
                      <div className="flex flex-wrap gap-2">
                        {pageFiles.map((file, index) => (
                          <div key={`${file.name}-${file.lastModified}-${index}`} className="relative w-20">
                            <img src={pageFilePreviews[index]} alt={`Selected page ${index + 1}`} className="h-24 w-20 rounded border border-[color:var(--border)] object-cover" />
                            <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPageFiles((prev) => prev.filter((_, i) => i !== index))}
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow"><X size={12} /></button>
                            <p className="truncate text-[10px] text-[color:var(--text-muted)]">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Dropzone id="bf-pages" accept=".jpg,.jpeg,.png,.webp" multiple onChange={(files) => setPageFiles((prev) => [...prev, ...files])}
                    icon={ImageIcon} title={pageFiles.length || existingPages.length ? "Add more page images" : "Drop page images here or browse"} />
                </Field>
              )}
            </Section>

            <Section id="cover" title="Cover" desc="The image readers see first in the library.">
              <div className="flex gap-4 md:col-span-2">
                <Thumb src={coverPreviewUrl || form.cover_url} alt="Cover preview" className="h-40 w-28 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Dropzone id="bf-cover" accept=".jpg,.jpeg,.png,.webp" file={coverFile} onChange={setCoverFile}
                    existingUrl={form.cover_url} icon={ImageIcon} title="Drop a cover image or browse" />
                  <p className="text-[11px] text-[color:var(--text-muted)]">JPG, PNG or WebP. A portrait image works best.</p>
                  {form.cover_url && !coverFile && (
                    <button type="button" onClick={handleRemoveCover}
                      className="flex w-fit items-center gap-1 text-xs font-medium text-red-400 hover:underline">
                      <Trash2 size={12} /> Remove current cover
                    </button>
                  )}
                </div>
              </div>
            </Section>

            <Section id="details" title="Details" desc="Everything here is optional.">
              <Field label="Short description" id="bf-short_description" className="md:col-span-2">
                <textarea id="bf-short_description" rows={3} value={form.short_description}
                  onChange={(e) => updateField("short_description", e.target.value)}
                  placeholder="A sentence or two about what readers will find in this book."
                  className={`${inputCls()} resize-y`} />
              </Field>
              {text("publisher", "Publisher")}
              {text("edition", "Edition", { placeholder: "e.g. 1st Edition" })}
              {text("publish_on", "Publication date", { type: "date" })}
              {auto("bf-total_pages", "Total pages", form.total_pages ?? "", "Set after you add a source")}
              {auto("bf-file_size", "File size", form.file_size ? formatFileSize(Number(form.file_size)) : "", "Set after you choose a PDF")}

              <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}
                className="flex w-fit items-center gap-1.5 text-sm font-medium text-[color:var(--accent-amber)] md:col-span-2">
                <ChevronDown size={15} className={`transition-transform ${showMore ? "rotate-180" : ""}`} />
                {showMore ? "Hide extra details" : "Show extra details (identifiers, size, translator)"}
              </button>

              {showMore && (
                <>
                  {text("isbn13", "ISBN-13")}
                  {text("isbn10", "ISBN-10")}
                  {text("asin", "ASIN")}
                  {text("doi", "DOI")}
                  {text("llcn", "LCCN")}
                  {text("co_publisher", "Co-publisher")}
                  {text("translator", "Translator")}
                  {text("dimensions", "Dimensions", { placeholder: "e.g. 8.5 × 11 in" })}
                  {text("length", "Length", { placeholder: "e.g. 320 pages" })}
                  <Field label="Weight" id="bf-weight_value">
                    <div className="flex gap-2">
                      <input id="bf-weight_value" type="number" min="0" value={form.weight_value ?? ""}
                        onChange={(e) => updateField("weight_value", e.target.value)} className={`${inputCls()} min-w-0 flex-1`} />
                      <input aria-label="Weight unit" list="bf-weight-units" value={form.weight_unit ?? ""}
                        onChange={(e) => updateField("weight_unit", e.target.value)} placeholder="Unit" className={`${inputCls()} w-24 shrink-0`} />
                      <datalist id="bf-weight-units">{["kg", "g", "lb", "oz"].map((u) => <option key={u} value={u} />)}</datalist>
                    </div>
                  </Field>
                  {text("download_url", "Download URL", { type: "url", placeholder: "https://" })}
                </>
              )}
            </Section>

            <Section id="contents" title="Table of contents" desc="Add chapter names and the page each chapter starts on. Page numbers start at 1.">
              <div className="flex flex-col gap-3 md:col-span-2">
                {form.table_of_contents.map((entry, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2">
                    <Field label={`Entry ${index + 1} title`} id={`bf-toc-title-${index}`}>
                      <input id={`bf-toc-title-${index}`} value={entry.title}
                        onChange={(event) => updateField("table_of_contents", form.table_of_contents.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item))}
                        placeholder="e.g. Chapter 2: Developing a Content Marketing Strategy"
                        className={inputCls(errors.table_of_contents)} />
                    </Field>
                    <Field label="Page" id={`bf-toc-page-${index}`}>
                      <input id={`bf-toc-page-${index}`} type="number" min="1"
                        max={Number(form.total_pages) > 0 ? form.total_pages : undefined}
                        value={entry.page_number}
                        onChange={(event) => updateField("table_of_contents", form.table_of_contents.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, page_number: event.target.value } : item))}
                        placeholder="1" className={inputCls(errors.table_of_contents)} />
                    </Field>
                    <IconBtn label={`Remove table of contents entry ${index + 1}`}
                      onClick={() => updateField("table_of_contents", form.table_of_contents.filter((_, itemIndex) => itemIndex !== index))}>
                      <Trash2 size={15} />
                    </IconBtn>
                  </div>
                ))}
                {errors.table_of_contents && (
                  <p role="alert" data-field-error className="flex items-center gap-1 text-[11px] text-red-400">
                    <AlertCircle size={12} className="shrink-0" /> {errors.table_of_contents}
                  </p>
                )}
                <button type="button"
                  onClick={() => updateField("table_of_contents", [...form.table_of_contents, { title: "", page_number: "" }])}
                  className="flex w-fit items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs font-semibold text-[color:var(--accent-amber)] transition hover:bg-[rgba(238,162,58,0.08)]">
                  <Plus size={14} /> Add TOC entry
                </button>
                {form.table_of_contents.length === 0 && (
                  <p className="text-xs text-[color:var(--text-muted)]">No custom entries. The reader will use PDF bookmarks or page numbers when available.</p>
                )}
              </div>
            </Section>

            <Section id="organize" title="Categories & tags" desc="Help readers find this book. Pick existing ones or type to create new.">
              <ChipPicker id="bf-categories" label="Categories" noun="category" items={categories}
                selected={form.category_ids} onChange={(ids) => updateField("category_ids", ids)} onCreate={handleCreateCategory} />
              <ChipPicker id="bf-tags" label="Tags" noun="tag" amber items={tags}
                selected={form.tag_ids} onChange={(ids) => updateField("tag_ids", ids)} onCreate={handleCreateTag} />
            </Section>

            <Section id="publish" title="Visibility" desc="Who can see this book once it's published.">
              <Field label="Visibility" id="bf-visibility"
                hint={form.visibility === "public" ? "Anyone with library access can find and read it." : "Only admins can see it."}>
                <Segmented id="bf-visibility" value={form.visibility} onChange={(v) => updateField("visibility", v)}
                  options={[{ value: "public", label: "Public", icon: Globe }, { value: "private", label: "Private", icon: Lock }]} />
              </Field>
              <Field label="Status" id="bf-status" hint="Publish from the book list when you're ready.">
                <p id="bf-status" className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2.5 text-sm capitalize text-[color:var(--text-primary)]">
                  {isEdit ? form.status : "draft"}
                </p>
              </Field>
            </Section>
          </form>
        </div>

        {/* Footer */}
        {errors.submit && (
          <div role="alert" className="flex shrink-0 items-start gap-2 border-t border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 sm:px-6">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{errors.submit}</span>
          </div>
        )}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 sm:px-6">
          <p aria-live="polite" className={`text-xs ${errorCount ? "text-red-400" : "text-[color:var(--text-muted)]"}`}>{statusText}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={requestClose} disabled={busy}
              className="rounded-xl border border-[color:var(--border)] px-5 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="lexora-book-form" disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--accent-amber)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" />}
              {uploading ? "Uploading…" : saving ? "Saving…" : isEdit ? "Save changes" : "Save draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ id, title, desc, children }) {
  return (
    <section id={`sec-${id}`} className="min-w-0 rounded-xl border border-[color:var(--border)] p-4 sm:p-5">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)]">{title}</h3>
      {desc && <p className="mb-4 mt-0.5 text-xs text-[color:var(--text-muted)]">{desc}</p>}
      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function parseTableOfContents(value) {
  let entries = value
  if (typeof entries === "string") {
    try {
      entries = JSON.parse(entries)
    } catch {
      return []
    }
  }
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    title: String(entry?.title || ""),
    page_number: entry?.page_number == null ? "" : String(entry.page_number),
  }))
}

function Field({ label, id, required, hint, error, className = "", children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-[color:var(--text-secondary)]">
        {label}{required && <span className="ml-0.5 text-red-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-[color:var(--text-muted)]">{hint}</p>}
      {error && (
        <p role="alert" data-field-error className="flex items-center gap-1 text-[11px] text-red-400">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function Segmented({ id, value, onChange, options }) {
  return (
    <div id={id} role="radiogroup" className="grid gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-primary)] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(({ value: v, label, icon: Icon }) => {
        const on = value === v
        return (
          <button key={v} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(238,162,58,0.4)] ${
              on ? "bg-[rgba(238,162,58,0.15)] text-[color:var(--accent-amber)]"
                 : "text-[color:var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)]"}`}>
            <Icon size={15} /> {label}
          </button>
        )
      })}
    </div>
  )
}

function Thumb({ src, alt, className = "" }) {
  return src ? (
    <img src={src} alt={alt} className={`${className} rounded-lg border border-[color:var(--border)] object-cover`} />
  ) : (
    <div aria-hidden="true" className={`${className} flex items-center justify-center rounded-lg border border-dashed border-[color:var(--border)] text-[color:var(--text-muted)]`}>
      <ImageIcon size={20} />
    </div>
  )
}

function IconBtn({ label, danger, children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} {...props}
      className={`rounded-md p-2 transition hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40 ${danger ? "text-red-400" : "text-[color:var(--text-secondary)]"}`}>
      {children}
    </button>
  )
}

function ChipPicker({ id, label, noun, items, selected, onChange, onCreate, amber }) {
  const [text, setText] = useState("")
  const [creating, setCreating] = useState(false)
  const q = text.trim().toLowerCase()
  const exact = items.find((i) => i.name.toLowerCase() === q)
  const chosen = selected.map((sid) => items.find((i) => i.id === sid)).filter(Boolean)
  const matches = items.filter((i) => !selected.includes(i.id) && (!q || i.name.toLowerCase().includes(q)))
  const chipStyle = amber
    ? { background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }
    : { background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }

  const add = (cid) => { if (!selected.includes(cid)) onChange([...selected, cid]); setText("") }
  const submit = async () => {
    if (!q || creating) return
    if (exact) return add(exact.id)
    setCreating(true)
    if (await onCreate(text.trim())) setText("")
    setCreating(false)
  }

  return (
    <Field label={label} id={id}>
      <div className="flex min-h-[1.75rem] flex-wrap gap-1.5">
        {chosen.length === 0 && <span className="py-1 text-xs text-[color:var(--text-muted)]">None selected</span>}
        {chosen.map((c) => (
          <span key={c.id} className="flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-xs font-medium" style={chipStyle}>
            {c.name}
            <button type="button" aria-label={`Remove ${c.name}`} onClick={() => onChange(selected.filter((x) => x !== c.id))}
              className="rounded-full p-0.5 hover:bg-[rgba(255,255,255,0.12)]"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Search or add a ${noun}`}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit() } }}
          className={`${inputCls()} min-w-0 flex-1`} />
        <button type="button" onClick={submit} disabled={!q || creating}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--border)] px-3 text-xs font-semibold text-[color:var(--accent-amber)] transition hover:bg-[rgba(238,162,58,0.08)] disabled:opacity-40">
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {exact ? "Add" : "Create"}
        </button>
      </div>
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.slice(0, 12).map((i) => (
            <button key={i.id} type="button" onClick={() => add(i.id)}
              className="flex items-center gap-1 rounded-full border border-dashed border-[color:var(--border)] px-2.5 py-1 text-xs text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent-amber)] hover:text-[color:var(--accent-amber)]">
              <Plus size={11} /> {i.name}
            </button>
          ))}
          {matches.length > 12 && <span className="py-1 text-[11px] text-[color:var(--text-muted)]">+{matches.length - 12} more. Type to search.</span>}
        </div>
      )}
    </Field>
  )
}

function Dropzone({ id, accept, multiple, file, onChange, existingUrl, icon: Icon = Upload, title, compact }) {
  const ref = useRef(null)
  const [over, setOver] = useState(false)
  const [skipped, setSkipped] = useState(0)
  const accepts = accept.split(",").map((s) => s.trim().toLowerCase())
  const allowed = (f) => accepts.some((a) => (a.startsWith(".") ? f.name.toLowerCase().endsWith(a) : f.type === a))

  const take = (list) => {
    const all = Array.from(list || [])
    const good = all.filter(allowed)
    setSkipped(all.length - good.length)
    if (good.length) onChange(multiple ? good : good[0])
  }

  if (file && !multiple) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2.5">
        <Icon size={18} className="shrink-0 text-[color:var(--accent-amber)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[color:var(--text-primary)]">{file.name}</p>
          <p className="text-[11px] text-[color:var(--text-muted)]">{formatFileSize(file.size)} · ready to upload</p>
        </div>
        <IconBtn label="Remove selected file" onClick={() => onChange(null)}><X size={15} /></IconBtn>
      </div>
    )
  }

  return (
    <div>
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" tabIndex={-1}
        onChange={(e) => { take(e.target.files); e.target.value = "" }} />
      <div id={id} role="button" tabIndex={0} onClick={() => ref.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(238,162,58,0.4)] ${
          compact ? "px-3 py-3" : "px-4 py-5"} ${
          over ? "border-[color:var(--accent-amber)] bg-[rgba(238,162,58,0.08)]"
               : "border-[color:var(--border)] hover:border-[color:var(--text-muted)]"}`}>
        <Icon size={compact ? 16 : 20} className={over ? "text-[color:var(--accent-amber)]" : "text-[color:var(--text-muted)]"} />
        <span className="text-sm text-[color:var(--text-secondary)]">{over ? "Drop to add" : existingUrl ? "Replace current file" : title}</span>
        {existingUrl && !file && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400"><Check size={11} /> A file is already uploaded</span>
        )}
      </div>
      {skipped > 0 && (
        <p role="alert" className="mt-1 text-[11px] text-amber-500">
          {skipped} {skipped === 1 ? "file was" : "files were"} skipped because the type isn't supported.
        </p>
      )}
    </div>
  )
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ""
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}