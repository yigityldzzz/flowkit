export interface WorkflowStep {
  type: click | input | navigate | wait | scroll | select;
  selector?: string;
  selectorAlternatives?: string[];
  value?: string;
  url?: string;
  delay?: number;
  description?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  variableName?: string;
}

export interface WorkflowSchedule {
  enabled: boolean;
  type: hourly | daily;
  hour?: number;
  minute?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  replayCount: number;
  createdAt: number;
  updatedAt: number;
  serverId?: string;
  schedule?: WorkflowSchedule;
  dataSets?: Record<string, string>[];
}

export interface AuthState {
  accessToken?: string;
  refreshToken?: string;
  user?: { id: string; email: string; name?: string; plan: string };
}

const KEYS = {
  WORKFLOWS: fk_workflows,
  AUTH: fk_auth,
  RECORDING_STATE: fk_recording,
  SETTINGS: fk_settings,
};

export const storage = {
  async getWorkflows(): Promise<Workflow[]> {
    const result = await chrome.storage.local.get(KEYS.WORKFLOWS);
    return result[KEYS.WORKFLOWS] || [];
  },

  async saveWorkflow(workflow: Workflow): Promise<void> {
    const workflows = await this.getWorkflows();
    const idx = workflows.findIndex((w) => w.id === workflow.id);
    if (idx >= 0) {
      workflows[idx] = { ...workflow, updatedAt: Date.now() };
    } else {
      workflows.unshift(workflow);
    }
    await chrome.storage.local.set({ [KEYS.WORKFLOWS]: workflows });
  },

  async deleteWorkflow(id: string): Promise<void> {
    const workflows = await this.getWorkflows();
    await chrome.storage.local.set({
      [KEYS.WORKFLOWS]: workflows.filter((w) => w.id !== id),
    });
  },

  async getAuth(): Promise<AuthState> {
    const result = await chrome.storage.local.get(KEYS.AUTH);
    return result[KEYS.AUTH] || {};
  },

  async setAuth(auth: AuthState): Promise<void> {
    await chrome.storage.local.set({ [KEYS.AUTH]: auth });
  },

  async clearAuth(): Promise<void> {
    await chrome.storage.local.remove(KEYS.AUTH);
  },

  async getRecordingState(): Promise<{ active: boolean; steps: WorkflowStep[] } | null> {
    const result = await chrome.storage.local.get(KEYS.RECORDING_STATE);
    return result[KEYS.RECORDING_STATE] || null;
  },

  async setRecordingState(state: { active: boolean; steps: WorkflowStep[] } | null): Promise<void> {
    if (state === null) {
      await chrome.storage.local.remove(KEYS.RECORDING_STATE);
    } else {
      await chrome.storage.local.set({ [KEYS.RECORDING_STATE]: state });
    }
  },
};
