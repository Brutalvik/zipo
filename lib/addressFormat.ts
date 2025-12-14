import type {
  Address,
  CanadaAddress,
  IndiaAddress,
  IndonesiaAddress,
} from "@/types/address";

const UPPER = (s?: string) => (s ?? "").trim().toUpperCase();

export function formatAddressLines(
  addr: Address,
  opts?: { simplified?: boolean }
): string[] {
  switch (addr.countryCode) {
    case "ID":
      return formatID(addr, opts?.simplified ?? false);
    case "CA":
      return formatCA(addr);
    case "IN":
      return formatIN(addr);
    default:
      return [];
  }
}

/** INDONESIA */
function formatID(a: IndonesiaAddress, simplified: boolean): string[] {
  const lines: string[] = [];

  if (a.recipientName) lines.push(a.recipientName);

  // Line 2: Street name & number
  lines.push(a.streetLine);

  if (!simplified) {
    // Line 3: RT/RW or housing complex
    if (a.rtRw) lines.push(a.rtRw);
    else if (a.housingComplex) lines.push(a.housingComplex);

    // Line 4: Village
    if (a.village) lines.push(a.village);

    // Line 5: District
    if (a.district) lines.push(`KECAMATAN ${a.district}`);

    // Line 6: City/Regency
    lines.push(a.cityOrRegency);

    // Line 7: Province
    lines.push(a.province);

    // Line 8: Postal code
    lines.push(a.postalCode);

    // Line 9: Country
    lines.push("INDONESIA");
  } else {
    // Simplified for international mail
    // Name
    // Street & Number
    // City, Postal Code
    // Province
    // INDONESIA
    lines.push(`${a.cityOrRegency} ${a.postalCode}`);
    lines.push(a.province);
    lines.push("INDONESIA");
  }

  // Optional landmark (append near street line if you want)
  // We keep it out by default to preserve standard format
  return lines.filter(Boolean);
}

/** CANADA */
function formatCA(a: CanadaAddress): string[] {
  const lines: string[] = [];

  // Line 1: Recipient
  if (a.recipientName) lines.push(UPPER(a.recipientName));

  // Line 2: Unit - Street Number Street Name Street Type OR rural route
  if (a.ruralRoute || a.stationInfo) {
    const rr = [a.ruralRoute, a.stationInfo]
      .filter(Boolean)
      .map(UPPER)
      .join(" ");
    lines.push(rr);
  } else {
    const unit = a.unitOrApt ? `${UPPER(a.unitOrApt)} - ` : "";
    const streetType = a.streetType ? ` ${UPPER(a.streetType)}` : "";
    lines.push(
      `${unit}${UPPER(a.streetNumber)} ${UPPER(
        a.streetName
      )}${streetType}`.trim()
    );
  }

  // Line 3: CITY PROVINCE POSTAL
  lines.push(
    `${UPPER(a.city)} ${UPPER(a.provinceCode)} ${UPPER(a.postalCode)}`.trim()
  );

  return lines.filter(Boolean);
}

/** INDIA */
function formatIN(a: IndiaAddress): string[] {
  const lines: string[] = [];

  if (a.recipientName) lines.push(UPPER(a.recipientName));
  lines.push(UPPER(a.houseOrFlat));
  lines.push(UPPER(a.streetArea));
  if (a.locality) lines.push(UPPER(a.locality));
  if (a.landmark) lines.push(UPPER(`LANDMARK: ${a.landmark}`));

  // City, State PIN
  lines.push(`${UPPER(a.city)}, ${UPPER(a.state)} ${UPPER(a.pinCode)}`);

  // Country
  lines.push("INDIA");

  // Contact number (recommended)
  if (a.contactPhone) lines.push(UPPER(a.contactPhone));

  return lines.filter(Boolean);
}

/** Convenience: join lines into a single formatted block */
export function formatAddressBlock(
  addr: Address,
  opts?: { simplified?: boolean }
): string {
  return formatAddressLines(addr, opts).join("\n");
}
