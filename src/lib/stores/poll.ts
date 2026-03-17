import { writable } from 'svelte/store';
import type { PollData } from '../types/poll.js';

export const currentPoll = writable<PollData | null>(null);
