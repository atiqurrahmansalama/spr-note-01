import { SettingsSectionItem } from "../../../components/common/SettingsSplitLayout";

export type DeveloperToolsSectionItem = SettingsSectionItem;

export interface HealthServiceStatus {
  status: string;
  engine?: string;
  backend?: string;
  broker?: string;
  latency_ms?: number;
}

export interface HealthDiagnosticsResponse {
  status: string;
  services: {
    database: HealthServiceStatus;
    cache: HealthServiceStatus;
    celery_worker: HealthServiceStatus;
    [key: string]: HealthServiceStatus | undefined;
  };
}
