type ReverseGeocodePayload = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

export function getAddressFieldsFromReverseGeocode(data: ReverseGeocodePayload) {
  const address = data.address ?? {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    "";

  const lineParts = [
    [address.road, address.house_number].filter(Boolean).join(" ").trim(),
    address.quarter,
    address.suburb,
    address.neighbourhood,
    address.hamlet,
  ].filter(Boolean);

  return {
    country: address.country || "",
    state: address.state || address.region || "",
    city,
    clientAddress: lineParts.length ? lineParts.join(", ") : data.display_name || "",
  };
}
