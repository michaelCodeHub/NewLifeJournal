// Re-export hospital visit functions from pregnancyService
export {
  addHospitalVisit as addHospitalVisitService,
  getHospitalVisits,
  subscribeToHospitalVisits,
  deleteHospitalVisit,
} from './pregnancyService';
