/**
 * Centralized agent service registry.
 * Single source of truth for ports, endpoints, and service types.
 */

export type ServiceType = "audit" | "translate" | "analyze" | "orchestrate";

export interface AgentEntry {
  port: number;
  serviceType: ServiceType;
  apiPath: string;
}

export const AGENT_REGISTRY: Record<ServiceType, AgentEntry> = {
  audit:       { port: 3001, serviceType: "audit",       apiPath: "/api/audit" },
  translate:   { port: 3002, serviceType: "translate",    apiPath: "/api/translate" },
  analyze:     { port: 3003, serviceType: "analyze",      apiPath: "/api/analyze" },
  orchestrate: { port: 3004, serviceType: "orchestrate",  apiPath: "/api/orchestrate" },
};

export const AGENT_PORTS = Object.values(AGENT_REGISTRY).map(a => a.port);

export function agentBaseUrl(service: ServiceType): string {
  return `http://localhost:${AGENT_REGISTRY[service].port}`;
}

export function agentInfoUrl(service: ServiceType): string {
  return `${agentBaseUrl(service)}/info`;
}

export function agentEndpoint(service: ServiceType): string {
  const entry = AGENT_REGISTRY[service];
  return `http://localhost:${entry.port}${entry.apiPath}`;
}
