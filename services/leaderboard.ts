
import { GlobalScoreEntry, Coordinate } from '../types';
import { ILeaderboardService } from './interfaces';

const LB_STORAGE_KEY = 'quester_global_leaderboard';

export class MockLeaderboardService implements ILeaderboardService {
    async getAllScores(): Promise<GlobalScoreEntry[]> {
        try {
            const stored = localStorage.getItem(LB_STORAGE_KEY);
            return Promise.resolve(stored ? JSON.parse(stored) : []);
        } catch {
            return Promise.resolve([]);
        }
    }

    async saveScore(entry: GlobalScoreEntry): Promise<void> {
        const scores = await this.getAllScores();
        scores.push(entry);
        scores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeSeconds - b.timeSeconds;
        });
        localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(scores));
    }
}
