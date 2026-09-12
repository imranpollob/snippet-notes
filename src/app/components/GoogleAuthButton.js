"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import logoPic from "../../../public/logo.png";
import Modal from "./Modal";
import {
  auth,
  isFirebaseConfigured,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "../../../firebase";

// Official Google 4-Color "G" Icon
const GoogleIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="google-g-icon"
  >
    <path
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      fill="#4285F4"
    />
    <path
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      fill="#34A853"
    />
    <path
      d="M5.28 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
      fill="#FBBC05"
    />
    <path
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      fill="#EA4335"
    />
  </svg>
);

export default function GoogleAuthButton({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [imageError, setImageError] = useState(false);

  const menuRef = useRef(null);
  const provider = useMemo(() => new GoogleAuthProvider(), []);

  // Sync with propUser if provided
  useEffect(() => {
    if (propUser !== undefined) {
      setUser(propUser);
    }
  }, [propUser]);

  // Listen to Firebase auth changes
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setImageError(false);
    });

    return () => unsubscribe();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    if (!isFirebaseConfigured || !auth) {
      setAuthError(
        "Firebase is not configured yet. Please add your credentials to .env.local to enable Google sign-in."
      );
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setIsLoginModalOpen(false);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === "auth/unauthorized-domain") {
        const domain = typeof window !== "undefined" ? window.location.hostname : "your domain";
        setAuthError(
          `Domain "${domain}" is not authorized for Firebase Authentication. Please add "${domain}" to your Firebase Console: Authentication → Settings → Authorized domains.`
        );
      } else if (error.code !== "auth/popup-closed-by-user") {
        setAuthError(error.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign-Out
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived user display details
  const displayName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "Account";
  }, [user]);

  const initials = useMemo(() => {
    if (!displayName || displayName === "Account") return "S";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  // High-res Google Avatar URL
  const avatarSrc = useMemo(() => {
    if (!user?.photoURL) return null;
    try {
      const url = new URL(user.photoURL);
      if (url.hostname.endsWith("googleusercontent.com")) {
        url.searchParams.set("sz", "128");
      }
      return url.toString();
    } catch {
      return user.photoURL;
    }
  }, [user?.photoURL]);

  return (
    <div className="auth-module-wrapper" ref={menuRef}>
      {user ? (
        /* ==========================================================================
           LOGGED IN: Interactive Avatar + Popover Menu
           ========================================================================== */
        <div className="auth-avatar-container">
          <button
            type="button"
            className={`auth-avatar-btn ${isMenuOpen ? "active" : ""}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label={`User menu for ${displayName}`}
            title={`${displayName} (Google Connected)`}
          >
            <div className="auth-avatar-circle">
              {avatarSrc && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="auth-avatar-image"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="auth-avatar-monogram">{initials}</span>
              )}
              <span className="auth-status-dot" title="Cloud Sync Active" />
            </div>

            <span className="auth-user-label">
              {displayName.split(" ")[0]}
            </span>

            <svg
              className={`auth-chevron-icon ${isMenuOpen ? "open" : ""}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* User Profile Popover */}
          {isMenuOpen && (
            <div className="auth-profile-popover" role="menu">
              <div className="auth-popover-header">
                <div className="auth-popover-avatar-lg">
                  {avatarSrc && !imageError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="auth-popover-img"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="auth-popover-monogram-lg">{initials}</span>
                  )}
                  <span className="auth-popover-dot" />
                </div>
                <div className="auth-popover-details">
                  <div className="auth-popover-name">{displayName}</div>
                  {user.email && (
                    <div className="auth-popover-email">{user.email}</div>
                  )}
                  <div className="auth-popover-sync-badge">
                    <span className="auth-pulse-dot" />
                    Cloud Sync Active
                  </div>
                </div>
              </div>

              <div className="auth-popover-divider" />

              <div className="auth-popover-footer">
                <button
                  type="button"
                  className="auth-popover-signout-btn"
                  onClick={handleSignOut}
                  disabled={isLoading}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{isLoading ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==========================================================================
           SIGNED OUT: Sleek "Sign In" Button
           ========================================================================== */
        <button
          type="button"
          className="auth-signin-btn"
          onClick={() => {
            setAuthError(null);
            setIsLoginModalOpen(true);
          }}
          aria-label="Sign in"
        >
          <GoogleIcon size={16} />
          <span className="auth-signin-text">Sign In</span>
        </button>
      )}

      {/* ==========================================================================
         CLEAN LOGIN INTERFACE MODAL
         ========================================================================== */}
      <Modal
        show={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setAuthError(null);
        }}
        maxWidth="420px"
      >
        <div className="login-modal-content">
          <div className="login-modal-header">
            <div className="login-modal-brand-row">
              <div className="login-modal-logo-frame">
                <Image
                  src={logoPic}
                  alt="Snippets Logo"
                  width={38}
                  height={38}
                  className="login-modal-logo"
                />
              </div>
              <button
                type="button"
                className="icon-close-btn"
                onClick={() => setIsLoginModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <h2 className="login-modal-title">Sign in to Snippets</h2>
            <p className="login-modal-desc">
              Synchronize your snippets across devices and back up your code library in the cloud.
            </p>
          </div>

          {authError && (
            <div className="login-modal-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <div className="login-modal-body">
            {/* Primary Google Login Button */}
            <button
              type="button"
              className="login-google-cta"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="login-cta-spinner" aria-hidden="true" />
              ) : (
                <GoogleIcon size={20} />
              )}
              <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
