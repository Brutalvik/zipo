import type { Address } from "@/types/address";

export type Guest = {
  id: string;
  fullName: string;
  email: string;
  address: Address;
};
