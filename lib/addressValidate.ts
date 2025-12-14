import type { Address } from "@/types/address";

export function validateAddress(addr: Address): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (addr.countryCode === "ID") {
    if (!addr.streetLine) errors.push("ID: streetLine is required.");
    if (!addr.cityOrRegency) errors.push("ID: cityOrRegency is required.");
    if (!addr.province) errors.push("ID: province is required.");
    if (!/^\d{5}$/.test(addr.postalCode))
      errors.push("ID: postalCode must be 5 digits.");
  }

  if (addr.countryCode === "CA") {
    if (!addr.streetNumber) errors.push("CA: streetNumber is required.");
    if (!addr.streetName) errors.push("CA: streetName is required.");
    if (!addr.city) errors.push("CA: city is required.");
    if (!addr.provinceCode) errors.push("CA: provinceCode is required.");
    if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(addr.postalCode))
      errors.push("CA: postalCode must look like A1A 1A1.");
  }

  if (addr.countryCode === "IN") {
    if (!addr.houseOrFlat) errors.push("IN: houseOrFlat is required.");
    if (!addr.streetArea) errors.push("IN: streetArea is required.");
    if (!addr.city) errors.push("IN: city is required.");
    if (!addr.state) errors.push("IN: state is required.");
    if (!/^\d{6}$/.test(addr.pinCode))
      errors.push("IN: pinCode must be 6 digits.");
  }

  return { ok: errors.length === 0, errors };
}
