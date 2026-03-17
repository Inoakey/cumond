export type ResponseVisibility = 'all' | 'own';

export interface PollData {
	title: string;
	location?: string;
	description?: string;
	timeslots: Timeslot[];
	responseVisibility: ResponseVisibility;
}

export interface Timeslot {
	start: string; // ISO 8601
	end: string; // ISO 8601
}

export interface PollResponse {
	participantName: string;
	selections: TimeslotSelection[];
}

export interface TimeslotSelection {
	timeslotIndex: number;
	status: 'yes' | 'maybe' | 'no';
}

export interface Poll {
	id: string;
	encryptedData: string;
	adminTokenHash: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface PollResponseRecord {
	id: string;
	pollId: string;
	encryptedData: string;
	createdAt: Date;
}
