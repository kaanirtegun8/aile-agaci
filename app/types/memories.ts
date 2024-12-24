export interface MemoryLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export interface MemoryPhoto {
  id: string;
  url: string;
  path: string;
  encodedUrl?: string;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  memoryDate: number;
  relationId: string;
  location?: MemoryLocation;
  photos?: MemoryPhoto[];
}

export interface MemoryStore {
  [key: string]: Memory;
}

const memories: MemoryStore = {};
export default memories; 