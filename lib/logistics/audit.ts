export interface LogisticsAuditValues {
  route: string | null;
  port: string | null;
  shipMethod: string | null;
  freightEur: string | null;
  inlandEur: string | null;
  otherEur: string | null;
  active: boolean;
}

export function logisticsAuditValues(c: LogisticsAuditValues): LogisticsAuditValues {
  return {
    route: c.route, port: c.port, shipMethod: c.shipMethod,
    freightEur: c.freightEur, inlandEur: c.inlandEur, otherEur: c.otherEur,
    active: c.active,
  };
}
