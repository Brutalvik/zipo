type FriendlyAuthError = {
  title: string;
  message: string;
};

export function phoneVerificationFriendlyError(error: any): FriendlyAuthError {
  const code = String(error?.code || "");
  const fallback: FriendlyAuthError = {
    title: "Verification failed",
    message: "We couldn’t verify that code. Please try again.",
  };

  switch (code) {
    // Common OTP / SMS issues
    case "auth/invalid-verification-code":
      return {
        title: "Incorrect code",
        message:
          "That code doesn’t look right. Please double-check and try again.",
      };

    case "auth/code-expired":
      return {
        title: "Code expired",
        message:
          "That code has expired. Please request a new one and try again.",
      };

    case "auth/invalid-verification-id":
      return {
        title: "Code issue",
        message: "That code can’t be used right now. Please request a new one.",
      };

    case "auth/missing-verification-code":
      return {
        title: "Missing code",
        message: "Please enter the verification code we sent you.",
      };

    case "auth/missing-verification-id":
      return {
        title: "Missing info",
        message:
          "Something went wrong while generating the code. Please resend and try again.",
      };

    // Linking/update conflicts
    case "auth/provider-already-linked":
      return {
        title: "Phone already linked",
        message: "This account already has a phone number linked.",
      };

    case "auth/credential-already-in-use":
      return {
        title: "Phone number already in use",
        message:
          "This phone number is already linked to another account. Please use a different number or sign in with the account that already uses it.",
      };

    case "auth/account-exists-with-different-credential":
      return {
        title: "Phone number already in use",
        message:
          "This phone number is linked to another account. Please use a different number or sign in using the account that already uses this phone number.",
      };

    // Rate limiting / abuse prevention
    case "auth/too-many-requests":
      return {
        title: "Too many attempts",
        message: "For security reasons, please wait a bit and try again.",
      };

    // Session / auth state
    case "auth/user-token-expired":
    case "auth/requires-recent-login":
      return {
        title: "Session expired",
        message: "Please log in again, then retry verifying your phone number.",
      };

    case "auth/user-disabled":
      return {
        title: "Account disabled",
        message: "This account has been disabled. Please contact support.",
      };

    case "auth/network-request-failed":
      return {
        title: "Network error",
        message: "Check your internet connection and try again.",
      };

    default:
      // If Firebase gives a readable message, keep it as a last resort (but don’t show codes)
      return {
        ...fallback,
        message: String(error?.message || fallback.message),
      };
  }
}

export function friendlyAuthError(err: any) {
  const code = err?.code ?? "";
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That password doesn't look right. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    default:
      return (
        err?.message || "Couldn't confirm your password. Please try again."
      );
  }
}

export function friendlyPasswordAuthError(error: any) {
  const code = error?.code ?? "";
  switch (code) {
    case "auth/requires-recent-login":
      return "For security, please confirm your password to continue.";
    case "auth/weak-password":
      return "That password is too weak. Please choose a stronger one.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    default:
      return "We couldn’t update your password. Please try again.";
  }
}
