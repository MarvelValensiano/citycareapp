import Map from '../utils/map';

export async function reportMapper(report) {
  return {
    ...report,
    location: {
      ...report,
      placeName:
        report.lat || report.lon ? await Map.getPlaceNameByCoordinate(report.lat, report.lon) : '',
    },
  };
}
