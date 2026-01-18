// types/global.d.ts

export {};

declare global {
  /**
   * User mode in the app
   * - guest: rents cars
   * - host: lists cars
   */
  type UserMode = "guest" | "host";

  /**
   * Core User object used across Redux, UI, and backend sync
   */
  interface IUser {
    /** Firebase UID */
    id: string;

    /** Same as Firebase UID (kept for backend alignment) */
    firebase_uid?: string;

    /** Display name */
    name: string;

    /** Email address */
    email: string;

    /** Phone in E.164 format */
    phoneNumber?: string | null;

    /** Profile image */
    photoURL?: string | null;

    /** Verification flags */
    emailVerified?: boolean;
    phoneVerified?: boolean;

    /** Guest / Host mode */
    mode?: UserMode;

    /** Account status flags (future-proof) */
    status?: "active" | "suspended" | "deleted";
    kycStatus?:
      | "not_started"
      | "incomplete"
      | "pending"
      | "verified"
      | "approved"
      | "rejected"
      | "expired";

    /** Metadata */
    created_at?: string;
    updated_at?: string;

    profile_photo_url?: string | null;
    profile_photo_path?: string | null;

    providerId?: any;
  }

  /**
   * Car listing (host-owned vehicle)
   */
  interface ICar {
    id: string;

    /** Owner (host) Firebase UID */
    ownerId: string;

    /** Vehicle details */
    make: string;
    model: string;
    year: number;

    /** Pricing */
    pricePerDay: number;
    currency?: "USD" | "CAD" | "IDR" | "INR";

    /** Location */
    location: string;

    /** Status */
    status?: "draft" | "active" | "inactive" | "blocked";

    /** Metadata */
    created_at?: string;
    updated_at?: string;
  }

  /**
   * Booking (guest ↔ host)
   */
  interface IBooking {
    id: string;
    carId: string;
    guestId: string;
    hostId: string;

    startDate: string;
    endDate: string;

    totalAmount: number;
    currency?: string;

    status: "pending" | "confirmed" | "cancelled" | "completed";

    created_at?: string;
    updated_at?: string;
  }
}
