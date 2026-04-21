/**
 * Canton Network Service Logic
 * Communicates with our Express backend which proxies to the Canton JSON API.
 */

export interface CantonResponse<T> {
  status: number;
  result?: T;
  error?: string;
  details?: any;
}

export const cantonService = {
  async getHealth() {
    try {
      const res = await fetch("/api/canton/health");
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error in getHealth. Received:", text.slice(0, 100));
        return { error: "Invalid JSON from server", details: text.slice(0, 100) };
      }
    } catch (err) {
      return { error: "Network Error", details: err instanceof Error ? err.message : "Unknown" };
    }
  },

  /**
   * Queries specified templates on the ledger.
   */
  async queryContracts(templateIds: string[]) {
    const res = await fetch("/api/canton/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateIds })
    });
    return res.json();
  },

  /**
   * Creates a new contract instance.
   */
  async createContract(templateId: string, payload: any) {
    const res = await fetch("/api/canton/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, payload })
    });
    return res.json();
  },

  /**
   * Exercises a choice on an existing contract.
   */
  async exerciseChoice(templateId: string, contractId: string, choice: string, argument: any) {
    const res = await fetch("/api/canton/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        templateId, 
        contractId, 
        choice, 
        argument 
      })
    });
    return res.json();
  }
};
