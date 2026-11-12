import { useAsync } from "../../hooks/useAsync";
import { periodicService } from "./periodic.service";
export const usePeriodic = () => useAsync(periodicService.list);
