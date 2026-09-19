// Existing office centres retained from the app; physical accuracy needs on-site verification. Placeholder branch excluded.
const offices = [
  { name: 'Expert Solutions Warehouse', latitude: 24.477576, longitude: 75.155993, radius: 50 },
  { name: 'E. S. Showroom', latitude: 24.464245, longitude: 75.150346, radius: 50 },
];
function distanceMetres(a, b, c, d) {
  const r = x => x * Math.PI / 180;
  const h = Math.sin(r(c-a)/2)**2 + Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
function officeAt(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) return null;
  return offices.find(o => distanceMetres(latitude,longitude,o.latitude,o.longitude) <= o.radius) || null;
}
module.exports = { offices, officeAt, distanceMetres };
