export type CountryCode = "ID" | "CA" | "IN";

/**
 * Shared base for all addresses. Use `label` as optional “Home/Office/Pickup” name.
 */
export type AddressBase = {
  countryCode: CountryCode;
  label?: string; // e.g., "Home", "Office", "Pickup"
  recipientName?: string; // for mail-like formatting, optional in-app
};

/**
 * INDONESIA (Detailed)
 * - Supports RT/RW
 * - Desa/Kelurahan, Kecamatan, Kota/Kabupaten, Provinsi
 * - Postal Code 5 digits
 */
export type IndonesiaAddress = AddressBase & {
  countryCode: "ID";

  // Core
  streetLine: string; // e.g., "Jl. Sudirman No. 45"
  rtRw?: string; // e.g., "RT 007/RW 008"
  housingComplex?: string; // alternative to rtRw, e.g., "Perumahan XYZ Blok A2"

  village?: string; // Desa/Kelurahan
  district?: string; // Kecamatan
  cityOrRegency: string; // Kota/Kabupaten
  province: string; // Provinsi
  postalCode: string; // "12345"

  // Optional extras
  landmark?: string; // e.g., "Near Mall", "Opposite Park"
};

/**
 * CANADA (3-line)
 * - Uppercase recommended
 * - Unit before street number, separated by hyphen
 * - Postal code like "K1A 0B1"
 * - Province abbreviation "AB", "ON", etc.
 */
export type CanadaAddress = AddressBase & {
  countryCode: "CA";

  unitOrApt?: string; // e.g., "APT 4" or "UNIT 10"
  streetNumber: string; // e.g., "123"
  streetName: string; // e.g., "OAK"
  streetType?: string; // e.g., "ST", "AVE", "RD", "BLVD"

  city: string; // e.g., "OTTAWA"
  provinceCode: string; // e.g., "ON", "AB"
  postalCode: string; // e.g., "K1A 0B1"

  // Optional
  ruralRoute?: string; // e.g., "RR 2"
  stationInfo?: string; // e.g., "STN A"
};

/**
 * INDIA (specific → general)
 * - PIN code 6 digits
 * - Landmark/locality supported
 * - Phone recommended
 */
export type IndiaAddress = AddressBase & {
  countryCode: "IN";

  houseOrFlat: string; // e.g., "Flat 101, Sunshine Apartments"
  streetArea: string; // e.g., "MG Road, Sector 12"
  locality?: string; // e.g., "Koramangala"
  city: string; // e.g., "Bengaluru"
  state: string; // e.g., "Karnataka"
  pinCode: string; // "560034"

  landmark?: string;
  contactPhone?: string; // "+91-9876543210"
};

export type Address = IndonesiaAddress | CanadaAddress | IndiaAddress;
