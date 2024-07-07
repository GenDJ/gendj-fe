import { API_ROOT } from "#root/utils/constants";

function createFullEndpoint(endpoint: string) {
  return `${API_ROOT}/v1/${endpoint}`;
}

export { createFullEndpoint };
