export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF" | "PARENT";
  tenantId: string;
  tenantName: string;
};

export const MOCK_USER: MockUser = {
  id: "mock-user-1",
  name: "Xiang Li",
  email: "owner@brightcare.local",
  role: "OWNER",
  tenantId: "tenant-1",
  tenantName: "BrightCare Demo",
};

export function getMockSession() {
  return {
    isAuthenticated: true,
    user: MOCK_USER,
  };
}
