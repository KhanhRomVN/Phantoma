export interface AddTargetData {
  name: string;
  url?: string;
  executablePath?: string;
  mode: 'browser' | 'electron' | 'native';
  platform: 'web' | 'pc' | 'android' | 'cli';
  icon?: string;
  emulatorSerial?: string;
  packageName?: string;
}

export interface UpdateTargetData {
  name: string;
  url?: string;
  executablePath?: string;
}

export const targetService = {
  async getAll() {
    return window.api.invoke('apps:get-all');
  },

  async add(data: AddTargetData) {
    return window.api.invoke('apps:add', data);
  },

  async update(id: string, data: UpdateTargetData) {
    return window.api.invoke('apps:update', id, data);
  },

  async delete(id: string) {
    return window.api.invoke('apps:delete', id);
  },

  async scanPcApps() {
    return window.api.invoke('apps:scan-pc');
  },
};

export default targetService;