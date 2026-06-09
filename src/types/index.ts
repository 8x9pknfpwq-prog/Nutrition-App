export interface Bar {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'bar' | 'club';
  imageUrl?: string;
  hours?: {
    open: string;
    close: string;
  };
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

export interface CheckIn {
  id: string;
  barId: string;
  userId: string;
  waitTimeMinutes: number;
  crowdLevel: 'empty' | 'moderate' | 'busy' | 'packed';
  timestamp: number;
}

export interface User {
  id: string;
  displayName: string;
  createdAt: number;
}
