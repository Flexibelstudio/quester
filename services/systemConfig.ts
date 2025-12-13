
import { SystemConfig } from '../types';
import { ISystemConfigService } from './interfaces';

const STORAGE_KEY = 'quester_system_config';

const DEFAULT_CONFIG: SystemConfig = {
    featuredModes: {
        zombie_survival: {
            isActive: false,
            title: "Zombie Survival",
            description: "Survive the outbreak."
        },
        christmas_hunt: {
            isActive: false,
            title: "Christmas Hunt",
            description: "Find the gifts before the Grinch."
        }
    }
};

export class MockConfigService implements ISystemConfigService {
    async getConfig(): Promise<SystemConfig> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return Promise.resolve(stored ? JSON.parse(stored) : DEFAULT_CONFIG);
        } catch {
            return Promise.resolve(DEFAULT_CONFIG);
        }
    }

    async updateConfig(config: SystemConfig): Promise<void> {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
}

export const systemConfigService = new MockConfigService(); // Export generic instance for legacy synchronous calls if needed, but preferred via dataService
