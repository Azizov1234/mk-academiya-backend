export interface ICompactSystemStats {
  cpuUsage: number;
  ramFree: number;
  ramTotal: number;
  diskSpace: number;
  networkMs: number;
  uptime: number;
  platform: string;
  arch: string;
  nodeVersion: string;
  updatedAt: Date;
}

export interface IAuditLog {
  type: string;
  title: string;
  time: string;
  status: string;
}
