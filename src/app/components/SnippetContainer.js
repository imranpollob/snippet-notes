"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import logoPic from "../../../public/logo.png";
import GoogleAuthButton from "./GoogleAuthButton";
import SnippetForm from "./SnippetForm";
import SnippetsComponent from "./SnippetsComponent";
import Modal from "./Modal";
import ThemeToggle from "./ThemeToggle";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import ExportImportModal from "./ExportImportModal";
import SyncLocalModal from "./SyncLocalModal";
import { RichContent } from "../../lib/syntaxHighlight";
import {
  getLocalSnippets,
  setLocalSnippets,
  addLocalSnippet,
  updateLocalSnippet,
  deleteLocalSnippet,
  togglePinLocalSnippet,
  exportSnippetAsMarkdown,
} from "../../lib/storage";
import { auth, db, isFirebaseConfigured, onAuthStateChanged } from "../../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

const AUTOSAVE_DELAY = 800;

const SnippetContainer = () => {
  const [snippets, setSnippets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSnippet, setCurrentSnippet] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [user, setUser] = useState(null);
  const [autosaveStatus, setAutosaveStatus] = useState("ready");
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [modalTab, setModalTab] = useState("write"); // "write" | "split" | "preview"

  // Approach B: Sync Local Snippets Modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [localSnippetsToSync, setLocalSnippetsToSync] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const searchInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const autosaveFeedbackTimerRef = useRef(null);
  const prevAuthUserRef = useRef(undefined);
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  // Initialize data on mount
  useEffect(() => {
    // 1. Load local snippets
    const initialLocal = getLocalSnippets();
    setSnippets(initialLocal);

    // 2. Load stored view mode
    const storedView = localStorage.getItem("ip_view_mode");
    if (storedView === "list" || storedView === "grid") {
      setViewMode(storedView);
    }

    // 3. If Firebase is configured, check auth state
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        const wasLoggedOut = prevAuthUserRef.current === null;
        prevAuthUserRef.current = authUser ? authUser.uid : null;

        if (authUser) {
          setUser(authUser);
          fetchFirebaseSnippets(authUser.uid);

          // Check if there are local guest notes created while signed out
          const local = getLocalSnippets();
          if (local.length > 0) {
            setLocalSnippetsToSync(local);
            // Open confirmation modal on active login or first session detection
            if (wasLoggedOut || !sessionStorage.getItem("ip_sync_dismissed")) {
              setIsSyncModalOpen(true);
            }
          }
        } else {
          setUser(null);
          setSnippets(getLocalSnippets());
          sessionStorage.removeItem("ip_sync_dismissed");
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("ip_view_mode", mode);
  };

  // Global keyboard shortcuts (conflict-free with browser defaults)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not trigger global shortcuts when any modal or dialog is open
      if (isSyncModalOpen || isModalOpen || isShortcutsOpen || isBackupOpen) {
        return;
      }

      const isInputActive =
        ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) ||
        document.activeElement?.isContentEditable;

      // 1. Search: ⌘K or Ctrl+K or '/' (when outside inputs)
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") ||
        (e.key === "/" && !isInputActive)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 2. Create new snippet: 'C' (when outside inputs) or ⌥N / Alt+N
      // Avoids browser conflict with ⌘N / Ctrl+N (which opens a new browser window)
      if (
        (e.altKey && e.key.toLowerCase() === "n") ||
        (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "c" && !isInputActive)
      ) {
        e.preventDefault();
        setIsComposerOpen((prev) => {
          const next = !prev;
          if (next) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return next;
        });
        return;
      }

      // 3. '?' when outside inputs to view shortcuts reference
      if (e.key === "?" && !isInputActive) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // 4. Esc closes composer or clears search
      if (e.key === "Escape") {
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery("");
        } else if (isComposerOpen) {
          e.preventDefault();
          setIsComposerOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, isComposerOpen, isSyncModalOpen, isModalOpen, isShortcutsOpen, isBackupOpen]);

  const fetchFirebaseSnippets = async (uid) => {
    if (!db) return [];
    setIsLoading(true);
    try {
      const snippetsCol = collection(db, "snippets");
      const q = query(snippetsCol, where("uid", "==", uid));
      const snapshot = await getDocs(q);
      const snippetsList = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      }));
      setSnippets(snippetsList);
      return snippetsList;
    } catch (error) {
      console.error("Error fetching Firebase snippets:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Approach B: Sync Local Snippets to Cloud
  const handleSyncLocalToCloud = async () => {
    if (!user || !db || !isFirebaseConfigured || localSnippetsToSync.length === 0) {
      setIsSyncModalOpen(false);
      return;
    }

    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      const now = Date.now();

      localSnippetsToSync.forEach((snippet) => {
        const docRef = doc(collection(db, "snippets"));
        const { id, ...dataToSave } = snippet;
        batch.set(docRef, {
          title: dataToSave.title || "Untitled snippet",
          data: dataToSave.data || "",
          language: dataToSave.language || "markdown",
          tags: Array.isArray(dataToSave.tags) ? dataToSave.tags : [],
          pinned: Boolean(dataToSave.pinned),
          createdAt: dataToSave.createdAt || now,
          updatedAt: dataToSave.updatedAt || now,
          uid: user.uid,
        });
      });

      await batch.commit();

      const syncedCount = localSnippetsToSync.length;
      // Clear local storage after successful cloud upload
      setLocalSnippets([]);
      setLocalSnippetsToSync([]);
      setIsSyncModalOpen(false);
      sessionStorage.removeItem("ip_sync_dismissed");

      // Reload fresh cloud snippets into UI
      await fetchFirebaseSnippets(user.uid);

      showToast(`Merged ${syncedCount} local snippet${syncedCount === 1 ? "" : "s"} into your cloud library!`);
    } catch (error) {
      console.error("Error syncing local snippets to cloud:", error);
      showToast("Failed to upload local snippets. Please check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Approach B: Discard Local Notes
  const handleDiscardLocal = () => {
    setLocalSnippets([]);
    setLocalSnippetsToSync([]);
    setIsSyncModalOpen(false);
    sessionStorage.removeItem("ip_sync_dismissed");
    showToast("Local notes discarded. Using cloud library.");
  };

  // Approach B: Decide Later
  const handleCloseSyncModal = () => {
    setIsSyncModalOpen(false);
    sessionStorage.setItem("ip_sync_dismissed", "true");
  };

  const handleAddSnippet = async (newSnippet) => {
    setIsSaving(true);
    try {
      if (user && db && isFirebaseConfigured) {
        const snippetWithUid = { ...newSnippet, uid: user.uid, createdAt: Date.now() };
        const docRef = await addDoc(collection(db, "snippets"), snippetWithUid);
        const created = { id: docRef.id, ...snippetWithUid };
        setSnippets((prev) => [created, ...prev]);
      } else {
        const created = addLocalSnippet(newSnippet);
        setSnippets((prev) => [created, ...prev]);
      }
      setIsComposerOpen(false);
    } catch (error) {
      console.error("Error adding new snippet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSnippet = (snippetId, updates) => {
    setCurrentSnippet((prev) => (prev ? { ...prev, ...updates } : { id: snippetId, ...updates }));

    setAutosaveStatus("pending");

    if (autosaveFeedbackTimerRef.current) {
      clearTimeout(autosaveFeedbackTimerRef.current);
      autosaveFeedbackTimerRef.current = null;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");

      let success = false;
      try {
        if (user && db && isFirebaseConfigured) {
          const snippetRef = doc(db, "snippets", snippetId);
          await updateDoc(snippetRef, updates);
          setSnippets((prev) =>
            prev.map((s) => (s.id === snippetId ? { ...s, ...updates } : s))
          );
          success = true;
        } else {
          const updated = updateLocalSnippet(snippetId, updates);
          setSnippets((prev) =>
            prev.map((s) => (s.id === snippetId ? updated : s))
          );
          success = true;
        }
      } catch (err) {
        console.error("Error updating snippet:", err);
        success = false;
      }

      if (success) {
        setAutosaveStatus("saved");
        autosaveFeedbackTimerRef.current = setTimeout(() => {
          setAutosaveStatus("ready");
          autosaveFeedbackTimerRef.current = null;
        }, 2200);
      } else {
        setAutosaveStatus("error");
      }
    }, AUTOSAVE_DELAY);
  };

  const handleDeleteSnippet = async (snippetId) => {
    try {
      if (user && db && isFirebaseConfigured) {
        const snippetRef = doc(db, "snippets", snippetId);
        await deleteDoc(snippetRef);
        setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
      } else {
        const updated = deleteLocalSnippet(snippetId);
        setSnippets(updated);
      }
      closeModal();
    } catch (error) {
      console.error("Error deleting snippet:", error);
    } finally {
      setIsDeleteConfirming(false);
    }
  };

  const handleTogglePin = (snippetId) => {
    if (user && db && isFirebaseConfigured) {
      const target = snippets.find((s) => s.id === snippetId);
      if (target) {
        handleUpdateSnippet(snippetId, { pinned: !target.pinned });
      }
    } else {
      const updated = togglePinLocalSnippet(snippetId);
      setSnippets(updated);
    }
  };

  const openModal = (snippet) => {
    setCurrentSnippet(snippet);
    setIsModalOpen(true);
    setAutosaveStatus("ready");
    setIsDeleteConfirming(false);
    setModalTab("write");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSnippet(null);
    setAutosaveStatus("ready");
    setIsDeleteConfirming(false);
    if (autosaveFeedbackTimerRef.current) {
      clearTimeout(autosaveFeedbackTimerRef.current);
    }
  };

  // Language count map for fast 1-click filter badges
  const languageCounts = useMemo(() => {
    const counts = {};
    snippets.forEach((s) => {
      const lang = (s.language || "text").toLowerCase();
      counts[lang] = (counts[lang] || 0) + 1;
    });
    return counts;
  }, [snippets]);

  // Unique tags list
  const allTags = useMemo(() => {
    const tagSet = new Set();
    snippets.forEach((s) => {
      if (Array.isArray(s.tags)) {
        s.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [snippets]);

  // Filtering & Sorting (pinned first)
  const filteredSnippets = useMemo(() => {
    const queryNorm = searchQuery.trim().toLowerCase();

    return snippets
      .filter((s) => {
        // Tag filter
        if (selectedTag !== "all") {
          if (!s.tags || !s.tags.includes(selectedTag)) return false;
        }

        // Language filter
        if (selectedLanguage !== "all") {
          if ((s.language || "").toLowerCase() !== selectedLanguage.toLowerCase()) return false;
        }

        // Search query filter
        if (!queryNorm) return true;

        const title = (s.title || "").toLowerCase();
        const data = (s.data || "").toLowerCase();
        const tagsStr = (s.tags || []).join(" ").toLowerCase();
        const lang = (s.language || "").toLowerCase();

        return (
          title.includes(queryNorm) ||
          data.includes(queryNorm) ||
          tagsStr.includes(queryNorm) ||
          lang.includes(queryNorm)
        );
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
  }, [snippets, searchQuery, selectedTag, selectedLanguage]);

  const totalSnippets = snippets.length;
  const visibleSnippets = filteredSnippets.length;

  return (
    <div className="page-shell">
      {/* Brand Header */}
      <header className="workspace-brand-header">
        <div className="brand-lockup">
          <div className="brand-logo-frame">
            <Image
              src={logoPic}
              alt="Snippets Logo"
              width={42}
              height={42}
              priority
              className="brand-logo-img"
            />
          </div>
          <div className="brand-meta">
            <span className="brand-title">Snippets</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="workspace-actions">
          <ThemeToggle />

          <button
            type="button"
            className="action-icon-pill"
            title="Keyboard shortcuts (?)"
            onClick={() => setIsShortcutsOpen(true)}
            aria-label="View keyboard shortcuts"
          >
            <kbd className="action-kbd">?</kbd>
            <span className="action-pill-text">Shortcuts</span>
          </button>

          <button
            type="button"
            className="action-icon-pill"
            title="Backup & Restore Library"
            onClick={() => setIsBackupOpen(true)}
            aria-label="Backup or restore snippets"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="action-pill-text">Backup</span>
          </button>

          <GoogleAuthButton user={user} />
        </div>
      </header>

      {/* Primary Interaction Hub: Search & Quick-Capture */}
      <section className="search-hub-section" aria-label="Search and create snippets">
        <div className="search-hub-bar">
          {/* Omni-Search Input */}
          <div className="omni-search-shell">
            <svg
              className="search-hub-icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M15.5 14h-.79l-.28-.27a6.47 6.47 0 0 0 1.57-4.23A6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
                fill="currentColor"
              />
            </svg>
            <input
              ref={searchInputRef}
              id="omni-search-input"
              type="search"
              placeholder="Search by title, tag, or code (Press ⌘K or /)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-hub-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
              >
                ×
              </button>
            )}
            <kbd className="search-hub-kbd">⌘K</kbd>
          </div>

          {/* "+ New Snippet" Quick-Capture Trigger */}
          <button
            type="button"
            className={`quick-capture-toggle-btn ${isComposerOpen ? "active" : ""}`}
            onClick={() => setIsComposerOpen(!isComposerOpen)}
            title="Create new snippet (Press C or ⌥N)"
          >
            <span className="capture-btn-icon">{isComposerOpen ? "✕" : "+"}</span>
            <span className="capture-btn-text">{isComposerOpen ? "Close" : "New Snippet"}</span>
            <kbd className="capture-btn-kbd">C</kbd>
          </button>
        </div>

        {/* Dynamic Language Filter Badges (1-Click Filtering) */}
        <div className="quick-filter-strip">
          <div className="filter-badges-scroll">
            <button
              type="button"
              className={`quick-filter-pill ${selectedLanguage === "all" ? "selected" : ""}`}
              onClick={() => setSelectedLanguage("all")}
            >
              <span>All</span>
              <span className="filter-count-badge">{totalSnippets}</span>
            </button>

            {Object.entries(languageCounts).map(([lang, count]) => (
              <button
                key={lang}
                type="button"
                className={`quick-filter-pill ${selectedLanguage === lang ? "selected" : ""}`}
                onClick={() => setSelectedLanguage(lang)}
              >
                <span>{lang}</span>
                <span className="filter-count-badge">{count}</span>
              </button>
            ))}

            {/* Tags separator */}
            {allTags.length > 0 && (
              <>
                <span className="filter-strip-divider" />
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`quick-tag-pill ${selectedTag === tag ? "selected" : ""}`}
                    onClick={() => setSelectedTag(selectedTag === tag ? "all" : tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* View mode toggle (Grid vs List) */}
          <div className="view-mode-toggle" role="radiogroup" aria-label="View mode">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => handleToggleViewMode("grid")}
              title="Grid View"
              aria-label="Grid view"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => handleToggleViewMode("list")}
              title="Compact List View"
              aria-label="List view"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Capture Dock (Opened via ⌘N or "+ New Snippet") */}
      {isComposerOpen && (
        <SnippetForm
          addSnippet={handleAddSnippet}
          isSaving={isSaving}
          onCancel={() => setIsComposerOpen(false)}
        />
      )}

      {/* Snippet Library Grid / List */}
      <section className="library-section" aria-live="polite">
        <div className="library-section-header">
          <div className="library-title-group">
            <h2 className="library-title">Library</h2>
            <span className="library-count-pill">
              {visibleSnippets} of {totalSnippets} snippets
            </span>
          </div>

          {(selectedLanguage !== "all" || selectedTag !== "all" || searchQuery) && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSelectedLanguage("all");
                setSelectedTag("all");
                setSearchQuery("");
              }}
            >
              Reset Filters ×
            </button>
          )}
        </div>

        {isLoading && (
          <div className="loading-state">
            <div className="loading-ring" aria-hidden="true" />
            <p>Loading snippets...</p>
          </div>
        )}

        {!isLoading && totalSnippets === 0 && (
          <div className="empty-state">
            <span className="empty-eyebrow">Workspace</span>
            <h3 className="empty-title">Capture your first code fragment</h3>
            <button
              type="button"
              className="primary-action"
              onClick={() => setIsComposerOpen(true)}
            >
              + Create Snippet (C)
            </button>
          </div>
        )}

        {!isLoading && totalSnippets > 0 && visibleSnippets === 0 && (
          <div className="empty-state">
            <span className="empty-eyebrow">No Matches</span>
            <h3 className="empty-title">No snippets match that search</h3>
            <p className="empty-description">
              Try a different keyword or reset your active filters.
            </p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setSelectedLanguage("all");
                setSelectedTag("all");
                setSearchQuery("");
              }}
            >
              Clear Search & Filters
            </button>
          </div>
        )}

        {!isLoading && visibleSnippets > 0 && (
          <SnippetsComponent
            snippets={filteredSnippets}
            onCardClick={openModal}
            searchQuery={searchQuery}
            onTogglePin={handleTogglePin}
            viewMode={viewMode}
          />
        )}
      </section>

      {/* Focused Editor Modal */}
      <Modal show={isModalOpen} onClose={closeModal} maxWidth="960px">
        {currentSnippet && (
          <div className="modal-editor">
            {/* Modal Top */}
            <div className="modal-top-row">
              <div className="modal-title-box">
                <input
                  className="modal-editor-title"
                  type="text"
                  placeholder="Snippet title..."
                  value={currentSnippet.title || ""}
                  onChange={(e) =>
                    handleUpdateSnippet(currentSnippet.id, {
                      ...currentSnippet,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              {/* View Tabs */}
              <div className="modal-tabs">
                <button
                  type="button"
                  className={`tab-btn ${modalTab === "write" ? "active" : ""}`}
                  onClick={() => setModalTab("write")}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`tab-btn ${modalTab === "split" ? "active" : ""}`}
                  onClick={() => setModalTab("split")}
                >
                  Split
                </button>
                <button
                  type="button"
                  className={`tab-btn ${modalTab === "preview" ? "active" : ""}`}
                  onClick={() => setModalTab("preview")}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="icon-close-btn modal-close-x"
                  onClick={closeModal}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tags */}
            <div className="modal-tags-row">
              <span className="lang-badge">
                {(currentSnippet.language || "text").toUpperCase()}
              </span>
              {currentSnippet.tags && currentSnippet.tags.length > 0 && (
                <div className="tags-active-list">
                  {currentSnippet.tags.map((tag) => (
                    <span key={tag} className="tag-chip active">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Fields */}
            <div className={`modal-editor-fields layout-${modalTab}`}>
              {modalTab !== "preview" && (
                <textarea
                  className="modal-editor-body"
                  value={currentSnippet.data || ""}
                  placeholder="Write markdown or code snippets with ```language ... ```"
                  onChange={(e) =>
                    handleUpdateSnippet(currentSnippet.id, {
                      ...currentSnippet,
                      data: e.target.value,
                    })
                  }
                />
              )}

              {modalTab !== "write" && (
                <div className="modal-preview-body">
                  <RichContent content={currentSnippet.data || ""} isPreview={true} />
                </div>
              )}
            </div>

            {/* Autosave feedback */}
            <div
              className="modal-editor-status"
              role="status"
              aria-live="polite"
              data-state={autosaveStatus}
            >
              {autosaveStatus === "saving" && "Saving changes..."}
              {autosaveStatus === "saved" && "✓ All changes saved"}
              {autosaveStatus === "pending" && "Changes pending..."}
              {autosaveStatus === "error" && "Failed to autosave."}
              {autosaveStatus === "ready" && "Ready to edit"}
            </div>

            {/* Modal Actions */}
            <div className="modal-editor-actions">
              <div className="modal-left-actions">
                <button
                  type="button"
                  className="ghost-button action-btn-icon"
                  onClick={() => exportSnippetAsMarkdown(currentSnippet)}
                  title="Download snippet as Markdown file"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export .md</span>
                </button>

                <button
                  type="button"
                  className={`ghost-button action-btn-icon ${currentSnippet.pinned ? "active" : ""}`}
                  onClick={() => handleTogglePin(currentSnippet.id)}
                >
                  <span>{currentSnippet.pinned ? "★ Pinned" : "☆ Pin snippet"}</span>
                </button>
              </div>

              <div className="modal-right-actions">
                {isDeleteConfirming ? (
                  <div className="delete-confirm-group">
                    <span className="delete-confirm-text">Delete permanently?</span>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteSnippet(currentSnippet.id)}
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setIsDeleteConfirming(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => setIsDeleteConfirming(true)}
                  >
                    Delete
                  </button>
                )}
                <button type="button" className="primary-action" onClick={closeModal}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Backup & Restore Modal */}
      <ExportImportModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        totalSnippets={totalSnippets}
        onImportSuccess={(newSnippets) => setSnippets(newSnippets)}
      />

      {/* Approach B: Sync Local Snippets Modal */}
      <SyncLocalModal
        isOpen={isSyncModalOpen}
        onClose={handleCloseSyncModal}
        localSnippets={localSnippetsToSync}
        onSync={handleSyncLocalToCloud}
        onDiscard={handleDiscardLocal}
        isSyncing={isSyncing}
        userEmail={user?.email}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="app-toast app-toast-success" role="status">
          <span className="app-toast-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SnippetContainer;
