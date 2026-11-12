import { useAsync } from "../../hooks/useAsync";
import { periodicRequestService } from "./periodic-request.service";
export const usePeriodicRequests = () => useAsync(periodicRequestService.list);
