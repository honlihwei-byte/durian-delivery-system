export type StaffPosition = {
  latitude: number;
  longitude: number;
};

export function getStaffPosition(): Promise<StaffPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot get your location. Use a phone with GPS enabled."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error(
              "Location permission denied. Please allow location access to clock in/out.",
            ),
          );
          return;
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("Could not determine your location. Try again outdoors or enable GPS."));
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(new Error("Location request timed out. Please try again."));
          return;
        }
        reject(new Error("Could not get your location. Please try again."));
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}
