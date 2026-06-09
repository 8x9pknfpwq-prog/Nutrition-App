export interface Bar {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'bar' | 'club';
  createdAt: number;
}

export interface QueueStatus {
  barId: string;
  waitTimeMinutes: number;
  crowdLevel: 'empty' | 'moderate' | 'busy' | 'packed';
  userCount: number;
  lastUpdated: number;
  updatedBy: string;
}
