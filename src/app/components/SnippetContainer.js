"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import logoPic from "../../../public/logo.png";
import GoogleAuthButton from "./GoogleAuthButton";
import SnippetsComponent from "./SnippetsComponent";
import SnippetLabelsEditor from "./SnippetLabelsEditor";
import Modal from "./Modal";
import ThemeToggle from "./ThemeToggle";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import ExportImportModal from "./ExportImportModal";
import ManageLabelsModal from "./ManageLabelsModal";
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
  normalizeLabels,
  detectLanguage,
  extractSmartTitle,
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
  const [selectedLabel, setSelectedLabel] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [user, setUser] = useState(null);
  const [autosaveStatus, setAutosaveStatus] = useState("ready");
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCreatingSnippet, setIsCreatingSnippet] = useState(false);
  const [createError, setCreateError] = useState("");
  const [modalTab, setModalTab] = useState("write"); // "write" | "split" | "preview"
  const [isManageLabelsOpen, setIsManageLabelsOpen] = useState(false);
  const [modalLabelInput, setModalLabelInput] = useState("");

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
  const createRequestRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const activeSnippetIdRef = useRef(null);

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

  // Load the brand tools launcher ("waffle") only after hydration:
  // launcher.js swaps the [data-brand-launcher] span for its button, which
  // would break React hydration (and drop the button) if it ran before.
  useEffect(() => {
    const src =
      "https://imranpollob.github.io/personal-brand-theme/launcher.js";
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

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
      if (isSyncModalOpen || isModalOpen || isShortcutsOpen || isBackupOpen || isManageLabelsOpen) {
        return;
      }

      const isInputActive =
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) ||
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
        openCreateModal();
        return;
      }

      // 3. '?' when outside inputs to view shortcuts reference
      if (e.key === "?" && !isInputActive) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // 4. Esc clears search
      if (e.key === "Escape") {
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isSyncModalOpen, isModalOpen, isShortcutsOpen, isBackupOpen, isManageLabelsOpen]);

  const fetchFirebaseSnippets = async (uid) => {
    if (!db) return [];
    setIsLoading(true);
    try {
      const snippetsCol = collection(db, "snippets");
      const q = query(snippetsCol, where("uid", "==", uid));
      const snapshot = await getDocs(q);
      const snippetsList = snapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data();
        const rest = { ...data };
        delete rest.tags;
        return {
          id: snapshotDoc.id,
          ...rest,
          labels: normalizeLabels(rest.labels),
        };
      });
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
          labels: normalizeLabels(dataToSave.labels),
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
    if (createRequestRef.current) return;
    createRequestRef.current = true;
    setIsSaving(true);
    setCreateError("");
    try {
      if (user && db && isFirebaseConfigured) {
        const snippetWithUid = { ...newSnippet, labels: normalizeLabels(newSnippet.labels), uid: user.uid, createdAt: Date.now(), updatedAt: Date.now() };
        const docRef = await addDoc(collection(db, "snippets"), snippetWithUid);
        const created = { id: docRef.id, ...snippetWithUid };
        setSnippets((prev) => [created, ...prev]);
      } else {
        const created = addLocalSnippet(newSnippet);
        if (!getLocalSnippets().some((snippet) => snippet.id === created.id)) {
          throw new Error("The snippet could not be stored in this browser.");
        }
        setSnippets((prev) => [created, ...prev]);
      }
      createRequestRef.current = false;
      closeModal();
      setSelectedLabel("");
      setSearchQuery("");
      showToast("Snippet created.");
    } catch (error) {
      console.error("Error adding new snippet:", error);
      setCreateError("Could not create the snippet. Your draft is still here. Please try again.");
    } finally {
      createRequestRef.current = false;
      setIsSaving(false);
    }
  };

  const createSnippet = () => {
    if (!currentSnippet || createRequestRef.current) return;
    const data = currentSnippet.data || "";
    if (!currentSnippet.title.trim() && !data.trim()) return;
    const language = detectLanguage(data);
    handleAddSnippet({
      title: currentSnippet.title.trim() || extractSmartTitle(data, language),
      data,
      language,
      labels: normalizeLabels(currentSnippet.labels),
      pinned: Boolean(currentSnippet.pinned),
    });
  };

  const persistSnippetUpdates = async (snippetId, updates) => {
    const setStatus = (status) => {
      if (activeSnippetIdRef.current === snippetId) setAutosaveStatus(status);
    };
    setStatus("saving");
    try {
      let updated;
      if (user && db && isFirebaseConfigured) {
        await updateDoc(doc(db, "snippets", snippetId), updates);
      } else {
        updated = updateLocalSnippet(snippetId, updates);
      }
      setSnippets((prev) => prev.map((snippet) =>
        snippet.id === snippetId ? (updated || { ...snippet, ...updates }) : snippet
      ));
      setStatus("saved");
      if (activeSnippetIdRef.current === snippetId) {
        autosaveFeedbackTimerRef.current = setTimeout(() => {
          setStatus("ready");
          autosaveFeedbackTimerRef.current = null;
        }, 2200);
      }
    } catch (error) {
      console.error("Error updating snippet:", error);
      setStatus("error");
      showToast("Could not save your changes. Please try again.");
    }
  };

  const flushPendingSave = () => {
    clearTimeout(typingTimeoutRef.current);
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (pending) persistSnippetUpdates(pending.id, pending.updates);
  };

  const handleUpdateSnippet = (snippetId, updates) => {
    setCurrentSnippet((prev) => (prev ? { ...prev, ...updates } : { id: snippetId, ...updates }));

    if (isCreatingSnippet) {
      setCreateError("");
      return;
    }

    setAutosaveStatus("pending");

    if (autosaveFeedbackTimerRef.current) {
      clearTimeout(autosaveFeedbackTimerRef.current);
      autosaveFeedbackTimerRef.current = null;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const { id: ignoredId, ...dataToSave } = { ...currentSnippet, ...updates };
    pendingSaveRef.current = {
      id: snippetId,
      updates: dataToSave,
    };
    typingTimeoutRef.current = setTimeout(flushPendingSave, AUTOSAVE_DELAY);
  };

  const handleDeleteSnippet = async (snippetId) => {
    clearTimeout(typingTimeoutRef.current);
    pendingSaveRef.current = null;
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
    activeSnippetIdRef.current = snippet.id;
    setIsCreatingSnippet(false);
    setCurrentSnippet(snippet);
    setIsModalOpen(true);
    setAutosaveStatus("ready");
    setIsDeleteConfirming(false);
    setModalTab("write");
    setModalLabelInput("");
  };

  const openCreateModal = () => {
    activeSnippetIdRef.current = null;
    setCurrentSnippet({ id: null, title: "", data: "", labels: [], pinned: false });
    setIsCreatingSnippet(true);
    setIsModalOpen(true);
    setCreateError("");
    setAutosaveStatus("ready");
    setIsDeleteConfirming(false);
    setModalTab("write");
    setModalLabelInput("");
  };

  const closeModal = () => {
    if (createRequestRef.current) return;
    activeSnippetIdRef.current = null;
    if (!isCreatingSnippet) flushPendingSave();
    setIsModalOpen(false);
    setCurrentSnippet(null);
    setAutosaveStatus("ready");
    setIsDeleteConfirming(false);
    setModalLabelInput("");
    setIsCreatingSnippet(false);
    setCreateError("");
    if (autosaveFeedbackTimerRef.current) {
      clearTimeout(autosaveFeedbackTimerRef.current);
    }
  };

  // Editor modal shortcuts: work regardless of focus placement while a snippet is open.
  // ⌘/Ctrl+Enter = Done, ⌘/Ctrl+Backspace = Delete (press once to arm, again to confirm).
  // closeModal/handleDeleteSnippet are stable in behavior; resubscribing only on state.
  useEffect(() => {
    if (!isModalOpen || !currentSnippet) return;

    const handleModalKeyDown = (event) => {
      const target = event.target;
      const isEditing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (isCreatingSnippet) createSnippet();
        else closeModal();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Backspace") {
        if (isCreatingSnippet) return;
        // Never hijack editing keys inside text fields
        if (isEditing) return;
        event.preventDefault();
        if (isDeleteConfirming) {
          handleDeleteSnippet(currentSnippet.id);
        } else {
          setIsDeleteConfirming(true);
        }
      }
    };

    window.addEventListener("keydown", handleModalKeyDown);
    return () => window.removeEventListener("keydown", handleModalKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, currentSnippet, isDeleteConfirming, isCreatingSnippet]);

  // Per-snippet label edits inside the editor modal (persisted via autosave)
  const handleModalAddLabel = (label) => {
    if (!currentSnippet) return;
    const clean = label.trim().replace(/^#+/, "");
    if (!clean) return;
    const current = Array.isArray(currentSnippet.labels) ? currentSnippet.labels : [];
    if (current.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      setModalLabelInput("");
      return;
    }
    handleUpdateSnippet(currentSnippet.id, {
      ...currentSnippet,
      labels: [...current, clean],
    });
    setModalLabelInput("");
  };

  const handleModalRemoveLabel = (label) => {
    if (!currentSnippet) return;
    const current = Array.isArray(currentSnippet.labels) ? currentSnippet.labels : [];
    handleUpdateSnippet(currentSnippet.id, {
      ...currentSnippet,
      labels: current.filter((l) => l !== label),
    });
  };

  // Persist a bulk label transform across local or cloud storage
  const persistBulkLabelChange = async (transform) => {
    const affected = snippets.filter((s) =>
      Array.isArray(s.labels) && s.labels.some((l) => transform.appliesTo(l))
    );
    if (affected.length === 0) return 0;

    if (user && db && isFirebaseConfigured) {
      // Firestore batches are limited to 500 writes; chunk defensively
      for (let i = 0; i < affected.length; i += 500) {
        const batch = writeBatch(db);
        affected.slice(i, i + 500).forEach((snippet) => {
          batch.update(doc(db, "snippets", snippet.id), {
            labels: normalizeLabels(transform.nextLabels(snippet.labels)),
          });
        });
        await batch.commit();
      }
    }

    const updated = snippets.map((s) =>
      affected.some((a) => a.id === s.id)
        ? { ...s, labels: normalizeLabels(transform.nextLabels(s.labels)), updatedAt: Date.now() }
        : s
    );
    if (!(user && db && isFirebaseConfigured)) {
      setLocalSnippets(updated);
    }
    setSnippets(updated);
    return affected.length;
  };

  // Global label rename: every snippet carrying oldName moves to newName (merges on collision)
  const handleRenameLabel = async (oldName, newName) => {
    const clean = String(newName ?? "").trim().replace(/^#+/, "");
    if (!clean || clean.toLowerCase() === oldName.toLowerCase()) return 0;
    const count = await persistBulkLabelChange({
      appliesTo: (l) => l.toLowerCase() === oldName.toLowerCase(),
      nextLabels: (labels) =>
        normalizeLabels(labels).map((l) =>
          l.toLowerCase() === oldName.toLowerCase() ? clean : l
        ),
    });
    if (selectedLabel.toLowerCase() === oldName.toLowerCase()) {
      setSelectedLabel(clean);
    }
    setCurrentSnippet((prev) =>
      prev && Array.isArray(prev.labels) && prev.labels.some((l) => l.toLowerCase() === oldName.toLowerCase())
        ? {
            ...prev,
            labels: normalizeLabels(prev.labels).map((l) =>
              l.toLowerCase() === oldName.toLowerCase() ? clean : l
            ),
          }
        : prev
    );
    if (count > 0) {
      showToast(`Renamed label "${oldName}" to "${clean}" on ${count} snippet${count === 1 ? "" : "s"}.`);
    }
    return count;
  };

  // Global label delete: removed from every snippet carrying it
  const handleDeleteLabel = async (name) => {
    const count = await persistBulkLabelChange({
      appliesTo: (l) => l.toLowerCase() === name.toLowerCase(),
      nextLabels: (labels) =>
        normalizeLabels(labels).filter((l) => l.toLowerCase() !== name.toLowerCase()),
    });
    if (selectedLabel.toLowerCase() === name.toLowerCase()) {
      setSelectedLabel("");
    }
    setCurrentSnippet((prev) =>
      prev && Array.isArray(prev.labels)
        ? { ...prev, labels: prev.labels.filter((l) => l.toLowerCase() !== name.toLowerCase()) }
        : prev
    );
    if (count > 0) {
      showToast(`Deleted label "${name}" from ${count} snippet${count === 1 ? "" : "s"}.`);
    }
    return count;
  };

  // Unique labels list with usage counts
  const allLabels = useMemo(() => {
    const labelSet = new Set();
    snippets.forEach((s) => {
      if (Array.isArray(s.labels)) {
        s.labels.forEach((t) => labelSet.add(t));
      }
    });
    return Array.from(labelSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [snippets]);

  const labelCounts = useMemo(() => {
    const counts = {};
    snippets.forEach((s) => {
      if (Array.isArray(s.labels)) {
        s.labels.forEach((t) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return counts;
  }, [snippets]);

  // Filtering & Sorting (pinned first)
  const filteredSnippets = useMemo(() => {
    const queryNorm = searchQuery.trim().toLowerCase();

    return snippets
      .filter((s) => {
        // Label filter
        if (selectedLabel) {
          if (!s.labels || !s.labels.includes(selectedLabel)) return false;
        }

        // Search query filter
        if (!queryNorm) return true;

        const title = (s.title || "").toLowerCase();
        const data = (s.data || "").toLowerCase();
        const labelsStr = (s.labels || []).join(" ").toLowerCase();
        const lang = (s.language || "").toLowerCase();

        return (
          title.includes(queryNorm) ||
          data.includes(queryNorm) ||
          labelsStr.includes(queryNorm) ||
          lang.includes(queryNorm)
        );
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
      });
  }, [snippets, searchQuery, selectedLabel]);

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
            <p className="brand-description">Your code and notes, in one place.</p>
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
          <span data-brand-launcher></span>
        </div>
      </header>

      {/* Search and create */}
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
              placeholder="Search snippets…"
              aria-label="Search snippets"
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

          {/* Create in the shared editor */}
          <button
            type="button"
            className="new-snippet-btn"
            onClick={openCreateModal}
            title="Create new snippet (Press C or ⌥N)"
          >
            <span className="capture-btn-icon" aria-hidden="true">+</span>
            <span className="capture-btn-text">New snippet</span>
            <kbd className="capture-btn-kbd">C</kbd>
          </button>
        </div>

        {/* Library controls */}
        <div className="quick-filter-strip">
          <div className="library-label-controls">
            <select
              className="library-label-filter"
              aria-label="Filter by label"
              value={selectedLabel}
              onChange={(event) => setSelectedLabel(event.target.value)}
            >
              <option value="">All labels</option>
              {allLabels.map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
            {allLabels.length > 0 && (
              <button
                type="button"
                className="manage-labels-btn"
                onClick={() => setIsManageLabelsOpen(true)}
                title="Rename or delete labels"
              >
                Manage labels
              </button>
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
              role="radio"
              aria-checked={viewMode === "grid"}
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
              role="radio"
              aria-checked={viewMode === "list"}
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

      {/* Snippet Library Grid / List */}
      <section className="library-section" aria-live="polite">
        <div className="library-section-header">
          <div className="library-title-group">
            <h2 className="library-title">Your snippets</h2>
            <span className="library-count-pill">
              {visibleSnippets === totalSnippets
                ? `${totalSnippets} snippet${totalSnippets === 1 ? "" : "s"}`
                : `${visibleSnippets} of ${totalSnippets} snippets`}
            </span>
          </div>

          {(selectedLabel || searchQuery) && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSelectedLabel("");
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
            <span className="empty-eyebrow">Your workspace</span>
            <h3 className="empty-title">A home for your code and notes</h3>
            <p className="empty-description">Save useful snippets and organize them with labels, ready for the next time you need them.</p>
            <button
              type="button"
              className="primary-action"
              onClick={openCreateModal}
            >
              Create your first snippet
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
                setSelectedLabel("");
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
      <Modal
        show={isModalOpen}
        onClose={closeModal}
        ariaLabel={isCreatingSnippet ? "Create snippet" : "Edit snippet"}
        maxWidth="960px"
        onEscapeKey={() => {
          if (isDeleteConfirming) {
            setIsDeleteConfirming(false);
          } else {
            closeModal();
          }
        }}
      >
        {currentSnippet && (
          <div className="modal-editor">
            <div className="modal-editor-main">
              {/* Modal Top */}
              <div className="modal-top-row">
                <div className="modal-title-box">
                  <input
                    className="modal-editor-title"
                    type="text"
                    placeholder={isCreatingSnippet ? "Title (optional)" : "Snippet title"}
                    aria-label="Snippet title"
                    autoFocus
                    disabled={isSaving}
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
                <div className="modal-header-controls">
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
                  </div>
                  <button
                    type="button"
                    className="icon-close-btn modal-close-x"
                    onClick={closeModal}
                    aria-label="Close modal"
                    disabled={isSaving}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Labels (editable) */}
              <SnippetLabelsEditor
                labels={currentSnippet.labels || []}
                availableLabels={allLabels}
                inputValue={modalLabelInput}
                onInputChange={setModalLabelInput}
                onAdd={handleModalAddLabel}
                onRemove={handleModalRemoveLabel}
                disabled={isSaving}
              />

              {/* Modal Fields */}
              <div className={`modal-editor-fields layout-${modalTab}`}>
                {modalTab !== "preview" && (
                  <textarea
                    className="modal-editor-body"
                    aria-label="Snippet content"
                    disabled={isSaving}
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
                role={createError ? "alert" : "status"}
                aria-live="polite"
                data-state={createError ? "error" : autosaveStatus}
              >
                {isCreatingSnippet ? (
                  createError || (isSaving ? "Creating snippet..." : "Add a title or content, then create your snippet.")
                ) : (
                  <>
                    {autosaveStatus === "saving" && "Saving changes..."}
                    {autosaveStatus === "saved" && "✓ All changes saved"}
                    {autosaveStatus === "pending" && "Changes pending..."}
                    {autosaveStatus === "error" && "Failed to autosave."}
                    {autosaveStatus === "ready" && "Changes save automatically"}
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-editor-actions">
              <div className="modal-left-actions">
                {isCreatingSnippet ? (
                  <button type="button" className="ghost-button" onClick={closeModal} disabled={isSaving}>
                    Cancel
                  </button>
                ) : (
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
                )}

                <button
                  type="button"
                  className={`ghost-button action-btn-icon ${currentSnippet.pinned ? "active" : ""}`}
                  onClick={() => handleUpdateSnippet(currentSnippet.id, { pinned: !currentSnippet.pinned })}
                  disabled={isSaving}
                >
                  <span>{currentSnippet.pinned ? "★ Pinned" : "☆ Pin snippet"}</span>
                </button>
              </div>

              <div className="modal-right-actions">
                {!isCreatingSnippet && (isDeleteConfirming ? (
                  <div className="delete-confirm-group">
                    <span className="delete-confirm-text">Delete permanently?</span>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteSnippet(currentSnippet.id)}
                      title="Confirm delete (⌘/Ctrl+Backspace)"
                    >
                      <span>Yes, delete</span>
                      <kbd className="btn-kbd">⌘⌫</kbd>
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setIsDeleteConfirming(false)}
                      title="Cancel (Esc)"
                    >
                      <span>Cancel</span>
                      <kbd className="btn-kbd">esc</kbd>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => setIsDeleteConfirming(true)}
                    title="Delete snippet (⌘/Ctrl+Backspace, twice to confirm)"
                  >
                    <span>Delete</span>
                    <kbd className="btn-kbd">⌘⌫</kbd>
                  </button>
                ))}
                <button
                  type="button"
                  className="primary-action"
                  onClick={isCreatingSnippet ? createSnippet : closeModal}
                  disabled={isSaving || (isCreatingSnippet && !currentSnippet.title.trim() && !currentSnippet.data.trim())}
                  title={isCreatingSnippet ? "Create snippet (⌘/Ctrl+Enter)" : "Done (⌘/Ctrl+Enter)"}
                >
                  <span>{isCreatingSnippet ? (isSaving ? "Creating..." : "Create snippet") : "Done"}</span>
                  <kbd className="btn-kbd">⌘↵</kbd>
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

      {/* Manage Labels Modal */}
      <ManageLabelsModal
        isOpen={isManageLabelsOpen}
        onClose={() => setIsManageLabelsOpen(false)}
        labels={allLabels}
        labelCounts={labelCounts}
        onRename={handleRenameLabel}
        onDelete={handleDeleteLabel}
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
