export type HostStatus =
  | "draft" // started but not submitted
  | "pending_review" // submitted, waiting
  | "approved" // can list cars
  | "rejected" // failed review (show reason)
  | "suspended" // temporarily blocked
  | "archived"; // host closed account

export type VerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed"
  | "expired";

export type PayoutStatus =
  | "not_setup"
  | "pending"
  | "active"
  | "failed"
  | "paused";

export type HostType = "individual" | "business";

export type HostProfile = {
  // -----------------------------
  // Identity / linking
  // -----------------------------
  id: string; // host_profiles.id (uuid)
  userId: string; // FK -> users.id (or firebase uid mapping)
  hostNumber?: string; // "H-000123" optional human-friendly

  // -----------------------------
  // Lifecycle
  // -----------------------------
  status: HostStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  suspendedAt?: string | null;

  rejectionReason?: string | null; // safe for UI
  internalNotes?: string | null; // admin only (don’t send to app)

  // -----------------------------
  // Type (future-proof: businesses)
  // -----------------------------
  hostType: HostType; // individual | business
  displayName: string; // what guests see (e.g., "Vikram" or "Zipo Fleet YYC")
  legalName?: string | null; // for contracts/payouts
  businessName?: string | null;
  taxId?: string | null; // optional, country-specific (store carefully)

  // -----------------------------
  // Contact (host-facing + support)
  // -----------------------------
  contact: {
    email?: string | null;
    phone?: string | null;
    preferredLanguage?: string | null; // e.g. "en", "fr"
    timezone?: string | null; // e.g. "America/Edmonton"
  };

  // -----------------------------
  // Operating region (multi-country ready)
  // -----------------------------
  baseLocation: {
    countryCode: string; // "CA"
    city?: string | null; // "Calgary"
    area?: string | null; // "Kensington"
  };

  // -----------------------------
  // Host onboarding progress (drives UI)
  // -----------------------------
  onboarding: {
    steps: {
      profileCompleted: boolean;
      identityVerified: boolean;
      payoutSetup: boolean;
      hostAgreementAccepted: boolean;
      firstCarCreated: boolean;
      firstCarPublished: boolean;
    };
    lastStepAt?: string | null;
  };

  // -----------------------------
  // Verification / compliance (KYC)
  // -----------------------------
  verification: {
    identity: {
      status: VerificationStatus;
      provider?: string | null; // future: "stripe_identity", "persona", etc.
      referenceId?: string | null; // provider session id
      verifiedAt?: string | null;
      failedAt?: string | null;
      failureReason?: string | null; // safe summary for UI
    };

    driverLicense?: {
      status: VerificationStatus;
      countryCode?: string | null;
      expiresOn?: string | null;
      verifiedAt?: string | null;
    };

    address?: {
      status: VerificationStatus;
      verifiedAt?: string | null;
    };
  };

  // -----------------------------
  // Payouts (abstract, provider-agnostic)
  // -----------------------------
  payouts: {
    status: PayoutStatus;
    provider?: string | null; // "stripe_connect", "paypal", "bank_transfer"
    accountId?: string | null; // provider account
    currency?: string | null; // "CAD"
    last4?: string | null; // masked info, optional
    updatedAt?: string | null;
  };

  // -----------------------------
  // Hosting preferences & policies (changes over time)
  // -----------------------------
  preferences: {
    instantBookEnabled: boolean;
    advanceNoticeHours: number; // e.g. 6, 12, 24
    minTripDays: number; // e.g. 1
    maxTripDays?: number | null; // optional
    cancellationPolicy: "flexible" | "moderate" | "strict";
    allowedDrivers: "primary_only" | "additional_allowed";
    smokingAllowed?: boolean | null;
    petsAllowed?: boolean | null;
  };

  // -----------------------------
  // Ratings / performance (denormalized for fast host dashboard)
  // -----------------------------
  metrics: {
    activeCars: number;
    totalCars: number;
    tripsCompleted: number;
    tripsCancelledByHost: number;
    responseRate30d?: number | null; // 0-100
    responseTimeMins30d?: number | null;
    ratingAvg?: number | null; // 0-5
    ratingCount: number;
    lastTripAt?: string | null;
  };

  // -----------------------------
  // Moderation / risk controls (future)
  // -----------------------------
  risk: {
    score?: number | null; // internal
    flags?: string[]; // internal tags
    payoutHold?: boolean; // internal
  };

  // -----------------------------
  // Timestamps
  // -----------------------------
  createdAt: string;
  updatedAt: string;
};
