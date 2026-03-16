type GeolocationFailure = {
  code?: number;
  message?: string;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 60_000,
};

export function getGeolocationSupportError() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "Geolocalizacion no disponible en este navegador.";
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "En celular la ubicacion requiere HTTPS. Si abriste la app por IP/http, usa HTTPS o ajusta el pin manualmente en el mapa.";
  }

  return null;
}

export function getGeolocationErrorMessage(error: unknown) {
  const supportError = getGeolocationSupportError();
  if (supportError) return supportError;

  const geoError = error as GeolocationFailure | null;

  switch (geoError?.code) {
    case 1:
      return "Permiso de ubicacion denegado. Habilitalo en el navegador y vuelve a intentar.";
    case 2:
      return "No se pudo determinar tu ubicacion. Verifica senal GPS, Wi-Fi o datos moviles.";
    case 3:
      return "La ubicacion tardo demasiado. Intenta de nuevo con mejor senal.";
    default:
      return geoError?.message?.trim() || "No se pudo obtener la ubicacion.";
  }
}

export async function requestCurrentPosition() {
  const supportError = getGeolocationSupportError();
  if (supportError) {
    throw new Error(supportError);
  }

  return await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}
