// types/global.d.ts

declare global {
  /** The interface for a car listing in the Zipo app. */
  interface ICar {
    id: string;
    make: string;
    model: string;
    year: number;
    pricePerDay: number;
    ownerId: string;
    location: string;
  }

  /** The interface for a user. */
  interface IUser {
    id: string;
    name: string;
    email: string;
    isOwner: boolean;
  }
}

// Export an empty object to make this a module file
export {};
